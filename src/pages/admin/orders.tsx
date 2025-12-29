'use client';

import AdminLayout from '@/components/AdminLayout';
import { useEffect, useState, useRef } from 'react';
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
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null);
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stickyScrollbarRef = useRef<HTMLDivElement>(null);

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

  // Sync sticky scrollbar with main scroll container
  useEffect(() => {
    const mainContainer = scrollContainerRef.current;
    const stickyScrollbar = stickyScrollbarRef.current;

    if (!mainContainer || !stickyScrollbar) return;

    // Sync scroll widths so they match
    const syncScrollWidths = () => {
      // Get the actual scrollable width from the inner div that contains the table
      const innerDiv = mainContainer.querySelector('div') as HTMLElement;
      // Use scrollWidth which includes all scrollable content
      const mainScrollWidth = innerDiv ? innerDiv.scrollWidth : mainContainer.scrollWidth;
      const mainClientWidth = mainContainer.clientWidth;
      const mainMaxScroll = mainScrollWidth - mainClientWidth;
      
      const stickyInnerDiv = stickyScrollbar.querySelector('div') as HTMLElement;
      const stickyClientWidth = stickyScrollbar.clientWidth;
      
      // The key issue: we need to ensure the sticky scrollbar's scrollable range matches
      // Calculate the width needed so that stickyScrollbar.scrollWidth - stickyScrollbar.clientWidth = mainMaxScroll
      // If stickyClientWidth is the current clientWidth of the sticky scrollbar,
      // we need: stickyScrollWidth - stickyClientWidth = mainMaxScroll
      // So: stickyScrollWidth = mainMaxScroll + stickyClientWidth
      const targetStickyScrollWidth = mainMaxScroll + stickyClientWidth;
      
      console.log('📊 [Scroll Sync] Width calculation:', {
        mainContainer: {
          scrollWidth: mainContainer.scrollWidth,
          clientWidth: mainContainer.clientWidth,
          scrollLeft: mainContainer.scrollLeft,
          maxScrollLeft: mainContainer.scrollWidth - mainContainer.clientWidth,
        },
        innerDiv: {
          scrollWidth: innerDiv?.scrollWidth,
          clientWidth: innerDiv?.clientWidth,
        },
        mainScrollWidth,
        mainClientWidth,
        mainMaxScroll,
        stickyScrollbar: {
          scrollWidth: stickyScrollbar.scrollWidth,
          clientWidth: stickyScrollbar.clientWidth,
          scrollLeft: stickyScrollbar.scrollLeft,
          maxScrollLeft: stickyScrollbar.scrollWidth - stickyScrollbar.clientWidth,
        },
        stickyInnerDiv: {
          currentWidth: stickyInnerDiv?.style.width,
          currentMinWidth: stickyInnerDiv?.style.minWidth,
        },
        targetStickyScrollWidth,
        calculation: `targetWidth = ${mainMaxScroll} + ${stickyClientWidth} = ${targetStickyScrollWidth}`,
      });
      
      if (stickyInnerDiv && mainScrollWidth > 0) {
        // Set width so that max scroll positions match
        // We want: stickyScrollbar.scrollWidth - stickyScrollbar.clientWidth = mainContainer.scrollWidth - mainContainer.clientWidth
        // So: stickyInnerDiv.width = mainMaxScroll + stickyScrollbar.clientWidth
        stickyInnerDiv.style.width = `${targetStickyScrollWidth}px`;
        stickyInnerDiv.style.minWidth = `${targetStickyScrollWidth}px`;
        stickyInnerDiv.style.maxWidth = `${targetStickyScrollWidth}px`;
        
        console.log('✅ [Scroll Sync] Updated sticky scrollbar width to:', targetStickyScrollWidth);
        
        // Log after a brief delay to see the updated values
        setTimeout(() => {
          const stickyMaxScrollAfter = stickyScrollbar.scrollWidth - stickyScrollbar.clientWidth;
          const mainMaxScrollAfter = mainContainer.scrollWidth - mainContainer.clientWidth;
          console.log('📊 [Scroll Sync] After update:', {
            stickyScrollbarScrollWidth: stickyScrollbar.scrollWidth,
            stickyScrollbarClientWidth: stickyScrollbar.clientWidth,
            stickyScrollbarMaxScrollLeft: stickyMaxScrollAfter,
            mainContainerMaxScrollLeft: mainMaxScrollAfter,
            match: Math.abs(stickyMaxScrollAfter - mainMaxScrollAfter) < 1, // Allow 1px tolerance
          });
        }, 50);
      }
    };

    // Initial sync with multiple attempts to ensure DOM is ready
    syncScrollWidths();
    requestAnimationFrame(() => {
      syncScrollWidths();
      setTimeout(syncScrollWidths, 100);
      setTimeout(syncScrollWidths, 500);
    });

    const handleScroll = () => {
      if (stickyScrollbar) {
        const mainScrollLeft = mainContainer.scrollLeft;
        const mainMaxScroll = mainContainer.scrollWidth - mainContainer.clientWidth;
        stickyScrollbar.scrollLeft = mainScrollLeft;
        console.log('🔄 [Scroll] Main container scrolled:', {
          scrollLeft: mainScrollLeft,
          maxScroll: mainMaxScroll,
          atMax: mainScrollLeft >= mainMaxScroll - 1,
          stickyScrollLeft: stickyScrollbar.scrollLeft,
        });
      }
    };

    const handleStickyScroll = () => {
      if (mainContainer) {
        const stickyScrollLeft = stickyScrollbar.scrollLeft;
        const stickyMaxScroll = stickyScrollbar.scrollWidth - stickyScrollbar.clientWidth;
        const mainMaxScroll = mainContainer.scrollWidth - mainContainer.clientWidth;
        mainContainer.scrollLeft = stickyScrollLeft;
        console.log('🔄 [Scroll] Sticky scrollbar scrolled:', {
          stickyScrollLeft,
          stickyMaxScroll,
          stickyAtMax: stickyScrollLeft >= stickyMaxScroll - 1,
          mainScrollLeft: mainContainer.scrollLeft,
          mainMaxScroll,
          mainAtMax: mainContainer.scrollLeft >= mainMaxScroll - 1,
          widthsMatch: stickyMaxScroll === mainMaxScroll,
        });
      }
    };

    mainContainer.addEventListener('scroll', handleScroll);
    stickyScrollbar.addEventListener('scroll', handleStickyScroll);

    // Watch for resize to keep widths in sync
    const resizeObserver = new ResizeObserver(() => {
      syncScrollWidths();
    });
    resizeObserver.observe(mainContainer);
    
    // Also observe the inner div that contains the table
    const innerDiv = mainContainer.querySelector('div') as HTMLElement;
    if (innerDiv) {
      resizeObserver.observe(innerDiv);
    }

    return () => {
      mainContainer.removeEventListener('scroll', handleScroll);
      stickyScrollbar.removeEventListener('scroll', handleStickyScroll);
      resizeObserver.disconnect();
    };
  }, [orders]);

  const handleViewSlip = async (orderId: string) => {
    try {
      const res = await fetch(`/api/generate-packing-slip?orderId=${orderId}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      alert('Failed to generate packing slip.');
    }
  };

  const handleFulfillmentChange = async (orderId: string, newStatus: string) => {
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

  const handleViewInvoice = async (orderId: string) => {
    try {
      setInvoiceLoadingId(orderId);
      const res = await fetch(`/api/orders/invoice-link?orderId=${orderId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch invoice');
      }

      const data = await res.json();
      const url = data.hostedInvoiceUrl || data.invoicePdfUrl || data.receiptUrl;

      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        alert('No invoice or receipt is available for this order yet.');
      }
    } catch (err) {
      console.error('Failed to open invoice:', err);
      alert('Could not load the invoice. Please try again later.');
    } finally {
      setInvoiceLoadingId(null);
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
      <div className="min-h-screen bg-[#f5f2ea] text-[#184c43] p-2 sm:p-4 lg:p-8 font-['Playfair_Display'] pb-20">
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
          <div className="relative pb-6">
            <div 
              ref={scrollContainerRef}
              className="w-full orders-table-scroll-container"
              onWheel={(e) => {
              // Enable horizontal scrolling with Shift + Mouse Wheel or trackpad horizontal scroll
              if (e.shiftKey && e.deltaY !== 0) {
                e.preventDefault();
                e.currentTarget.scrollLeft += e.deltaY;
              } else if (e.deltaX !== 0) {
                // Handle trackpad horizontal scrolling
                e.currentTarget.scrollLeft += e.deltaX;
              }
            }}
          >
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

                            {!["Local Pickup", "Hand Delivery"].includes(order.shipping_method) ? (
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
                              <div className="flex flex-col items-stretch gap-2">
                                <button
                                  onClick={() => handleViewSlip(order.id)}
                                  className="bg-[#2f5d50] text-white px-1 sm:px-2 py-1 rounded hover:bg-[#24493f] text-xs whitespace-nowrap"
                                >
                                  Packing <br />
                                  Slip
                                </button>
                                <button
                                  onClick={() => handleViewInvoice(order.id)}
                                  className="bg-[#184c43] text-white px-1 sm:px-2 py-1 rounded hover:bg-[#12362f] text-xs whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                                  disabled={invoiceLoadingId === order.id}
                                >
                                  {invoiceLoadingId === order.id ? 'Loading…' : 'Invoice'}
                                </button>
                              </div>
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
            {/* Fixed scrollbar that's always visible at bottom of viewport */}
            <div 
              ref={stickyScrollbarRef}
              className="fixed bottom-0 h-4 bg-[#f5f2ea] sticky-scrollbar z-50 md:left-[10rem] left-0 right-0"
            >
              <div style={{ minWidth: '1400px', height: '100%' }}></div>
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