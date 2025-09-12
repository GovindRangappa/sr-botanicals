import { useState } from 'react';

export default function ShippingCalculator() {
  const [address, setAddress] = useState({
    name: '',
    street1: '',
    city: '',
    state: '',
    zip: '',
  });
  const [weightOz, setWeightOz] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rates, setRates] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAddress((prev) => ({ ...prev, [name]: value }));
  };

  const fetchRates = async () => {
    setLoading(true);
    setError('');
    setRates([]);
    try {
      const res = await fetch('/api/get-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, weightOz }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch rates');
      setRates(data.rates);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow font-garamond">
      <h2 className="text-2xl font-semibold mb-4 text-center">Calculate Shipping</h2>
      <div className="grid grid-cols-1 gap-4">
        <input
          className="border p-2 rounded"
          placeholder="Name"
          name="name"
          value={address.name}
          onChange={handleChange}
        />
        <input
          className="border p-2 rounded"
          placeholder="Street Address"
          name="street1"
          value={address.street1}
          onChange={handleChange}
        />
        <input
          className="border p-2 rounded"
          placeholder="City"
          name="city"
          value={address.city}
          onChange={handleChange}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            className="border p-2 rounded"
            placeholder="State"
            name="state"
            value={address.state}
            onChange={handleChange}
          />
          <input
            className="border p-2 rounded"
            placeholder="ZIP"
            name="zip"
            value={address.zip}
            onChange={handleChange}
          />
        </div>
        <button
          onClick={fetchRates}
          disabled={loading}
          className="bg-[#2f5d50] text-white py-2 rounded hover:bg-[#24493f] transition"
        >
          {loading ? 'Loading...' : 'Get Shipping Rates'}
        </button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {rates.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Available Shipping Options:</h3>
            <ul className="space-y-2">
              {rates.map((rate, i) => (
                <li key={i} className="border p-2 rounded flex justify-between">
                  <span>{rate.service} ({rate.provider})</span>
                  <span>${(rate.amount / 100).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
