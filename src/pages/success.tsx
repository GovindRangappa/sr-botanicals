"use client";


// stops Next from prerendering this page at build time
export async function getServerSideProps() {
  return { props: {} };
}


import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useCart } from "@/context/CartContext";
import Footer from '@/components/Footer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Success() {
  const router = useRouter();
  const session_id = router.query.session_id as string | undefined;

  // All useState hooks must be at the top - before any early returns
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [estimatedMinDate, setEstimatedMinDate] = useState<Date | null>(null);
  const [estimatedMaxDate, setEstimatedMaxDate] = useState<Date | null>(null);

  const { clearCart } = useCart();

  // Redirect if no session_id is provided
  useEffect(() => {
    if (!session_id || !router.isReady) {
      if (router.isReady && !session_id) {
        router.replace('/shop');
      }
      return;
    }

    // Guard: only run once per session_id
    let isMounted = true;

    async function fetchOrders() {
      console.log("🔄 [SUCCESS PAGE] Fetching orders and receipt for session:", session_id);

      const { data, error } = await supabase
        .schema("public")
        .from("orders")
        .select("*")
        .eq("stripe_checkout_id", session_id);

      if (!isMounted) return; // Prevent state updates if component unmounted

      if (!error && data && data.length > 0) {
        // Verify that the order is actually paid
        const paidOrders = data.filter(order => order.status === 'paid' || order.status === 'complete');
        if (paidOrders.length === 0) {
          // Order exists but is not paid - redirect to shop
          console.warn('Order found but not paid, redirecting to shop');
          if (isMounted) {
            router.replace('/shop');
            setLoading(false);
          }
          return;
        }
        
        if (isMounted) {
          setOrders(paidOrders);
          clearCart();
        }

        try {
          // Pass customer email for session ownership validation
          const stripeRes = await fetch("/api/get-checkout-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
              session_id,
              customer_email: data[0]?.customer_email, // Pass email from order for validation
            }),
          });

          if (!isMounted) return;

          const stripeData = await stripeRes.json();

          if (stripeData.receipt_url) {
            if (isMounted) {
              setReceiptUrl(stripeData.receipt_url);
              console.log("✅ [SUCCESS PAGE] Receipt URL received");
            }
          } else {
            console.warn("⚠️ [SUCCESS PAGE] No receipt URL in response");
          }
        } catch (err) {
          console.error("❌ Error while fetching Stripe receipt:", err);
        }
      } else {
        if (error) {
          console.error("❌ Error fetching orders from Supabase:", error);
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    fetchOrders();

    return () => {
      isMounted = false; // Cleanup: prevent state updates after unmount
    };
  }, [session_id, router.isReady]); // Removed router and clearCart from dependencies

  // Calculate dates only on client to prevent hydration mismatch
  // Date.now() produces different values on server vs client
  useEffect(() => {
    if (orders.length > 0) {
      const firstOrder = orders[0];
      if (firstOrder?.shipping_estimated_days) {
        setEstimatedMinDate(new Date(Date.now() + firstOrder.shipping_estimated_days * 24 * 60 * 60 * 1000));
        setEstimatedMaxDate(new Date(Date.now() + (firstOrder.shipping_estimated_days + 2) * 24 * 60 * 60 * 1000));
      }
    }
  }, [orders]);

  // Show nothing while router is not ready or if no session_id
  if (!router.isReady || !session_id) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f2ea] text-[#184c43] text-center font-['Playfair_Display']">
        <h1 className="text-2xl font-semibold">Loading your order details...</h1>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    // Redirect to shop if no paid orders found
    router.replace('/shop');
    return null;
  }

  const firstOrder = orders[0];
  const subtotal = firstOrder.subtotal || 0;
  const tax = firstOrder.tax || 0;
  const shippingCost = firstOrder.shipping_cost || 0;
  const total = subtotal + tax + shippingCost;

  const isFreeDelivery =
    firstOrder.shipping_method === "Local Pickup" ||
    firstOrder.shipping_method === "Hand Delivery";

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
            ) : firstOrder.shipping_method === "Hand Delivery" ? (
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
