'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { ShoppingBagIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export default function NavBar() {
  const { cart, toggleCart } = useCart();
  const cartItemCount = cart?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Shop', href: '/shop' },
    { name: 'Contact', href: '/contact' },
    { name: 'Admin', href: '/admin/login' },
  ];

  return (
    <>
      {/* Desktop Nav */}
      <nav className="hidden md:flex relative items-center justify-center py-6 bg-white shadow-md">
        {/* Logo Left */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="SR Botanicals Logo"
              width={110}
              height={110}
              className="hover:scale-105 transition-transform"
            />
          </Link>
        </div>

        {/* Nav Links Right */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-5 text-base md:text-lg font-medium text-gray-700 font-['Playfair_Display']">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href}>
              <span className="hover:text-green-700 transition">{link.name}</span>
            </Link>
          ))}

          <button onClick={toggleCart} className="relative">
            <ShoppingBagIcon className="w-6 h-6 text-green-900 hover:text-green-700 transition" />
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-1.5">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>

        {/* Title Center */}
        <h1 className="text-4xl md:text-5xl tracking-wide text-green-900 font-[Italiana] text-center">
          SR Botanicals
        </h1>
      </nav>

      {/* Mobile Nav */}
      <nav className="md:hidden bg-white shadow-md p-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/">
          <Image src="/logo.png" alt="SR Botanicals Logo" width={60} height={60} />
        </Link>

        {/* Title */}
        <h1 className="text-2xl font-[Italiana] text-green-900">SR Botanicals</h1>

        {/* Icons */}
        <div className="flex items-center space-x-3">
          <button onClick={toggleCart} className="relative">
            <ShoppingBagIcon className="w-6 h-6 text-green-900" />
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-1.5">
                {cartItemCount}
              </span>
            )}
          </button>
          <button onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? (
              <XMarkIcon className="w-6 h-6 text-green-900" />
            ) : (
              <Bars3Icon className="w-6 h-6 text-green-900" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-[#f5f2ea] text-[#3c2f2f] font-['Playfair_Display'] px-4 pb-4 shadow-md">
          <ul className="space-y-2 text-base">
            {navLinks.map(link => (
              <li key={link.href}>
                <Link href={link.href} onClick={() => setMenuOpen(false)}>
                  <span className="block py-2 border-b border-gray-300 hover:text-green-700 transition">
                    {link.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
