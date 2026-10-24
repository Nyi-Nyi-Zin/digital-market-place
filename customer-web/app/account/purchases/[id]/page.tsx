import { Header } from "../../../components/Header";
import { OrderDetail } from "./OrderDetail";
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
        <OrderDetail id={id} />
      </main>
    </>
  );
}
