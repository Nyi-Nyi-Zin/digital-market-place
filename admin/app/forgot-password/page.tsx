import { AuthForm } from "../../components/AuthForm";
import { AuthLayout } from "../../components/AuthLayout";
export default function Page() {
  return (
    <AuthLayout>
      <AuthForm mode="forgot-password" />
    </AuthLayout>
  );
}
