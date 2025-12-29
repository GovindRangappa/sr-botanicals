// src/components/HomeImage.tsx
import FadeInOnScroll from '@/components/FadeInOnScroll';

import Image from 'next/image';

export default function HomeImage() {
  const bannerSrc = "/HomePageBannerFadedLogo-2.png";
  console.log("HomeImage: Loading banner image from:", bannerSrc);
  
  return (
    <section className="bg-[#f5f2e8]">
      <FadeInOnScroll>
      <div className="relative w-full aspect-[1920/800]">
        <Image
          src={bannerSrc}
          alt="SR Botanicals Banner"
          fill
          className="object-cover"
          priority
          quality={100}
          sizes="100vw"
          onLoad={() => console.log("HomeImage: Banner image loaded successfully:", bannerSrc)}
          onError={(e) => console.error("HomeImage: Error loading banner image:", bannerSrc, e)}
        />
      </div>
      </FadeInOnScroll>
    </section>
  );
}
