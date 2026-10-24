import {
  StoreInformation,
  storePageMetadata,
} from "../components/StoreInformation";
export const dynamic = "force-dynamic";
export default function Page() {
  return <StoreInformation document="how-to-buy" />;
}
export async function generateMetadata() {
  return storePageMetadata("how-to-buy");
}
