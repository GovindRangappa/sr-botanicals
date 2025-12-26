// pages/checkout.tsx
'use client';


// stops Next from prerendering this page at build time
export async function getServerSideProps() {
  return { props: {} };
}


import NavBar from '@/components/NavBar';
import { useState, useEffect, useRef } from 'react';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/router';
import Footer from '@/components/Footer';
import Script from 'next/script';

export default function CheckoutPage() {
  const { cart } = useCart();
  const router = useRouter();

  const handleBackToShop = () => {
    router.push('/shop');
  };


  const [shippingInfo, setShippingInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'US', // ✅ required for Shippo
  });

  const [shipmentId, setShipmentId] = useState<string>('');
  const [errors, setErrors] = useState<any>({});
  const [rates, setRates] = useState<any[]>([]);
  const [selectedRate, setSelectedRate] = useState<string>('');
  const [loadingRates, setLoadingRates] = useState(false);
  const [bestRateId, setBestRateId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const autocompleteRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function initAutocomplete() {
      if (!window.google?.maps?.places || !autocompleteRef.current) return;

      const autocomplete = new window.google.maps.places.Autocomplete(autocompleteRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
      });

      autocomplete.addListener('place_changed', () => {
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

        setShippingInfo(prev => ({
          ...prev,
          street: addressComponents.street.trim(),
          city: addressComponents.city,
          state: addressComponents.state,
          zip: addressComponents.zip,
          country: 'US',
        }));

        if (autocompleteRef.current) {
          autocompleteRef.current.value = `${addressComponents.street.trim()}, ${addressComponents.city}, ${addressComponents.state}, ${addressComponents.zip}`;
        }
      });
    }

    // Wait for Google Maps script to load
    window.addEventListener('googleMapsLoaded', initAutocomplete);

    // Cleanup
    return () => {
      window.removeEventListener('googleMapsLoaded', initAutocomplete);
    };
  }, []);

  const validateForm = async () => {
    const newErrors: any = {};
    if (!shippingInfo.firstName.trim()) newErrors.firstName = 'Required';
    if (!shippingInfo.lastName.trim()) newErrors.lastName = 'Required';
    if (!shippingInfo.email.trim()) newErrors.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingInfo.email)) newErrors.email = 'Invalid email';
    if (!shippingInfo.phone.trim()) newErrors.phone = 'Required';
    else if (!/^\+?[0-9\s().-]{7,20}$/.test(shippingInfo.phone.trim())) newErrors.phone = 'Invalid phone';
    if (!shippingInfo.street.trim()) newErrors.street = 'Required';
    if (!shippingInfo.city.trim()) newErrors.city = 'Required';
    if (!shippingInfo.state.trim()) newErrors.state = 'Required';
    if (!/^[0-9]{5}$/.test(shippingInfo.zip)) newErrors.zip = 'Invalid ZIP';

    const res = await fetch('/api/verify-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shippingInfo),
    });
    const verify = await res.json();
    if (!verify.valid) newErrors.street = 'Address not recognized';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShippingInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFetchRates = async () => {
    if (!(await validateForm())) return;

    setLoadingRates(true);
    const res = await fetch('/api/get-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: shippingInfo,
        weightOz: cart.reduce((sum, item) => sum + item.weightOz * item.quantity, 0),
      }),
    });
    const data = await res.json();
    setShipmentId(data.shipmentId);
    const filtered = (data.rates || []).filter((r: any) => r.amount > 0);
    const sorted = filtered.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
    setRates(sorted);
    setBestRateId(sorted[0]?.id || '');
    setLoadingRates(false);
  };

  const handleProceedToStripe = async () => {
    // Prevent double submission
    if (isSubmitting) {
      console.log('⚠️ Checkout already in progress, ignoring duplicate click');
      return;
    }

    setIsSubmitting(true);

    try {
      const isFreeDelivery = selectedRate === 'local-pickup' || selectedRate === 'hand-delivery';

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          shippingInfo,
          shippingRateId: isFreeDelivery ? null : selectedRate,
          shippingMethod: isFreeDelivery
            ? selectedRate === 'local-pickup'
              ? 'Local Pickup'
              : 'Hand Delivery'
            : null,
          shipmentId: isFreeDelivery ? null : shipmentId,
        }),
      });

      const data = await res.json();

      if (data.url) {
        const currentUrl = window.location.pathname + window.location.search;
        const targetUrl = new URL(data.url).pathname + new URL(data.url).search;

        if (currentUrl !== targetUrl) {
          router.push(data.url);
        } else {
          console.log("⚠️ Already on the target URL, skipping navigation.");
        }
      } else {
        alert(data.message || 'Checkout failed.');
        setIsSubmitting(false); // Re-enable on error
      }
    } catch (error) {
      console.error('❌ Checkout error:', error);
      alert('Checkout failed. Please try again.');
      setIsSubmitting(false); // Re-enable on error
    }
  };


  const groupedRates = rates.reduce((acc: any, rate) => {
    const provider = rate.provider;
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(rate);
    return acc;
  }, {});

  const renderInput = (name: string, placeholder: string, type = 'text', refProp?: any) => (
    <div className="relative">
      <input
        ref={refProp}
        type={type}
        name={name}
        placeholder={placeholder}
        value={(shippingInfo as any)[name]}
        onChange={handleChange}
        className={`w-full p-3 border rounded-md ${errors[name] ? 'border-red-500' : ''}`}
      />
      {errors[name] && (
        <p className="text-red-600 text-sm absolute top-full left-0 mt-1">{errors[name]}</p>
      )}
    </div>
  );

  const personalInfoValid =
    shippingInfo.firstName.trim() &&
    shippingInfo.lastName.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingInfo.email) &&
    /^\+?[0-9\s().-]{7,20}$/.test(shippingInfo.phone.trim());

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
    <main className="bg-[#f5f2e8] min-h-screen py-20 px-4 font-['Playfair_Display'] text-[#3c2f2f]">
      <div className="max-w-6xl mx-auto mt-6 px-4">
        <button
          onClick={handleBackToShop}
          className="text-green-700 font-semibold hover:underline mb-6 inline-block font-['Playfair_Display']"
        >
          ← Back to Shop
        </button>
      </div>

      <div className="max-w-2xl mx-auto space-y-10">
        <h1 className="text-4xl font-semibold text-center">Checkout</h1>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Your Items</h2>
          <ul className="space-y-3 font-garamond">
            {cart.map((item: any) => (
              <li key={item.id} className="flex justify-between border-b pb-2">
                <span>{item.name}</span>
                <span>× {item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
          <h2 className="text-2xl font-semibold mb-4">Personal Information</h2>
          <div className="flex gap-4">
            <div className="w-1/2">{renderInput('firstName', 'First Name')}</div>
            <div className="w-1/2">{renderInput('lastName', 'Last Name')}</div>
          </div>
          {renderInput('email', 'Email')}
          {renderInput('phone', 'Phone Number', 'tel')}
        </div>


        <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
          <h2 className="text-2xl font-semibold mb-4">Shipping Information</h2>
          {renderInput('street', 'Street Address', 'text', autocompleteRef)}
          {renderInput('city', 'City')}
          {renderInput('state', 'State')}
          {renderInput('zip', 'ZIP Code')}

          <button onClick={handleFetchRates} className="mt-2 bg-[#2f5d50] hover:bg-[#24493f] text-white px-6 py-3 rounded-full">
            {loadingRates ? 'Loading...' : 'Get Shipping Rates'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Free Delivery Options</h2>
          <div className="space-y-3 font-garamond">
            <label className="flex items-center space-x-2">
              <input type="radio" name="shippingRate" value="local-pickup" checked={selectedRate === 'local-pickup'} onChange={e => setSelectedRate(e.target.value)} className="accent-[#2f5d50]" />
              <span>Free Local Pickup (Friendswood, TX)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="radio" name="shippingRate" value="hand-delivery" checked={selectedRate === 'hand-delivery'} onChange={e => setSelectedRate(e.target.value)} className="accent-[#2f5d50]" />
              <span>Hand Delivery (In Person by SR Botanicals)</span>
            </label>
          </div>
        </div>

        {rates.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Paid Shipping Options</h2>
            <div className="space-y-6 font-garamond">
              {Object.keys(groupedRates).map(provider => (
                <div key={provider}>
                  <h3 className="font-semibold uppercase text-sm mb-2">{provider}</h3>
                  <div className="space-y-3">
                    {groupedRates[provider].map((rate: any) => (
                      <label key={rate.id} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="shippingRate"
                          value={rate.id}
                          checked={selectedRate === rate.id}
                          onChange={e => setSelectedRate(e.target.value)}
                          className="accent-[#2f5d50]"
                        />
                        <span>
                          {rate.servicelevel} – ${rate.amount}
                          {rate.estimated_days ? ` (Est. ${rate.estimated_days} day${rate.estimated_days > 1 ? 's' : ''})` : ''}
                        </span>
                        {rate.id === bestRateId && (
                          <span className="ml-2 bg-green-100 text-green-700 px-2 py-1 text-xs rounded-full font-semibold">🌿 Best Value</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={handleProceedToStripe}
            disabled={!selectedRate || !personalInfoValid || isSubmitting}
            className="bg-[#2f5d50] hover:bg-[#24493f] text-white font-medium px-8 py-3 rounded-full shadow-md disabled:opacity-50 transition-all"
          >
            {isSubmitting ? 'Processing...' : 'Proceed to Payment'}
          </button>
        </div>
      </div>
    </main>
    <Footer />
    </>
  );
}
