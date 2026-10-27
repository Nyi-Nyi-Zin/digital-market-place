import { currentUser, telegramConnection } from "@marketplace/server/next-auth";
import { TelegramConnection } from "../../../components/TelegramConnection";
import { ProfileForm } from "../../../components/ProfileForm";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await currentUser();
  const telegram = await telegramConnection();
  return (
    <>
      <ProfileForm
        name={user?.name ?? ""}
        email={user?.email ?? ""}
        security={<TelegramConnection {...telegram} />}
      />
    </>
  );
}
