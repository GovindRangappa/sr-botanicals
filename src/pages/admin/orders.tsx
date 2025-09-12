'use client';

import AdminLayout from '@/components/AdminLayout';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ManualOrderForm from '@/components/ManualOrderForm';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [showManualOrderModal, setShowManualOrderModal] = useState(false);
  const router = useRouter();

  const allowedEmails = ['ivygovind@gmail.com', 'srbotanicals@gmail.com'];

  useEffect(() => {
    async function checkAccessAndFetchOrders() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user || !allowedEmails.includes(user.email!)) {
        setAuthorized(false);
        router.push('/admin/login');
        return;
      }

      setAuthorized(true);

      const { data, error } = await supabase
        .schema('public')
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) setOrders(data || []);
      setLoading(false);
    }

    checkAccessAndFetchOrders();
  }, [router]);

  const handleViewSlip = async (orderId: number) => {
    try {
      const res = await fetch(`/api/generate-packing-slip?orderId=${orderId}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      alert('Failed to generate packing slip.');
    }
  };

  const handleFulfillmentChange = async (orderId: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ fulfillment_status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, fulfillment_status: newStatus } : order
        )
      );
    } catch (err) {
      console.error('Failed to update fulfillment status:', err);
      alert('Could not update fulfillment status. Please try again.');
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#184c43] bg-[#f5f2ea] font-['Playfair_Display']">
        <p>Checking authorization...</p>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#f5f2ea] text-[#184c43] p-2 sm:p-4 lg:p-8 font-['Playfair_Display']">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center">Order History</h1>

        <div className="mb-4 sm:mb-6 text-center">
          <button
            className="bg-[#2f5d50] text-white px-3 sm:px-4 py-2 rounded text-sm sm:text-base"
            onClick={() => setShowManualOrderModal(true)}
          >
            + Create Manual Order
          </button>
        </div>

        {loading ? (
          <p className="text-center">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-center text-red-600">No orders found.</p>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[1400px]">
              <table className="w-full text-xs sm:text-sm text-left border border-[#dcd6c4] table-fixed">
                <thead className="bg-[#e8e3d5]">
                  <tr className="text-[#184c43] font-semibold">
                    <th className="w-20 px-1 sm:px-2 py-2 sm:py-3 text-xs">Date</th>
                    <th className="w-28 px-1 sm:px-2 py-2 sm:py-3 text-xs">Customer</th>
                    <th className="w-32 px-1 sm:px-2 py-2 sm:py-3 text-xs">Product Name</th>
                    <th className="w-12 px-1 sm:px-2 py-2 sm:py-3 text-xs text-center">Qty</th>
                    <th className="w-16 px-1 sm:px-2 py-2 sm:py-3 text-xs">Unit Price</th>
                    <th className="w-16 px-1 sm:px-2 py-2 sm:py-3 text-xs text-center">Subtotal</th>
                    <th className="w-12 px-1 sm:px-2 py-2 sm:py-3 text-xs text-center">Tax</th>
                    <th className="w-16 px-1 sm:px-2 py-2 sm:py-3 text-xs text-center">Shipping</th>
                    <th className="w-16 px-1 sm:px-2 py-2 sm:py-3 text-xs text-center">Total</th>
                    <th className="w-20 px-1 sm:px-2 py-2 sm:py-3 text-xs text-center">Payment Method</th>
                    <th className="w-20 px-1 sm:px-2 py-2 sm:py-3 text-xs text-center">Payment Status</th>
                    <th className="w-24 px-1 sm:px-2 py-2 sm:py-3 text-xs text-center">Fulfillment</th>
                    <th className="w-24 px-1 sm:px-2 py-2 sm:py-3 text-xs text-center">Shipping Method</th>
                    <th className="w-32 px-1 sm:px-2 py-2 sm:py-3 text-xs text-center">Tracking #</th>
                    <th className="w-20 px-1 sm:px-2 py-2 sm:py-3 text-xs text-center">Label</th>
                    <th className="w-20 px-1 sm:px-2 py-2 sm:py-3 text-xs text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.flatMap((order, orderIndex) => {
                    const date = new Date(order.created_at).toLocaleDateString('en-US', {
                      month: 'numeric',
                      day: 'numeric',
                      year: '2-digit'
                    });
                    const total = (order.subtotal || 0) + (order.tax || 0) + (order.shipping_cost || 0);
                    const productList = Array.isArray(order.products)
                      ? order.products
                      : [{ name: order.product_name, price: order.price, quantity: order.quantity }];

                    return productList.map((product: any, index: number) => (
                      <tr key={`${order.id}-${index}`} className="hover:bg-[#f8f6f0] border-b border-[#dcd6c4]">
                        {index === 0 && (
                          <>
                            <td rowSpan={productList.length} className="px-1 sm:px-2 py-2 sm:py-4 align-middle text-xs">
                              {date}
                            </td>
                            <td rowSpan={productList.length} className="px-1 sm:px-2 py-2 sm:py-4 align-middle text-xs">
                              <div className="truncate" title={`${order.first_name} ${order.last_name}` || 'N/A'}>
                                {order.first_name + ' ' + order.last_name || 'N/A'}
                              </div>
                            </td>
                          </>
                        )}
                        <td className="px-1 sm:px-2 py-2 sm:py-4 text-xs">
                          <div className="truncate" title={product.name}>
                            {product.name}
                          </div>
                        </td>
                        <td className="px-1 sm:px-2 py-2 sm:py-4 text-center text-xs">{product.quantity}</td>
                        <td className="px-1 sm:px-2 py-2 sm:py-4 text-xs">${(product.price || 0).toFixed(2)}</td>

                        {index === 0 && (
                          <>
                            <td rowSpan={productList.length} className="px-1 sm:px-2 py-2 sm:py-4 align-middle text-center text-xs">
                              ${order.subtotal?.toFixed(2) || '0.00'}
                            </td>
                            <td rowSpan={productList.length} className="px-1 sm:px-2 py-2 sm:py-4 align-middle text-center text-xs">
                              ${order.tax?.toFixed(2) || '0.00'}
                            </td>
                            <td rowSpan={productList.length} className="px-1 sm:px-2 py-2 sm:py-4 align-middle text-center text-xs">
                              ${order.shipping_cost?.toFixed(2) || '0.00'}
                            </td>
                            <td rowSpan={productList.length} className="px-1 sm:px-2 py-2 sm:py-4 align-middle font-semibold text-center text-xs">
                              ${total.toFixed(2)}
                            </td>
                            <td rowSpan={productList.length} className="px-1 sm:px-2 py-2 sm:py-4 align-middle text-center text-xs">
                              <div className="truncate" title={order.payment_method || 'N/A'}>
                                {order.payment_method || 'N/A'}
                              </div>
                            </td>
                            <td rowSpan={productList.length} className="px-1 sm:px-2 py-2 sm:py-4 align-middle text-center text-xs">
                              {order.status || 'pending'}
                            </td>
                            <td rowSpan={productList.length} className="px-1 sm:px-2 py-2 sm:py-4 align-middle text-center">
                              <select
                                value={order.fulfillment_status || 'unfulfilled'}
                                onChange={(e) => handleFulfillmentChange(order.id, e.target.value)}
                                className="w-full border rounded px-1 py-1 text-xs bg-white"
                              >
                                <option value="unfulfilled">Unfulfilled</option>
                                <option value="fulfilled">Fulfilled</option>
                              </select>
                            </td>

                            <td rowSpan={productList.length} className="px-1 sm:px-2 py-2 sm:py-4 align-middle text-center text-xs">
                              <div className="truncate" title={order.shipping_method || 'N/A'}>
                                {order.shipping_method || 'N/A'}
                              </div>
                            </td>

                            {!["Local Pickup", "Hand Delivery (In Person)"].includes(order.shipping_method) ? (
                              <>
                                <td rowSpan={productList.length} className="px-1 sm:px-2 py-2 sm:py-4 align-middle text-center text-xs">
                                  {order.tracking_number ? (
                                    <a
                                      href={`https://track.shippo.com/${order.tracking_number}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 underline break-all"
                                      title={order.tracking_number}
                                    >
                                      {order.tracking_number.length > 12 
                                        ? `${order.tracking_number.substring(0, 12)}...` 
                                        : order.tracking_number}
                                    </a>
                                  ) : '—'}
                                </td>

                                <td rowSpan={productList.length} className="px-1 sm:px-2 py-2 sm:py-4 align-middle text-center">
                                  {order.label_url ? (
                                    <a
                                      href={order.label_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-blue-500 text-white px-1 sm:px-2 py-1 rounded text-xs hover:bg-blue-600 inline-block"
                                    >
                                      View <br />
                                      Label
                                    </a>
                                  ) : '—'}
                                </td>
                              </>
                            ) : (
                              <>
                                <td rowSpan={productList.length} className="px-1 sm:px-2 py-2 sm:py-4 align-middle text-center text-xs">—</td>
                                <td rowSpan={productList.length} className="px-1 sm:px-2 py-2 sm:py-4 align-middle text-center text-xs">—</td>
                              </>
                            )}

                            <td rowSpan={productList.length} className="px-1 sm:px-2 py-2 sm:py-4 align-middle text-center">
                              <button
                                onClick={() => handleViewSlip(order.id)}
                                className="bg-[#2f5d50] text-white px-1 sm:px-2 py-1 rounded hover:bg-[#24493f] text-xs whitespace-nowrap"
                              >
                                Packing <br /> 
                                Slip
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showManualOrderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 pt-10 sm:pt-20 p-4">
            <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto relative shadow-xl">
              <button
                onClick={() => setShowManualOrderModal(false)}
                className="absolute top-2 right-4 text-gray-600 text-xl sm:text-2xl"
              >
                &times;
              </button>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">Manual Order Entry</h2>
              <ManualOrderForm onClose={() => setShowManualOrderModal(false)} />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}