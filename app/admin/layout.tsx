import { redirect } from "next/navigation";
import { currentUser } from "../lib/auth";
import { Header } from "../components/Header";
import { AdminNav } from "./AdminNav";
import "./admin.css";
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/admin");
  if (user.role !== "admin") redirect("/account");
  return (
    <>
      <Header />
      <div className="shell admin-workspace">
        <AdminNav />
        <main className="admin-main">{children}</main>
      </div>
    </>
  );
}
