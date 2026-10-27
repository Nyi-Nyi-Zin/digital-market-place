"use client";
import { Cloud } from "lucide-react";

export function BrandMark() {
  return (
    <span
      className="brand-mark relative overflow-hidden bg-white! text-[#7a2cff]!"
      aria-hidden="true"
    >
      <Cloud size={26} strokeWidth={1.8} />
    </span>
  );
}
