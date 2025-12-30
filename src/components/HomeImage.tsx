// src/components/HomeImage.tsx
'use client';

import FadeInOnScroll from '@/components/FadeInOnScroll';
import { useEffect, useRef } from 'react';
import Image from 'next/image';

export default function HomeImage() {
  const mobileBannerSrc = "/HomePageBanner-Mobile.png";
  const desktopBannerSrc = "/HomePageBannerFadedLogo.png";
  const mobileContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const logDimensions = () => {
      if (typeof window === 'undefined') return;
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const calculatedHeight = viewportWidth * 1.44;
      const minHeight = viewportHeight - (5.5 * 16); // 5.5rem in pixels
      const actualHeight = Math.max(calculatedHeight, minHeight);
      
      console.log("=== Mobile Banner Debug Info ===");
      console.log("Viewport Width:", viewportWidth, "px");
      console.log("Viewport Height:", viewportHeight, "px");
      console.log("Calculated Height (100vw * 1.44):", calculatedHeight, "px");
      console.log("Min Height (100vh - 5.5rem):", minHeight, "px");
      console.log("Actual Container Height:", actualHeight, "px");
      
      if (mobileContainerRef.current) {
        const container = mobileContainerRef.current;
        const computedStyle = window.getComputedStyle(container);
        console.log("Container Computed Width:", computedStyle.width);
        console.log("Container Computed Height:", computedStyle.height);
        console.log("Container Bounding Rect:", container.getBoundingClientRect());
      }
    };

    logDimensions();
    window.addEventListener('resize', logDimensions);
    
    return () => {
      window.removeEventListener('resize', logDimensions);
    };
  }, []);

  return (
    <section className="bg-[#f5f2e8] m-0 p-0">
      <FadeInOnScroll>
        {/* Mobile Banner - visible on mobile, hidden on md and up */}
        <div 
          ref={mobileContainerRef}
          className="relative w-screen block md:hidden m-0 overflow-hidden" 
          style={{ height: 'calc(100vw * 1.44)' }}
        >
          <Image
            src={mobileBannerSrc}
            alt="SR Botanicals Banner"
            fill
            className="object-cover"
            priority
            quality={100}
            sizes="100vw"
            style={{ width: '100%', objectFit: 'cover', objectPosition: 'center' }}
            onLoad={(e) => {
              const img = e.target as HTMLImageElement;
              console.log("=== Image Load Info ===");
              console.log("Image natural width:", img.naturalWidth);
              console.log("Image natural height:", img.naturalHeight);
              console.log("Image aspect ratio:", img.naturalWidth / img.naturalHeight);
              console.log("Image loaded successfully:", mobileBannerSrc);
            }}
            onError={(e) => console.error("HomeImage: Error loading mobile banner image:", mobileBannerSrc, e)}
          />
        </div>
        
        {/* Desktop Banner - hidden on mobile, visible on md and up */}
        <div className="relative w-full aspect-[1920/800] hidden md:block">
          <Image
            src={desktopBannerSrc}
            alt="SR Botanicals Banner"
            fill
            className="object-cover"
            priority
            quality={100}
            sizes="100vw"
            onLoad={() => console.log("HomeImage: Desktop banner image loaded successfully:", desktopBannerSrc)}
            onError={(e) => console.error("HomeImage: Error loading desktop banner image:", desktopBannerSrc, e)}
          />
        </div>
      </FadeInOnScroll>
    </section>
  );
}
