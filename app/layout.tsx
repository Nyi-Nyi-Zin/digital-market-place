import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cloud Nine | Digital products for modern creators",
  description: "Cloud Nine is a Myanmar-focused digital products marketplace with verified manual payment review.",
  icons: { icon: "/manus-storage/cloud-nine-logo_7fdf2201.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
