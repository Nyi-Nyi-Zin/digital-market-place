"use client";
import { useState } from "react";
export function BrandMark() {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className="brand-mark"
      style={{ overflow: "hidden", background: "#fff", color: "#7a2cff" }}
    >
      {failed ? (
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M6 18h12a4 4 0 0 0 .5-7.97 6.5 6.5 0 0 0-12.4-1.7A4.9 4.9 0 0 0 6 18Z" />
        </svg>
      ) : (
        <img
          src="/manus-storage/cloud-nine-logo_7fdf2201.png"
          alt="Cloud Nine logo"
          width="38"
          height="38"
          style={{ width: 38, height: 38, objectFit: "cover" }}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
