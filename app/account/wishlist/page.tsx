import Link from "next/link";
import { Header } from "../../components/Header";
import { WishlistClient } from "./WishlistClient";

export default function WishlistPage() {
  return (
    <>
      <Header />
      <main className="shell simple-page">
        <p className="eyebrow plain">SAVED FOR LATER</p>
        <h1>Wishlist</h1>
        <WishlistClient />
        <Link className="button button-secondary library-link" href="/products">
          Browse products
        </Link>
      </main>
    </>
  );
}
