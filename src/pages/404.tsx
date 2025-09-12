// pages/404.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import {
  Home,
  ShoppingBag,
  ShoppingCart,
  Info,
  Mail,
  Sparkles,
  Droplets,
  ArrowLeft,
} from "lucide-react";

export default function NotFoundPage() {
  const router = useRouter();

  const links = [
    { href: "/", label: "Home", Icon: Home },
    { href: "/shop", label: "Shop", Icon: ShoppingBag },
    // Deep links to your main shop sections (feel free to adjust anchors/paths)
    { href: "/shop#Skin-Soaps", label: "Skin · Soaps", Icon: Sparkles },
    { href: "/shop#Hair-Oils", label: "Hair · Oils & Pomades", Icon: Droplets },
    { href: "/about", label: "About", Icon: Info },
    { href: "/contact", label: "Contact", Icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-[#f5f2e8] text-[#3c2f2f] flex flex-col">
      {/* Keep site chrome for familiarity */}
      <NavBar />

      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-4 py-20">
          <div className="text-center mb-10">
            <p className="text-sm tracking-widest text-[#3c2f2f]/70">ERROR</p>
            <h1 className="text-6xl md:text-7xl font-['Playfair_Display'] font-bold mb-4">
              404
            </h1>
            <p className="text-lg md:text-xl font-garamond">
              Oops—looks like this page wandered off the garden path.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-white border border-[#ccc] shadow-sm hover:shadow transition font-garamond"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </button>

            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-[#2f5d50] text-white hover:bg-[#24493f] transition shadow-md font-garamond"
            >
              Return Home
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {links.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="group rounded-2xl bg-white border border-[#e3dfd2] p-5 shadow-sm hover:shadow-md transition flex items-center gap-3"
              >
                <div className="p-2 rounded-xl bg-[#f5f2e8] border border-[#e8e3d6]">
                  <Icon className="w-6 h-6 text-[#2f5d50]" />
                </div>
                <span className="font-garamond text-lg group-hover:underline">
                  {label}
                </span>
              </Link>
            ))}
          </div>

          <p className="text-center mt-10 text-sm text-[#3c2f2f]/70 font-garamond">
            Still stuck?{" "}
            <Link href="/contact" className="underline hover:no-underline">
              Contact us
            </Link>{" "}
            and we’ll help you find what you need.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
