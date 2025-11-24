'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NavBar from './NavBar';
import { useState } from 'react';

const adminLinks = [
  { name: 'Orders', path: '/admin/orders' },
  { name: 'Customer Memory', path: '/admin/customers' },
  { name: 'Sales Analytics', path: '/admin/sales-analytics' },
  { name: 'Add Product', path: '/admin/add-product' },
  { name: 'Edit Product', path: '/admin/edit-product' },
  { name: 'Review Approval', path: '/admin/review-approval' },
  { name: 'Inbox', path: '/admin/inbox' },
  { name: 'Storage Cleanup', path: '/admin/storage-cleanup' },
  { name: 'Logout', path: '/admin/logout' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f2ea] text-[#3c2f2f] font-['Playfair_Display']">
      <NavBar />

      {/* Mobile Menu Toggle */}
      <div className="md:hidden p-4">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="text-sm bg-[#2f5d50] text-white px-4 py-2 rounded shadow"
        >
          Open Admin Menu
        </button>
      </div>

      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block min-w-[10rem] bg-[#e2dfd0] shadow-md p-4 h-screen sticky top-0">
          <h2 className="text-xl font-bold mb-6 text-[#184c43]">Admin Panel</h2>
          <ul className="space-y-3">
            {adminLinks.map((link) => (
              <li key={link.path}>
                <Link
                  href={link.path}
                  className={`block py-2 px-3 rounded hover:bg-[#d5d2c3] transition ${
                    pathname === link.path ? 'bg-[#c2bfaf] font-semibold' : ''
                  }`}
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* Mobile Sidebar (Drawer) */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-30">
            <div className="w-3/4 max-w-xs h-full bg-[#f5f2ea] p-6 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[#184c43]">Admin Panel</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-bold"
                >
                  &times;
                </button>
              </div>
              <ul className="space-y-3">
                {adminLinks.map((link) => (
                  <li key={link.path}>
                    <Link
                      href={link.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block py-2 px-3 rounded hover:bg-[#d5d2c3] transition ${
                        pathname === link.path ? 'bg-[#c2bfaf] font-semibold' : ''
                      }`}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}
