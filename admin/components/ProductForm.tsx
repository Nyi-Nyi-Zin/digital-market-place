"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { ImagePlus, Upload, X } from "lucide-react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  baseCurrency,
  currencies,
  currencyConfig,
} from "@marketplace/shared/currency";
import {
  checkProduct,
  productInput,
} from "@marketplace/shared/marketplace-validation";
import { storageUrl } from "@marketplace/shared/storage";
import type { AdminOverview } from "@marketplace/server/marketplace";
import { useI18n } from "./I18nProvider";
import { api } from "../lib/api";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { NativeSelect } from "./ui/native-select";
import { Button } from "./ui/button";

type Draft = z.infer<typeof productInput>;

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="product-field">
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

export function ProductForm({
  product,
  categories,
  pending,
  save,
}: {
  product: AdminOverview["products"][number] | null;
  categories: AdminOverview["categoryOptions"];
  pending: boolean;
  save: (draft: Draft) => Promise<void>;
}) {
  const { t } = useI18n();
  const settings = useQuery({
    queryKey: ["admin", "store-settings"],
    queryFn: () =>
      api<Parameters<typeof currencyConfig>[0]>("/api/admin/settings/store"),
  });
  const config = currencyConfig(
    settings.data ?? { usdRate: null, sgdRate: null, mmkRate: null }
  );
  const form = useForm<Draft>({
    defaultValues: {
      title: product?.title ?? "",
      categoryId: product?.categoryId ?? categories[0]?.id,
      price: product?.price ?? "0.00",
      currency: baseCurrency,
      discountPrice: product?.discountPrice ?? null,
      status: product?.status ?? "draft",
      featured: product?.featured ?? false,
      thumbnailKey: product?.thumbnailKey ?? null,
      digitalFileKey: product?.digitalFileKey ?? null,
      description: product?.description ?? "",
      shortDescription: product?.shortDescription ?? "",
      license:
        product?.license ??
        "Personal and commercial use. Redistribution prohibited.",
      tags: product?.tags ?? "",
      includes: product?.includes ?? "",
      fileSize: product?.fileSize ?? "",
      fileType: product?.fileType ?? "",
    },
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [preview, setPreview] = useState(
    product?.thumbnailKey ? storageUrl(product.thumbnailKey) : ""
  );
  const [previewFailed, setPreviewFailed] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrl = useRef("");
  const controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    []
  );
  const thumbnailKey = form.watch("thumbnailKey");
  const busy = pending || form.formState.isSubmitting;
  const errors = form.formState.errors;
  const error = (name: keyof Draft) =>
    errors[name]?.message ? t(String(errors[name]?.message)) : undefined;
  const field = (name: keyof Draft) => ({
    ...form.register(name),
    "aria-invalid": !!errors[name],
  });

  async function upload(file?: File) {
    if (!file || uploading) return;
    setUploadError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError(t("Choose a JPG, PNG, or WEBP image."));
      return;
    }
    if (!file.size || file.size > 5 * 1024 * 1024) {
      setUploadError(t("Choose a non-empty image up to 5 MB."));
      return;
    }
    setUploading(true);
    controller.current = new AbortController();
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("kind", "thumbnail");
      const result = await api<{ key: string }>("/api/admin/uploads", {
        method: "POST",
        body: data,
        signal: controller.current.signal,
      });
      form.setValue("thumbnailKey", result.key, { shouldDirty: true });
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(file);
      setPreview(objectUrl.current);
      setPreviewFailed(false);
      setFileName(file.name);
    } catch (e) {
      if (!controller.current?.signal.aborted)
        setUploadError(t((e as Error).message));
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      className="admin-form product-form"
      noValidate
      onSubmit={form.handleSubmit(async raw => {
        form.clearErrors();
        try {
          await save(checkProduct(productInput.parse(raw)));
        } catch (e) {
          if (e instanceof z.ZodError) {
            for (const issue of e.issues)
              form.setError(issue.path[0] as keyof Draft, {
                message: issue.message,
              });
            const first = e.issues[0]?.path[0] as keyof Draft | undefined;
            if (first) form.setFocus(first);
          } else form.setError("root", { message: t((e as Error).message) });
        }
      })}
    >
      <fieldset className="product-fields" disabled={pending}>
        <div className="product-section">
          <h3>{t("Product details")}</h3>
          <Field label={t("Title")} error={error("title")}>
            <Input {...field("title")} required minLength={2} maxLength={220} />
          </Field>
          <Field label={t("Category")} error={error("categoryId")}>
            <NativeSelect
              {...form.register("categoryId", { valueAsNumber: true })}
              aria-invalid={!!errors.categoryId}
              required
            >
              {!categories.length && (
                <option value="">{t("Create a category first.")}</option>
              )}
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label={t("Short description")}
            error={error("shortDescription")}
          >
            <Textarea {...field("shortDescription")} maxLength={500} rows={2} />
          </Field>
          <Field label={t("Description")} error={error("description")}>
            <Textarea {...field("description")} maxLength={30000} rows={5} />
          </Field>
        </div>
        <div className="product-section">
          <h3>{t("Thumbnail")}</h3>
          <div className="thumbnail-uploader" aria-busy={uploading}>
            <div className="thumbnail-preview">
              {preview && !previewFailed ? (
                <img
                  src={preview}
                  alt={t("Thumbnail preview")}
                  onError={() => setPreviewFailed(true)}
                />
              ) : (
                <ImagePlus size={30} strokeWidth={1.5} aria-hidden="true" />
              )}
            </div>
            <div className="thumbnail-controls">
              <p>{t("JPG, PNG, or WEBP · up to 5 MB")}</p>
              <div className="thumbnail-actions">
                <Button
                  type="button"
                  variant="brand"
                  size="brand"
                  className="button button-secondary"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  <Upload size={16} aria-hidden="true" />
                  {t(thumbnailKey ? "Change image" : "Choose image")}
                </Button>
                {thumbnailKey && (
                  <Button
                    type="button"
                    variant="brand"
                    size="brand"
                    className="button button-secondary"
                    disabled={uploading}
                    onClick={() => {
                      form.setValue("thumbnailKey", null, {
                        shouldDirty: true,
                      });
                      setPreview("");
                      setFileName("");
                      setUploadError("");
                      if (objectUrl.current) {
                        URL.revokeObjectURL(objectUrl.current);
                        objectUrl.current = "";
                      }
                    }}
                  >
                    <X size={16} aria-hidden="true" />
                    {t("Remove image")}
                  </Button>
                )}
              </div>
              <input
                ref={fileInput}
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp"
                aria-label={t("Thumbnail")}
                disabled={uploading || busy}
                onChange={e => {
                  void upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <small role="status">
                {uploading
                  ? t("Uploading file…")
                  : fileName ||
                    t(
                      thumbnailKey
                        ? "Thumbnail uploaded"
                        : "No thumbnail uploaded"
                    )}
              </small>
              {previewFailed && (
                <small>
                  {t(
                    "Preview unavailable. Choose another image to replace it."
                  )}
                </small>
              )}
            </div>
          </div>
          {uploadError && (
            <p className="field-error" role="alert">
              {uploadError}
            </p>
          )}
          {error("thumbnailKey") && (
            <p className="field-error">{error("thumbnailKey")}</p>
          )}
        </div>
        <div className="product-section">
          <h3>{t("Pricing")}</h3>
          <Field label={t("Currency")} error={error("currency")}>
            <NativeSelect {...field("currency")} aria-label={t("Currency")}>
              {currencies.map(code => (
                <option key={code} value={code} disabled={!config.rates[code]}>
                  {code}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <p className="product-help">
            {t(
              "Prices are converted to {currency} using your store exchange rates when saved.",
              { currency: baseCurrency }
            )}
          </p>
          {settings.error && (
            <p className="field-error" role="alert">
              {t(settings.error.message)}
            </p>
          )}
          {!settings.isPending &&
            currencies.some(code => !config.rates[code]) && (
              <p className="product-help">
                <a href="/settings/store">
                  {t("Configure exchange rates to enable more currencies.")}
                </a>
              </p>
            )}
          <div className="form-grid">
            <Field label={t("Price")} error={error("price")}>
              <Input
                {...field("price")}
                type="number"
                min="0"
                max="99999999.99"
                step="0.01"
                required
              />
            </Field>
            <Field label={t("Discount price")} error={error("discountPrice")}>
              <Input
                {...form.register("discountPrice", {
                  setValueAs: value => (value === "" ? null : value),
                })}
                aria-invalid={!!errors.discountPrice}
                type="number"
                min="0"
                step="0.01"
              />
            </Field>
          </div>
        </div>
        <div className="product-section">
          <h3>{t("Additional details")}</h3>
          <Field
            label={t("What is included? (one item per line)")}
            error={error("includes")}
          >
            <Textarea {...field("includes")} maxLength={5000} />
          </Field>
          <Field label={t("License")} error={error("license")}>
            <Input {...field("license")} maxLength={180} />
          </Field>
          <Field label={t("Tags")} error={error("tags")}>
            <Input {...field("tags")} maxLength={2000} />
          </Field>
        </div>
        <div className="product-section">
          <h3>{t("Publishing")}</h3>
          <div className="product-publishing">
            <Field label={t("Status")}>
              <NativeSelect {...field("status")}>
                <option value="draft">{t("Draft")}</option>
                <option value="published">{t("Published")}</option>
                <option value="archived">{t("Archived")}</option>
              </NativeSelect>
            </Field>
            <label className="check-label">
              <input {...form.register("featured")} type="checkbox" />
              {t("Featured product")}
            </label>
          </div>
          <p className="product-help">
            {t("Products are delivered manually after payment approval.")}
          </p>
        </div>
      </fieldset>
      <div className="product-form-footer">
        {errors.root && (
          <p className="field-error" role="alert">
            {errors.root.message}
          </p>
        )}
        {Object.keys(errors).some(key => key !== "root") && (
          <p className="field-error" role="alert">
            {t("Check the highlighted fields and try again.")}
          </p>
        )}
        {!categories.length && (
          <p role="alert">{t("Create a category first.")}</p>
        )}
        <Button
          type="submit"
          variant="brand"
          size="brand"
          className="button button-primary"
          disabled={busy || uploading || !categories.length}
        >
          {busy ? t("Saving…") : t("Save product")}
        </Button>
      </div>
    </form>
  );
}
