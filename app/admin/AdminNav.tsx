"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [
  ["/admin", "Overview"],
  ["/admin/products", "Products"],
  ["/admin/categories", "Categories"],
  ["/admin/orders", "Orders"],
  ["/admin/payments", "Payments"],
  ["/admin/settings/payment", "Payment settings"],
];
export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="Admin navigation">
      {links.map(([href, label]) => (
        <Link
          href={href}
          key={href}
          aria-current={path === href ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
