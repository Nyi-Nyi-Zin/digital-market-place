"use client";
import { Button } from "./ui/button";

import { useI18n } from "./I18nProvider";
import { storageUrl } from "@marketplace/shared/storage";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play, Sparkles } from "lucide-react";
import { usePricing } from "./CurrencyProvider";

type FeaturedProduct = {
  id: number;
  slug: string;
  title: string;
  category: string;
  description: string;
  price: number;
  salePrice?: number;
  thumbnailKey: string | null;
};

export function FeaturedProductBanner({
  products,
}: {
  products: FeaturedProduct[];
}) {
  const { t } = useI18n();
  const { price } = usePricing();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null);
  const rotating =
    products.length > 1 &&
    !paused &&
    !hovered &&
    !focused &&
    !reducedMotion &&
    !hidden;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(preference.matches);
    const updateVisibility = () => setHidden(document.hidden);
    updateMotion();
    updateVisibility();
    preference.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      preference.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(
      () => setIndex(current => (current + 1) % products.length),
      5000
    );
    return () => window.clearTimeout(timer);
  }, [index, products, rotating]);

  const product = products[index % products.length];
  if (!product) return null;
  const href = `/products/${product.slug}`;
  const hasImage =
    product.thumbnailKey && product.thumbnailKey !== failedThumbnail;

  return (
    <section
      className="featured-carousel"
      aria-label={t("Featured product")}
      aria-roledescription={products.length > 1 ? "carousel" : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <div
        className={`storefront-banner${hasImage ? "" : " storefront-banner-text"}`}
        aria-live={rotating ? "off" : "polite"}
        aria-atomic="true"
      >
        <div key={`copy-${product.id}`} className="banner-copy">
          <p className="eyebrow hero-eyebrow">
            <Sparkles size={14} aria-hidden="true" /> {t("Featured product")}
            {product.category ? ` · ${product.category}` : ""}
          </p>
          <h1 id="featured-title">
            <Link href={href}>{product.title}</Link>
          </h1>
          {product.description ? (
            <p className="featured-description">{product.description}</p>
          ) : null}
          <div className="featured-price">
            <strong>{price(product.salePrice ?? product.price)}</strong>
            {product.salePrice != null ? <s>{price(product.price)}</s> : null}
          </div>
          <div className="featured-actions">
            <Link className="button button-primary" href={href}>
              {t("View product")} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
        {hasImage && product.thumbnailKey ? (
          <Link
            key={`media-${product.id}`}
            className="featured-media"
            href={href}
            aria-label={t("View {title}", { title: product.title })}
          >
            <img
              key={product.id}
              ref={image => {
                if (image?.complete && image.naturalWidth === 0) {
                  setFailedThumbnail(product.thumbnailKey);
                }
              }}
              src={storageUrl(product.thumbnailKey)}
              alt={product.title}
              decoding="async"
              onError={() => setFailedThumbnail(product.thumbnailKey)}
            />
          </Link>
        ) : null}
      </div>
      {products.length > 1 ? (
        <div className="featured-navigation">
          <Button
            variant="brand"
            size="brand"
            type="button"
            className="featured-arrow"
            aria-label={t("Previous featured product")}
            onClick={() =>
              setIndex(
                current => (current - 1 + products.length) % products.length
              )
            }
          >
            <ArrowLeft size={16} aria-hidden="true" />
          </Button>
          <div className="featured-dots">
            {products.map((item, itemIndex) => (
              <Button
                variant="brand"
                size="brand"
                key={item.id}
                type="button"
                className="featured-dot"
                aria-label={t("View {title}", { title: item.title })}
                aria-pressed={itemIndex === index % products.length}
                onClick={() => setIndex(itemIndex)}
              />
            ))}
          </div>
          <Button
            variant="brand"
            size="brand"
            type="button"
            className="featured-arrow"
            aria-label={t("Next featured product")}
            onClick={() => setIndex(current => (current + 1) % products.length)}
          >
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
          {!reducedMotion ? (
            <Button
              variant="brand"
              size="brand"
              type="button"
              className="featured-arrow"
              aria-label={t(
                paused ? "Resume featured products" : "Pause featured products"
              )}
              onClick={() => setPaused(current => !current)}
            >
              {paused ? (
                <Play size={14} aria-hidden="true" />
              ) : (
                <Pause size={14} aria-hidden="true" />
              )}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
