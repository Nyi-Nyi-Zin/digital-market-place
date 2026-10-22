import { Header } from "../../components/Header";
import { NotificationsClient } from "./NotificationsClient";

export default function NotificationsPage() {
  return (
    <>
      <Header />
      <main className="shell simple-page">
        <p className="eyebrow plain">UPDATES</p>
        <h1>Notifications</h1>
        <NotificationsClient />
      </main>
    </>
  );
}
