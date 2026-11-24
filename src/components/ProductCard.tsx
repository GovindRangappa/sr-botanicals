import Link from 'next/link';
import Image from 'next/image';

type Variant = {
  size: string;
  price: number;
  netWeight?: number | null;
};

type Product = {
  name: string;
  price: number;
  slug: string;
  image?: string;
  variants?: Variant[];
};

function formatSize(size: string) {
  return size.replace(/(\d+(?:\.\d+)?)\s*oz\b/i, '$1 oz');
}

export default function ProductCard({ product }: { product: Product }) {
  const sizedVariants = [...(product.variants ?? [])]
    .filter((variant) => variant.size && Number.isFinite(Number(variant.price)))
    .sort((a, b) => {
      const aWeight = a.netWeight ?? Number.POSITIVE_INFINITY;
      const bWeight = b.netWeight ?? Number.POSITIVE_INFINITY;
      if (aWeight !== bWeight) return aWeight - bWeight;
      return Number(a.price) - Number(b.price);
    });

  return (
    <Link href={`/product/${product.slug}`} className="block group cursor-pointer">
      <div className="transition-all duration-300 group-hover:bg-[#e5e0d8] rounded-md">
        {/* Image */}
        <div className="relative w-full aspect-square overflow-hidden">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
        </div>

        {/* Text */}
        <div className="mt-4">
          <h4 className="text-base font-medium text-[#3c2f2f] group-hover:text-green-900 transition-colors duration-300 font-['Playfair_Display']">
            {product.name}
          </h4>
          {sizedVariants.length > 1 ? (
            <div className="mt-1 space-y-0.5 text-sm font-['Playfair_Display']">
              {sizedVariants.map((variant) => (
                <p key={`${variant.size}-${variant.price}`} className="flex items-baseline justify-between gap-3">
                  <span className="font-normal text-[#3c2f2f]/75 group-hover:text-green-900 transition-colors duration-300">
                    {formatSize(variant.size)}
                  </span>
                  <span className="font-semibold text-green-700 group-hover:text-green-900 transition-colors duration-300">
                    ${Number(variant.price).toFixed(2)}
                  </span>
                </p>
              ))}
            </div>
          ) : (
            <p className="text-green-700 font-semibold text-sm group-hover:text-green-900 transition-colors duration-300 font-['Playfair_Display']">
              {product.price > 0 ? `$${product.price.toFixed(2)}` : 'Out of stock'}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
