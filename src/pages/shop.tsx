import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/utils/supabaseClient';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

export default function Shop() {
  const router = useRouter();
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const sidebarRef = useRef<HTMLElement | null>(null);
  const [shopData, setShopData] = useState<{
    [category: string]: { [subcategory: string]: any[] };
  }>({});

  useEffect(() => {
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

  // Use JavaScript to make sidebar stick since CSS sticky isn't working due to body/html overflow
  useEffect(() => {
    if (!sidebarRef.current) return;

    const sidebar = sidebarRef.current;
    const parentContainer = sidebar.parentElement;
    if (!parentContainer) return;

    // Find the main content element (sibling after sidebar)
    const mainContent = parentContainer.querySelector('main');
    if (!mainContent) return;

    let initialOffsetTop = 0;
    let initialLeft = 0;
    let sidebarWidth = 0;

    const updatePosition = () => {
      if (!sidebarRef.current || !parentContainer || !mainContent) return;

      const scrollY = window.scrollY || window.pageYOffset;
      const parentRect = parentContainer.getBoundingClientRect();
      
      // Calculate the initial position on first run
      if (initialOffsetTop === 0) {
        initialOffsetTop = parentContainer.offsetTop;
        initialLeft = parentRect.left;
        sidebarWidth = sidebar.offsetWidth;
      }

      // Get the navbar height
      const navbar = document.querySelector('nav');
      const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 0;
      
      // Calculate if sidebar should be sticky
      // Sidebar should stick when the parent container's top reaches the navbar
      const shouldStick = scrollY >= initialOffsetTop - navbarHeight;
      
      if (shouldStick && parentRect.top <= navbarHeight) {
        // Sidebar should be sticky - use fixed positioning
        sidebar.style.position = 'fixed';
        sidebar.style.top = `${navbarHeight + 16}px`; // Add 16px (1rem) spacing from top
        sidebar.style.left = `${initialLeft + 16}px`; // Add 16px (1rem) spacing from left
        sidebar.style.width = `${sidebarWidth}px`;
        // Add margin-left to main content to reserve space for fixed sidebar
        // sidebarWidth (160px) + pr-6 (24px padding) + left margin (16px) = 200px total
        (mainContent as HTMLElement).style.marginLeft = `${sidebarWidth + 24 + 16}px`;
      } else {
        // Sidebar should be in normal flow
        sidebar.style.position = '';
        sidebar.style.top = '';
        sidebar.style.left = '';
        sidebar.style.width = '';
        // Remove the margin when sidebar is in normal flow
        (mainContent as HTMLElement).style.marginLeft = '';
      }
    };

    // Initial calculation
    const timeoutId = setTimeout(updatePosition, 100);

    // Update on scroll (throttled)
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updatePosition, 10);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updatePosition);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updatePosition);
      
      // Reset styles on cleanup
      if (sidebarRef.current) {
        sidebarRef.current.style.position = '';
        sidebarRef.current.style.top = '';
        sidebarRef.current.style.left = '';
        sidebarRef.current.style.width = '';
      }
      if (mainContent) {
        (mainContent as HTMLElement).style.marginLeft = '';
      }
    };
  }, [shopData]);

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
      <div className="bg-[#f5f2e8] text-[#3c2f2f] font-garamond flex flex-col md:flex-row px-4 md:pl-8 md:pr-6 py-6 md:py-12 relative">
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
        <aside 
          ref={sidebarRef}
          className="hidden md:block w-40 pr-6 border-r border-[#d9d9d9] flex-shrink-0 z-10 self-start"
          style={{ 
            maxHeight: 'calc(100vh - 4rem)', 
            overflowY: 'auto',
            marginTop: '1rem',
            marginLeft: '1rem',
          }}
        >
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
        <main className="flex-1 md:pl-6">
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