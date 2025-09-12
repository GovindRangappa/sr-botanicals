"use client";


// stops Next from prerendering this page at build time
export async function getServerSideProps() {
  return { props: {} };
}


import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useCart } from "@/context/CartContext";
import Footer from '@/components/Footer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Success() {
  const searchParams = useSearchParams();
  const session_id = searchParams.get("session_id");

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const { clearCart } = useCart();

  useEffect(() => {
    if (!session_id) return;

    async function fetchOrders() {
      console.log("🔄 Fetching orders and receipt for session:", session_id);

      const { data, error } = await supabase
        .schema("public")
        .from("orders")
        .select("*")
        .eq("stripe_checkout_id", session_id);

      if (!error) {
        setOrders(data || []);
        clearCart();

        try {
          const stripeRes = await fetch("/api/get-checkout-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ session_id }),
          });

          const stripeData = await stripeRes.json();
          console.log("🧾 Stripe response from API:", stripeData);

          if (stripeData.receipt_url) {
            setReceiptUrl(stripeData.receipt_url);
            console.log("✅ Receipt URL saved:", stripeData.receipt_url);
          } else {
            console.warn("⚠️ No receipt URL found in Stripe response.");
          }
        } catch (err) {
          console.error("❌ Error while fetching Stripe receipt:", err);
        }
      } else {
        console.error("❌ Error fetching orders from Supabase:", error);
      }

      setLoading(false);
    }

    fetchOrders();
  }, [session_id]);


  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f2ea] text-[#184c43] text-center font-['Playfair_Display']">
        <h1 className="text-2xl font-semibold">Loading your order details...</h1>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f2ea] text-red-700 text-center font-['Playfair_Display']">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="mt-2 text-md">Please contact support if you think this is a mistake.</p>
      </div>
    );
  }

  const firstOrder = orders[0];
  const subtotal = firstOrder.subtotal || 0;
  const tax = firstOrder.tax || 0;
  const shippingCost = firstOrder.shipping_cost || 0;
  const total = subtotal + tax + shippingCost;

  const estimatedMinDate = firstOrder.shipping_estimated_days
    ? new Date(Date.now() + firstOrder.shipping_estimated_days * 24 * 60 * 60 * 1000)
    : null;

  const estimatedMaxDate = firstOrder.shipping_estimated_days
    ? new Date(Date.now() + (firstOrder.shipping_estimated_days + 2) * 24 * 60 * 60 * 1000)
    : null;

  const isFreeDelivery =
    firstOrder.shipping_method === "Local Pickup" ||
    firstOrder.shipping_method === "Hand Delivery (In Person)";

  return (
    <>
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f2ea] text-center text-[#184c43] font-['Playfair_Display'] px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md max-w-lg w-full">
        <h1 className="text-3xl font-bold mb-3">Payment Successful!</h1>
        <p className="text-lg mb-4">
          Thank you for your purchase{firstOrder.customer_name ? `, ${firstOrder.customer_name}` : ""}!
        </p>

        <div className="text-md mb-4 space-y-2">
          {firstOrder.products?.map((item: any, index: number) => (
            <div key={index} className="flex justify-between">
              <span className="font-semibold">
                {item.name} × {item.quantity}
              </span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}

          <hr className="my-2 border-gray-300" />
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax (8.25%):</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          {shippingCost > 0 && (
            <div className="flex justify-between">
              <span>Shipping:</span>
              <span>${shippingCost.toFixed(2)}</span>
            </div>
          )}
          <hr className="my-2 border-gray-300" />
          <div className="flex justify-between font-bold text-lg">
            <span>Total Paid:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="text-left text-sm mb-4 border-t pt-4">
          <h2 className="font-semibold mb-1">Delivery Method:</h2>
          <p>
            {firstOrder.shipping_method === "Local Pickup" ? (
              <>
                Free Local Pickup<br />
                Please pick up your order at:<br />
                <strong>2412 Ivy Stone Ln, Friendswood, TX 77546</strong><br />
                Thank you for your support!
              </>
            ) : firstOrder.shipping_method === "Hand Delivery (In Person)" ? (
              <>
                Hand Delivery (In Person by SR Botanicals)<br />
                Your order will be personally handed to you.<br />
                Thank you for your support!
              </>
            ) : (
              <>
                {firstOrder.shipping_method || "N/A"}
                <h2 className="font-semibold mt-3 mb-1">Shipping Address:</h2>
                <p>{firstOrder.shipping_name}</p>
                <p>{firstOrder.shipping_street1}</p>
                <p>
                  {firstOrder.shipping_city}, {firstOrder.shipping_state}{" "}
                  {firstOrder.shipping_zip}
                </p>

                {estimatedMinDate && estimatedMaxDate && (
                  <div className="mt-4">
                    <h2 className="font-semibold mb-1">Estimated Delivery Window:</h2>
                    <p>
                      {estimatedMinDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      –{" "}
                      {estimatedMaxDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </>
            )}
          </p>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:justify-center sm:items-center gap-4">
          {receiptUrl && (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline text-[#184c43] hover:text-[#133a34] transition"
            >
              View Stripe Receipt
            </a>
          )}
          <a
            href="/"
            className="bg-[#184c43] text-white text-sm font-medium py-2 px-6 rounded-full hover:bg-[#133a34] transition"
          >
            Back to Shop
          </a>
        </div>
    </div>
    </div>
    <Footer />
    </> 
  );
}
