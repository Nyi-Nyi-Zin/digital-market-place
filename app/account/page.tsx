import Link from "next/link";
import { Header } from "../components/Header";
import { currentUser } from "../lib/auth";
import { ProfileForm } from "./ProfileForm";
export const dynamic = "force-dynamic";
export default async function AccountPage() {
  const user = await currentUser();
  return (
    <>
      <Header />
      <main className="shell simple-page">
        <p className="eyebrow plain">YOUR WORKSPACE</p>
        <h1>Account</h1>
        {user?.role === "admin" && (
          <Link className="button button-primary" href="/admin">
            Open admin panel
          </Link>
        )}
        <div className="account-grid">
          {[
            [
              "purchases",
              "My purchases",
              "Order status and approved downloads",
            ],
            ["wishlist", "Wishlist", "Products saved for later"],
            ["notifications", "Notifications", "Payment and product updates"],
          ].map(([path, title, body]) => (
            <Link href={`/account/${path}`} key={path}>
              <h2>{title}</h2>
              <p>{body}</p>
            </Link>
          ))}
        </div>
        <ProfileForm name={user?.name ?? ""} email={user?.email ?? ""} />
      </main>
    </>
  );
}
