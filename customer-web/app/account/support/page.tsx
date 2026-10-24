import { Header } from "../../components/Header";
import { SupportRequests } from "./SupportRequests";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const q = await searchParams;
  return (
    <>
      <Header />
      <main className="shell simple-page store-page">
        <SupportRequests
          initialOrder={/^\d+$/.test(q.order ?? "") ? q.order : ""}
        />
      </main>
    </>
  );
}
