"use client";

import AdminLayout from '@/components/AdminLayout';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import NextImage from 'next/image';
import axios from 'axios';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AddProductPage() {
  useAdminGuard();
  const router = useRouter();

  const [product, setProduct] = useState({
    name: '',
    category: '',
    subcategory: '',
    description: '',
    ingredients: '',
    image: null as File | null,
  });

  const [variants, setVariants] = useState([
    { size: '', price: '', netWeight: '' }
  ]);

  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [nameTaken, setNameTaken] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const fetchMetadata = async () => {
      const { data } = await supabase.from('products').select('name, category, subcategory');
      if (data) {
        setExistingNames(data.map(p => p.name.toLowerCase()));
        setCategories([...new Set(data.map(p => p.category))]);
        setSubcategories([...new Set(data.map(p => p.subcategory))]);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    setNameTaken(existingNames.includes(product.name.toLowerCase()));
  }, [product.name, existingNames]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleVariantChange = (index: number, field: string, value: string) => {
    setVariants(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleAddVariant = () => {
    setVariants(prev => [...prev, { size: '', price: '', netWeight: '' }]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const convertedFile = new File([blob], `${file.name.split('.')[0]}.png`, { type: 'image/png' });
            setProduct(prev => ({ ...prev, image: convertedFile }));
            setImagePreview(URL.createObjectURL(convertedFile));
          }
        }, 'image/png');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback('');
    console.log('[SUBMIT] Starting product submission...');

    const { name, category, subcategory, image, description, ingredients } = product;

    if (!name || !category || !subcategory || variants.some(v => !v.size || !v.price)) {
      setFeedback('Please fill out all required fields.');
      return;
    }

    if (nameTaken) {
      setFeedback('A product with this name already exists.');
      return;
    }

    let imageUrl = '';
    if (image) {
      const fileName = `${Date.now()}-${image.name}`;
      const filePath = `${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, image);

      if (uploadError) {
        setFeedback('Image upload failed.');
        return;
      }

      imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${filePath}`;
    }

    try {
      console.log('[SUBMIT] Inserting base product into Supabase...');
      const { data: productInsert, error: insertError } = await supabase
        .from('products')
        .insert([{
          name,
          price: parseFloat(variants[0].price),
          category,
          subcategory,
          slug: generateSlug(name),
          image: imageUrl || null,
          description,
          ingredients: ingredients ? ingredients.split(',').map(i => i.trim()) : [],
          inStock: true,
        }])
        .select();

      if (insertError || !productInsert) {
        setFeedback('Error adding product: ' + insertError?.message);
        return;
      }

      const productId = productInsert[0].id;
      console.log('[SUBMIT] Product inserted with ID:', productId);

      if (variants.length === 1) {
        const variant = variants[0];
        console.log(`[STRIPE] Creating product for variant size: ${variant.size}, price: $${variant.price}`);

        // Get auth headers for admin API call
        const { data: { session } } = await supabase.auth.getSession();
        const authHeaders: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (session?.access_token) {
          authHeaders['Authorization'] = `Bearer ${session.access_token}`;
        }

        const stripeRes = await axios.post('/api/create-stripe-product', {
          name,
          price: parseFloat(variant.price),
        }, {
          headers: authHeaders,
        });

        console.log('[STRIPE] Response:', stripeRes.data);

        const stripe_price_id = stripeRes.data?.stripe_price_id;

        if (stripe_price_id) {
          const { error: updateError } = await supabase
            .from('products')
            .update({
              stripe_price_id,
              netWeight: variant.netWeight ? parseFloat(variant.netWeight) : null,
            })
            .eq('id', productId);

          if (updateError) {
            console.error('Failed to update product with stripe_price_id:', updateError);
          }
        }
      } else {
        // Get auth headers once for all variant calls
        const { data: { session } } = await supabase.auth.getSession();
        const authHeaders: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (session?.access_token) {
          authHeaders['Authorization'] = `Bearer ${session.access_token}`;
        }

        for (const variant of variants) {
          const stripeRes = await axios.post('/api/create-stripe-product', {
            name: `${name} (${variant.size})`,
            price: parseFloat(variant.price),
          }, {
            headers: authHeaders,
          });

          const stripe_price_id = stripeRes.data?.stripe_price_id;

          if (!stripe_price_id) {
            console.error('Stripe error:', stripeRes);
            continue;
          }

          const { error: variantInsertError } = await supabase.from('product_variants').insert([{
            product_id: productId,
            size: variant.size,
            price: parseFloat(variant.price),
            stripe_price_id,
            netWeight: variant.netWeight ? parseFloat(variant.netWeight) : null,
          }]);

          if (variantInsertError) {
            console.error('Variant insert error:', variantInsertError);
          }
        }
      }

      setFeedback('✅ Product and variants added successfully!');
      setProduct({ name: '', category: '', subcategory: '', description: '', ingredients: '', image: null });
      setVariants([{ size: '', price: '', netWeight: '' }]);
      setImagePreview(null);

    } catch (err: any) {
      console.error('Error:', err);
      setFeedback('❌ Failed to add product.');
    }
  };

  return (
    <AdminLayout>
      <main className="min-h-screen bg-[#f5f2e8] text-[#3c2f2f] py-20 px-6 font-garamond">
        <div className="max-w-3xl mx-auto bg-white p-10 rounded-xl shadow-md">
          <h1 className="text-3xl font-bold font-playfair mb-8 text-center">Add New Product</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block mb-1 font-medium">Product Name *</label>
              <input type="text" name="name" value={product.name} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded" />
              {nameTaken && <p className="text-red-500 text-sm mt-1">This name is already taken.</p>}
            </div>

            <div>
              <label className="block mb-1 font-medium">Category *</label>
              <input list="category-list" name="category" value={product.category} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded" />
              <datalist id="category-list">{categories.map((cat, i) => <option key={i} value={cat} />)}</datalist>
            </div>

            <div>
              <label className="block mb-1 font-medium">Subcategory *</label>
              <input list="subcategory-list" name="subcategory" value={product.subcategory} onChange={handleChange} required className="w-full p-3 border border-gray-300 rounded" />
              <datalist id="subcategory-list">{subcategories.map((sub, i) => <option key={i} value={sub} />)}</datalist>
            </div>

            <div>
              <label className="block mb-1 font-medium">Description</label>
              <textarea name="description" value={product.description} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded" />
            </div>

            <div>
              <label className="block mb-1 font-medium">Ingredients (comma separated)</label>
              <input type="text" name="ingredients" value={product.ingredients} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded" />
            </div>

            <div>
              <label className="block mb-2 font-medium">Product Image (optional)</label>
              <label className="block border-2 border-dashed border-gray-400 p-4 text-center cursor-pointer bg-gray-50 hover:bg-gray-100 rounded-md transition">
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                {product.image ? product.image.name : "Click to choose an image"}
              </label>
              {imagePreview && <div className="mt-4"><NextImage src={imagePreview} alt="Preview" width={200} height={200} className="rounded-lg object-cover" /></div>}
            </div>

            <div>
              <label className="block mb-2 font-semibold text-lg">Product Variants *</label>
              {variants.map((v, i) => (
                <div key={i} className="flex items-center gap-4 mb-2">
                  <input type="text" placeholder="Size" value={v.size} onChange={e => handleVariantChange(i, 'size', e.target.value)} className="w-1/4 border p-2 rounded" required />
                  <input type="text" placeholder="Price ($)" value={v.price} onChange={e => handleVariantChange(i, 'price', e.target.value)} className="w-1/4 border p-2 rounded" required />
                  <input type="text" placeholder="Net Weight (oz)" value={v.netWeight} onChange={e => handleVariantChange(i, 'netWeight', e.target.value)} className="w-1/4 border p-2 rounded" />
                  <button type="button" onClick={() => handleRemoveVariant(i)} className="text-red-500">❌</button>
                </div>
              ))}
              <button type="button" onClick={handleAddVariant} className="text-sm text-green-600 mt-2">➕ Add Another Variant</button>
            </div>

            {feedback && (
              <p className={`text-sm ${feedback.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{feedback}</p>
            )}

            <button type="submit" className="bg-[#2f5d50] text-white px-8 py-3 rounded-full hover:bg-[#24493f] transition">
              Add Product
            </button>
          </form>
        </div>
      </main>
    </AdminLayout>
  );
}
