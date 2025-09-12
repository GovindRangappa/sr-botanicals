import Image from 'next/image';
import Link from 'next/link';
import FadeInOnScroll from '@/components/FadeInOnScroll';

export default function About() {
  return (
    <section className="py-20 px-6 bg-[#f5f2e8]">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        {/* Left: Text */}
        <FadeInOnScroll>
          <div className="text-center md:text-left md:col-span-1">
            <h2 className="text-4xl font-bold text-[#3c2f2f] mb-4 font-['Playfair_Display']">
              About
            </h2>
            <p className="text-2xl text-[#3c2f2f] mb-6 font-['Playfair_Display']">
              Discover the essence of our brand
            </p>
            <p className="text-lg text-[#3c2f2f] max-w-md mx-auto md:mx-0 leading-[2] font-['Playfair_Display']">
              Unveil the secrets that lie behind our natural homemade soaps and hair products.
              Explore our origin, our meticulous process, and the inspiration that drives us.
              Immerse yourself in the creativity that shapes our unique story.
            </p>
            <div className="mt-8">
              <Link href="/about">
                <button className="bg-[#2f5d50] text-white px-8 py-3 rounded-full shadow-md hover:bg-[#24493f] transition-all duration-300 tracking-wide font-['Playfair_Display'] text-lg">
                  About
                </button>
              </Link>
            </div>
          </div>
        </FadeInOnScroll>

        {/* Right: Image - hidden on mobile */}
        <FadeInOnScroll>
          <div className="hidden md:flex justify-center">
            <div className="p-3 bg-[#fef9f2] border-[4px] border-[#bfae94] rounded-xl shadow-md">
              <Image
                src="/aboutpage-pic.png"
                alt="Stacked handmade soaps"
                width={500}
                height={700}
                className="rounded-lg object-cover border-[8px] border-[#a3b18a]"
              />
            </div>
          </div>
        </FadeInOnScroll>
      </div>
    </section>
  );
}
