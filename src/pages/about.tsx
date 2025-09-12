import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function About() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f5f2e8] text-[#3c2f2f] font-garamond">
      <NavBar />
      <main className="flex-grow py-32 px-6 sm:py-28">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-x-20 gap-y-12 items-center">
          
          {/* Left Column: Text */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="text-center md:text-left mx-auto md:mx-0"
          >
            <h1 className="text-4xl sm:text-5xl font-bold font-['Playfair_Display'] mb-8 leading-tight">
              Our Story
            </h1>
            <div className="text-lg leading-[2] font-['Playfair_Display'] max-w-prose mx-auto md:mx-0">
              <p>
                At SR Botanicals, we are passionate about crafting high-quality natural homemade soaps and hair products.
                Our origin story stems from a deep love for nature and an appreciation for the power of botanical ingredients.
                We take pride in creating products that are not only effective but also gentle on your skin and hair.
                We carefully formulate each product, ensuring they are enriched with nourishing botanical extracts and essential oils.
                It is our mission to provide you with products that enhance your natural beauty while promoting overall well-being.
                With a focus on sustainability and ethical sourcing, our ingredients are carefully selected to minimize our impact on the environment.
                We believe in using nature's gifts responsibly, without compromising on the efficacy of our products.
              </p>
            </div>
          </motion.div>


          {/* Right Column: Responsive Image */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
            className="relative w-full aspect-[7/8] rounded-3xl overflow-hidden border-[6px] border-[#bfae94] shadow-lg"
          >
            <Image
              src="/aboutpage-pic.png"
              alt="Stacked handmade soaps"
              fill
              className="object-cover"
            />
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
