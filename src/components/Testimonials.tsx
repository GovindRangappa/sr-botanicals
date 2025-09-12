// src/components/Testimonials.tsx
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import FadeInOnScroll from '@/components/FadeInOnScroll';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Review = {
  id: number;
  name: string;
  message: string;
  created_at: string;
};

export default function Testimonials() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const fetchReviews = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('approved', true) // Only fetch approved reviews
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching reviews:', error);
      } else {
        setReviews(data);
      }
    };

    fetchReviews();
  }, []);

  return (
    <section className="py-15 px-4 bg-[#f5f2e8]">
      <FadeInOnScroll>
        <h2 className="text-4xl font-lora font-semibold text-center text-[#3c2f2f] mb-12 font-['Playfair_Display']">
          What Our Customers Say
        </h2>

        <div className="max-w-4xl mx-auto space-y-8">
          {reviews.map((review) => (
            <blockquote
              key={review.id}
              className="bg-white border-l-4 border-green-700 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              <p className="italic text-[#3c2f2f] font-garamond">"{review.message}"</p>
              <footer className="mt-2 text-sm text-green-800 font-semibold">
                – {review.name}
              </footer>
            </blockquote>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a href="/reviews">
            <button className="bg-[#2f5d50] text-white px-8 py-3 rounded-full text-lg hover:bg-[#24493f] font-['Playfair_Display'] transition">
              Share Your Experience
            </button>
          </a>
        </div>
      </FadeInOnScroll>
    </section>
  );
}
