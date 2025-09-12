// src/components/HomeImage.tsx
import FadeInOnScroll from '@/components/FadeInOnScroll';

import Image from 'next/image';

export default function HomeImage() {
  return (
    <section className="bg-[#f5f2e8]">
      <FadeInOnScroll>
      <div className="relative w-full aspect-[1920/800]">
        <Image
          src="/homepage-banner.png"
          alt="SR Botanicals Banner"
          fill
          className="object-cover"
          priority
        />
      </div>
      </FadeInOnScroll>
    </section>
  );
}
