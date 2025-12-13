/* scripts/migrate-stripe-live.js */
require("dotenv").config({ path: ".env.local" });

const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  STRIPE_SECRET_KEY,
  DRY_RUN = "false",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !STRIPE_SECRET_KEY) {
  console.error("Missing env vars. Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY");
  process.exit(1);
}

if (!STRIPE_SECRET_KEY.startsWith("sk_live_")) {
  console.error("STRIPE_SECRET_KEY is not a live key. Aborting to prevent creating test prices.");
  process.exit(1);
}

const dryRun = DRY_RUN.toLowerCase() === "true";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-04-30.basil",
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function stripePriceExists(priceId) {
  if (!priceId) return false;
  try {
    await stripe.prices.retrieve(priceId);
    return true;
  } catch (e) {
    return false;
  }
}

async function findOrCreateStripeProduct({ supabaseProductId, name, slug }) {
  // Use Stripe Search API to make this idempotent
  const query = `metadata['supabase_product_id']:'${supabaseProductId}'`;
  const found = await stripe.products.search({ query, limit: 1 }).catch(() => null);

  if (found?.data?.length) return found.data[0];

  if (dryRun) {
    console.log(`[DRY_RUN] Would create Stripe product for: ${name} (${supabaseProductId})`);
    return { id: "prod_DRY_RUN" };
  }

  const created = await stripe.products.create({
    name: name || slug || `Product ${supabaseProductId}`,
    metadata: {
      supabase_product_id: supabaseProductId,
      slug: slug || "",
    },
  });

  return created;
}

async function createStripePrice({ stripeProductId, unitAmountCents, nickname }) {
  if (dryRun) {
    console.log(`[DRY_RUN] Would create price for ${stripeProductId}: $${(unitAmountCents / 100).toFixed(2)} (${nickname || ""})`);
    return { id: "price_DRY_RUN" };
  }

  return await stripe.prices.create({
    currency: "usd",
    unit_amount: unitAmountCents,
    product: stripeProductId,
    nickname: nickname || undefined,
  });
}

function toCents(value) {
  // Accept number or string like "4.99"
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

async function main() {
  console.log(`Starting migration. DRY_RUN=${dryRun}`);
  console.log("Fetching products...");

  // Adjust selected columns if your schema differs
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id,name,slug,price,stripe_price_id")
    .order("name", { ascending: true });

  if (prodErr) {
    console.error("Supabase products fetch error:", prodErr);
    process.exit(1);
  }

  console.log(`Loaded ${products.length} products`);

  // Fetch all variants (if table exists) and index by product_id
  let variantsByProduct = new Map();
  const { data: variants, error: varErr } = await supabase
    .from("product_variants")
    .select("id,product_id,size,price,stripe_price_id");

  if (varErr) {
    console.warn("Could not load product_variants (table missing or permissions?). Variants will be skipped.");
  } else {
    for (const v of variants) {
      if (!variantsByProduct.has(v.product_id)) variantsByProduct.set(v.product_id, []);
      variantsByProduct.get(v.product_id).push(v);
    }
    console.log(`Loaded ${variants.length} variants`);
  }

  let updatedProducts = 0;
  let updatedVariants = 0;
  let skipped = 0;
  let errors = 0;

  for (const p of products) {
    const productId = p.id;
    const name = p.name;
    const slug = p.slug;

    const hasVariants = variantsByProduct.has(productId) && variantsByProduct.get(productId).length > 0;

    try {
      // Case A: single-price product (stripe_price_id should be set)
      if (!hasVariants) {
        if (!p.price) {
          console.log(`SKIP (no price): ${name} (${productId})`);
          skipped++;
          continue;
        }

        // If price exists and is valid in LIVE, skip
        if (p.stripe_price_id && (await stripePriceExists(p.stripe_price_id))) {
          console.log(`OK (live price exists): ${name} -> ${p.stripe_price_id}`);
          skipped++;
          continue;
        }

        const cents = toCents(p.price);
        if (cents == null) {
          console.log(`SKIP (invalid price): ${name} price=${p.price}`);
          skipped++;
          continue;
        }

        const stripeProduct = await findOrCreateStripeProduct({
          supabaseProductId: productId,
          name,
          slug,
        });

        const newPrice = await createStripePrice({
          stripeProductId: stripeProduct.id,
          unitAmountCents: cents,
          nickname: "Default",
        });

        if (!dryRun) {
          const { error: upErr } = await supabase
            .from("products")
            .update({ stripe_price_id: newPrice.id })
            .eq("id", productId);

          if (upErr) throw upErr;
        }

        console.log(`UPDATED product: ${name} -> ${newPrice.id}`);
        updatedProducts++;
        continue;
      }

      // Case B: variant product (products.stripe_price_id is usually NULL; variants carry stripe_price_id)
      const productVariants = variantsByProduct.get(productId);

      const stripeProduct = await findOrCreateStripeProduct({
        supabaseProductId: productId,
        name,
        slug,
      });

      for (const v of productVariants) {
        // If variant has a price ID that exists in LIVE, skip
        if (v.stripe_price_id && (await stripePriceExists(v.stripe_price_id))) {
          console.log(`OK (live variant price exists): ${name} [${v.size}] -> ${v.stripe_price_id}`);
          skipped++;
          continue;
        }

        const cents = toCents(v.price);
        if (cents == null) {
          console.log(`SKIP (invalid variant price): ${name} [${v.size}] price=${v.price}`);
          skipped++;
          continue;
        }

        const newPrice = await createStripePrice({
          stripeProductId: stripeProduct.id,
          unitAmountCents: cents,
          nickname: v.size ? `Size ${v.size}` : "Variant",
        });

        if (!dryRun) {
          const { error: vErr2 } = await supabase
            .from("product_variants")
            .update({ stripe_price_id: newPrice.id })
            .eq("id", v.id);

          if (vErr2) throw vErr2;
        }

        console.log(`UPDATED variant: ${name} [${v.size}] -> ${newPrice.id}`);
        updatedVariants++;

        // gentle rate-limit
        await sleep(50);
      }
    } catch (e) {
      errors++;
      console.error(`ERROR on product ${name} (${productId}):`, e?.message || e);
    }

    await sleep(50);
  }

  console.log("\nDONE");
  console.log({ updatedProducts, updatedVariants, skipped, errors, dryRun });
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
