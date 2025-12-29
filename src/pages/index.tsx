// src/pages/index.tsx
import NavBar from '@/components/NavBar';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Collection from '@/components/Collection';
import Testimonials from '@/components/Testimonials';
import ContactForm from '@/components/ContactForm';
import Footer from '@/components/Footer';
import HomeImage from '@/components/HomeImage';
import ProductPreview from '@/components/ProductPreview';

export default function Home() {
  return (
    <>
      <NavBar />
      <HomeImage />
      <ProductPreview/>
      <Collection />
      <About />
      <Testimonials />
      <ContactForm />
      <Footer />
    </>
  );
}