// ✅ src/context/CartContext.tsx
import { createContext, useContext, useState, useEffect } from "react";

// Product type now uses stripe_price_id to distinguish variants
export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  stripe_price_id: string;
  weightOz?: number;
  quantity?: number;
  slug: string; 
};

type CartContextType = {
  cart: Product[];
  setCart: React.Dispatch<React.SetStateAction<Product[]>>;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (stripePriceId: string) => void;
  updateQuantity: (stripePriceId: string, quantity: number) => void;
  isCartOpen: boolean;
  toggleCart: () => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const toggleCart = () => setIsCartOpen((prev) => !prev);

  const addToCart = (product: Product, quantity: number = 1) => {
    setCart((prevCart) => {
      const existing = prevCart.find(
        (item) => item.stripe_price_id === product.stripe_price_id
      );
      if (existing) {
        return prevCart.map((item) =>
          item.stripe_price_id === product.stripe_price_id
            ? { ...item, quantity: (item.quantity || 1) + quantity }
            : item
        );
      } else {
        return [
          ...prevCart,
          {
            ...product,
            quantity,
            weightOz: product.weightOz ?? 4,
          },
        ];
      }
    });
  };

  const removeFromCart = (stripePriceId: string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.stripe_price_id !== stripePriceId)
    );
  };

  const updateQuantity = (stripePriceId: string, quantity: number) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.stripe_price_id === stripePriceId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("cart");
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        setCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        isCartOpen,
        toggleCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};