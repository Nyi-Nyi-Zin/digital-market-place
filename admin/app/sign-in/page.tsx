import { AuthForm } from "../../components/AuthForm";
import { AuthLayout } from "../../components/AuthLayout";
import {
  isGoogleOAuthEnabled,
  isTelegramOAuthEnabled,
} from "@marketplace/server/oauth";
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <AuthLayout>
      <AuthForm
        mode="sign-in"
        googleEnabled={isGoogleOAuthEnabled()}
        telegramEnabled={isTelegramOAuthEnabled()}
      />
    </AuthLayout>
  );
}
