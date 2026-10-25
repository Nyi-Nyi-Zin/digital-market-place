"use client";

import { useState } from "react";
import { PackageOpen } from "lucide-react";
import { storageUrl } from "@marketplace/shared/storage";

export function ProductDetailCover({
  title,
  thumbnailKey,
}: {
  title: string;
  thumbnailKey?: string | null;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="detail-cover">
      {thumbnailKey && !failed ? (
        <img
          className="product-image"
          src={storageUrl(thumbnailKey)}
          alt={title}
          ref={image => {
            if (image?.complete && image.naturalWidth === 0) setFailed(true);
          }}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="detail-cover-fallback">
          <PackageOpen size={44} strokeWidth={1.25} aria-hidden="true" />
          <strong>{title}</strong>
        </div>
      )}
    </div>
  );
}
