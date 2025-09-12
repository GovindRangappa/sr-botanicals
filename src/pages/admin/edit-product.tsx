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




function VariantEditor({ productId }: { productId: number }) {
  const [variants, setVariants] = useState<any[]>([]);
  const [product, setProduct] = useState<any>({
    name: '',
    category: '',
    subcategory: '',
    description: '',
    ingredients: '',
    image: null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: variantsData } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId);
      if (variantsData) setVariants(variantsData);

      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      if (productData) {
        setProduct({
          name: productData.name || '',
          category: productData.category || '',
          subcategory: productData.subcategory || '',
          description: productData.description || '',
          ingredients: productData.ingredients?.join(', ') || '',
          image: null,
        });
        setImagePreview(productData.image || null);
      }

      const { data: meta } = await supabase.from('products').select('category, subcategory');
      if (meta) {
        setCategories([...new Set(meta.map(p => p.category))]);
        setSubcategories([...new Set(meta.map(p => p.subcategory))]);
      }
    };

    fetchData();
  }, [productId]);

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setProduct(prev => ({ ...prev, image: file }));
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  const handleVariantChange = (index: number, field: string, value: string) => {
    setVariants(prev =>
      prev.map((v, i) =>
        i === index ? { ...v, [field]: field === 'price' ? parseFloat(value) : value } : v
      )
    );
  };

  const handleAddVariant = () => {
    setVariants(prev => [...prev, { id: null, size: '', price: '', product_id: productId }]);
  };

  const handleDeleteVariant = async (index: number) => {
    const variant = variants[index];
    if (variant.id) {
      const { error } = await supabase.from('product_variants').delete().eq('id', variant.id);
      if (error) {
        setFeedback('❌ Failed to delete variant.');
        return;
      }
    }
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');

  const handleSave = async () => {
    setFeedback('');

    // Update parent product
    const updates: any = {
      name: product.name,
      category: product.category,
      subcategory: product.subcategory,
      description: product.description,
      ingredients: product.ingredients?.split(',').map(i => i.trim()),
      slug: generateSlug(product.name),
    };

    if (product.image) {
      const fileName = `${Date.now()}-${product.image.name}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, product.image);

      if (uploadError) {
        setFeedback('❌ Image upload failed.');
        return;
      }

      updates.image = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${fileName}`;
    }

    const { error: productError } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId);

    if (productError) {
      setFeedback(`❌ Failed to update product info: ${productError.message}`);
      return;
    }

    // Update/Add variants
    for (const variant of variants) {
      const { id, size, price } = variant;
      if (!size || price === '') {
        setFeedback('❌ Size and price are required for all variants.');
        return;
      }

      if (id) {
        const { error } = await supabase
          .from('product_variants')
          .update({ size, price })
          .eq('id', id);
        if (error) {
          setFeedback('❌ Failed to update one or more variants.');
          return;
        }
      } else {
        const { error } = await supabase
          .from('product_variants')
          .insert({ size, price, product_id: productId });
        if (error) {
          setFeedback('❌ Failed to add one or more new variants.');
          return;
        }
      }
    }

    setFeedback('✅ Product and variants updated successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Product Fields */}
        <div>
          <label className="block mb-1 font-medium">Product Name *</label>
          <input
            type="text"
            name="name"
            value={product.name}
            onChange={handleProductChange}
            required
            className="w-full p-3 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Category *</label>
          <input
            list="category-list"
            name="category"
            value={product.category}
            onChange={handleProductChange}
            required
            className="w-full p-3 border border-gray-300 rounded"
          />
          <datalist id="category-list">
            {categories.map((cat, i) => <option key={i} value={cat} />)}
          </datalist>
        </div>
        <div>
          <label className="block mb-1 font-medium">Subcategory *</label>
          <input
            list="subcategory-list"
            name="subcategory"
            value={product.subcategory}
            onChange={handleProductChange}
            required
            className="w-full p-3 border border-gray-300 rounded"
          />
          <datalist id="subcategory-list">
            {subcategories.map((sub, i) => <option key={i} value={sub} />)}
          </datalist>
        </div>
        <div>
          <label className="block mb-1 font-medium">Ingredients (comma separated)</label>
          <input
            type="text"
            name="ingredients"
            value={product.ingredients}
            onChange={handleProductChange}
            className="w-full p-3 border border-gray-300 rounded"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block mb-1 font-medium">Description</label>
          <textarea
            name="description"
            value={product.description}
            onChange={handleProductChange}
            className="w-full p-3 border border-gray-300 rounded"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block mb-2 font-medium">Product Image</label>
          <label className="block border-2 border-dashed border-gray-400 p-4 text-center cursor-pointer bg-gray-50 hover:bg-gray-100 rounded-md transition">
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            {product.image ? product.image.name : "Click to choose a new image"}
          </label>
          {imagePreview && (
            <div className="mt-4">
              <Image
                src={imagePreview}
                alt="Preview"
                width={200}
                height={200}
                className="rounded-lg object-cover"
              />
            </div>
          )}
        </div>
      </div>

      <hr className="my-6" />

      {/* Variant Editor */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-center mb-4">Edit Variants</h2>

        {variants.map((variant, index) => (
          <div key={variant.id || index} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-100 p-4 rounded relative">
            <div>
              <label className="block mb-1 font-medium">Size</label>
              <input
                type="text"
                value={variant.size}
                onChange={(e) => handleVariantChange(index, 'size', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={variant.price}
                onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <button
              type="button"
              onClick={() => handleDeleteVariant(index)}
              className="absolute top-2 right-2 text-sm text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        ))}

        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={handleAddVariant}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
          >
            + Add Variant
          </button>
          <button
            onClick={handleSave}
            className="bg-[#2f5d50] text-white px-6 py-2 rounded hover:bg-[#24493f] transition"
          >
            Save All
          </button>
        </div>

        {feedback && (
          <p className={`text-sm mt-2 text-center ${feedback.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
}








export default function EditProduct() {
  useAdminGuard();

  const [search, setSearch] = useState('');
  const [allProducts, setAllProducts] = useState<{ id: number; name: string }[]>([]);
  const [filtered, setFiltered] = useState<{ id: number; name: string }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [product, setProduct] = useState<any>({
    name: '',
    price: '',
    netWeight: '',
    category: '',
    subcategory: '',
    description: '',
    ingredients: '',
    image: null as File | null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [hasVariants, setHasVariants] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: names } = await supabase.from('products').select('id, name');
      const { data: meta } = await supabase.from('products').select('category, subcategory');
      if (names) {
        setAllProducts(names);
        setFiltered(names);
      }
      if (meta) {
        setCategories([...new Set(meta.map(p => p.category))]);
        setSubcategories([...new Set(meta.map(p => p.subcategory))]);
      }
    };
    fetchData();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    setFiltered(allProducts.filter(p => p.name.toLowerCase().includes(val.toLowerCase())));
  };

  const handleSelect = async (id: number, name: string) => {
    setSearch(name);
    setFiltered([]);

    const { data: variants } = await supabase.from('product_variants').select('*').eq('product_id', id);
    setHasVariants(!!variants?.length);

    if (!variants?.length) {
      const { data } = await supabase.from('products').select('*').eq('id', id).single();
      if (data) {
        setSelectedProduct(data);
        setProduct({
          name: data.name || '',
          price: data.price?.toString() || '',
          category: data.category || '',
          subcategory: data.subcategory || '',
          description: data.description || '',
          ingredients: data.ingredients?.join(', ') || '',
          netWeight: data.netWeight?.toString() || '',
          image: null,
        });
        setImagePreview(data.image || null);
      }
    } else {
      const { data } = await supabase.from('products').select('*').eq('id', id).single();
      if (data) setSelectedProduct(data);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Restrict price and netWeight to valid decimal numbers only
    if ((name === 'price' || name === 'netWeight') && value !== '' && !/^[0-9]*\.?[0-9]*$/.test(value)) return;

    setProduct(prev => ({ ...prev, [name]: value }));
  };


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setProduct(prev => ({ ...prev, image: file }));
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback('');
    if (!selectedProduct) return;

    const updates: any = {
      name: product.name,
      price: parseFloat(product.price),
      category: product.category,
      subcategory: product.subcategory,
      description: product.description,
      ingredients: product.ingredients?.split(',').map(i => i.trim()),
      slug: generateSlug(product.name),
    };

    if (product.image) {
      if (selectedProduct.image) {
        const segments = selectedProduct.image.split('/');
        const oldFileName = segments[segments.length - 1].split('?')[0];
        await supabase.storage.from('product-images').remove([oldFileName]);
      }

      const fileName = `${Date.now()}-${product.image.name}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, product.image);

      if (uploadError) {
        setFeedback('❌ Image upload failed.');
        return;
      }

      updates.image = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${fileName}`;
    }

    const { error: updateError } = await supabase
      .from('products')
      .update(updates)
      .eq('id', selectedProduct.id);

    setFeedback(updateError ? `❌ ${updateError.message}` : '✅ Product updated successfully!');
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    if (!confirm(`Are you sure you want to delete "${selectedProduct.name}"?`)) return;

    try {
      // Delete associated image using backend API
      if (selectedProduct.image) {
        const res = await fetch('/api/admin/delete-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: selectedProduct.image })
        });

        const result = await res.json();
        if (!res.ok) {
          console.warn('⚠️ Image delete error:', result.error);
        } else {
          console.log('🗑️ Image deleted:', result.message);
        }
      }

      // Optional: Delete from Stripe
      if (selectedProduct.stripe_price_id) {
        try {
          const res = await fetch('/api/delete-stripe-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stripe_price_id: selectedProduct.stripe_price_id })
          });

          const result = await res.json();
          console.log('[FRONTEND] Stripe delete response:', result);
          if (!res.ok) console.error('[FRONTEND] Stripe delete failed:', result.error);
        } catch (err) {
          console.error('[FRONTEND] Network or unexpected error:', err);
        }
      }

      // Delete product from Supabase
      const { error } = await supabase.from('products').delete().eq('id', selectedProduct.id);
      if (error) {
        setFeedback('❌ Failed to delete product: ' + error.message);
      } else {
        setFeedback('✅ Product deleted successfully.');
        setSelectedProduct(null);
        setProduct({ name: '', price: '', category: '', subcategory: '', description: '', ingredients: '', image: null });
        setImagePreview(null);
        setSearch('');
      }
    } catch (err: any) {
      console.error('❌ Error in deletion:', err.message);
      setFeedback(`❌ ${err.message}`);
    }
  };


  return (
    <AdminLayout>
      <main className="min-h-screen bg-[#f5f2e8] text-[#3c2f2f] py-20 px-6 font-garamond">
        <div className="max-w-3xl mx-auto bg-white p-10 rounded-xl shadow-md">
          <h1 className="text-3xl font-bold font-playfair mb-8 text-center">Edit Product</h1>
          <div className="mb-6">
            <label className="block mb-1 font-medium">Search Product to Edit</label>
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              className="w-full p-3 border border-gray-300 rounded"
              placeholder="Start typing a product name..."
            />
            {filtered.length > 0 && (
              <ul className="border border-gray-300 rounded mt-1 bg-white max-h-40 overflow-auto z-10">
                {filtered.map(p => (
                  <li
                    key={p.id}
                    onClick={() => handleSelect(p.id, p.name)}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {p.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {hasVariants === false && selectedProduct && (
            <form onSubmit={handleUpdate} className="space-y-6">
              <div>
                <label className="block mb-1 font-medium">Product Name *</label>
                <input
                  type="text"
                  name="name"
                  value={product.name}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">Price ($)*</label>
                <input
                  type="text"
                  name="price"
                  value={product.price}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">Net Weight (oz)*</label>
                <input
                  type="text"
                  name="netWeight"
                  value={product.netWeight}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">Category *</label>
                <input
                  list="category-list"
                  name="category"
                  value={product.category}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded"
                />
                <datalist id="category-list">
                  {categories.map((cat, i) => <option key={i} value={cat} />)}
                </datalist>
              </div>

              <div>
                <label className="block mb-1 font-medium">Subcategory *</label>
                <input
                  list="subcategory-list"
                  name="subcategory"
                  value={product.subcategory}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded"
                />
                <datalist id="subcategory-list">
                  {subcategories.map((sub, i) => <option key={i} value={sub} />)}
                </datalist>
              </div>

              <div>
                <label className="block mb-1 font-medium">Description</label>
                <textarea
                  name="description"
                  value={product.description}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">Ingredients (comma separated)</label>
                <input
                  type="text"
                  name="ingredients"
                  value={product.ingredients}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">Product Image</label>
                <label className="block border-2 border-dashed border-gray-400 p-4 text-center cursor-pointer bg-gray-50 hover:bg-gray-100 rounded-md transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  {product.image ? product.image.name : "Click to choose a new image"}
                </label>
                {imagePreview && (
                  <div className="mt-4">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      width={200}
                      height={200}
                      className="rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>

              {feedback && (
                <p className={`text-sm ${feedback.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
                  {feedback}
                </p>
              )}

              <div className="flex gap-4">
                <button type="submit" className="bg-[#2f5d50] text-white px-6 py-2 rounded hover:bg-[#24493f] transition">
                  Update Product
                </button>
                <button type="button" onClick={handleDelete} className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition">
                  Delete Product
                </button>
              </div>
            </form>
          )}


          {hasVariants === true && selectedProduct && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-center">Edit Variants for {selectedProduct.name}</h2>

              {selectedProduct.id && (
                <VariantEditor productId={selectedProduct.id} />
              )}
            </div>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}
