// app/admin/manual-order.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Script from 'next/script';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ManualOrderEntry() {
  const router = useRouter();

  const [products, setProducts] = useState([{ name: '', quantity: 1, price: 0 }]);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });
  const [shipping, setShipping] = useState({
    method: '',
    name: '',
    street: '',
    city: '',
    state: '',
    zip: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [fulfilled, setFulfilled] = useState(false);
  const [message, setMessage] = useState('');
  const autocompleteRef = useRef<HTMLInputElement | null>(null);

  const addProduct = () => {
    setProducts([...products, { name: '', quantity: 1, price: 0 }]);
  };

  const updateProduct = (i: number, key: string, value: any) => {
    const updated = [...products];
    (updated[i] as any)[key] = value;
    setProducts(updated);
  };

  const removeProduct = (i: number) => {
    const updated = [...products];
    updated.splice(i, 1);
    setProducts(updated);
  };

  const subtotal = products.reduce(
    (sum, p) => sum + p.price * p.quantity,
    0
  );
  const tax = +(subtotal * 0.0825).toFixed(2);
  const shippingCost = ['local_pickup', 'hand_delivery'].includes(shipping.method)
    ? 0
    : 5; // or dynamically set if needed

  const total = +(subtotal + tax + shippingCost).toFixed(2);

  useEffect(() => {
    function initAutocomplete() {
      console.log('🔍 initAutocomplete called', {
        hasGoogleMaps: !!window.google?.maps?.places,
        hasRef: !!autocompleteRef.current,
        shippingMethod: shipping.method
      });

      if (!window.google?.maps?.places || !autocompleteRef.current) {
        console.log('❌ Cannot initialize - missing requirements');
        return;
      }
      if (shipping.method !== "paid_shipping") {
        console.log('❌ Cannot initialize - wrong shipping method');
        return;
      }

      console.log('✅ Initializing Google Places Autocomplete');
      const autocomplete = new window.google.maps.places.Autocomplete(autocompleteRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
      });

      console.log('✅ Autocomplete instance created');

      autocomplete.addListener('place_changed', () => {
        console.log('📍 Place selected from autocomplete');
        const place = autocomplete.getPlace();
        if (!place.address_components) return;

        const addressComponents: any = {
          street: '',
          city: '',
          state: '',
          zip: '',
        };

        place.address_components.forEach(component => {
          const types = component.types;
          if (types.includes('street_number')) addressComponents.street = component.long_name;
          if (types.includes('route')) addressComponents.street += ` ${component.long_name}`;
          if (types.includes('locality')) addressComponents.city = component.long_name;
          if (types.includes('administrative_area_level_1')) addressComponents.state = component.short_name;
          if (types.includes('postal_code')) addressComponents.zip = component.long_name;
        });

        setShipping(prev => ({
          ...prev,
          street: addressComponents.street.trim(),
          city: addressComponents.city,
          state: addressComponents.state,
          zip: addressComponents.zip,
        }));

        if (autocompleteRef.current) {
          autocompleteRef.current.value = `${addressComponents.street.trim()}, ${addressComponents.city}, ${addressComponents.state}, ${addressComponents.zip}`;
        }
      });
    }

    // Only initialize if paid_shipping is selected
    if (shipping.method !== "paid_shipping") {
      console.log('⏭️ Skipping autocomplete init - shipping method:', shipping.method);
      return;
    }

    console.log('🚀 useEffect running for paid_shipping, checking initialization...');

    // Wait for Google Maps script to load
    window.addEventListener('googleMapsLoaded', () => {
      console.log('📦 googleMapsLoaded event fired');
      initAutocomplete();
    });

    // Also check if already loaded
    if (window.google?.maps?.places && autocompleteRef.current) {
      console.log('⏱️ Google Maps already loaded, initializing with delay...');
      // Small delay to ensure DOM is ready after conditional render
      const timeoutId = setTimeout(initAutocomplete, 100);
      return () => clearTimeout(timeoutId);
    } else {
      console.log('⏳ Waiting for Google Maps to load...', {
        hasGoogleMaps: !!window.google?.maps?.places,
        hasRef: !!autocompleteRef.current
      });
    }

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up autocomplete effect');
      window.removeEventListener('googleMapsLoaded', initAutocomplete);
    };
  }, [shipping.method]);

  const handleSubmit = async () => {
    if (!customer.name || !customer.email || products.length === 0) {
      setMessage('Please complete all required fields.');
      return;
    }

    // Map normalized shipping method values to display values for database
    const shippingMethodMap: Record<string, string> = {
      'paid_shipping': 'Paid Shipping',
      'local_pickup': 'Local Pickup',
      'hand_delivery': 'Hand Delivery',
    };
    const shippingMethodDisplay = shippingMethodMap[shipping.method] || shipping.method;

    const { error } = await supabase.from('orders').insert([
      {
        stripe_checkout_id: null,
        status: paymentMethod === 'card' ? 'pending' : 'complete',
        customer_email: customer.email,
        products,
        shipping_method: shippingMethodDisplay,
        shipping_name: shipping.name,
        shipping_street1: shipping.street,
        shipping_city: shipping.city,
        shipping_state: shipping.state,
        shipping_zip: shipping.zip,
        shipping_estimated_days: null,
        subtotal,
        tax,
        shipping_cost: shippingCost,
        fulfillment_status: fulfilled ? 'fulfilled' : 'unfulfilled',
      },
    ]);

    if (error) setMessage('❌ Error creating order: ' + error.message);
    else {
      setMessage('✅ Order created successfully');
      router.refresh();
    }
  };

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <>
      {googleMapsApiKey && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`}
          strategy="afterInteractive"
          onLoad={() => {
            console.log('Google Maps script loaded');
            window.dispatchEvent(new Event('googleMapsLoaded'));
          }}
          onError={() => {
            console.error('Google Maps API failed to load. Please check your API key and ensure Maps JavaScript API and Places API are enabled.');
          }}
        />
      )}
      <div className="max-w-3xl mx-auto p-6 space-y-8 bg-[#f5f2e8] min-h-screen font-garamond">
        <h1 className="text-3xl font-bold text-[#3c2f2f]">Manual Order Entry</h1>

      <section className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Customer Info</h2>
        <input placeholder="Name" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} className="w-full p-2 mb-2 border rounded" />
        <input placeholder="Email" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} className="w-full p-2 mb-2 border rounded" />
        <input placeholder="Phone (optional)" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} className="w-full p-2 border rounded" />
      </section>

      <section className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Products</h2>
        {products.map((p, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input placeholder="Name" value={p.name} onChange={e => updateProduct(i, 'name', e.target.value)} className="flex-1 p-2 border rounded" />
            <input type="number" placeholder="Qty" value={p.quantity} onChange={e => updateProduct(i, 'quantity', +e.target.value)} className="w-20 p-2 border rounded" />
            <input type="number" step="0.01" placeholder="Price" value={p.price} onChange={e => updateProduct(i, 'price', +e.target.value)} className="w-24 p-2 border rounded" />
            <button onClick={() => removeProduct(i)} className="text-red-600">✕</button>
          </div>
        ))}
        <button onClick={addProduct} className="mt-2 px-4 py-1 rounded bg-[#2f5d50] text-white">Add Product</button>
      </section>

      <section className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Shipping</h2>
        <select value={shipping.method} onChange={e => setShipping({ ...shipping, method: e.target.value })} className="w-full p-2 mb-2 border rounded">
          <option value="">Select Shipping Method</option>
          <option value="paid_shipping">Paid Shipping</option>
          <option value="local_pickup">Local Pickup</option>
          <option value="hand_delivery">Hand Delivery</option>
        </select>
        {(shipping.method === "paid_shipping" || shipping.method === "hand_delivery") && (
          <>
            <input placeholder="Recipient Name" value={shipping.name} onChange={e => setShipping({ ...shipping, name: e.target.value })} className="w-full p-2 mb-2 border rounded" />
            {shipping.method === "paid_shipping" && (
              <input 
                ref={autocompleteRef}
                placeholder="Start typing address..."
                className="w-full p-2 mb-2 border rounded"
              />
            )}
            <input placeholder="Street" value={shipping.street} onChange={e => setShipping({ ...shipping, street: e.target.value })} className="w-full p-2 mb-2 border rounded" readOnly />
            <input placeholder="City" value={shipping.city} onChange={e => setShipping({ ...shipping, city: e.target.value })} className="w-full p-2 mb-2 border rounded" readOnly />
            <input placeholder="State" value={shipping.state} onChange={e => setShipping({ ...shipping, state: e.target.value })} className="w-full p-2 mb-2 border rounded" readOnly />
            <input placeholder="ZIP" value={shipping.zip} onChange={e => setShipping({ ...shipping, zip: e.target.value })} className="w-full p-2 border rounded" readOnly />
          </>
        )}
      </section>

      <section className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Payment & Fulfillment</h2>
        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-2 mb-2 border rounded">
          <option value="cash">Paid in Cash</option>
          <option value="card">Paid by Card</option>
        </select>
        <label className="flex items-center space-x-2">
          <input type="checkbox" checked={fulfilled} onChange={e => setFulfilled(e.target.checked)} />
          <span>Mark as Fulfilled</span>
        </label>
      </section>

      <div className="text-right">
        <p className="mb-2 text-[#3c2f2f] font-medium">Subtotal: ${subtotal.toFixed(2)}</p>
        <p className="mb-2 text-[#3c2f2f] font-medium">Tax: ${tax.toFixed(2)}</p>
        <p className="mb-4 text-[#3c2f2f] font-medium">Shipping: ${shippingCost.toFixed(2)}</p>
        <p className="text-xl font-bold text-[#3c2f2f]">Total: ${total.toFixed(2)}</p>
        <button onClick={handleSubmit} className="mt-4 px-6 py-3 rounded bg-[#2f5d50] hover:bg-[#24493f] text-white font-semibold">Submit Order</button>
        {message && <p className="mt-2 text-sm text-[#3c2f2f]">{message}</p>}
      </div>
      </div>
    </>
  );
}
