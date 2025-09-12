import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ReviewsPage() {
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const fetchReviews = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });
      if (!error && data) setReviews(data);
    };
    fetchReviews();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || rating < 1 || rating > 5) {
      setFeedback('Please enter a valid review and rating.');
      return;
    }

    const { error } = await supabase.from('reviews').insert([
      { name: name || 'Anonymous', rating, message}
    ]);

    if (error) {
      setFeedback('Failed to submit review.');
    } else {
      setFeedback('✅ Thank you for your review!');
      setName('');
      setRating(5);
      setMessage('');
      // Reload reviews
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });
      setReviews(data || []);
    }
  };

  return (
    <>
      <NavBar />
      <main className="bg-[#f5f2e8] text-[#3c2f2f] py-20 px-6 font-garamond">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center font-[Playfair_Display]">Customer Reviews</h1>

          <form onSubmit={handleSubmit} className="mb-10 space-y-4 bg-white p-6 rounded shadow">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border p-3 rounded"
            />
            <div>
              <label className="block mb-1 font-medium font-[Playfair_Display]">How would you rate your experience?</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    type="button"
                    key={num}
                    onClick={() => setRating(num)}
                    className={`text-2xl transition ${
                      rating >= num ? 'text-yellow-400' : 'text-gray-300'
                    } hover:text-yellow-500`}
                    aria-label={`Rate ${num}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="text-sm mt-1 text-gray-600">
                {rating === 1 && '😞 Poor'}
                {rating === 2 && '😐 Fair'}
                {rating === 3 && '🙂 Good'}
                {rating === 4 && '😀 Very Good'}
                {rating === 5 && '🤩 Excellent'}
              </p>
            </div>

            <textarea
              placeholder="Write your review..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border p-3 rounded min-h-[100px]"
            />

            {feedback && <p className="text-sm text-green-600">{feedback}</p>}

            <button
              type="submit"
              className="bg-[#2f5d50] text-white px-6 py-2 rounded hover:bg-[#24493f] transition font-[Playfair_Display]"
            >
              Submit Review
            </button>
          </form>

          <div className="space-y-6">
            {reviews.map((r) => (
              <div key={r.id} className="bg-white p-4 rounded shadow">
                <div className="flex justify-between items-center mb-1">
                  <strong>{r.name}</strong>
                  <span className="text-yellow-500">
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </span>
                </div>
                <p className="text-gray-700">{r.message}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
