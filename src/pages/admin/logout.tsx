'use client';

import AdminLayout from '@/components/AdminLayout';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabaseClient';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdminAccess = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push('/admin/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userData?.role === 'admin') {
        setAuthorized(true);
      } else {
        router.push('/admin/login');
      }

      setLoading(false);
    };

    checkAdminAccess();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return <p className="text-center mt-24">Checking permissions...</p>;
  if (!authorized) return null;

  return (
    <AdminLayout>
    <div className="max-w-4xl mx-auto mt-24">
      <h1 className="text-3xl font-bold mb-6">Welcome Admin</h1>
      <p className="text-gray-600 mb-4">You have full access to manage products and orders.</p>
      <button
        onClick={handleLogout}
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>
    </AdminLayout>
  );
}
