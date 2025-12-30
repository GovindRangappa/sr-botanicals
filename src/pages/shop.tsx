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
    let lastWindowWidth = window.innerWidth;

    const updatePosition = () => {
      if (!sidebarRef.current || !parentContainer || !mainContent) return;

      // Check if sidebar is visible (it's hidden on mobile with 'hidden md:block')
      // Sidebar should only be visible at md breakpoint (768px) and above
      const windowWidth = window.innerWidth;
      const isSidebarVisible = windowWidth >= 768; // md breakpoint
      
      // If sidebar is not visible on mobile, reset all styles and exit early
      if (!isSidebarVisible) {
        sidebar.style.position = '';
        sidebar.style.top = '';
        sidebar.style.left = '';
        sidebar.style.width = '';
        sidebar.style.backgroundColor = '';
        sidebar.style.zIndex = '';
        sidebar.style.paddingRight = '';
        sidebar.style.height = '';
        sidebar.style.maxHeight = '';
        sidebar.style.boxShadow = '';
        sidebar.style.marginLeft = '';
        sidebar.style.marginTop = '';
        (mainContent as HTMLElement).style.marginLeft = '';
        (mainContent as HTMLElement).style.paddingLeft = '';
        // Reset initial values so they recalculate if window is resized back above md
        initialOffsetTop = 0;
        initialLeft = 0;
        return;
      }

      const scrollY = window.scrollY || window.pageYOffset;
      const parentRect = parentContainer.getBoundingClientRect();
      
      // Get the navbar height
      const navbar = document.querySelector('nav');
      const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 0;
      
      // Calculate if sidebar should be sticky
      // Sidebar should stick when the parent container's top reaches the navbar
      const shouldStick = scrollY >= initialOffsetTop - navbarHeight;
      
      // Only capture position when sidebar is in normal flow (not already fixed)
      // This ensures we get the accurate position before it becomes sticky
      const isCurrentlyFixed = sidebar.style.position === 'fixed';
      const hasWindowResized = windowWidth !== lastWindowWidth;
      
      if (!isCurrentlyFixed) {
        const sidebarRect = sidebar.getBoundingClientRect();
        // Capture or update position only when:
        // 1. First time (initialOffsetTop === 0)
        // 2. Window has been resized
        if (initialOffsetTop === 0 || hasWindowResized) {
          initialOffsetTop = parentContainer.offsetTop;
          const previousInitialLeft = initialLeft;
          initialLeft = sidebarRect.left;
          sidebarWidth = sidebar.offsetWidth || sidebarRect.width;
          lastWindowWidth = windowWidth;
          
          console.log("=== Sidebar Position Captured ===");
          console.log("Previous initialLeft:", previousInitialLeft);
          console.log("New initialLeft:", initialLeft);
          console.log("Sidebar rect.left:", sidebarRect.left);
          console.log("Sidebar offsetWidth:", sidebar.offsetWidth);
          console.log("SidebarWidth:", sidebarWidth);
          console.log("Parent offsetTop:", initialOffsetTop);
          console.log("Window width:", windowWidth);
          console.log("Was resized:", hasWindowResized);
        }
      }
      
      // Make sidebar sticky when conditions are met (at all visible widths >= 768px)
      const shouldBeSticky = shouldStick && parentRect.top <= navbarHeight;
      
      if (shouldBeSticky) {
        const sidebarRectBefore = sidebar.getBoundingClientRect();
        
        // Get computed margin to account for it when positioning fixed element
        const computedStyle = window.getComputedStyle(sidebar);
        const marginLeft = parseFloat(computedStyle.marginLeft) || 0;
        
        // Sidebar should be sticky - use fixed positioning
        sidebar.style.position = 'fixed';
        sidebar.style.top = `${navbarHeight + 16}px`; // Add 16px (1rem) spacing from top
        // Remove margin when fixed and adjust left position to account for removed margin
        sidebar.style.marginLeft = '0';
        sidebar.style.marginTop = '0';
        // Use the captured initial left position (which includes margin) minus the margin
        const adjustedLeft = initialLeft - marginLeft;
        sidebar.style.left = `${adjustedLeft}px`;
        
        // Log after setting styles to see actual position
        setTimeout(() => {
          const sidebarRectAfter = sidebar.getBoundingClientRect();
          console.log("=== Sidebar Became Sticky ===");
          console.log("Should stick:", shouldStick);
          console.log("Parent top:", parentRect.top);
          console.log("Navbar height:", navbarHeight);
          console.log("InitialLeft (captured):", initialLeft);
          console.log("MarginLeft:", marginLeft);
          console.log("Adjusted left (initialLeft - marginLeft):", adjustedLeft);
          console.log("Set left to:", `${adjustedLeft}px`);
          console.log("Actual sidebar.left (before):", sidebarRectBefore.left);
          console.log("Actual sidebar.left (after):", sidebarRectAfter.left);
          console.log("Difference:", sidebarRectAfter.left - adjustedLeft);
        }, 0);
        sidebar.style.width = `${sidebarWidth}px`;
        // Add background color and z-index when sticky to prevent transparency and ensure it's above content
        sidebar.style.backgroundColor = '#f5f2e8';
        sidebar.style.zIndex = '20';
        sidebar.style.paddingRight = '1.5rem'; // pr-6 equivalent
        sidebar.style.height = 'auto';
        sidebar.style.maxHeight = `calc(100vh - ${navbarHeight + 16}px)`;
        sidebar.style.boxShadow = '2px 0 4px rgba(0,0,0,0.1)'; // Add subtle shadow for depth
        
        // Calculate total sidebar space (width + padding + margins)
        // Sidebar has: width (160px) + padding-right (24px) + margin-left (16px) = total space
        const totalSidebarSpace = sidebarWidth + 24 + 16; // width + padding-right + margin-left
        
        // Handle spacing based on screen width
        if (windowWidth >= 1280) {
          // On large screens (1280px+), use margin-left to reserve space
          (mainContent as HTMLElement).style.marginLeft = `${totalSidebarSpace}px`;
          (mainContent as HTMLElement).style.paddingLeft = '';
        } else {
          // Below 1280px, use padding-left to maintain space without affecting flex container width
          // This prevents cards from moving by maintaining the exact space the sidebar occupied
          (mainContent as HTMLElement).style.paddingLeft = `${totalSidebarSpace}px`;
          (mainContent as HTMLElement).style.marginLeft = '';
        }
      } else {
        // Sidebar should be in normal flow
        if (isCurrentlyFixed) {
          const sidebarRectBefore = sidebar.getBoundingClientRect();
          console.log("=== Sidebar Returning to Normal Flow ===");
          console.log("Was at left:", sidebarRectBefore.left);
          console.log("InitialLeft value:", initialLeft);
        }
        
        sidebar.style.position = '';
        sidebar.style.top = '';
        sidebar.style.left = '';
        sidebar.style.width = '';
        sidebar.style.backgroundColor = '';
        sidebar.style.zIndex = '';
        sidebar.style.paddingRight = '';
        sidebar.style.height = '';
        sidebar.style.maxHeight = '';
        sidebar.style.boxShadow = '';
        // Restore margins when returning to normal flow (they're defined in inline styles)
        sidebar.style.marginLeft = '';
        sidebar.style.marginTop = '';
        // Remove the margin and padding when sidebar is in normal flow
        (mainContent as HTMLElement).style.marginLeft = '';
        (mainContent as HTMLElement).style.paddingLeft = '';
        
        if (isCurrentlyFixed) {
          setTimeout(() => {
            const sidebarRectAfter = sidebar.getBoundingClientRect();
            console.log("Sidebar left after returning to normal:", sidebarRectAfter.left);
          }, 0);
        }
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