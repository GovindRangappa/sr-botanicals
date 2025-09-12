// hooks/useAdminGuard.ts
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabaseClient';

export function useAdminGuard() {
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

      if (userData?.role !== 'admin') {
        router.push('/admin/login');
      }
    };

    checkAdminAccess();
  }, [router]);
}
