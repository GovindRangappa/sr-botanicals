'use client';

import AdminLayout from '@/components/AdminLayout';
import { useAdminGuard } from '@/hooks/useAdminGuard'; // ✅ NEW
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ReviewApprovals() {
  useAdminGuard(); // ✅ Protect this page

  const [reviews, setReviews] = useState<any[]>([]);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('approved', false)
      .order('created_at', { ascending: false });

    if (!error && data) setReviews(data);
  };

  const handleApprove = async (id: number) => {
    const { error } = await supabase
      .from('reviews')
      .update({ approved: true })
      .eq('id', id);

    if (error) {
      setFeedback('Failed to approve review.');
    } else {
      setFeedback('✅ Review approved!');
      fetchReviews();
    }
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) {
      setFeedback('Failed to delete review.');
    } else {
      setFeedback('✅ Review deleted.');
      fetchReviews();
    }
  };

  return (
    <AdminLayout>
    <>
      <main className="bg-[#f5f2e8] text-[#3c2f2f] py-20 px-6 font-garamond">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center font-playfair">Review Approvals</h1>
          {feedback && <p className="text-center mb-4 text-green-700">{feedback}</p>}

          {reviews.length === 0 ? (
            <p className="text-center text-gray-600">No pending reviews.</p>
          ) : (
            <div className="space-y-6">
              {reviews.map((r) => (
                <div key={r.id} className="bg-white p-4 rounded shadow">
                  <div className="flex justify-between items-center mb-1">
                    <strong>{r.name}</strong>
                    <span className="text-yellow-500">
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">{r.message}</p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleApprove(r.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
    </AdminLayout>
  );
}
