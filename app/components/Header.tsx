import Link from "next/link";
import { CartBadge } from "../cart/CartClient";
import { AuthControls } from "./AuthControls";
import { BrandMark } from "./BrandMark";

export function Header() {
  return (
    <header className="site-header">
      <div className="shell nav">
        <Link className="brand" href="/">
          <BrandMark />
          <span>
            Cloud <span>Nine</span>
          </span>
        </Link>
        <nav>
          <Link href="/products">Products</Link>
          <Link href="/#categories">Categories</Link>
          <Link href="/account">Account</Link>
        </nav>
        <div className="nav-actions">
          <Link className="icon-link" href="/products" aria-label="Search">
            ⌕
          </Link>
          <CartBadge />
          <AuthControls />
        </div>
      </div>
    </header>
  );
}
