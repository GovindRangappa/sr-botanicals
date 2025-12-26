'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ManualOrderForm({ onClose }: { onClose: () => void }) {
  console.log('📄 ManualOrderForm component rendered');
  
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    shippingType: '',
    shippingRateId: '',
    shippingMethod: '',
    shipmentId: '',
    paymentMethod: '',
    paid: false,
    fulfilled: false,
  });
  const [errors, setErrors] = useState<any>({});
  const [rates, setRates] = useState<any[]>([]);
  const [bestRateId, setBestRateId] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [shippingType, setShippingType] = useState('');
  const autocompleteRef = useRef<HTMLInputElement | null>(null);
  const [subtotal, setSubtotal] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);



  const isFormValid =
    formData.email.trim() !== '' &&
    formData.firstName.trim() !== '' &&
    formData.lastName.trim() !== '' &&
    /^\+?[0-9\s().-]{7,20}$/.test(formData.phone.trim()) &&
    formData.shippingType !== '' &&
    formData.paymentMethod !== '' &&
    (
        formData.shippingType !== 'paid' || formData.shippingRateId !== ''
    );


  useEffect(() => {
    const newSubtotal = selectedProducts.reduce((acc, prod) => {
        return acc + (prod.price * prod.quantity);
    }, 0);
    setSubtotal(newSubtotal);
  }, [selectedProducts]);



  useEffect(() => {
    const fetchProducts = async () => {
    const { data: products } = await supabase.from('products').select();
    const { data: variants } = await supabase.from('product_variants').select();

    const combined = [];

    for (const product of products || []) {
        const productVariants = variants?.filter(v => v.product_id === product.id) || [];

        if (product.stripe_price_id) {
        combined.push({
            id: product.id,
            name: product.name,
            size: null,
            price: product.price,
            stripe_price_id: product.stripe_price_id,
        });
        } else {
        for (const variant of productVariants) {
            combined.push({
            id: variant.id,
            name: product.name,
            size: variant.size,
            price: variant.price,
            stripe_price_id: variant.stripe_price_id,
            });
        }
        }
    }

    setAllProducts(combined);
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    // Only initialize if paid shipping is selected
    if (shippingType !== 'paid') return;

    function initAutocomplete() {
      console.log('🔍 ManualOrderForm initAutocomplete called', {
        hasGoogleMaps: !!window.google?.maps?.places,
        hasRef: !!autocompleteRef.current,
        shippingType: shippingType
      });

      if (!window.google?.maps?.places || !autocompleteRef.current) {
        console.log('❌ Cannot initialize - missing requirements');
        return;
      }

      console.log('✅ Initializing Google Places Autocomplete in ManualOrderForm');
      const autocomplete = new window.google.maps.places.Autocomplete(autocompleteRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
      });

      console.log('✅ Autocomplete instance created in ManualOrderForm');

      autocomplete.addListener('place_changed', () => {
        console.log('📍 Place selected from autocomplete in ManualOrderForm');
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

        setFormData(prev => ({
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

    console.log('🚀 ManualOrderForm useEffect running for shippingType:', shippingType);

    // Wait for Google Maps script to load (using correct event name)
    window.addEventListener('googleMapsLoaded', initAutocomplete);

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
      console.log('🧹 Cleaning up autocomplete effect in ManualOrderForm');
      window.removeEventListener('googleMapsLoaded', initAutocomplete);
    };
  }, [shippingType]);

  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addProduct = (product: any) => {
    const existing = selectedProducts.find(
        p => p.name === product.name && p.size === product.size
    );

    if (existing) {
        setSelectedProducts(selectedProducts.map(p =>
        p.name === product.name && p.size === product.size
            ? { ...p, quantity: p.quantity + 1 }
            : p
        ));
    } else {
        setSelectedProducts([...selectedProducts, {
        id: product.id,
        name: product.name,
        size: product.size,
        quantity: 1,
        price: product.price,
        }]);
    }

    setSearchTerm('');
    setShowDropdown(false);
  };


  const deleteProduct = (id: number) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== id));
  };

  const fetchRates = async () => {
    try {
      const res = await fetch('/api/get-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: {
            name: `${formData.firstName} ${formData.lastName}`,
            street: formData.street,
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
          },
          weightOz: selectedProducts.length * 20,
        }),
      });

      const data = await res.json();

      if (!data || !Array.isArray(data.rates)) {
        console.error("❌ Invalid shipping rates response from /api/get-rates:", data);
        setRates([]);
        return;
      }

      const paidRates = data.rates.filter((rate: any) => Number(rate.amount) > 0);
      setRates(paidRates);
      setBestRateId(data.bestValueId || '');
      setFormData(prev => ({ ...prev, shipmentId: data.shipmentId }));

    } catch (err) {
      console.error("❌ Error fetching rates:", err);
      setRates([]);
    }
  };


  const groupedRates = rates.reduce((acc: any, rate: any) => {
    if (!acc[rate.provider]) acc[rate.provider] = [];
    acc[rate.provider].push(rate);
    return acc;
  }, {});


  const handleSubmit = async () => {
    console.log('📦 Selected Shipping Type:', formData.shippingType);
    console.log('📦 Selected Shipping Rate ID:', formData.shippingRateId);
    console.log('📦 All Available Rates:', rates);

    const subtotal = selectedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);
    const tax = subtotal * 0.0825;
    const shippingCost =
        formData.shippingType === 'paid'
        ? Number(rates.find(r => r.id === formData.shippingRateId)?.amount || 0)
        : 0;

    console.log('✅ Calculated Shipping Cost:', shippingCost);

    const products = selectedProducts.map(p => ({
        name: p.name,
        size: p.size ?? null,
        quantity: p.quantity,
        price: p.price,
    }));


    const selectedRate = rates.find(r => r.id === formData.shippingRateId);


    console.log('📤 Submitting Order with shipping_method:', selectedRate ? `${selectedRate.provider} ${selectedRate.servicelevel?.name}` : formData.shippingMethod);
    console.log('📦 Selected Rate object:', selectedRate);

    const { data, error } = await supabase
        .from('orders')
        .insert([
        {
            customer_email: formData.email,
            first_name: formData.firstName,
            last_name: formData.lastName,
            products,
            subtotal,
            tax,
            shipping_cost: shippingCost,
            shipment_id: formData.shipmentId ?? null, // ✅ added
            shipping_method: selectedRate ? `${selectedRate.provider} ${selectedRate.servicelevel}` : formData.shippingMethod,
            shipping_name: `${formData.firstName} ${formData.lastName}`,
            shipping_street1: formData.street,
            shipping_city: formData.city,
            shipping_state: formData.state,
            shipping_zip: formData.zip,
            status: formData.paid ? 'paid' : 'unpaid',
            fulfillment_status: formData.fulfilled ? 'fulfilled' : 'unfulfilled',
            payment_method: formData.paymentMethod,
        },
        ])
        .select()
        .single();

    if (error) {
        alert('❌ Failed to submit order');
        console.error(error);
        return;
    }

    try {
        const { data: existingCustomer, error: customerLookupError } = await supabase
            .from('customers')
            .select('id, first_name, last_name, phone')
            .eq('email', formData.email)
            .single();

        if (customerLookupError && customerLookupError.code !== 'PGRST116') {
            throw customerLookupError;
        }

        if (!existingCustomer) {
            const { error: insertCustomerError } = await supabase.from('customers').insert([
                {
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    email: formData.email,
                    phone: formData.phone,
                },
            ]);

            if (insertCustomerError) {
                console.error('❗ Failed to insert customer record', insertCustomerError);
            }
        } else {
            const updates: Record<string, string> = {};

            if (!existingCustomer.first_name && formData.firstName) {
                updates.first_name = formData.firstName;
            }
            if (!existingCustomer.last_name && formData.lastName) {
                updates.last_name = formData.lastName;
            }
            if (formData.phone && formData.phone !== (existingCustomer as any).phone) {
                updates.phone = formData.phone;
            }

            if (Object.keys(updates).length > 0) {
                const { error: updateCustomerError } = await supabase
                    .from('customers')
                    .update(updates)
                    .eq('id', existingCustomer.id);

                if (updateCustomerError) {
                    console.error('❗ Failed to update customer record', updateCustomerError);
                }
            }
        }
    } catch (customerSyncError) {
        console.error('❗ Customer sync error:', customerSyncError);
    }

    // 🔁 Create Stripe invoice for both cash and card orders
    const invoicePayload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        products,
        shipping_cost: shippingCost,
        tax,
        orderId: data.id,
        mark_as_paid: formData.paymentMethod === 'cash', // ✅ Mark cash invoices as paid
    };

    console.log('🛒 Invoice payload being sent:', invoicePayload);

    const invoiceRes = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload),
    });

    const invoiceResult = await invoiceRes.json();

    if (!invoiceRes.ok) {
        console.error('❌ Failed to generate Stripe invoice', invoiceResult);
        alert('Order saved, but failed to generate invoice');
    } else {
        if (invoiceResult.hostedInvoiceUrl) {
        window.open(invoiceResult.hostedInvoiceUrl, '_blank');
        alert(
            formData.paymentMethod === 'cash'
            ? `✅ Cash order saved and receipt generated!\nInvoice: ${invoiceResult.hostedInvoiceUrl}`
            : `✅ Order and invoice sent!\nInvoice: ${invoiceResult.hostedInvoiceUrl}`
        );
        } else {
        alert('✅ Order saved, but invoice link is missing');
        }
    }

    onClose();
    }; 


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-[#f5f2e8] p-6 rounded-xl shadow-lg w-full max-w-3xl relative font-['Playfair_Display'] text-[#3c2f2f] max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-xl">×</button>
        <h2 className="text-2xl font-semibold text-center mb-4">Create Manual Order</h2>

        <div className="mb-4">
            <label className="block mb-1 font-semibold">
                Email <span className="text-red-600">*</span>
            </label>
            <input
                required
                className="border p-2 rounded w-full"
                placeholder="Email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
        </div>

        <div className="mb-4">
            <label className="block mb-1 font-semibold">
                Phone Number <span className="text-red-600">*</span>
            </label>
            <input
                required
                className="border p-2 rounded w-full"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
            <label className="block mb-1 font-semibold">
                First Name <span className="text-red-600">*</span>
            </label>
            <input
                required
                className="border p-2 rounded w-full"
                placeholder="First Name"
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
            />
        </div>
        <div>
            <label className="block mb-1 font-semibold">
                Last Name <span className="text-red-600">*</span>
            </label>
            <input
                required
                className="border p-2 rounded w-full"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
            />
        </div>
        </div>


        <h3 className="mt-2 mb-1 font-semibold">Products</h3>
        <input
          type="text"
          className="border p-2 rounded w-full mb-2"
          value={searchTerm}
          placeholder="Search products..."
          onChange={e => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        />
        {showDropdown && (
          <div className="border rounded bg-white shadow-md max-h-40 overflow-y-auto">
            {filteredProducts.map(p => (
                <div
                    key={`${p.name}-${p.size || ''}`}
                    onClick={() => addProduct(p)}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                    {p.name}{p.size ? ` – ${p.size}` : ''}
                </div>
                ))}
          </div>
        )}

        {selectedProducts.length > 0 && (
          <div className="mb-4">
            <div className="grid grid-cols-4 gap-2 font-semibold text-sm mb-1">
              <div>Product</div>
              <div>Qty</div>
              <div>Price</div>
              <div></div>
            </div>
            {selectedProducts.map((prod, index) => (
              <div key={index} className="grid grid-cols-4 gap-2 mb-2 items-center">
                <input value={`${prod.name}${prod.size ? ` – ${prod.size}` : ''}`} className="border p-2 rounded" disabled />
                <input type="number" value={prod.quantity} className="border p-2 rounded" onChange={e => {
                  const updated = [...selectedProducts];
                  updated[index].quantity = Number(e.target.value);
                  setSelectedProducts(updated);
                }} />
                <input type="number" value={prod.price} className="border p-2 rounded" onChange={e => {
                  const updated = [...selectedProducts];
                  updated[index].price = Number(e.target.value);
                  setSelectedProducts(updated);
                }} />
                <button onClick={() => deleteProduct(prod.id)} className="text-red-600 font-bold">X</button>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Shipping Type</label>
          <select
            value={shippingType}
            onChange={e => {
                const value = e.target.value;
                setShippingType(value);
                setFormData(prev => ({ ...prev, shippingType: value }));
            }}
            className="border p-2 rounded w-full"
            >
            <option value="">Select Shipping Type</option>
            <option value="paid">Paid Shipping</option>
            <option value="local pickup">Local Pickup</option>
            <option value="hand delivery">Hand Delivery (In Person)</option>
          </select>
        </div>

        {shippingType === 'paid' && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input ref={autocompleteRef} className="border p-2 rounded w-full col-span-2" placeholder="Street Address" />
            <input className="border p-2 rounded w-full" placeholder="City" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
            <input className="border p-2 rounded w-full" placeholder="State" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} />
            <input className="border p-2 rounded w-full col-span-2" placeholder="ZIP Code" value={formData.zip} onChange={e => setFormData({ ...formData, zip: e.target.value })} />
          </div>
        )}


        <div className="mb-4">
            <label className="block mb-1 font-semibold">Payment Method</label>
            <select
                className="border p-2 rounded w-full"
                value={formData.paymentMethod}
                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
            >
                <option value="">Select payment method</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
            </select>
        </div>



        <div className="flex items-center gap-4 mt-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={formData.paid} onChange={e => setFormData({ ...formData, paid: e.target.checked })} /> Paid
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={formData.fulfilled} onChange={e => setFormData({ ...formData, fulfilled: e.target.checked })} /> Fulfilled
          </label>
        </div>

        {shippingType === 'paid' && (
            <button
            onClick={fetchRates}
            className="mt-6 bg-[#2f5d50] hover:bg-[#24493f] text-white px-6 py-3 rounded-full"
            >
            Get Shipping Rates
            </button>
        )}

        {rates.length > 0 && (
          <div className="mt-6 space-y-4">
            {Object.entries(groupedRates).map(([provider, rates]) => (
              <div key={provider}>
                <h4 className="text-sm font-semibold uppercase mb-1">{provider}</h4>
                {rates.map((rate: any) => (
                  <label key={rate.id} className="block">
                    <input
                      type="radio"
                      name="shippingRate"
                      value={rate.id}
                      checked={formData.shippingRateId === rate.id}
                      onChange={e => {

                        console.log('🔍 Selected Rate Object:', rate);
                        console.log('🔍 rate.provider:', rate.provider);
                        console.log('🔍 rate.servicelevel:', rate.servicelevel);
                        console.log('🔍 rate.servicelevel.name:', rate.servicelevel?.name);
                        setFormData({
                            ...formData,
                            shippingRateId: e.target.value,
                            shippingMethod: `${rate.provider} ${rate.servicelevel}`,  // ✅ Proper string
                        });
                        setShippingCost(Number(rate.amount));
                     }}
                      className="mr-2 accent-[#2f5d50]"
                    />
                    {rate.servicelevel} – ${rate.amount}
                    {rate.id === bestRateId && (
                      <span className="ml-2 bg-green-100 text-green-700 px-2 py-1 text-xs rounded-full font-semibold">
                        🌿 Best Value
                      </span>
                    )}
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}


        {/* Order Summary */}
        {selectedProducts.length > 0 && (
        <div className="bg-white rounded-lg p-4 mt-6 shadow border text-sm">
            <h3 className="font-semibold text-md mb-3">Order Summary</h3>
            <ul className="mb-3">
            {selectedProducts.map((prod, i) => (
                <li key={i} className="flex justify-between">
                <span>{prod.name}{prod.size ? ` – ${prod.size}` : ''} (x{prod.quantity})</span>
                <span>${(prod.price * prod.quantity).toFixed(2)}</span>
                </li>
            ))}
            </ul>
            <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
            <span>Sales Tax (8.25%):</span>
            <span>${(subtotal * 0.0825).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
            <span>Shipping:</span>
            <span>${shippingCost.toFixed(2)}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-semibold">
            <span>Total:</span>
            <span>${(subtotal + subtotal * 0.0825 + shippingCost).toFixed(2)}</span>
            </div>
        </div>
        )}


        <div className="text-center mt-6">
          <button
            disabled={!isFormValid}
            onClick={handleSubmit}
            className={`bg-[#2f5d50] text-white px-4 py-2 rounded hover:bg-[#24493f] w-full ${
                !isFormValid ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            >
            Submit Order
          </button>

        </div>
      </div>
    </div>
  );
}
