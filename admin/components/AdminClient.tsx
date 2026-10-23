"use client";
import { formatDate } from "@marketplace/shared/format";
import { storageUrl } from "@marketplace/shared/storage";
import { useI18n } from "./I18nProvider";

import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import type { AdminOverview } from "@marketplace/server/marketplace";
import { api } from "../lib/api";
import { formatPrice } from "@marketplace/shared/pricing";
import { customerSiteUrl } from "@marketplace/shared/sites";
import {
  productInput,
  checkProduct,
} from "@marketplace/shared/marketplace-validation";
import type { z } from "zod";
type Product = AdminOverview["products"][number];
type Category = AdminOverview["categories"][number];
type Draft = z.infer<typeof productInput>;
type Operation = { url: string; method: string; data?: unknown };
export function AdminClient({
  section,
}: {
  section:
    | "dashboard"
    | "products"
    | "categories"
    | "orders"
    | "payments"
    | "settings";
}) {
  const { t, intlLocale } = useI18n();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["admin"],
    queryFn: () => api<AdminOverview>("/api/admin/overview"),
  });
  const [product, setProduct] = useState<Product | null | undefined>();
  const [category, setCategory] = useState<Category | null | undefined>();
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const mutation = useMutation({
    mutationFn: ({ url, method, data }: Operation) =>
      api(url, { method, body: JSON.stringify(data) }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["admin"] });
      setNotice("Changes saved.");
    },
  });
  const save = async (operation: Operation) => {
    setNotice("");
    await mutation.mutateAsync(operation);
  };
  if (query.isPending)
    return <p role="status">{t("Loading your operations center…")}</p>;
  if (query.error)
    return (
      <div className="empty-panel">
        <p role="alert">{t(query.error.message)}</p>
        <button onClick={() => query.refetch()}>{t("Try again")}</button>
      </div>
    );
  const data = query.data!;
  const title = {
    dashboard: t("Overview"),
    products: t("Products"),
    categories: t("Categories"),
    orders: t("Orders"),
    payments: t("Payment review"),
    settings: t("Payment settings"),
  }[section];
  const matches = (text: string) =>
    text.toLowerCase().includes(search.toLowerCase());
  const rows =
    section === "products"
      ? data.products.filter(
          p =>
            matches(`${p.title} ${p.slug}`) &&
            (filter === "all" || p.status === filter)
        )
      : section === "orders"
        ? data.orders.filter(
            o =>
              matches(`${o.id} ${o.customerName} ${o.customerEmail}`) &&
              (filter === "all" || o.paymentStatus === filter)
          )
        : data.payments.filter(
            p =>
              matches(`${p.id} ${p.orderId} ${p.senderName}`) &&
              (filter === "all" || p.status === filter)
          );
  const pages = Math.ceil(rows.length / 12) || 1;
  const current = Math.min(page, pages);
  const ids = new Set(
    rows.slice((current - 1) * 12, current * 12).map(row => row.id)
  );
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow plain">{t("OPERATIONS CENTER")}</p>
          <h1>{title}</h1>
        </div>
        <Link href={customerSiteUrl} className="button button-secondary">
          {t("View storefront")}
        </Link>
      </div>
      {notice && (
        <p className="notice" role="status">
          {t(notice)}
        </p>
      )}
      {mutation.error && (
        <p className="error" role="alert">
          {t(mutation.error.message)}
        </p>
      )}
      {section === "dashboard" && (
        <>
          <div className="metric-grid">
            {[
              [t("Pending payments"), data.stats.pendingPayments],
              [t("Approved orders"), data.stats.approvedOrders],
              [t("Products"), data.stats.products],
              [
                t("Approved revenue"),
                formatPrice(data.stats.revenue, intlLocale),
              ],
            ].map(([label, value]) => (
              <article key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <section className="admin-panel">
            <div className="section-heading">
              <h2>{t("Recent orders")}</h2>
              <Link href="/orders">{t("View orders →")}</Link>
            </div>
            <OrderList orders={data.orders.slice(0, 5)} />
          </section>
          <section className="admin-panel">
            <h2>{t("Next actions")}</h2>
            <div className="admin-quick">
              <Link href="/payments">
                {t("Review {count} pending payments →", {
                  count: data.stats.pendingPayments,
                })}
              </Link>
              <Link href="/products">{t("Manage products →")}</Link>
              <Link href="/settings/payment">
                {t("Configure payment accounts →")}
              </Link>
            </div>
          </section>
        </>
      )}
      {["products", "orders", "payments"].includes(section) && (
        <form className="admin-toolbar" onSubmit={e => e.preventDefault()}>
          <label>
            {t("Search")}
            <input
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={
                section === "products"
                  ? t("Title or slug")
                  : t("Order number or customer")
              }
            />
          </label>
          <label>
            {t("Status")}
            <select
              aria-label={t("Status")}
              value={filter}
              onChange={e => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">{t("All statuses")}</option>
              {(section === "products"
                ? ["published", "draft"]
                : ["pending", "approved", "rejected"]
              ).map(status => (
                <option key={status} value={status}>
                  {t(status)}
                </option>
              ))}
            </select>
          </label>
          {section === "products" && (
            <button
              type="button"
              className="button button-primary"
              onClick={() => setProduct(null)}
            >
              {t("Add product")}
            </button>
          )}
        </form>
      )}
      {section === "products" && (
        <section className="admin-panel">
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label={t("Products")}
          >
            <table>
              <thead>
                <tr>
                  <th>{t("Product")}</th>
                  <th>{t("Category")}</th>
                  <th>{t("Price")}</th>
                  <th>{t("Status")}</th>
                  <th>{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {data.products
                  .filter(p => ids.has(p.id))
                  .map(p => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.title}</strong>
                        <small>{p.slug}</small>
                      </td>
                      <td>
                        {data.categories.find(c => c.id === p.categoryId)?.name}
                      </td>
                      <td>
                        {formatPrice(p.discountPrice ?? p.price, intlLocale)}
                      </td>
                      <td>
                        <span className={`pill ${p.status}`}>
                          {t(p.status)}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="button button-secondary"
                            onClick={() => setProduct(p)}
                          >
                            {t("Edit {title}", { title: p.title })}
                          </button>
                          {p.status === "published" && (
                            <button
                              disabled={mutation.isPending}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    t(
                                      "Unpublish {title}? Existing buyers retain access.",
                                      { title: p.title }
                                    )
                                  )
                                )
                                  save({
                                    url: `/api/admin/products?id=${p.id}`,
                                    method: "DELETE",
                                  }).catch(() => {});
                              }}
                            >
                              {t("Unpublish")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!rows.length && (
            <p>{t("No products match. Add a product to start selling.")}</p>
          )}
        </section>
      )}
      {section === "orders" && (
        <section className="admin-panel">
          <OrderList orders={data.orders.filter(o => ids.has(o.id))} />
        </section>
      )}
      {section === "payments" && (
        <section className="review-list">
          {data.payments
            .filter(p => ids.has(p.id))
            .map(payment => (
              <PaymentReview
                key={payment.id}
                payment={payment}
                pending={mutation.isPending}
                save={save}
              />
            ))}
          {!rows.length && (
            <div className="empty-panel">
              {t("No payment submissions match this view.")}
            </div>
          )}
        </section>
      )}
      {["products", "orders", "payments"].includes(section) && (
        <div className="pager">
          <button disabled={current <= 1} onClick={() => setPage(current - 1)}>
            {t("Previous")}
          </button>
          <span>
            {t("Page {page} of {pages} · {count} records", {
              page: current,
              pages,
              count: rows.length,
            })}
          </span>
          <button
            disabled={current >= pages}
            onClick={() => setPage(current + 1)}
          >
            {t("Next")}
          </button>
        </div>
      )}
      {section === "categories" && (
        <section className="admin-panel">
          <div className="section-heading">
            <p>{t("Organize the catalogue into clear collections.")}</p>
            <button
              className="button button-primary"
              onClick={() => setCategory(null)}
            >
              {t("Add category")}
            </button>
          </div>
          {data.categories.map(c => (
            <article className="record-row" key={c.id}>
              <div>
                <strong>{c.name}</strong>
                <p>{c.description || c.slug}</p>
              </div>
              <div className="row-actions">
                <button onClick={() => setCategory(c)}>
                  {t("Edit {title}", { title: c.name })}
                </button>
                <button
                  disabled={mutation.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        t(
                          "Delete category {name}? Categories containing products cannot be deleted.",
                          { name: c.name }
                        )
                      )
                    )
                      save({
                        url: `/api/admin/categories?id=${c.id}`,
                        method: "DELETE",
                      }).catch(() => {});
                  }}
                >
                  {t("Delete")}
                </button>
              </div>
            </article>
          ))}
          {!data.categories.length && (
            <p>{t("No categories yet. Create one before adding products.")}</p>
          )}
        </section>
      )}
      {section === "settings" && (
        <div className="settings-grid">
          {["KBZPay", "AYA Pay", "WavePay"].map(name => (
            <MethodForm
              key={name}
              name={name}
              method={data.methods.find(m => m.name === name)}
              pending={mutation.isPending}
              save={save}
            />
          ))}
        </div>
      )}
      <Modal
        open={product !== undefined}
        title={product ? t("Edit product") : t("Add product")}
        onClose={() => setProduct(undefined)}
      >
        {product !== undefined && (
          <ProductForm
            key={product?.id ?? "new"}
            product={product}
            categories={data.categories}
            pending={mutation.isPending}
            save={async draft => {
              await save({
                url: "/api/admin/products",
                method: product ? "PATCH" : "POST",
                data: { ...draft, ...(product ? { id: product.id } : {}) },
              });
              setProduct(undefined);
            }}
          />
        )}
      </Modal>
      <Modal
        open={category !== undefined}
        title={category ? t("Edit category") : t("Add category")}
        onClose={() => setCategory(undefined)}
      >
        {category !== undefined && (
          <form
            className="admin-form"
            onSubmit={async e => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              try {
                await save({
                  url: "/api/admin/categories",
                  method: category ? "PATCH" : "POST",
                  data: {
                    ...Object.fromEntries(form),
                    ...(category ? { id: category.id } : {}),
                  },
                });
                setCategory(undefined);
              } catch {}
            }}
          >
            <label>
              {t("Name")}
              <input
                name="name"
                required
                minLength={2}
                defaultValue={category?.name}
              />
            </label>
            <label>
              {t("Slug")}
              <input
                name="slug"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                defaultValue={category?.slug}
              />
            </label>
            <label>
              {t("Description")}
              <textarea
                aria-label={t("Description")}
                name="description"
                defaultValue={category?.description ?? ""}
              />
            </label>
            <button
              className="button button-primary"
              disabled={mutation.isPending}
            >
              {t("Save category")}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={value => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content" aria-describedby={undefined}>
          <div className="section-heading">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close
              className="button button-secondary"
              aria-label={t("Close dialog")}
            >
              {t("Close")}
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
function ProductForm({
  product,
  categories,
  pending,
  save,
}: {
  product: Product | null;
  categories: Category[];
  pending: boolean;
  save: (draft: Draft) => Promise<void>;
}) {
  const { t } = useI18n();
  const form = useForm<Draft>({
    defaultValues: product
      ? {
          ...product,
          description: product.description ?? "",
          shortDescription: product.shortDescription ?? "",
          version: product.version ?? "",
          license: product.license ?? "",
          tags: product.tags ?? "",
          includes: product.includes ?? "",
          fileSize: product.fileSize ?? "",
          fileType: product.fileType ?? "",
        }
      : {
          title: "",
          slug: "",
          categoryId: categories[0]?.id,
          price: "0.00",
          discountPrice: null,
          status: "draft",
          featured: false,
          description: "",
          shortDescription: "",
          version: "1.0",
          license: "Personal and commercial use. Redistribution prohibited.",
          includes: "",
          tags: "",
          thumbnailKey: null,
          digitalFileKey: null,
          fileType: "",
          fileSize: "",
        },
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("kind", "thumbnail");
      const result = await api<{ key: string }>("/api/admin/uploads", {
        method: "POST",
        body: data,
      });
      form.setValue("thumbnailKey", result.key);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  return (
    <form
      className="admin-form"
      onSubmit={form.handleSubmit(async raw => {
        setError("");
        try {
          await save(checkProduct(productInput.parse(raw)));
        } catch (e) {
          setError((e as Error).message);
        }
      })}
    >
      <div className="form-grid">
        <label>
          {t("Title")}
          <input {...form.register("title")} required minLength={2} />
        </label>
        <label>
          {t("Slug")}
          <input
            {...form.register("slug")}
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
          />
        </label>
        <label>
          {t("Category")}
          <select
            aria-label={t("Category")}
            {...form.register("categoryId", { valueAsNumber: true })}
            required
          >
            {categories.map(c => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Price")}
          <input
            {...form.register("price")}
            type="number"
            min="0"
            step="0.01"
            required
          />
        </label>
        <label>
          {t("Discount price")}
          <input
            {...form.register("discountPrice", {
              setValueAs: value => (value === "" ? null : value),
            })}
            type="number"
            min="0"
            step="0.01"
          />
        </label>
        <label>
          {t("Version")}
          <input {...form.register("version")} />
        </label>
      </div>
      <label>
        {t("Short description")}
        <textarea
          aria-label={t("Short description")}
          {...form.register("shortDescription")}
          maxLength={500}
        />
      </label>
      <label>
        {t("Description")}
        <textarea
          aria-label={t("Description")}
          {...form.register("description")}
          rows={5}
        />
      </label>
      <label>
        {t("What is included? (one item per line)")}
        <textarea
          aria-label={t("What is included? (one item per line)")}
          {...form.register("includes")}
        />
      </label>
      <label>
        {t("License")}
        <input {...form.register("license")} maxLength={180} />
      </label>
      <label>
        {t("Tags")}
        <input {...form.register("tags")} />
      </label>
      <div className="form-grid">
        <label>
          {t("Thumbnail (JPG, PNG, WEBP · up to 5 MB)")}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={e => upload(e.target.files?.[0])}
          />
          <small>
            {form.watch("thumbnailKey")
              ? t("Thumbnail uploaded")
              : t("No thumbnail uploaded")}
          </small>
        </label>
      </div>
      <p>{t("Products are delivered manually after payment approval.")}</p>
      <div className="row-actions">
        <label>
          {t("Status")}
          <select aria-label={t("Status")} {...form.register("status")}>
            <option value="draft">{t("Draft")}</option>
            <option value="published">{t("Published")}</option>
          </select>
        </label>
        <label className="check-label">
          <input {...form.register("featured")} type="checkbox" />
          {t("Featured product")}
        </label>
      </div>
      {error && (
        <p role="alert" className="error">
          {t(error)}
        </p>
      )}
      {uploading && <p role="status">{t("Uploading file…")}</p>}
      <button
        className="button button-primary"
        disabled={pending || uploading || !categories.length}
      >
        {pending ? t("Saving…") : t("Save product")}
      </button>
      {!categories.length && <p>{t("Create a category first.")}</p>}
    </form>
  );
}
function OrderList({ orders }: { orders: AdminOverview["orders"] }) {
  const { t, intlLocale } = useI18n();
  return orders.length ? (
    <div>
      {orders.map(order => (
        <details className="order-detail" key={order.id}>
          <summary>
            <strong>{t("Order #{id}", { id: order.id })}</strong>
            <span>{order.customerName}</span>
            <span>{formatPrice(order.total, intlLocale)}</span>
            <span className={`pill ${order.paymentStatus}`}>
              {t(order.paymentStatus)}
            </span>
          </summary>
          <p>
            {order.customerEmail} · {formatDate(order.createdAt, intlLocale)}
          </p>
          <ul>
            {order.items.map(item => (
              <li key={item.id}>
                {item.titleSnapshot} · {formatPrice(item.unitPrice, intlLocale)}{" "}
                × {item.quantity}
              </li>
            ))}
          </ul>
          <p>
            {t("Order status:")} {t(order.orderStatus)}
          </p>
        </details>
      ))}
    </div>
  ) : (
    <p>{t("No orders match this view.")}</p>
  );
}
function PaymentReview({
  payment,
  pending,
  save,
}: {
  payment: AdminOverview["payments"][number];
  pending: boolean;
  save: (o: Operation) => Promise<void>;
}) {
  const { t, intlLocale } = useI18n();
  const [reason, setReason] = useState("");
  return (
    <article className="admin-panel">
      <div className="section-heading">
        <h2>
          {t("Payment #{id} · Order #{order}", {
            id: payment.id,
            order: payment.orderId,
          })}
        </h2>
        <span className={`pill ${payment.status}`}>{t(payment.status)}</span>
      </div>
      <p>
        <strong>{formatPrice(payment.amount, intlLocale)}</strong> {t("via")}{" "}
        {payment.paymentMethod}
      </p>
      <p>
        {payment.senderName} · {payment.senderPhone}
      </p>
      <p>
        {t("Reference:")} {payment.transactionReference || t("Not provided")}
      </p>
      <a
        className="button button-secondary"
        target="_blank"
        rel="noreferrer"
        href={storageUrl(payment.screenshotKey)}
      >
        {t("View payment screenshot")}
      </a>
      {payment.status === "pending" ? (
        <form
          className="admin-form"
          onSubmit={async e => {
            e.preventDefault();
            await save({
              url: "/api/admin/payments",
              method: "PATCH",
              data: {
                paymentId: payment.id,
                status: "rejected",
                rejectionReason: reason,
              },
            }).catch(() => {});
          }}
        >
          <label>
            {t("Rejection reason")}
            <textarea
              aria-label={t("Rejection reason")}
              value={reason}
              onChange={e => setReason(e.target.value)}
              minLength={2}
              maxLength={1000}
            />
          </label>
          <div className="row-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={pending}
              onClick={() =>
                save({
                  url: "/api/admin/payments",
                  method: "PATCH",
                  data: { paymentId: payment.id, status: "approved" },
                }).catch(() => {})
              }
            >
              {t("Approve payment #{id}", { id: payment.id })}
            </button>
            <button
              className="button button-secondary"
              disabled={pending || reason.trim().length < 2}
            >
              {t("Reject payment #{id}", { id: payment.id })}
            </button>
          </div>
        </form>
      ) : (
        <p>
          {payment.status === "rejected"
            ? payment.rejectionReason
            : t("Reviewed {date}", {
                date: payment.verifiedAt
                  ? formatDate(payment.verifiedAt, intlLocale)
                  : "",
              })}{" "}
          {t("· Admin #")}
          {payment.verifiedBy}
        </p>
      )}
    </article>
  );
}
function MethodForm({
  name,
  method,
  pending,
  save,
}: {
  name: string;
  method: AdminOverview["methods"][number] | undefined;
  pending: boolean;
  save: (o: Operation) => Promise<void>;
}) {
  const { t } = useI18n();
  const [error, setError] = useState("");
  return (
    <form
      className="admin-panel admin-form"
      key={`${method?.id}-${method?.updatedAt}`}
      onSubmit={async e => {
        e.preventDefault();
        setError("");
        const values = new FormData(e.currentTarget);
        try {
          await save({
            url: "/api/admin/payment-methods",
            method: "PATCH",
            data: {
              name,
              accountName: values.get("accountName"),
              accountNumber: values.get("accountNumber"),
              instructions: values.get("instructions"),
              enabled: values.get("enabled") === "on",
            },
          });
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <h2>{name}</h2>
      <label className="check-label">
        <input
          name="enabled"
          type="checkbox"
          defaultChecked={method?.enabled}
        />
        {t("Enable {name}", { name })}
      </label>
      <label>
        {t("Account name")}
        <input
          name="accountName"
          defaultValue={method?.accountName}
          maxLength={160}
        />
      </label>
      <label>
        {t("Account number")}
        <input
          name="accountNumber"
          defaultValue={method?.accountNumber}
          maxLength={80}
        />
      </label>
      <label>
        {t("Checkout instructions")}
        <textarea
          aria-label={t("Checkout instructions")}
          name="instructions"
          defaultValue={method?.instructions ?? ""}
          maxLength={1000}
        />
      </label>
      {error && <p role="alert">{t(error)}</p>}
      <button className="button button-primary" disabled={pending}>
        {t("Save {name}", { name })}
      </button>
    </form>
  );
}
