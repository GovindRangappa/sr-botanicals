'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CustomerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string | null;
};

type OrderProduct = {
  name?: string;
  size?: string | null;
  price?: number | null;
  quantity?: number | null;
};

type OrderRow = {
  id: string;
  customer_email: string | null;
  first_name: string | null;
  last_name: string | null;
  products: OrderProduct[] | string | null;
  subtotal: number | null;
  tax: number | null;
  shipping_cost: number | null;
  status: string | null;
  payment_method: string | null;
  fulfillment_status: string | null;
  shipping_method: string | null;
  shipping_name: string | null;
  shipping_street1: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  created_at: string | null;
};

type MessageRow = {
  id: string;
  customer_id: string | null;
  sender: string | null;
  message: string | null;
  type: string | null;
  created_at: string | null;
};

type AddressSummary = {
  street: string;
  city: string;
  state: string;
  zip: string;
  lastUsed: string;
};

type OrderSummary = OrderRow & { products: OrderProduct[] };

type CustomerProfile = {
  key: string;
  id: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  createdAt: string | null;
  firstSeenAt: string | null;
  orders: OrderSummary[];
  messages: MessageRow[];
  shippingAddresses: AddressSummary[];
  totalOrders: number;
  totalSpend: number;
  lastOrderAt: string | null;
  lastMessageAt: string | null;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const dateFormatter = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function AdminCustomersPage() {
  useAdminGuard();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<CustomerProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);

  useEffect(() => {
    async function fetchCustomerMemory() {
      setLoading(true);
      setError(null);

      try {
        const [customersRes, ordersRes, messagesRes] = await Promise.all([
          supabase.from('customers').select('*'),
          supabase
            .schema('public')
            .from('orders')
            .select('*'),
          supabase.from('messages').select('*'),
        ]);

        if (customersRes.error) throw customersRes.error;
        if (ordersRes.error) throw ordersRes.error;
        if (messagesRes.error) throw messagesRes.error;

        const customers = (customersRes.data ?? []) as CustomerRow[];
        const orders = (ordersRes.data ?? []) as OrderRow[];
        const messages = (messagesRes.data ?? []) as MessageRow[];

        const profileMap = new Map<string, CustomerProfile>();
        const customerIdToKey = new Map<string, string>();
        const addressTracker = new Map<string, Map<string, AddressSummary>>();

        customers.forEach(customer => {
          const key = (customer.email || customer.id).toLowerCase();
          profileMap.set(key, {
            key,
            id: customer.id,
            firstName: customer.first_name ?? '',
            lastName: customer.last_name ?? '',
            email: customer.email,
            phone: customer.phone ?? null,
            createdAt: customer.created_at,
            firstSeenAt: customer.created_at,
            orders: [],
            messages: [],
            shippingAddresses: [],
            totalOrders: 0,
            totalSpend: 0,
            lastOrderAt: null,
            lastMessageAt: null,
          });

          customerIdToKey.set(customer.id, key);
        });

        const ensureProfile = (email: string | null, fallback: Partial<CustomerProfile>) => {
          const normalizedEmail = (email ?? '').trim().toLowerCase();

          let key = normalizedEmail;
          if (!key) {
            if (fallback.key) {
              key = fallback.key;
            } else if (fallback.id) {
              key = `customer-${fallback.id}`;
            } else {
              key = `customer-${Math.random().toString(36).slice(2, 10)}`;
            }
          }

          if (!profileMap.has(key)) {
            profileMap.set(key, {
              key,
              id: (fallback.id ?? null) as string | null,
              firstName: fallback.firstName ?? '',
              lastName: fallback.lastName ?? '',
              email: normalizedEmail || fallback.email || email || null,
              phone: fallback.phone ?? null,
              createdAt: fallback.createdAt ?? null,
              firstSeenAt: fallback.firstSeenAt ?? fallback.createdAt ?? null,
              orders: [],
              messages: [],
              shippingAddresses: [],
              totalOrders: 0,
              totalSpend: 0,
              lastOrderAt: null,
              lastMessageAt: null,
            });
          }

          const profile = profileMap.get(key)!;
          if (!profile.phone && fallback.phone) {
            profile.phone = fallback.phone;
          }

          return profile;
        };

        orders.forEach(order => {
          const products = normalizeProducts(order.products);
          const profile = ensureProfile(order.customer_email, {
            firstName: order.first_name ?? '',
            lastName: order.last_name ?? '',
            createdAt: order.created_at ?? null,
            phone: (order as any).phone ?? null,
          });

          if (!profile.firstName && order.first_name) profile.firstName = order.first_name;
          if (!profile.lastName && order.last_name) profile.lastName = order.last_name;
          if (!profile.email && order.customer_email) profile.email = order.customer_email;
          if (!profile.phone && (order as any).phone) profile.phone = (order as any).phone;

          const enrichedOrder: OrderSummary = {
            ...order,
            products,
          };

          profile.orders.push(enrichedOrder);

          if (order.created_at) {
            if (!profile.lastOrderAt || new Date(order.created_at) > new Date(profile.lastOrderAt)) {
              profile.lastOrderAt = order.created_at;
            }

            if (!profile.firstSeenAt || new Date(order.created_at) < new Date(profile.firstSeenAt)) {
              profile.firstSeenAt = order.created_at;
            }
          }

          if (order.shipping_street1) {
            const addressKey = [
              order.shipping_street1,
              order.shipping_city,
              order.shipping_state,
              order.shipping_zip,
            ]
              .map(part => part ?? '')
              .join('|');

            if (!addressTracker.has(profile.key)) {
              addressTracker.set(profile.key, new Map());
            }

            const profileAddresses = addressTracker.get(profile.key)!;
            const lastUsed = order.created_at ?? new Date().toISOString();
            const existing = profileAddresses.get(addressKey);

            if (!existing || new Date(lastUsed) > new Date(existing.lastUsed)) {
              profileAddresses.set(addressKey, {
                street: order.shipping_street1 ?? '',
                city: order.shipping_city ?? '',
                state: order.shipping_state ?? '',
                zip: order.shipping_zip ?? '',
                lastUsed,
              });
            }
          }
        });

        messages.forEach(message => {
          if (!message.customer_id) return;
          const key = customerIdToKey.get(message.customer_id);
          if (!key) return;
          const profile = profileMap.get(key);
          if (!profile) return;

          profile.messages.push(message);

          if (message.created_at) {
            if (!profile.lastMessageAt || new Date(message.created_at) > new Date(profile.lastMessageAt)) {
              profile.lastMessageAt = message.created_at;
            }

            if (!profile.firstSeenAt || new Date(message.created_at) < new Date(profile.firstSeenAt)) {
              profile.firstSeenAt = message.created_at;
            }
          }
        });

        const consolidatedProfiles = Array.from(profileMap.values()).map(profile => {
          profile.orders.sort(sortByDateDesc(order => order.created_at));
          profile.messages.sort(sortByDateDesc(message => message.created_at));

          const totalSpend = profile.orders.reduce((sum, order) => {
            const subtotal = Number(order.subtotal ?? 0);
            const tax = Number(order.tax ?? 0);
            const shipping = Number(order.shipping_cost ?? 0);
            return sum + subtotal + tax + shipping;
          }, 0);

          const addresses = Array.from(addressTracker.get(profile.key)?.values() ?? []).sort(
            (a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
          );

          return {
            ...profile,
            totalOrders: profile.orders.length,
            totalSpend,
            shippingAddresses: addresses,
          };
        });

        setProfiles(
          consolidatedProfiles.sort((a, b) => {
            if (a.lastOrderAt && b.lastOrderAt) {
              return new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime();
            }
            if (a.lastOrderAt) return -1;
            if (b.lastOrderAt) return 1;
            return (b.firstSeenAt ? new Date(b.firstSeenAt).getTime() : 0) -
              (a.firstSeenAt ? new Date(a.firstSeenAt).getTime() : 0);
          })
        );
      } catch (err: any) {
        console.error('Failed to load customer memory', err);
        setError(err.message ?? 'Failed to load customer memory');
      } finally {
        setLoading(false);
      }
    }

    fetchCustomerMemory();
  }, []);

  const filteredProfiles = useMemo(() => {
    if (!searchTerm) return profiles;
    const term = searchTerm.toLowerCase();

    return profiles.filter(profile => {
      return (
        profile.firstName.toLowerCase().includes(term) ||
        profile.lastName.toLowerCase().includes(term) ||
        (profile.email ?? '').toLowerCase().includes(term) ||
        (profile.phone ?? '').toLowerCase().includes(term)
      );
    });
  }, [profiles, searchTerm]);

  const metrics = useMemo(() => {
    if (!profiles.length) {
      return {
        totalCustomers: 0,
        repeatCustomers: 0,
        totalSpend: 0,
        averageSpend: 0,
      };
    }

    const totalSpend = profiles.reduce((sum, profile) => sum + profile.totalSpend, 0);
    const repeatCustomers = profiles.filter(profile => profile.totalOrders > 1).length;
    const uniqueCustomers = profiles.length;

    return {
      totalCustomers: uniqueCustomers,
      repeatCustomers,
      totalSpend,
      averageSpend: totalSpend / uniqueCustomers,
    };
  }, [profiles]);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#f5f2ea] text-[#184c43] p-4 sm:p-6 lg:p-8 font-['Playfair_Display']">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Customer Memory</h1>
            <p className="text-sm text-[#2f5d50] mt-1">
              View every customer with their purchase history, conversations, and key insights.
            </p>
          </div>

          <input
            type="search"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder="Search customers..."
            className="w-full md:w-64 px-4 py-2 rounded-full border border-[#c0b9a0] bg-white focus:outline-none focus:ring-2 focus:ring-[#2f5d50]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <MetricCard label="Customers" value={metrics.totalCustomers.toString()} />
          <MetricCard label="Repeat Buyers" value={metrics.repeatCustomers.toString()} />
          <MetricCard label="Total Spend" value={currencyFormatter.format(metrics.totalSpend)} />
          <MetricCard label="Avg. Lifetime Value" value={currencyFormatter.format(metrics.averageSpend || 0)} />
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">Loading customer memory...</div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-red-600">{error}</div>
        ) : filteredProfiles.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-[#2f5d50]">
            No customers match your search.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="min-w-[900px] w-full text-left">
              <thead className="bg-[#e8e3d5] text-xs uppercase tracking-wide text-[#184c43]">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3 text-center">Orders</th>
                  <th className="px-4 py-3 text-right">Lifetime Spend</th>
                  <th className="px-4 py-3">Last Purchase</th>
                  <th className="px-4 py-3">Last Contact</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredProfiles.map(profile => (
                  <tr key={profile.key} className="border-t border-[#efe9d9] hover:bg-[#fdfbf4] transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#184c43]">
                        {formatName(profile.firstName, profile.lastName)}
                      </div>
                      <div className="text-xs text-[#5f5a49]">
                        First seen {dateFormatter(profile.firstSeenAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{profile.email ?? '—'}</div>
                      {profile.phone && (
                        <div className="text-xs text-[#5f5a49]">{profile.phone}</div>
                      )}
                      {profile.shippingAddresses[0] && (
                        <div className="text-xs text-[#5f5a49]">
                          {profile.shippingAddresses[0].city}, {profile.shippingAddresses[0].state}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-[#184c43]">
                      {profile.totalOrders}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#184c43]">
                      {currencyFormatter.format(profile.totalSpend)}
                    </td>
                    <td className="px-4 py-3 text-sm">{dateFormatter(profile.lastOrderAt)}</td>
                    <td className="px-4 py-3 text-sm">{dateFormatter(profile.lastMessageAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedCustomer(profile)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-[#2f5d50] rounded-full hover:bg-[#24493f]"
                      >
                        View Memory
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCustomer && (
        <CustomerDetailDrawer
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </AdminLayout>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-xs uppercase tracking-wide text-[#5f5a49]">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-[#184c43]">{value}</div>
    </div>
  );
}

function CustomerDetailDrawer({
  customer,
  onClose,
}: {
  customer: CustomerProfile;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-end z-50">
      <div className="w-full max-w-4xl h-full bg-[#f5f2ea] shadow-xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#e8e3d5] border-b border-[#dcd6c4] px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-[#184c43]">
              {formatName(customer.firstName, customer.lastName)}
            </h2>
            <p className="text-sm text-[#2f5d50]">{customer.email ?? 'No email on file'}</p>
            {customer.phone && (
              <p className="text-sm text-[#2f5d50]">Phone: {customer.phone}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-[#184c43] hover:text-[#2f5d50]"
            aria-label="Close customer detail"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-8">
          <section className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-[#184c43] mb-4">Lifetime Snapshot</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <SnapshotItem label="First Seen" value={dateFormatter(customer.firstSeenAt)} />
              <SnapshotItem label="Orders" value={customer.totalOrders.toString()} />
              <SnapshotItem
                label="Lifetime Spend"
                value={currencyFormatter.format(customer.totalSpend)}
              />
              <SnapshotItem label="Last Purchase" value={dateFormatter(customer.lastOrderAt)} />
            </div>
          </section>

          <section className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#184c43]">Purchase History</h3>
              <span className="text-xs text-[#5f5a49]">
                {customer.totalOrders === 0
                  ? 'No orders yet'
                  : `${customer.totalOrders} order${customer.totalOrders > 1 ? 's' : ''}`}
              </span>
            </div>

            {customer.orders.length === 0 ? (
              <p className="text-sm text-[#5f5a49]">No purchases recorded for this customer.</p>
            ) : (
              <div className="space-y-4">
                {customer.orders.map(order => (
                  <div key={order.id} className="border border-[#efe9d9] rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div>
                        <div className="font-semibold text-[#184c43]">
                          {dateFormatter(order.created_at)}
                        </div>
                        <div className="text-xs text-[#5f5a49]">
                          {order.shipping_method ?? 'Unknown method'}
                        </div>
                      </div>
                      <div className="text-sm text-[#184c43] font-semibold">
                        {currencyFormatter.format(
                          Number(order.subtotal ?? 0) +
                            Number(order.tax ?? 0) +
                            Number(order.shipping_cost ?? 0)
                        )}
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-[#5f5a49]">
                      Payment: {order.payment_method ?? 'Unknown'} • Status: {order.status ?? 'pending'} • Fulfillment:{' '}
                      {order.fulfillment_status ?? 'unfulfilled'}
                    </div>

                    {order.products.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm text-[#184c43]">
                        {order.products.map((product, index) => (
                          <li key={`${order.id}-product-${index}`} className="flex justify-between">
                            <span>
                              {product.name}
                              {product.size ? ` – ${product.size}` : ''}{' '}
                              <span className="text-xs text-[#5f5a49]">
                                × {product.quantity ?? 1}
                              </span>
                            </span>
                            <span className="text-xs text-[#5f5a49]">
                              {currencyFormatter.format((product.price ?? 0) * (product.quantity ?? 1))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#184c43]">Conversation History</h3>
              <span className="text-xs text-[#5f5a49]">
                {customer.messages.length} message{customer.messages.length === 1 ? '' : 's'}
              </span>
            </div>

            {customer.messages.length === 0 ? (
              <p className="text-sm text-[#5f5a49]">No conversations recorded for this customer.</p>
            ) : (
              <div className="space-y-4">
                {customer.messages.map(message => (
                  <div
                    key={message.id}
                    className="border border-[#efe9d9] rounded-lg p-4 bg-[#fdfbf4]"
                  >
                    <div className="flex justify-between text-xs text-[#5f5a49] mb-2">
                      <span className="uppercase tracking-wide font-semibold">
                        {message.sender === 'business' ? 'You' : 'Customer'}
                      </span>
                      <span>{dateFormatter(message.created_at)}</span>
                    </div>
                    <p className="text-sm text-[#184c43] whitespace-pre-line">
                      {message.message ?? ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-[#184c43] mb-4">Saved Addresses</h3>
            {customer.shippingAddresses.length === 0 ? (
              <p className="text-sm text-[#5f5a49]">No shipping addresses on record.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customer.shippingAddresses.map((address, index) => (
                  <div key={`${address.street}-${index}`} className="border border-[#efe9d9] rounded-lg p-4">
                    <div className="font-semibold text-[#184c43]">{address.street}</div>
                    <div className="text-sm text-[#184c43]">
                      {address.city}, {address.state} {address.zip}
                    </div>
                    <div className="text-xs text-[#5f5a49] mt-1">
                      Last used {dateFormatter(address.lastUsed)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SnapshotItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-[#5f5a49]">{label}</div>
      <div className="mt-1 text-lg font-semibold text-[#184c43]">{value}</div>
    </div>
  );
}

function formatName(first: string, last: string) {
  const trimmedFirst = first?.trim();
  const trimmedLast = last?.trim();

  if (trimmedFirst && trimmedLast) return `${trimmedFirst} ${trimmedLast}`;
  if (trimmedFirst) return trimmedFirst;
  if (trimmedLast) return trimmedLast;
  return 'Unknown Customer';
}

function sortByDateDesc<T>(accessor: (item: T) => string | null) {
  return (a: T, b: T) => {
    const first = accessor(a);
    const second = accessor(b);

    if (!first && !second) return 0;
    if (!first) return 1;
    if (!second) return -1;

    return new Date(second).getTime() - new Date(first).getTime();
  };
}

function normalizeProducts(products: OrderRow['products']): OrderProduct[] {
  if (Array.isArray(products)) {
    return products as OrderProduct[];
  }

  if (typeof products === 'string') {
    try {
      const parsed = JSON.parse(products);
      return Array.isArray(parsed) ? (parsed as OrderProduct[]) : [];
    } catch {
      return [];
    }
  }

  return [];
}

