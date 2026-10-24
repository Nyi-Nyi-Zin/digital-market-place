import {
  StoreInformation,
  storePageMetadata,
} from "../components/StoreInformation";
export const dynamic = "force-dynamic";
export default function Page() {
  return <StoreInformation document="refund" />;
}
export async function generateMetadata() {
  return storePageMetadata("refund");
}
