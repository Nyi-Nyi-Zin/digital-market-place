import { redirect } from "next/navigation";
import { currentUser } from "@marketplace/server/next-auth";
import { AdminShell } from "../../components/AdminShell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=%2F");
  if (user.role !== "admin") redirect("/access-denied");
  return (
    <AdminShell name={user.name ?? user.email ?? ""}>{children}</AdminShell>
  );
}
