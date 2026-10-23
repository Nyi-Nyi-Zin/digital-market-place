"use client";
import { Cloud } from "lucide-react";

export function BrandMark() {
  return (
    <span
      className="brand-mark"
      aria-hidden="true"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#fff",
        color: "#7a2cff",
      }}
    >
      <Cloud size={26} strokeWidth={1.8} />
    </span>
  );
}
