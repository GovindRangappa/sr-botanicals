import Link from 'next/link';
import Image from 'next/image';

type Product = {
  name: string;
  price: number;
  slug: string;
  image?: string;
};

export default function ProductCard({ product }: { product: Product }) {
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
          <p className="text-green-700 font-semibold text-sm group-hover:text-green-900 transition-colors duration-300 font-['Playfair_Display']">
            {product.price > 0 ? `$${product.price.toFixed(2)}` : 'Out of stock'}
          </p>
        </div>
      </div>
    </Link>
  );
}
