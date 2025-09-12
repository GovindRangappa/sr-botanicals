// src/pages/_app.tsx
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { CartProvider } from "@/context/CartContext";
import CartDrawer from "@/components/CartDrawer"; // 👈 import it

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CartProvider>
      <Component {...pageProps} />
      <CartDrawer /> {/* 👈 ensure this is here */}
    </CartProvider>
  );
}
