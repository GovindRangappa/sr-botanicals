import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Total parcel weight in oz for Shippo, aligned with ManualOrderForm / get-rates expectations.
 * Uses line-item weights when present; otherwise matches product name to DB netWeight; fallback 20 oz per unit.
 */
export async function getTotalWeightOzForOrder(
  supabase: SupabaseClient,
  order: { products?: unknown }
): Promise<number> {
  const lines = Array.isArray(order.products) ? order.products : [];
  if (lines.length === 0) return 20;

  const { data: dbProducts } = await supabase.from('products').select('name, netWeight');
  const nameToWeight = new Map<string, number>();
  for (const p of dbProducts || []) {
    if (p.name) nameToWeight.set(p.name, Number(p.netWeight) > 0 ? Number(p.netWeight) : 20);
  }

  let total = 0;
  for (const line of lines as { name?: string; quantity?: number; weightOz?: number; netWeight?: number }[]) {
    const qty = Math.max(1, Number(line.quantity) || 1);
    const explicit = line.weightOz ?? line.netWeight;
    if (explicit != null && Number(explicit) > 0) {
      total += Number(explicit) * qty;
      continue;
    }
    const perUnit = line.name ? nameToWeight.get(line.name) ?? 20 : 20;
    total += perUnit * qty;
  }

  return Math.max(Math.round(total * 100) / 100, 1);
}
