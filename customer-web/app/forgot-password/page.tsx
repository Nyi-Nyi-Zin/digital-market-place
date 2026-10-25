import { AuthLayout } from "../components/AuthLayout";
import { AuthForm } from "../components/AuthForm";
export default function Page() {
  return (
    <AuthLayout>
      <AuthForm mode="forgot-password" />
    </AuthLayout>
  );
}
