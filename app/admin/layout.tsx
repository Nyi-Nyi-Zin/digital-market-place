import { redirect } from "next/navigation";
import { currentUser } from "../lib/auth";
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/admin");
  if (user.role !== "admin") redirect("/account");
  return children;
}
