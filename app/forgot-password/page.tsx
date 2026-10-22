import { Header } from "../components/Header";
import { AuthForm } from "../components/AuthForm";
export default function Page() {
  return (
    <>
      <Header />
      <main className="shell simple-page">
        <AuthForm mode="forgot-password" />
      </main>
    </>
  );
}
