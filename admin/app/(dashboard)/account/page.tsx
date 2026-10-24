import { currentUser } from "@marketplace/server/next-auth";
import { ProfileForm } from "../../../components/ProfileForm";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await currentUser();
  return (
    <>
      <ProfileForm name={user?.name ?? ""} email={user?.email ?? ""} />
    </>
  );
}
