import { Header } from "../../../components/Header";
import { SupportConversation } from "../SupportRequests";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <Header />
      <main className="shell simple-page store-page">
        <SupportConversation id={id} />
      </main>
    </>
  );
}
