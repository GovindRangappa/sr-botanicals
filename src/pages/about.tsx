import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function About() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f5f2e8] text-[#3c2f2f] font-garamond">
      <NavBar />
      <main className="flex-grow">
        {/* Hero Section with Image */}
        <div className="py-16 px-6 sm:py-24 bg-[#f5f2e8]">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-x-20 gap-y-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="relative w-full aspect-[7/8] rounded-3xl overflow-hidden border-[6px] border-[#bfae94] shadow-lg mx-auto"
            >
              <Image
                src="/aboutpage-pic.png"
                alt="Stacked handmade soaps"
                fill
                className="object-cover"
              />
            </motion.div>
            <div className="text-center md:text-left">
              <h1 className="text-4xl sm:text-5xl font-bold font-['Playfair_Display'] mb-4">
                About SR Botanicals
              </h1>
            </div>
          </div>
        </div>

        {/* Dark Content Sections */}
        <div className="bg-[#2a2a2a] text-white">
          <div className="max-w-4xl mx-auto py-16 px-6 space-y-16">
            
            {/* About Suman Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold font-['Playfair_Display'] mb-4">
                About Suman
              </h2>
              <hr className="border-gray-600 mb-6" />
              <p className="text-lg leading-relaxed">
                Suman Rangappa, DMD, is the founder of <strong>SR Botanicals</strong>. An avid gardener, passionate formulator, and practicing general dentist, she brings hands-on experience with herbs, deep research, and a love for nature. She approaches skin and hair care with a strong understanding of the body, balance, and long-term health. Her products reflect her belief that what is put on the body should be thoughtful and nourishing, gentle, naturally derived, and made with intention.
              </p>
            </motion.section>

            {/* Mission Statement Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold font-['Playfair_Display'] mb-4">
                Mission Statement
              </h2>
              <hr className="border-gray-600 mb-6" />
              <p className="text-lg leading-relaxed">
                To create naturally derived skin and hair care products that are gentle, effective, and rooted in both botanical wisdom and scientific understanding—supporting health, balance, and natural beauty.
              </p>
            </motion.section>

            {/* Vision Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold font-['Playfair_Display'] mb-4">
                Vision
              </h2>
              <hr className="border-gray-600 mb-6" />
              <p className="text-lg leading-relaxed">
                To redefine self-care as intentional and wellness-focused, where people choose meaningful, sustainable products that nurture the body and respect nature—without compromise.
              </p>
            </motion.section>

            {/* Our Values Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="space-y-8"
            >
              <h2 className="text-3xl sm:text-4xl font-bold font-['Playfair_Display'] mb-4">
                Our Values
              </h2>
              <hr className="border-gray-600 mb-8" />
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold font-['Playfair_Display'] mb-2">
                    Nature-First Formulation
                  </h3>
                  <p className="text-lg leading-relaxed">
                    We believe in using nature's gifts responsibly—formulating with naturally derived ingredients and avoiding unnecessary or harmful additives.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold font-['Playfair_Display'] mb-2">
                    Health & Balance
                  </h3>
                  <p className="text-lg leading-relaxed">
                    Our products are designed to be gentle on the skin and hair, without disrupting hormones or the body's natural equilibrium.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold font-['Playfair_Display'] mb-2">
                    Research & Integrity
                  </h3>
                  <p className="text-lg leading-relaxed">
                    Every formulation is thoughtfully researched and created with care, transparency, and purpose.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold font-['Playfair_Display'] mb-2">
                    Sustainability & Responsibility
                  </h3>
                  <p className="text-lg leading-relaxed">
                    We prioritize ethical sourcing and mindful creation to minimize environmental impact.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold font-['Playfair_Display'] mb-2">
                    Intentional Living
                  </h3>
                  <p className="text-lg leading-relaxed">
                    We encourage replacing throwaway, unwanted gifts with products that promote wellness, longevity, and care.
                  </p>
                </div>
              </div>
            </motion.section>

            {/* Why SR Botanicals Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold font-['Playfair_Display'] mb-4">
                Why SR Botanicals
              </h2>
              <hr className="border-gray-600 mb-6" />
              <p className="text-lg leading-relaxed">
                SR Botanicals was born from the belief that personal care should be both effective and meaningful. Each product is handmade with intention, inspired by years of gardening, herbal knowledge, and a deep appreciation for natural beauty. These are products meant to be used, valued, and gifted with purpose—not forgotten or discarded.
              </p>
            </motion.section>

            {/* A Personal Note Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <hr className="border-gray-600 mb-8" />
              <h2 className="text-2xl sm:text-3xl font-bold font-['Playfair_Display'] mb-4">
                A Personal Note
              </h2>
              <p className="text-lg leading-relaxed">
                SR Botanicals is more than a business—it's a reflection of a lifelong respect for nature, health, and mindful living. Every product is created with the same care we would give our own family.
              </p>
            </motion.section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}