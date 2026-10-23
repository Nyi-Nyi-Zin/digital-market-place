import { AdminBrand } from "./AdminShell";
import { Preferences } from "./Preferences";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-auth">
      <header className="auth-topbar">
        <AdminBrand />
        <Preferences />
      </header>
      <main className="auth-main">{children}</main>
      <footer className="auth-footer">Cloud Nine · Admin</footer>
    </div>
  );
}
