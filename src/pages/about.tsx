'use client';

import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function About() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set()); // All sections start collapsed

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };
  return (
    <div className="flex flex-col min-h-screen bg-[#2a2a2a] text-white font-garamond">
      <NavBar />
      <main className="flex-grow bg-[#2a2a2a]">
        {/* Hero Section with Title */}
        <div className="pt-16 pb-8 px-6 sm:pt-24 sm:pb-12">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="text-center"
            >
              <h1 className="text-4xl sm:text-5xl font-bold font-['Playfair_Display'] text-white">
                About SR Botanicals
              </h1>
            </motion.div>
          </div>
        </div>

        {/* Dark Content Sections */}
        <div className="text-white">
          <div className="max-w-4xl mx-auto pt-0 pb-16 px-6 space-y-16">
            
            {/* About Suman Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="border-b border-gray-700 pb-4"
            >
              <button
                onClick={() => toggleSection('about-suman')}
                className="w-full text-left"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-3xl sm:text-4xl font-bold font-['Playfair_Display']">
                    About Suman
                  </h2>
                  <span className="text-2xl text-gray-400">
                    {expandedSections.has('about-suman') ? '−' : '+'}
                  </span>
                </div>
              </button>
              <AnimatePresence>
                {expandedSections.has('about-suman') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <hr className="border-gray-600 mb-6" />
                    <p className="text-lg leading-relaxed">
                      Suman Rangappa, DMD, is the founder of <strong>SR Botanicals</strong>. An avid gardener, passionate formulator, and practicing general dentist, she brings hands-on experience with herbs, deep research, and a love for nature. She approaches skin and hair care with a strong understanding of the body, balance, and long-term health. Her products reflect her belief that what is put on the body should be thoughtful and nourishing, gentle, naturally derived, and made with intention.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* Mission Statement Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="border-b border-gray-700 pb-4"
            >
              <button
                onClick={() => toggleSection('mission')}
                className="w-full text-left"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-3xl sm:text-4xl font-bold font-['Playfair_Display']">
                    Mission Statement
                  </h2>
                  <span className="text-2xl text-gray-400">
                    {expandedSections.has('mission') ? '−' : '+'}
                  </span>
                </div>
              </button>
              <AnimatePresence>
                {expandedSections.has('mission') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <hr className="border-gray-600 mb-6" />
                    <p className="text-lg leading-relaxed">
                      To create naturally derived skin and hair care products that are gentle, effective, and rooted in both botanical wisdom and scientific understanding—supporting health, balance, and natural beauty.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* Vision Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="border-b border-gray-700 pb-4"
            >
              <button
                onClick={() => toggleSection('vision')}
                className="w-full text-left"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-3xl sm:text-4xl font-bold font-['Playfair_Display']">
                    Vision
                  </h2>
                  <span className="text-2xl text-gray-400">
                    {expandedSections.has('vision') ? '−' : '+'}
                  </span>
                </div>
              </button>
              <AnimatePresence>
                {expandedSections.has('vision') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <hr className="border-gray-600 mb-6" />
                    <p className="text-lg leading-relaxed">
                      To redefine self-care as intentional and wellness-focused, where people choose meaningful, sustainable products that nurture the body and respect nature—without compromise.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* Our Values Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="border-b border-gray-700 pb-4"
            >
              <button
                onClick={() => toggleSection('values')}
                className="w-full text-left"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-3xl sm:text-4xl font-bold font-['Playfair_Display']">
                    Our Values
                  </h2>
                  <span className="text-2xl text-gray-400">
                    {expandedSections.has('values') ? '−' : '+'}
                  </span>
                </div>
              </button>
              <AnimatePresence>
                {expandedSections.has('values') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
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
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* Why SR Botanicals Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="border-b border-gray-700 pb-4"
            >
              <button
                onClick={() => toggleSection('why')}
                className="w-full text-left"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-3xl sm:text-4xl font-bold font-['Playfair_Display']">
                    Why SR Botanicals
                  </h2>
                  <span className="text-2xl text-gray-400">
                    {expandedSections.has('why') ? '−' : '+'}
                  </span>
                </div>
              </button>
              <AnimatePresence>
                {expandedSections.has('why') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <hr className="border-gray-600 mb-6" />
                    <p className="text-lg leading-relaxed">
                      SR Botanicals was born from the belief that personal care should be both effective and meaningful. Each product is handmade with intention, inspired by years of gardening, herbal knowledge, and a deep appreciation for natural beauty. These are products meant to be used, valued, and gifted with purpose—not forgotten or discarded.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* A Personal Note Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="border-b border-gray-700 pb-4"
            >
              <button
                onClick={() => toggleSection('personal-note')}
                className="w-full text-left"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl sm:text-3xl font-bold font-['Playfair_Display']">
                    A Personal Note
                  </h2>
                  <span className="text-2xl text-gray-400">
                    {expandedSections.has('personal-note') ? '−' : '+'}
                  </span>
                </div>
              </button>
              <AnimatePresence>
                {expandedSections.has('personal-note') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <hr className="border-gray-600 mb-8" />
                    <p className="text-lg leading-relaxed">
                      SR Botanicals is more than a business—it's a reflection of a lifelong respect for nature, health, and mindful living. Every product is created with the same care we would give our own family.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          </div>
        </div>

        {/* Image Section at Bottom */}
        <div className="py-16 px-6 sm:py-24">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="max-w-2xl mx-auto"
            >
              <div className="relative w-full aspect-[7/8] rounded-3xl overflow-hidden border-[6px] border-[#bfae94] shadow-lg">
                <Image
                  src="/aboutpage-pic.png"
                  alt="Stacked handmade soaps"
                  fill
                  className="object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}