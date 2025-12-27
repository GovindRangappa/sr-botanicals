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
  const [showManualAddressFields, setShowManualAddressFields] = useState(false);

  const autocompleteRef = useRef<HTMLInputElement | null>(null);
  const autocompleteInstanceRef = useRef<any>(null);

  useEffect(() => {
    function initAutocomplete() {
      // Only initialize if the input is visible (paid shipping is selected)
      const isPaidShippingSelected = selectedRate === 'paid-shipping' || 
        (selectedRate && selectedRate !== 'local-pickup' && selectedRate !== 'hand-delivery');
      
      if (!window.google?.maps?.places || !autocompleteRef.current || !isPaidShippingSelected) return;

      // Clean up existing autocomplete instance if it exists
      if (autocompleteInstanceRef.current && autocompleteRef.current && (window.google.maps as any).event) {
        (window.google.maps as any).event.clearInstanceListeners(autocompleteRef.current);
        autocompleteInstanceRef.current = null;
      }

      const autocomplete = new window.google.maps.places.Autocomplete(autocompleteRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
      });

      autocompleteInstanceRef.current = autocomplete;

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

        // Hide manual fields when autocomplete is used
        setShowManualAddressFields(false);
      });
    }

    // Wait for Google Maps script to load
    const handleGoogleMapsLoaded = () => {
      // Small delay to ensure DOM is ready
      setTimeout(initAutocomplete, 100);
    };

    // Check if Google Maps is already loaded
    if (window.google?.maps?.places) {
      handleGoogleMapsLoaded();
    } else {
      window.addEventListener('googleMapsLoaded', handleGoogleMapsLoaded);
    }

    // Also try to initialize when selectedRate changes (when input becomes visible)
    const timeoutId = setTimeout(initAutocomplete, 100);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('googleMapsLoaded', handleGoogleMapsLoaded);
      if (autocompleteInstanceRef.current && autocompleteRef.current && window.google?.maps && (window.google.maps as any).event) {
        (window.google.maps as any).event.clearInstanceListeners(autocompleteRef.current);
        autocompleteInstanceRef.current = null;
      }
    };
  }, [selectedRate]);

  const validateForm = async (skipAddressValidation = false) => {
    const newErrors: any = {};
    
    // First Name validation
    if (!shippingInfo.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (!/^[A-Za-zÀ-ÿ'’.\-\s]+$/.test(shippingInfo.firstName.trim())) {
      newErrors.firstName = 'First name contains invalid characters';
    }
    
    // Last Name validation
    if (!shippingInfo.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (!/^[A-Za-zÀ-ÿ'’.\-\s]+$/.test(shippingInfo.lastName.trim())) {
      newErrors.lastName = 'Last name contains invalid characters';
    }
    
    // Email validation
    if (!shippingInfo.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingInfo.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Phone validation
    if (!shippingInfo.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[0-9\s().-]{7,20}$/.test(shippingInfo.phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    // Address validation (only if not skipping - for payment button)
    if (!skipAddressValidation) {
      if (!shippingInfo.street.trim()) newErrors.street = 'Street address is required';
      if (!shippingInfo.city.trim()) newErrors.city = 'City is required';
      if (!shippingInfo.state.trim()) newErrors.state = 'State is required';
      if (!shippingInfo.zip.trim()) {
        newErrors.zip = 'ZIP code is required';
      } else if (!/^[0-9]{5}$/.test(shippingInfo.zip)) {
        newErrors.zip = 'ZIP code must be 5 digits';
      }

      // Address verification only if address fields are filled
      if (shippingInfo.street.trim() && shippingInfo.city.trim() && shippingInfo.state.trim() && /^[0-9]{5}$/.test(shippingInfo.zip)) {
        try {
          const res = await fetch('/api/verify-address', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shippingInfo),
          });
          const verify = await res.json();
          if (!verify.valid) newErrors.street = 'Address not recognized';
        } catch (err) {
          console.error('Address verification error:', err);
        }
      }
    }
    
    // Fulfillment option validation
    if (!selectedRate) {
      newErrors.fulfillment = 'Please select a delivery option';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFetchRates = async () => {
    // Validate address fields before fetching rates
    if (!(await validateForm(false))) return;

    setLoadingRates(true);
    const res = await fetch('/api/get-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: shippingInfo,
        weightOz: cart.reduce((sum, item) => sum + (item.weightOz || 0) * (item.quantity || 0), 0),
      }),
    });
    const data = await res.json();
    setShipmentId(data.shipmentId);
    const filtered = (data.rates || []).filter((r: any) => r.amount > 0);
    const sorted = filtered.sort((a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount));
    setRates(sorted);
    setBestRateId(sorted[0]?.id || '');
    // Auto-select the best rate when rates are loaded
    if (sorted.length > 0 && selectedRate === 'paid-shipping') {
      setSelectedRate(sorted[0].id);
    }
    setLoadingRates(false);
  };

  const handleProceedToStripe = async () => {
    // Prevent double submission
    if (isSubmitting) {
      console.log('⚠️ Checkout already in progress, ignoring duplicate click');
      return;
    }

    // Determine if address validation is needed based on selected rate
    const isFreeDelivery = selectedRate === 'local-pickup' || selectedRate === 'hand-delivery';
    const needsAddress = selectedRate && !isFreeDelivery;
    
    // Validate all required fields before proceeding
    // Skip address validation for free delivery options
    const isValid = await validateForm(!needsAddress);
    if (!isValid) {
      // Scroll to first error field
      setTimeout(() => {
        const firstErrorField = Object.keys(errors).find(key => key !== 'fulfillment');
        if (firstErrorField) {
          const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            (errorElement as HTMLElement).focus();
          }
        } else if (errors.fulfillment) {
          // Scroll to fulfillment options if that's the only error
          const fulfillmentSection = document.querySelector('[name="shippingRate"]');
          if (fulfillmentSection) {
            fulfillmentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
      return;
    }

    setIsSubmitting(true);

    try {
      const isFreeDelivery = selectedRate === 'local-pickup' || selectedRate === 'hand-delivery';
      // If paid-shipping placeholder is selected but no actual rate is chosen yet, don't proceed
      if (selectedRate === 'paid-shipping' || (!isFreeDelivery && selectedRate && rates.length > 0 && !rates.some((r: any) => r.id === selectedRate))) {
        setErrors((prev: any) => ({ ...prev, fulfillment: 'Please enter your address and get shipping rates first' }));
        setIsSubmitting(false);
        return;
      }

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
    <div className="mb-1">
      <input
        ref={refProp}
        type={type}
        name={name}
        placeholder={placeholder}
        value={(shippingInfo as any)[name]}
        onChange={handleChange}
        className={`w-full p-3 border rounded-md transition-colors ${
          errors[name] 
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:border-[#2f5d50] focus:ring-[#2f5d50]'
        } focus:outline-none focus:ring-2`}
      />
      {errors[name] && (
        <p className="text-red-600 text-sm mt-1 font-medium">{errors[name]}</p>
      )}
    </div>
  );

  // Check if all required personal info fields are valid
  const personalInfoValid =
    shippingInfo.firstName.trim() &&
    /^[A-Za-zÀ-ÿ'’.\-\s]+$/.test(shippingInfo.firstName.trim()) &&
    shippingInfo.lastName.trim() &&
    /^[A-Za-zÀ-ÿ'’.\-\s]+$/.test(shippingInfo.lastName.trim()) &&
    shippingInfo.email.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingInfo.email.trim()) &&
    shippingInfo.phone.trim() &&
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

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Choose ONE Delivery Option</h2>
          {errors.fulfillment && (
            <p className="text-red-600 text-sm mb-4 font-medium">{errors.fulfillment}</p>
          )}
          
          <div className="space-y-6">
            {/* Free Delivery Options */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-[#2f5d50]">Free Delivery Options</h3>
              <div className="space-y-3 font-garamond">
                <label className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    name="shippingRate" 
                    value="local-pickup" 
                    checked={selectedRate === 'local-pickup'} 
                onChange={e => {
                  setSelectedRate(e.target.value);
                  // Reset rates when switching to free delivery
                  setRates([]);
                  setShipmentId('');
                  // Reset manual fields toggle
                  setShowManualAddressFields(false);
                  // Clear fulfillment error when option is selected
                  if (errors.fulfillment) {
                    setErrors((prev: any) => {
                      const newErrors = { ...prev };
                      delete newErrors.fulfillment;
                      return newErrors;
                    });
                  }
                }}
                    className="accent-[#2f5d50]" 
                  />
                  <span>Free Local Pickup (Friendswood, TX)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    name="shippingRate" 
                    value="hand-delivery" 
                    checked={selectedRate === 'hand-delivery'} 
                onChange={e => {
                  setSelectedRate(e.target.value);
                  // Reset rates when switching to free delivery
                  setRates([]);
                  setShipmentId('');
                  // Reset manual fields toggle
                  setShowManualAddressFields(false);
                  // Clear fulfillment error when option is selected
                  if (errors.fulfillment) {
                    setErrors((prev: any) => {
                      const newErrors = { ...prev };
                      delete newErrors.fulfillment;
                      return newErrors;
                    });
                  }
                }}
                    className="accent-[#2f5d50]" 
                  />
                  <span>Hand Delivery (In Person by SR Botanicals)</span>
                </label>
              </div>
            </div>

            {/* Paid Shipping Options */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-3 text-[#2f5d50]">Paid Shipping Options</h3>
              <div className="space-y-3 font-garamond">
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={selectedRate === 'paid-shipping' || (!!selectedRate && selectedRate !== 'local-pickup' && selectedRate !== 'hand-delivery' && rates.length > 0 && rates.some((r: any) => r.id === selectedRate))} 
                    onChange={e => {
                      if (e.target.checked) {
                        // If checking and no rate is selected yet, set to 'paid-shipping' to show address fields
                        const isRateSelected = !!selectedRate && selectedRate !== 'local-pickup' && selectedRate !== 'hand-delivery' && rates.length > 0 && rates.some((r: any) => r.id === selectedRate);
                        if (!isRateSelected && selectedRate !== 'paid-shipping') {
                          setSelectedRate('paid-shipping');
                        }
                        // If a rate is already selected, keep it selected (checkbox just indicates paid shipping is chosen)
                      } else {
                        // If unchecking, clear the selection and reset rates
                        setSelectedRate('');
                        setRates([]);
                        setShipmentId('');
                      }
                      // Reset manual fields toggle
                      setShowManualAddressFields(false);
                      // Clear fulfillment error
                      if (errors.fulfillment) {
                        setErrors((prev: any) => {
                          const newErrors = { ...prev };
                          delete newErrors.fulfillment;
                          return newErrors;
                        });
                      }
                    }}
                    className="accent-[#2f5d50]" 
                  />
                  <span>Paid Shipping {rates.length > 0 ? '(Select a rate below)' : '(Enter address below to see rates)'}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Information - Only show when paid shipping option is selected (not free delivery) */}
        {((selectedRate === 'paid-shipping') || (selectedRate && selectedRate !== 'local-pickup' && selectedRate !== 'hand-delivery' && rates.length > 0 && rates.some((r: any) => r.id === selectedRate))) && (
          <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
            <h2 className="text-2xl font-semibold mb-4">Shipping Information</h2>
            
            {/* Address Autocomplete Field */}
            <div className="mb-1">
              <input
                ref={autocompleteRef}
                type="text"
                name="street"
                placeholder="Enter your street address"
                value={shippingInfo.street}
                onChange={handleChange}
                className={`w-full p-3 border rounded-md transition-colors ${
                  errors.street 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-[#2f5d50] focus:ring-[#2f5d50]'
                } focus:outline-none focus:ring-2`}
              />
              {errors.street && (
                <p className="text-red-600 text-sm mt-1 font-medium">{errors.street}</p>
              )}
            </div>

            {/* Read-only confirmation fields (shown when address is populated) */}
            {shippingInfo.city && shippingInfo.state && shippingInfo.zip && !showManualAddressFields && (
              <div className="space-y-2 bg-gray-50 p-3 rounded-md">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600 font-medium">City:</span>
                    <span className="ml-2 text-gray-800">{shippingInfo.city}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">State:</span>
                    <span className="ml-2 text-gray-800">{shippingInfo.state}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">ZIP Code:</span>
                    <span className="ml-2 text-gray-800">{shippingInfo.zip}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Manual entry fields (shown if user clicks "Can't find address?" or if no autocomplete data) */}
            {showManualAddressFields && (
              <div className="space-y-4 border-t pt-4">
                {renderInput('city', 'City')}
                {renderInput('state', 'State')}
                {renderInput('zip', 'ZIP Code')}
              </div>
            )}

            <div className="flex flex-col items-center space-y-3">
              {/* Toggle link for manual entry */}
              {!showManualAddressFields && (
                <button
                  type="button"
                  onClick={() => {
                    setShowManualAddressFields(true);
                    // Clear autocomplete address data when switching to manual entry
                    setShippingInfo(prev => ({
                      ...prev,
                      city: '',
                      state: '',
                      zip: '',
                    }));
                    if (autocompleteRef.current) {
                      autocompleteRef.current.value = shippingInfo.street;
                    }
                  }}
                  className="text-sm text-[#2f5d50] hover:text-[#24493f] underline"
                >
                  Can't find your address? Enter manually
                </button>
              )}

              {showManualAddressFields && (
                <button
                  type="button"
                  onClick={() => {
                    setShowManualAddressFields(false);
                    // Clear manual entry fields when switching back to autocomplete
                    setShippingInfo(prev => ({
                      ...prev,
                      city: '',
                      state: '',
                      zip: '',
                    }));
                  }}
                  className="text-sm text-[#2f5d50] hover:text-[#24493f] underline"
                >
                  Use address autocomplete instead
                </button>
              )}

              <button onClick={handleFetchRates} className="bg-[#2f5d50] hover:bg-[#24493f] text-white px-6 py-3 rounded-full">
                {loadingRates ? 'Loading...' : 'Get Shipping Rates'}
              </button>
            </div>
          </div>
        )}

        {/* Paid Shipping Rates - Show below Shipping Information */}
        {rates.length > 0 && (selectedRate === 'paid-shipping' || (selectedRate && selectedRate !== 'local-pickup' && selectedRate !== 'hand-delivery')) && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Select Shipping Rate</h2>
            <div className="space-y-6 font-garamond">
              {Object.keys(groupedRates).map(provider => (
                <div key={provider}>
                  <h3 className="font-semibold uppercase text-sm mb-2 text-gray-600">{provider}</h3>
                  <div className="space-y-3">
                    {groupedRates[provider].map((rate: any) => (
                      <label key={rate.id} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="shippingRate"
                          value={rate.id}
                          checked={selectedRate === rate.id}
                          onChange={e => {
                            setSelectedRate(e.target.value);
                            // Reset manual fields toggle when selecting a rate
                            setShowManualAddressFields(false);
                            // Clear fulfillment error when option is selected
                            if (errors.fulfillment) {
                              setErrors((prev: any) => {
                                const newErrors = { ...prev };
                                delete newErrors.fulfillment;
                                return newErrors;
                              });
                            }
                          }}
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
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 font-semibold mb-2">Please fix the following errors:</p>
              <ul className="text-red-700 text-sm space-y-1 text-left list-disc list-inside">
                {errors.firstName && <li>{errors.firstName}</li>}
                {errors.lastName && <li>{errors.lastName}</li>}
                {errors.email && <li>{errors.email}</li>}
                {errors.phone && <li>{errors.phone}</li>}
                {errors.fulfillment && <li>{errors.fulfillment}</li>}
              </ul>
            </div>
          )}
          <button
            onClick={handleProceedToStripe}
            disabled={isSubmitting}
            className="bg-[#2f5d50] hover:bg-[#24493f] text-white font-medium px-8 py-3 rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
