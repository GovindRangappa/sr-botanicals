import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Shop() {
  const router = useRouter();
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [shopData, setShopData] = useState<{
    [category: string]: { [subcategory: string]: any[] };
  }>({});

  useEffect(() => {
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("Supabase ANON Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    async function fetchProducts() {
      const { data, error } = await supabase.from('products').select('*');
      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      const structuredData: { [category: string]: { [subcategory: string]: any[] } } = {};
      for (const product of data) {
        const { category, subcategory } = product;
        if (!category || !subcategory) continue;
        if (!structuredData[category]) structuredData[category] = {};
        if (!structuredData[category][subcategory]) structuredData[category][subcategory] = [];
        structuredData[category][subcategory].push(product);
      }

      setShopData(structuredData);
    }

    fetchProducts();
  }, []);

  useEffect(() => {
    if (Object.keys(shopData).length === 0) return;
    const hash = router.asPath.split('#')[1];
    if (hash && sectionRefs.current[hash]) {
      setTimeout(() => {
        sectionRefs.current[hash]?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [router.asPath, shopData]);

  const scrollToSection = (id: string) => {
    const element = sectionRefs.current[id];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <style jsx>{`
        .hide-scrollbar {
          -ms-overflow-style: none;  /* Internet Explorer 10+ */
          scrollbar-width: none;  /* Firefox */
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;  /* Safari and Chrome */
        }
      `}</style>
      <NavBar />
      <div className="bg-[#f5f2e8] text-[#3c2f2f] font-garamond flex flex-col md:flex-row px-4 md:px-6 py-6 md:py-12">
        {/* Mobile Category Toggle */}
        <div className="block md:hidden mb-6">
          <details className="bg-white rounded-md shadow-md">
            <summary className="cursor-pointer px-4 py-3 font-semibold text-lg font-['Playfair_Display'] bg-[#2f5d50] text-white rounded-md">
              Browse Categories
            </summary>
            <div className="px-4 py-4">
              {Object.entries(shopData).map(([category, subcategories]) => (
                <div key={category} className="mb-4">
                  <button
                    className="font-semibold text-[#2f5d50] mb-1 hover:underline font-['Playfair_Display']"
                    onClick={() => scrollToSection(category)}
                  >
                    {category}
                  </button>
                  <ul className="pl-2 space-y-1 text-sm font-['Playfair_Display']">
                    {Object.keys(subcategories).map((subCat) => {
                      const id = `${category}-${subCat.replace(/\s+/g, '-')}`;
                      return (
                        <li key={id}>
                          <button
                            className="hover:underline"
                            onClick={() => scrollToSection(id)}
                          >
                            {subCat}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        </div>

        {/* Sidebar - Hidden on Mobile */}
        <aside className="hidden md:block w-40 pr-6 border-r border-[#d9d9d9] sticky top-0 h-fit flex-shrink-0">
          <h2 className="text-xl font-bold font-['Playfair_Display'] mb-4">Categories</h2>
          {Object.entries(shopData).map(([category, subcategories]) => (
            <div key={category} className="mb-6">
              <button
                className="font-semibold text-[#2f5d50] mb-2 hover:underline font-['Playfair_Display']"
                onClick={() => scrollToSection(category)}
              >
                {category}
              </button>
              <ul className="space-y-1 mt-1 font-['Playfair_Display']">
                {Object.keys(subcategories).map((subCat) => {
                  const id = `${category}-${subCat.replace(/\s+/g, '-')}`;
                  return (
                    <li key={id}>
                      <button
                        className="text-sm hover:underline"
                        onClick={() => scrollToSection(id)}
                      >
                        {subCat}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:pl-6 overflow-y-auto hide-scrollbar">
          <h1 className="text-4xl font-bold text-[#3c2f2f] font-['Playfair_Display'] mb-8 text-center">Shop</h1>

          {Object.entries(shopData).map(([category, subcategories]) => (
            <div
              key={category}
              ref={(el) => (sectionRefs.current[category] = el)}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold font-['Playfair_Display'] text-[#2f5d50] mb-4">{category}</h2>
              {Object.entries(subcategories).map(([subCategory, items]) => {
                const id = `${category}-${subCategory.replace(/\s+/g, '-')}`;
                return (
                  <div
                    key={subCategory}
                    ref={(el) => (sectionRefs.current[id] = el)}
                    id={id}
                    className="mb-10"
                  >
                    <h3 className="text-2xl font-semibold font-['Playfair_Display'] mb-3">{subCategory}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6">
                      {items.map((product, idx) => (
                        <ProductCard key={idx} product={product} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </main>
      </div>
      <Footer />
    </>
  );
}