'use client';

import AdminLayout from '@/components/AdminLayout';
import { useAdminGuard } from '@/hooks/useAdminGuard'; // ✅ Add this line
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import NavBar from "@/components/NavBar";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import dynamic from "next/dynamic";
import "react-datepicker/dist/react-datepicker.css";

const DatePicker = dynamic(() => import("react-datepicker"), { ssr: false });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const FILTER_OPTIONS = [
  { label: "All Time", value: "all" },
  { label: "Last 7 Days", value: "7" },
  { label: "Last 30 Days", value: "30" },
  { label: "Custom Range", value: "custom" },
];

export default function SalesAnalytics() {
  useAdminGuard(); // ✅ Protect this page

  const [totalSales, setTotalSales] = useState<number>(0);
  const [orderCount, setOrderCount] = useState<number>(0);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [salesByDate, setSalesByDate] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);


  
  useEffect(() => {
    async function fetchAnalytics() {
      let query = supabase
        .from("orders")
        .select("id, created_at, customer_email, first_name, last_name, products")
        .eq("status", "paid");

      if (filter === "7" || filter === "30") {
        const days = parseInt(filter);
        const from = new Date();
        from.setDate(from.getDate() - days);
        query = query.gte("created_at", from.toISOString());
      }

      if (filter === "custom" && fromDate && toDate) {
        query = query
          .gte("created_at", fromDate.toISOString())
          .lte("created_at", toDate.toISOString());
      }

      const { data: salesData } = await query;

      if (salesData) {
        const total = salesData.reduce((sum, order) => {
          return sum + order.products.reduce(
            (pSum: number, p) => pSum + p.price * p.quantity,
            0
          );
        }, 0);

        setTotalSales(total);
        setOrderCount(salesData.length);

        const grouped: Record<string, number> = {};
        salesData.forEach(order => {
          order.products.forEach(p => {
            grouped[p.name] = (grouped[p.name] || 0) + p.quantity;
          });
        });

        const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
        setTopProducts(sorted.slice(0, 5));


        const groupedByDate: Record<string, number> = {};
        salesData.forEach(order => {
          const date = new Date(order.created_at).toLocaleDateString();
          if (!groupedByDate[date]) groupedByDate[date] = 0;

          order.products.forEach(p => {
            groupedByDate[date] += p.price * p.quantity;
          });
        });

        const formattedData = Object.entries(groupedByDate).map(
          ([date, total]: any) => ({ date, total })
        );

        setSalesByDate(
          formattedData.sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          )
        );


        const recentOrders = salesData
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .flatMap(order =>
            order.products.map(p => ({
              ...p,
              created_at: order.created_at,
              customer_email: order.customer_email,
              customer_name: `${order.first_name ?? ""} ${order.last_name ?? ""}`.trim() || "Unknown Customer",
            }))
          )
          .slice(0, 5);


        setRecentOrders(recentOrders);
      }
    }

    fetchAnalytics();
  }, [filter, fromDate, toDate]);

  return (
    <AdminLayout>
    <>
      <main className="min-h-screen bg-[#f5f2ea] text-[#3c2f2f] px-6 py-10 font-garamond">
        <h1 className="text-3xl text-center font-bold mb-6">Sales Analytics</h1>

        <div className="flex justify-center items-center gap-4 mb-6 flex-wrap text-center">
          <label className="font-semibold text-lg">Filter By:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-center"
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {filter === "custom" && (
            <div className="flex items-center gap-2">
              <DatePicker
                selected={fromDate}
                onChange={(date) => setFromDate(date)}
                selectsStart
                startDate={fromDate}
                endDate={toDate}
                placeholderText="From Date"
                className="border border-gray-300 rounded px-2 py-1"
              />
              <DatePicker
                selected={toDate}
                onChange={(date) => setToDate(date)}
                selectsEnd
                startDate={fromDate}
                endDate={toDate}
                minDate={fromDate}
                placeholderText="To Date"
                className="border border-gray-300 rounded px-2 py-1"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded shadow text-center">
            <h2 className="text-lg font-semibold">Total Revenue</h2>
            <p className="text-2xl text-green-800 mt-2">${totalSales.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded shadow text-center">
            <h2 className="text-lg font-semibold">Total Orders</h2>
            <p className="text-2xl text-green-800 mt-2">{orderCount}</p>
          </div>
          <div className="bg-white p-6 rounded shadow text-center">
            <h2 className="text-lg font-semibold">Top Product</h2>
            <p className="text-2xl text-green-800 mt-2">
              {topProducts[0]?.[0] || "No Sales Yet"}
            </p>
          </div>
        </div>


        <h2 className="text-2xl text-center font-semibold mb-4">Top Selling Products</h2>
        <div className="bg-white p-4 rounded shadow mb-10">
          <ul>
            {topProducts.map(([name, qty]: any) => (
              <li key={name} className="flex justify-between py-2 border-b">
                <span>{name}</span>
                <span className="font-semibold">{qty} sold</span>
              </li>
            ))}
          </ul>
        </div>

        <h2 className="text-2xl text-center font-semibold mb-4">Sales Over Time</h2>
        <div className="bg-white p-4 rounded shadow mb-10">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesByDate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#2f5d50"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <h2 className="text-2xl text-center font-semibold mb-4">Recent Orders</h2>
        <div className="bg-white p-4 rounded shadow mb-10">
        <ul>
            {recentOrders.map((order) => (
            <li
                key={order.id}
                className="flex justify-between items-center py-2 border-b"
            >
                <div>
                <p className="font-semibold">{order.customer_name || "Unknown Customer"}</p>
                <p className="text-sm text-gray-600">{order.product_name} × {order.quantity}</p>
                </div>
                <div className="text-right">
                <p className="font-semibold">${(order.price * order.quantity).toFixed(2)}</p>
                <p className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                </p>
                </div>
            </li>
            ))}
        </ul>
        </div>
      </main>
    </>
    </AdminLayout>
  );
}
