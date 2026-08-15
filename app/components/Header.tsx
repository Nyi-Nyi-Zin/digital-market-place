import Link from "next/link";

export function Header() {
  return <header className="site-header"><div className="shell nav"><Link className="brand" href="/"><span className="brand-mark" style={{ overflow: "hidden", display: "grid", placeItems: "center", background: "#fff" }}><img src="/manus-storage/cloud-nine-logo_7fdf2201.png" alt="Cloud Nine logo" width="38" height="38" style={{ width: "38px", height: "38px", objectFit: "cover" }} /></span><span>Cloud <span>Nine</span></span></Link><nav><Link href="/products">Products</Link><Link href="/products#categories">Categories</Link><Link href="/account">Account</Link></nav><div className="nav-actions"><Link className="icon-link" href="/products" aria-label="Search">⌕</Link><Link className="cart-link" href="/cart">Cart <b>0</b></Link><a className="button button-primary" href="/api/auth/login">Sign in</a></div></div></header>;
}
