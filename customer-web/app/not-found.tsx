import { getServerI18n } from "./lib/i18n-server";
import Link from "next/link";

export default async function NotFound() {
  const { t } = await getServerI18n();
  return (
    <main className="grid min-h-screen place-items-center p-8 text-center [font-family:inherit]">
      <div>
        <p className="font-[700] tracking-[.12em] text-[#7a2cff]">404</p>
        <h1 className="my-2 text-[length:3rem]">
          {t("This page is not available.")}
        </h1>
        <p className="text-[#6e7384]">
          {t("Return to the marketplace to keep exploring digital products.")}
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-[.7rem] bg-[#7a2cff] px-4 py-[.8rem] font-[700] text-white!"
        >
          {t("Back to marketplace")}
        </Link>
      </div>
    </main>
  );
}
