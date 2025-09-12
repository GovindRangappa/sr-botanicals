import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getServerSideProps() {
    const { data: allProducts, error: allError } = await supabase
      .from('products')
      .select('name, slug');
  
    if (allError) {
      console.error('❌ Error fetching slugs:', allError);
    } else {
      console.log('✅ Slugs in Supabase:', allProducts);
    }
  
    // Try fetching one specific product by known slug
    const slug = 'vintage-leather-turmeric';
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .single();
  
    console.log('🔍 Fetched product for slug:', slug, product);
    if (error) console.error('❌ Supabase error on product fetch:', error);
  
    return {
      props: { product: product || null },
    };
  }
  

export default function DebugProductPage({ product }: { product: any }) {
  return (
    <>
      <NavBar />
      <main className="max-w-4xl mx-auto py-12 px-6 text-gray-800">
        {product ? (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="relative w-full h-[400px]">
              <Image
                src={product.image || '/placeholder.png'}
                alt={product.name}
                fill
                className="object-contain rounded"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{product.name}</h1>
              <p className="text-green-700 mt-2 mb-4">${product.price.toFixed(2)}</p>
              <p>{product.description || 'No description.'}</p>
            </div>
          </div>
        ) : (
          <p className="text-red-600">Product not found.</p>
        )}
      </main>
      <Footer />
    </>
  );
}
