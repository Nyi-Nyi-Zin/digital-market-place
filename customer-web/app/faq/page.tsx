import {
  StoreInformation,
  storePageMetadata,
} from "../components/StoreInformation";
export const dynamic = "force-dynamic";
export default function Page() {
  return <StoreInformation document="faq" />;
}
export async function generateMetadata() {
  return storePageMetadata("faq");
}
