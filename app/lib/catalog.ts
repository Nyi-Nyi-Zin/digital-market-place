import { formatMoney } from "../../shared/marketplace-validation";
export type { PublicProduct as Product } from "../../server/catalog";
export const formatPrice = formatMoney;
