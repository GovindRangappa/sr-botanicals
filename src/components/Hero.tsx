import FadeInOnScroll from '@/components/FadeInOnScroll';

export default function Hero() {
  return (
    <section className="bg-[#f5f2e8] text-center py-20 px-4 sm:px-6 lg:px-8">
      <FadeInOnScroll>
        <h1 className="text-3xl sm:text-4xl font-semibold text-[#3c2f2f] mb-4 font-['Playfair_Display'] tracking-wide">
          WELCOME
        </h1>
        <p className="text-base sm:text-lg text-[#3c2f2f] max-w-2xl sm:max-w-3xl mx-auto font-['Playfair_Display'] px-2 sm:px-0">
          Welcome to SR Botanicals, where nature meets luxury in every handcrafted soap and hair product,
          curated for pampering and a sensorial skincare and haircare experience.
        </p>
      </FadeInOnScroll>
    </section>
  );
}
