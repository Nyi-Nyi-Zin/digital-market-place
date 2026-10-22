"use client";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import type { AdminOverview } from "../../server/marketplace";
import { api } from "../lib/api";
import { formatPrice } from "../lib/catalog";
import {
  productInput,
  checkProduct,
} from "../../shared/marketplace-validation";
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
    return <p role="status">Loading your operations center…</p>;
  if (query.error)
    return (
      <div className="empty-panel">
        <p role="alert">{query.error.message}</p>
        <button onClick={() => query.refetch()}>Try again</button>
      </div>
    );
  const data = query.data!;
  const title = {
    dashboard: "Overview",
    products: "Products",
    categories: "Categories",
    orders: "Orders",
    payments: "Payment review",
    settings: "Payment settings",
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
          <p className="eyebrow plain">OPERATIONS CENTER</p>
          <h1>{title}</h1>
        </div>
        <Link href="/" className="button button-secondary">
          View storefront
        </Link>
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {mutation.error && (
        <p className="error" role="alert">
          {mutation.error.message}
        </p>
      )}
      {section === "dashboard" && (
        <>
          <div className="metric-grid">
            {[
              ["Pending payments", data.stats.pendingPayments],
              ["Approved orders", data.stats.approvedOrders],
              ["Products", data.stats.products],
              ["Approved revenue", formatPrice(data.stats.revenue)],
            ].map(([label, value]) => (
              <article key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <section className="admin-panel">
            <div className="section-heading">
              <h2>Recent orders</h2>
              <Link href="/admin/orders">View orders →</Link>
            </div>
            <OrderList orders={data.orders.slice(0, 5)} />
          </section>
          <section className="admin-panel">
            <h2>Next actions</h2>
            <div className="admin-quick">
              <Link href="/admin/payments">
                Review {data.stats.pendingPayments} pending payments →
              </Link>
              <Link href="/admin/products">Manage products →</Link>
              <Link href="/admin/settings/payment">
                Configure payment accounts →
              </Link>
            </div>
          </section>
        </>
      )}
      {["products", "orders", "payments"].includes(section) && (
        <form className="admin-toolbar" onSubmit={e => e.preventDefault()}>
          <label>
            Search
            <input
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={
                section === "products"
                  ? "Title or slug"
                  : "Order number or customer"
              }
            />
          </label>
          <label>
            Status
            <select
              aria-label="Status"
              value={filter}
              onChange={e => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              {(section === "products"
                ? ["published", "draft"]
                : ["pending", "approved", "rejected"]
              ).map(status => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          {section === "products" && (
            <button
              type="button"
              className="button button-primary"
              onClick={() => setProduct(null)}
            >
              Add product
            </button>
          )}
        </form>
      )}
      {section === "products" && (
        <section className="admin-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
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
                      <td>{formatPrice(p.discountPrice ?? p.price)}</td>
                      <td>
                        <span className={`pill ${p.status}`}>{p.status}</span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="button button-secondary"
                            onClick={() => setProduct(p)}
                          >
                            Edit {p.title}
                          </button>
                          {p.status === "published" && (
                            <button
                              disabled={mutation.isPending}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Unpublish ${p.title}? Existing buyers retain access.`
                                  )
                                )
                                  save({
                                    url: `/api/admin/products?id=${p.id}`,
                                    method: "DELETE",
                                  }).catch(() => {});
                              }}
                            >
                              Unpublish
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
            <p>No products match. Add a product to start selling.</p>
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
              No payment submissions match this view.
            </div>
          )}
        </section>
      )}
      {["products", "orders", "payments"].includes(section) && (
        <div className="pager">
          <button disabled={current <= 1} onClick={() => setPage(current - 1)}>
            Previous
          </button>
          <span>
            Page {current} of {pages} · {rows.length} records
          </span>
          <button
            disabled={current >= pages}
            onClick={() => setPage(current + 1)}
          >
            Next
          </button>
        </div>
      )}
      {section === "categories" && (
        <section className="admin-panel">
          <div className="section-heading">
            <p>Organize the catalogue into clear collections.</p>
            <button
              className="button button-primary"
              onClick={() => setCategory(null)}
            >
              Add category
            </button>
          </div>
          {data.categories.map(c => (
            <article className="record-row" key={c.id}>
              <div>
                <strong>{c.name}</strong>
                <p>{c.description || c.slug}</p>
              </div>
              <div className="row-actions">
                <button onClick={() => setCategory(c)}>Edit {c.name}</button>
                <button
                  disabled={mutation.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete category ${c.name}? Categories containing products cannot be deleted.`
                      )
                    )
                      save({
                        url: `/api/admin/categories?id=${c.id}`,
                        method: "DELETE",
                      }).catch(() => {});
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
          {!data.categories.length && (
            <p>No categories yet. Create one before adding products.</p>
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
        title={product ? "Edit product" : "Add product"}
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
        title={category ? "Edit category" : "Add category"}
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
              Name
              <input
                name="name"
                required
                minLength={2}
                defaultValue={category?.name}
              />
            </label>
            <label>
              Slug
              <input
                name="slug"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                defaultValue={category?.slug}
              />
            </label>
            <label>
              Description
              <textarea
                aria-label="Description"
                name="description"
                defaultValue={category?.description ?? ""}
              />
            </label>
            <button
              className="button button-primary"
              disabled={mutation.isPending}
            >
              Save category
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
              aria-label="Close dialog"
            >
              Close
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
  async function upload(file: File | undefined, kind: "thumbnail" | "digital") {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("kind", kind);
      const result = await api<{
        key: string;
        fileType: string;
        fileSize: string;
      }>("/api/admin/uploads", { method: "POST", body: data });
      form.setValue(
        kind === "thumbnail" ? "thumbnailKey" : "digitalFileKey",
        result.key
      );
      if (kind === "digital") {
        form.setValue("fileType", result.fileType);
        form.setValue("fileSize", result.fileSize);
      }
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
          Title
          <input {...form.register("title")} required minLength={2} />
        </label>
        <label>
          Slug
          <input
            {...form.register("slug")}
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
          />
        </label>
        <label>
          Category
          <select
            aria-label="Category"
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
          Price
          <input
            {...form.register("price")}
            type="number"
            min="0"
            step="0.01"
            required
          />
        </label>
        <label>
          Discount price
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
          Version
          <input {...form.register("version")} />
        </label>
      </div>
      <label>
        Short description
        <textarea
          aria-label="Short description"
          {...form.register("shortDescription")}
          maxLength={500}
        />
      </label>
      <label>
        Description
        <textarea
          aria-label="Description"
          {...form.register("description")}
          rows={5}
        />
      </label>
      <label>
        What is included? (one item per line)
        <textarea
          aria-label="What is included? (one item per line)"
          {...form.register("includes")}
        />
      </label>
      <label>
        License
        <input {...form.register("license")} maxLength={180} />
      </label>
      <label>
        Tags
        <input {...form.register("tags")} />
      </label>
      <div className="form-grid">
        <label>
          Thumbnail (JPG, PNG, WEBP · up to 5 MB)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={e => upload(e.target.files?.[0], "thumbnail")}
          />
          <small>
            {form.watch("thumbnailKey")
              ? "Thumbnail uploaded"
              : "No thumbnail uploaded"}
          </small>
        </label>
        <label>
          Digital file (up to 25 MB)
          <input
            type="file"
            accept=".zip,.pdf,.fig,.txt,.csv,.json,.xlsx,.docx,.pptx"
            disabled={uploading}
            onChange={e => upload(e.target.files?.[0], "digital")}
          />
          <small>
            {form.watch("digitalFileKey")
              ? `${form.watch("fileType")} · ${form.watch("fileSize")}`
              : "Upload a file before publishing"}
          </small>
        </label>
      </div>
      <div className="row-actions">
        <label>
          Status
          <select aria-label="Status" {...form.register("status")}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        <label className="check-label">
          <input {...form.register("featured")} type="checkbox" />
          Featured product
        </label>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {uploading && <p role="status">Uploading file…</p>}
      <button
        className="button button-primary"
        disabled={pending || uploading || !categories.length}
      >
        {pending ? "Saving…" : "Save product"}
      </button>
      {!categories.length && <p>Create a category first.</p>}
    </form>
  );
}
function OrderList({ orders }: { orders: AdminOverview["orders"] }) {
  return orders.length ? (
    <div>
      {orders.map(order => (
        <details className="order-detail" key={order.id}>
          <summary>
            <strong>Order #{order.id}</strong>
            <span>{order.customerName}</span>
            <span>{formatPrice(order.total)}</span>
            <span className={`pill ${order.paymentStatus}`}>
              {order.paymentStatus}
            </span>
          </summary>
          <p>
            {order.customerEmail} · {new Date(order.createdAt).toLocaleString()}
          </p>
          <ul>
            {order.items.map(item => (
              <li key={item.id}>
                {item.titleSnapshot} · {formatPrice(item.unitPrice)} ×{" "}
                {item.quantity}
              </li>
            ))}
          </ul>
          <p>Order status: {order.orderStatus}</p>
        </details>
      ))}
    </div>
  ) : (
    <p>No orders match this view.</p>
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
  const [reason, setReason] = useState("");
  return (
    <article className="admin-panel">
      <div className="section-heading">
        <h2>
          Payment #{payment.id} · Order #{payment.orderId}
        </h2>
        <span className={`pill ${payment.status}`}>{payment.status}</span>
      </div>
      <p>
        <strong>{formatPrice(payment.amount)}</strong> via{" "}
        {payment.paymentMethod}
      </p>
      <p>
        {payment.senderName} · {payment.senderPhone}
      </p>
      <p>Reference: {payment.transactionReference || "Not provided"}</p>
      <a
        className="button button-secondary"
        target="_blank"
        rel="noreferrer"
        href={`/manus-storage/${payment.screenshotKey}`}
      >
        View payment screenshot
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
            Rejection reason
            <textarea
              aria-label="Rejection reason"
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
              Approve payment #{payment.id}
            </button>
            <button
              className="button button-secondary"
              disabled={pending || reason.trim().length < 2}
            >
              Reject payment #{payment.id}
            </button>
          </div>
        </form>
      ) : (
        <p>
          {payment.status === "rejected"
            ? payment.rejectionReason
            : `Reviewed ${payment.verifiedAt ? new Date(payment.verifiedAt).toLocaleString() : ""}`}{" "}
          · Admin #{payment.verifiedBy}
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
        Enable {name}
      </label>
      <label>
        Account name
        <input
          name="accountName"
          defaultValue={method?.accountName}
          maxLength={160}
        />
      </label>
      <label>
        Account number
        <input
          name="accountNumber"
          defaultValue={method?.accountNumber}
          maxLength={80}
        />
      </label>
      <label>
        Checkout instructions
        <textarea
          aria-label="Checkout instructions"
          name="instructions"
          defaultValue={method?.instructions ?? ""}
          maxLength={1000}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button className="button button-primary" disabled={pending}>
        Save {name}
      </button>
    </form>
  );
}
