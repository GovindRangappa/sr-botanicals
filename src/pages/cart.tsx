// src/pages/cart.tsx

// stops Next from prerendering this page at build time
export async function getServerSideProps() {
  return { props: {} };
}


import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();

  const handleQuantityChange = (id: string, qty: number) => {
    if (qty >= 1) updateQuantity(id, qty);
  };

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);

  const handleCheckout = async () => {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cartItems }),
    });

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert('Failed to redirect to checkout.');
    }
  };

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-[#f5f2e8] text-[#3c2f2f] font-garamond px-6 py-16">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
          <h1 className="text-3xl font-bold font-['Playfair_Display'] mb-6">Your Cart</h1>

          {cartItems.length === 0 ? (
            <p className="text-center text-gray-600">
              Your cart is empty. <Link href="/shop" className="text-green-700 hover:underline">Shop now →</Link>
            </p>
          ) : (
            <>
              <ul className="divide-y">
                {cartItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-6 py-4">
                    <div className="w-20 h-20 relative">
                      <Image
                        src={item.image}
                        alt={item.name}
                        layout="fill"
                        objectFit="cover"
                        className="rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold">{item.name}</h2>
                      <p className="text-sm text-gray-600">${item.price.toFixed(2)}</p>
                      <div className="flex items-center mt-2">
                        <label className="mr-2">Qty:</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value))}
                          className="w-16 border rounded px-2 py-1"
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <button onClick={() => removeFromCart(item.id)} className="text-red-500 text-sm hover:underline">
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="text-right mt-6">
                <p className="text-xl font-semibold mb-4">Total: ${total}</p>
                <button
                  onClick={handleCheckout}
                  className="bg-[#2f5d50] hover:bg-[#24493f] text-white px-6 py-3 rounded-full font-['Playfair_Display'] transition"
                >
                  Proceed to Checkout
                </button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
