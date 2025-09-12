// ✅ components/CartDrawer.tsx
'use client';

import { useCart } from "@/context/CartContext";
import { XMarkIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import { useRouter } from "next/router";
import { useState } from "react";

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    toggleCart,
    removeFromCart,
    updateQuantity,
  } = useCart();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const subtotal =
    cart?.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0) || 0;

  const handleCheckout = () => {
    toggleCart();
    router.push("/checkout");
  };

  const handleProductClick = (slug: string) => {
    toggleCart();
    router.push(`/product/${slug}`);
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 bg-white shadow-lg z-50 transition-transform transform ${
        isCartOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-lg font-semibold text-[#3c2f2f] font-['Playfair_Display']">
          Your Cart
        </h2>
        <button onClick={toggleCart} aria-label="Close cart">
          <XMarkIcon className="h-6 w-6 text-gray-600" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 overflow-y-auto h-[calc(100%-200px)]">
        {cart?.length ? (
          cart.map((item) => (
            <div
              key={item.stripe_price_id}
              className="flex items-center gap-4 border-b pb-3"
            >
              <Image
                src={item.image}
                alt={item.name}
                width={60}
                height={60}
                className="rounded object-cover cursor-pointer"
                onClick={() => handleProductClick(item.slug)}
              />
              <div className="flex-1">
                <p
                  onClick={() => handleProductClick(item.slug)}
                  className="font-medium text-[#3c2f2f] font-['Playfair_Display'] cursor-pointer hover:underline"
                >
                  {item.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-green-700 font-['Playfair_Display']">
                    ${item.price.toFixed(2)}
                  </span>
                  <span className="text-green-700 font-['Playfair_Display']">×</span>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateQuantity(
                        item.stripe_price_id,
                        parseInt(e.target.value) || 1
                      )
                    }
                    className="w-14 border rounded px-2 py-1 text-sm text-center text-black font-['Playfair_Display']"
                  />
                </div>
              </div>
              <button
                onClick={() => removeFromCart(item.stripe_price_id)}
                className="text-red-500 hover:underline text-sm font-['Playfair_Display']"
              >
                Remove
              </button>
            </div>
          ))
        ) : (
          <p className="text-gray-600 font-['Playfair_Display']">
            Your cart is empty.
          </p>
        )}
      </div>

      <div className="p-4 border-t mt-auto">
        <div className="flex justify-between font-semibold text-lg mb-4 text-[#2f5d50] font-['Playfair_Display']">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <button
          onClick={handleCheckout}
          disabled={!cart?.length}
          className={`block text-center w-full ${
            cart?.length
              ? "bg-green-700 hover:bg-green-800"
              : "bg-gray-400 cursor-not-allowed"
          } text-white py-2 rounded transition`}
        >
          Checkout
        </button>
      </div>
    </div>
  );
}
