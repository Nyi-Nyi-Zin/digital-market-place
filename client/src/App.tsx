import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Purchases from "./pages/Purchases";
import Admin from "./pages/Admin";
import Account from "./pages/Account";
import { createContext, useContext, useMemo, useState } from "react";

export type CartItem = { productId: number; title: string; price: number; thumbnailKey?: string | null };
type CartContextValue = { items: CartItem[]; add: (item: CartItem) => void; remove: (id: number) => void; clear: () => void };
const CartContext = createContext<CartContextValue | null>(null);
export const useCart = () => { const ctx = useContext(CartContext); if (!ctx) throw new Error("Cart context missing"); return ctx; };

function Router() { return <Switch><Route path="/" component={Home} /><Route path="/products" component={Products} /><Route path="/products/:slug" component={ProductDetail} /><Route path="/cart" component={Cart} /><Route path="/checkout" component={Checkout} /><Route path="/account/purchases" component={Purchases} /><Route path="/account" component={Account} /><Route path="/account/wishlist" component={Account} /><Route path="/account/notifications" component={Account} /><Route path="/admin" component={Admin} /><Route path="/admin/settings/payment" component={Admin} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>; }

function App() {
  const [items, setItems] = useState<CartItem[]>([]);
  const cart = useMemo(() => ({ items, add: (item: CartItem) => setItems(prev => prev.some(x => x.productId === item.productId) ? prev : [...prev, item]), remove: (id: number) => setItems(prev => prev.filter(x => x.productId !== id)), clear: () => setItems([]) }), [items]);
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><CartContext.Provider value={cart}><Toaster /><Router /></CartContext.Provider></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
export default App;
