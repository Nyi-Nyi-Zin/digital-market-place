import { redirect } from "next/navigation";
import { currentUser } from "../lib/auth";
export const dynamic = "force-dynamic";
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await currentUser())) redirect("/sign-in?next=/account");
  return children;
}
