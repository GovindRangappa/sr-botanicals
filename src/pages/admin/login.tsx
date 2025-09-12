'use client';

import NavBar from '@/components/NavBar';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabaseClient';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return setError('Invalid email or password.');
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (userError || !userData) {
      return setError('Your account is not recognized as an admin.');
    }

    if (userData.role === 'admin') {
      router.push('/admin/logout');
    } else {
      setError('You are not authorized to access admin pages.');
    }
  };

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-[#f5f2e8] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white p-6 rounded-md shadow-md">
          <h1 className="text-2xl font-bold mb-6 text-center text-[#3c2f2f] font-['Playfair_Display']">
            Admin Login
          </h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-4 text-[#3c2f2f] font-[Playfair_Display]">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2f5d50]"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2f5d50]"
              required
            />
            {error && <p className="text-red-600 text-sm text-center">{error}</p>}
            <button
              type="submit"
              className="bg-[#2f5d50] text-white py-2 rounded hover:bg-[#24493f] transition-all"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
