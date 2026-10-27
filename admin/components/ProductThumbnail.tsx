"use client";

import { useEffect, useRef, useState } from "react";
import { Package } from "lucide-react";
import { storageUrl } from "@marketplace/shared/storage";

export function ProductThumbnail({ imageKey }: { imageKey: string | null }) {
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth === 0)
      setFailed(true);
  }, []);
  return (
    <span className="admin-product-thumbnail" aria-hidden="true">
      {imageKey && !failed ? (
        <img
          ref={image}
          src={storageUrl(imageKey)}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <Package size={18} />
      )}
    </span>
  );
}
