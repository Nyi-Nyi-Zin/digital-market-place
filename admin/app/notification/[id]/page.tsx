import { redirect } from "next/navigation";
import { currentUser } from "@marketplace/server/next-auth";
export const dynamic = "force-dynamic";
export default async function NotificationLink({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) redirect("/notifications");
  const user = await currentUser();
  if (!user)
    redirect("/sign-in?next=" + encodeURIComponent("/notification/" + id));
  if (user.role !== "admin") redirect("/access-denied");
  redirect("/notifications?notification=" + id);
}
