'use client';

import AdminLayout from '@/components/AdminLayout';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.error('Error getting auth session:', error);
  }
  return headers;
}

export default function StorageCleanup() {
  useAdminGuard();

  const [usedImages, setUsedImages] = useState<Set<string>>(new Set());
  const [storageImages, setStorageImages] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        // Fetch used product image names from DB
        const { data: products, error: productError } = await supabase
          .from('products')
          .select('image');

        if (productError) throw productError;

        const used = new Set(
          products
            .map((p: any) => p.image?.split('/').pop())
            .filter((name: string | undefined) => !!name)
        );

        setUsedImages(used);
        console.log('🟢 Used Images:', Array.from(used));

        // ✅ This version calls your server-side API instead of Supabase directly from the browser
        try {
          const headers = await getAuthHeaders();
          const response = await fetch('/api/admin/list-storage', {
            headers,
          });
          const json = await response.json();

          if (json.error) {
            throw new Error(json.error);
          }

          setStorageImages(json.images || []);
          console.log('🟢 Storage Images (from API route):', json.images?.map((img: any) => img.name));
        } catch (err: any) {
          console.error('❌ Error fetching storage images via API:', err.message);
        }


      } catch (err: any) {
        console.error('❌ Error fetching data:', err.message || err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const toggleSelect = (name: string) => {
    setSelected(prev => {
      const newSet = new Set(prev);
      newSet.has(name) ? newSet.delete(name) : newSet.add(name);
      return newSet;
    });
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${selected.size} selected image(s)?`)) return;

    setDeleting(true);

    try {
      const fileList = Array.from(selected);
      const headers = await getAuthHeaders();

      const response = await fetch('/api/admin/delete-storage', {
        method: 'POST',
        headers,
        body: JSON.stringify({ files: fileList }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Failed to delete files');
      }

      console.log('🗑️ Deleted:', fileList);
      setStorageImages(prev => prev.filter(img => !selected.has(img.name)));
      setSelected(new Set());
    } catch (err: any) {
      console.error('❌ Delete error:', err.message);
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };


  const unusedImages = storageImages.filter(img => !usedImages.has(img.name));

  return (
    <AdminLayout>
      <main className="min-h-screen bg-[#f5f2e8] text-[#3c2f2f] py-10 px-6 font-garamond">
        <h1 className="text-3xl font-bold mb-6">Storage Cleanup</h1>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <p className="mb-4">
              Found <strong>{unusedImages.length}</strong> unused image{unusedImages.length !== 1 ? 's' : ''} in storage.
            </p>

            <button
              onClick={handleDelete}
              disabled={selected.size === 0 || deleting}
              className="mb-6 bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : `Delete Selected (${selected.size})`}
            </button>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {unusedImages.map((img) => (
                <div key={img.name} className="border p-2 rounded">
                  <Image
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${img.name}`}
                    alt={img.name}
                    width={150}
                    height={150}
                    className="rounded object-cover"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs break-words">{img.name}</span>
                    <input
                      type="checkbox"
                      checked={selected.has(img.name)}
                      onChange={() => toggleSelect(img.name)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </AdminLayout>
  );
}
