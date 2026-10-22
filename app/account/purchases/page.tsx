import Link from "next/link";
import { Header } from "../../components/Header";
import { PurchasesClient } from "./PurchasesClient";

export default function PurchasesPage() {
  return (
    <>
      <Header />
      <main className="shell simple-page">
        <p className="eyebrow plain">YOUR LIBRARY</p>
        <h1>My purchases</h1>
        <PurchasesClient />
        <Link className="button button-secondary library-link" href="/products">
          Explore products
        </Link>
      </main>
    </>
  );
}
