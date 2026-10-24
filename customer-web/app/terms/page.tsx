import {
  StoreInformation,
  storePageMetadata,
} from "../components/StoreInformation";
export const dynamic = "force-dynamic";
export default function Page() {
  return <StoreInformation document="terms" />;
}
export async function generateMetadata() {
  return storePageMetadata("terms");
}
