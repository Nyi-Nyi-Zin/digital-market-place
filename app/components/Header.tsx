import Link from "next/link";

export function Header() {
  return <header className="site-header"><div className="shell nav"><Link className="brand" href="/"><span className="brand-mark">M</span><span>Market<span>place</span></span></Link><nav><Link href="/products">Products</Link><Link href="/products#categories">Categories</Link><Link href="/account">Account</Link></nav><div className="nav-actions"><Link className="icon-link" href="/products" aria-label="Search">⌕</Link><Link className="cart-link" href="/cart">Cart <b>0</b></Link><a className="button button-primary" href="/api/auth/login">Sign in</a></div></div></header>;
}
