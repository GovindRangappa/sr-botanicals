// pages/product/[slug].tsx
import { GetStaticPaths, GetStaticProps } from 'next';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const getStaticPaths: GetStaticPaths = async () => {
  const { data: products } = await supabase.from('products').select('slug');
  const paths =
    products?.map((product) => ({ params: { slug: product.slug } })) ?? [];
  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params?.slug;
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !product) return { notFound: true };

  const { data: variants } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', product.id);

  return { props: { product, variants } };
};

export default function ProductPage({ product, variants }: { product: any; variants: any[] }) {
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  // ✅ Track the cart item for the currently selected variant
  const currentId = selectedVariant?.stripe_price_id;
  const cartItem = currentId ? cart.find(i => i.stripe_price_id === currentId) : null;

  // ✅ Keep quantity in sync with cart when present
  useEffect(() => {
    if (cartItem?.quantity) setQuantity(cartItem.quantity);
    else setQuantity(1);
  }, [currentId, cartItem?.quantity]);

  useEffect(() => {
    if (variants?.length > 0) {
      setSelectedVariant(variants[0]);
    } else {
      setSelectedVariant({
        id: product.id,
        size: '',
        price: product.price,
        stripe_price_id: product.stripe_price_id,
        netWeight: product.netWeight || null,
      });
    }
  }, [variants, product]);

  const handleAddToCart = () => {
    const existing = cart.find(
      item => item.stripe_price_id === selectedVariant?.stripe_price_id
    );

    if (!existing && selectedVariant) {
      addToCart(
        {
          id: selectedVariant.id, // Use variant ID, not product ID
          name: variants.length > 1 ? `${product.name} (${selectedVariant.size})` : product.name,
          price: selectedVariant.price,
          image: product.image,
          stripe_price_id: selectedVariant.stripe_price_id,
          slug: product.slug,
          netWeight: selectedVariant.netWeight,
        },
        quantity
      );
      alert('Product added to cart!');
    }
  };


  const subcategoryId = `${product.category}-${product.subcategory.replace(/\s+/g, '-')}`;

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f2e8] text-[#3c2f2f] font-garamond">
      <NavBar />
      <main className="bg-[#f5f2e8] flex-grow text-[#3c2f2f] font-garamond px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <Link
            href={`/shop#${subcategoryId}`}
            className="text-green-700 font-semibold hover:underline mb-6 inline-block font-['Playfair_Display']"
          >
            ← Back to Shop
          </Link>

          <div className="grid md:grid-cols-2 gap-16 mt-4 items-start">
            {/* Product Image */}
            <div className="w-full max-w-md aspect-square mx-auto border shadow overflow-hidden">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  width={800}
                  height={800}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-400">No image available</span>
                </div>
              )}
            </div>

            {/* Product Details */}
            <div>
              <h1 className="text-4xl font-bold font-['Playfair_Display'] mb-4">
                {product.name}
              </h1>

              {/* Price and Variant Selector */}
              {selectedVariant?.price ? (
                <div className="mb-6 flex items-center gap-4">
                  <p className="text-xl font-semibold text-green-700 font-['Playfair_Display']">
                    ${selectedVariant.price.toFixed(2)}
                  </p>
                  {variants.length > 0 && (
                    <select
                      value={selectedVariant?.id || ''}
                      onChange={(e) => {
                        const v = variants.find((v) => v.id.toString() === e.target.value);
                        setSelectedVariant(v);
                      }}
                      className="w-32 border rounded px-3 py-2"
                    >
                      {variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.size}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <p className="text-green-700 text-xl font-semibold mb-6 font-['Playfair_Display']">
                  Price not available
                </p>
              )}

              {/* Quantity Selector (editable whether or not it's in cart) */}
              <div className="mb-4">
                <label className="block mb-2 font-medium">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={cartItem ? cartItem.quantity : quantity}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 1);
                    if (cartItem) updateQuantity(currentId!, val); // updates drawer too
                    else setQuantity(val);                         // local before adding
                  }}
                  className="w-24 border rounded px-2 py-1"
                />
              </div>


              {/* Add / Remove Button (toggles based on cart presence) */}
              <button
                onClick={() => {
                  if (!selectedVariant) return;

                  if (cartItem) {
                    // remove from both slug and drawer
                    removeFromCart(currentId!);
                  } else {
                    // add to cart with slug for drawer linking
                    addToCart(
                      {
                        id: selectedVariant.id,
                        name: variants.length > 1
                          ? `${product.name} (${selectedVariant.size})`
                          : product.name,
                        price: selectedVariant.price,
                        image: product.image,
                        stripe_price_id: selectedVariant.stripe_price_id,
                        slug: product.slug,
                        weightOz: selectedVariant.netWeight ?? product.netWeight ?? 4,
                      },
                      quantity
                    );
                  }
                }}
                className={`px-6 py-2 rounded font-['Playfair_Display'] transition ${
                  cartItem
                    ? 'bg-red-600 hover:bg-red-700 text-white'          // Remove
                    : 'bg-[#2f5d50] hover:bg-[#24493f] text-white'      // Add
                }`}
                disabled={!selectedVariant || !selectedVariant.price}
              >
                {cartItem ? 'Remove' : 'Add to Cart'}
              </button>


              {/* Description */}
              {product.description && (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-2 font-['Playfair_Display']">
                    Description
                  </h2>
                  <p className="text-[#3c2f2f] leading-relaxed font-['Playfair_Display']">{product.description}</p>
                </div>
              )}

              {/* Ingredients */}
              {product.ingredients?.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-2 font-['Playfair_Display']">
                    Ingredients
                  </h2>
                  <ul className="list-disc list-inside text-[#3c2f2f] font-['Playfair_Display']">
                    {product.ingredients.map((ingredient: string, i: number) => (
                      <li key={i}>{ingredient}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
