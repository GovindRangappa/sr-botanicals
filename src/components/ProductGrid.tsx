// ✅ File: src/components/ProductGrid.tsx

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Product {
  name: string;
  price: number;
  image?: string;
  slug: string;
  description?: string;
  ingredients?: string[];
  inStock?: boolean;
}

export default function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase.from('products').select('*');
      if (error) {
        console.error('❌ Supabase error:', error.message);
      } else {
        console.log('✅ Supabase products:', data);
        setProducts(data);
      }
    }

    fetchProducts();
  }, []);

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <Link
          key={product.slug}
          href={`/product/${product.slug}`}
          className="border rounded-lg shadow hover:shadow-md transition cursor-pointer block"
        >
          <div className="relative w-full h-64">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover rounded-t-lg"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-t-lg">
                <span className="text-gray-400">No image</span>
              </div>
            )}
          </div>
          <div className="p-4 text-center">
            <h3 className="text-lg font-semibold text-gray-800">{product.name}</h3>
            <p className="text-green-700 font-medium">${product.price.toFixed(2)}</p>
          </div>
        </Link>
      ))}
    </section>
  );
}
