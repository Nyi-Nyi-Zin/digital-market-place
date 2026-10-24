"use client";
import { ConfirmAction } from "./ConfirmAction";
import { toast } from "sonner";
import { Textarea } from "./ui/textarea";

import { Input } from "./ui/input";

import { Button } from "./ui/button";

import { formatDate } from "@marketplace/shared/format";
import { storageUrl } from "@marketplace/shared/storage";
import { useI18n } from "./I18nProvider";

import { useEffect, useRef, useState } from "react";
import { Archive, Search, Trash2 } from "lucide-react";
import {
  adminFilterQuery,
  adminStatusLabels,
  adminSortLabels,
  adminSortOptions,
  type AdminSort,
} from "@marketplace/shared/pagination";
import {
  removeAdminFilter,
  defaultAdminListState,
} from "@marketplace/shared/admin-list-state";
import { NativeSelect } from "./ui/native-select";
import { useAdminListState } from "./useAdminListState";
import { ActiveFilters } from "./ActiveFilters";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "./ui/dialog";
import Link from "next/link";
import type { AdminOverview } from "@marketplace/server/marketplace";
import { api } from "../lib/api";
import { formatPrice } from "@marketplace/shared/pricing";
import { ProductForm } from "./ProductForm";
import { RowActions } from "./RowActions";
import { Pagination } from "./Pagination";
import { EmptyTable, EmptyTableRow } from "./EmptyTable";
import { AdminSummary } from "./AdminSummary";
import { ListFilters } from "./ListFilters";
type Product = AdminOverview["products"][number];
type Category = AdminOverview["categories"][number];
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
  const [product, setProduct] = useState<Product | null | undefined>();
  const [category, setCategory] = useState<Category | null | undefined>();
  const actionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const addActionRef = useRef<HTMLButtonElement | null>(null);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    actionLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const restoreActionFocus = (event: Event) => {
    const target = actionTriggerRef.current?.isConnected
      ? actionTriggerRef.current
      : addActionRef.current;
    if (target) {
      event.preventDefault();
      target.focus();
    }
  };

  const [search, setSearch] = useState("");
  const {
    state: view,
    update: updateView,
    ready,
    invalidLink,
  } = useAdminListState(section);
  const { filters } = view;
  useEffect(() => setSearch(view.search), [view.search]);
  useEffect(() => {
    if (!ready || search === view.search) return;
    const timer = setTimeout(
      () => updateView({ ...view, search, page: 1 }, "replace"),
      300
    );
    return () => clearTimeout(timer);
  }, [search, view, ready, updateView]);
  const query = useQuery({
    queryKey: ["admin", section, view],
    enabled: ready,
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        section,
        page: String(view.page),
        query: view.search,
        sort: view.sort,
        ...adminFilterQuery(filters),
      });
      return api<AdminOverview>(`/api/admin/overview?${params}`, { signal });
    },
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === section ? previous : undefined,
  });
  const mutation = useMutation({
    mutationFn: ({ url, method, data }: Operation) =>
      api(url, { method, body: JSON.stringify(data) }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["admin"] });
      toast.success(t("Changes saved."));
    },
  });
  const save = async (operation: Operation) => {
    await mutation.mutateAsync(operation);
  };
  if (query.isPending)
    return <p role="status">{t("Loading your operations center…")}</p>;
  if (query.error)
    return (
      <div className="empty-panel">
        <p role="alert">{t(query.error.message)}</p>
        <Button variant="brand" size="brand" onClick={() => query.refetch()}>
          {t("Try again")}
        </Button>
      </div>
    );
  const data = query.data!;
  const searchPlaceholder =
    section === "products"
      ? t("Title or slug")
      : section === "categories"
        ? t("Name or description")
        : section === "payments"
          ? t("Order, sender or transaction reference")
          : t("Order number or customer");
  const paginated = ["products", "categories", "orders", "payments"].includes(
    section
  );
  const refreshing = query.isFetching || search !== view.search;
  const emptyList = paginated && data.pagination.total === 0;
  return (
    <>
      <AdminSummary section={section} data={data} />
      {invalidLink && paginated && (
        <p role="alert">
          {t("The filters in this link are invalid. Adjust or clear them.")}
        </p>
      )}

      {section === "dashboard" && (
        <>
          <section className="admin-panel">
            <div className="section-heading">
              <h2>{t("Recent orders")}</h2>
              <Link href="/orders">{t("View orders →")}</Link>
            </div>
            <OrderList orders={data.orders} />
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
      <div className={emptyList ? "admin-empty-list" : undefined}>
        {paginated && (
          <form
            className={`admin-toolbar admin-toolbar-${section}`}
            onSubmit={e => e.preventDefault()}
          >
            <label className="admin-list-search">
              <span className="sr-only">{t("Search")}</span>
              <Search size={18} aria-hidden="true" />
              <Input
                type="search"
                value={search}
                maxLength={200}
                onChange={e => {
                  setSearch(e.target.value);
                }}
                placeholder={searchPlaceholder}
              />
            </label>
            <label className="admin-sort">
              <span className="sr-only">{t("Sort")}</span>
              <NativeSelect
                aria-label={t("Sort")}
                value={view.sort}
                onChange={event =>
                  updateView({
                    ...view,
                    search,
                    sort: event.target.value as AdminSort,
                    page: 1,
                  })
                }
              >
                {adminSortOptions(section).map(value => (
                  <option key={value} value={value}>
                    {t(adminSortLabels[value])}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <ListFilters
              search={search}
              filters={filters}
              section={section}
              placeholder={searchPlaceholder}
              categories={data.categoryOptions}
              products={data.productOptions}
              onApply={(nextSearch, nextFilters) => {
                setSearch(nextSearch);
                updateView({
                  ...view,
                  search: nextSearch,
                  filters: nextFilters,
                  page: 1,
                });
              }}
            />
            {section === "products" && (
              <Button
                ref={addActionRef}
                variant="brand"
                size="brand"
                type="button"
                className="button button-primary"
                onClick={event => {
                  actionTriggerRef.current = event.currentTarget;
                  setProduct(null);
                }}
              >
                {t("Add product")}
              </Button>
            )}
            <Button
              variant="brand"
              size="brand"
              type="button"
              className="button button-secondary"
              onClick={() => {
                setSearch("");
                updateView(defaultAdminListState(section));
              }}
            >
              {t("Clear all")}
            </Button>
          </form>
        )}
        {paginated && (
          <ActiveFilters
            search={view.search}
            filters={filters}
            categories={data.categoryOptions}
            products={data.productOptions}
            onRemove={key => {
              const next = removeAdminFilter(view, key);
              setSearch(next.search);
              updateView(next);
            }}
          />
        )}
        {section === "products" && (
          <section className="admin-panel">
            <div
              className={`table-scroll${emptyList ? " admin-empty-table" : ""}`}
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
                  {!data.products.length && (
                    <EmptyTableRow columns={5} message="No products found." />
                  )}
                  {data.products.map(p => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.title}</strong>
                        <small>{p.slug}</small>
                      </td>
                      <td>
                        {
                          data.categoryOptions.find(c => c.id === p.categoryId)
                            ?.name
                        }
                      </td>
                      <td>
                        {formatPrice(p.discountPrice ?? p.price, intlLocale)}
                      </td>
                      <td>
                        <span className={`pill ${p.status}`}>
                          {t(adminStatusLabels[p.status])}
                        </span>
                      </td>
                      <td>
                        <RowActions
                          name={p.title}
                          editLabel={t("Edit product")}
                          disabled={mutation.isPending || refreshing}
                          onEdit={trigger => {
                            actionTriggerRef.current = trigger;
                            setProduct(p);
                          }}
                          destructiveAction={
                            p.status !== "archived"
                              ? {
                                  label: t("Archive"),
                                  icon: Archive,
                                  onSelect: trigger => {
                                    actionTriggerRef.current = trigger;
                                    setConfirmation({
                                      title: t("Archive"),
                                      description: t(
                                        "Archive {title}? It will no longer be for sale. Existing orders are preserved.",
                                        { title: p.title }
                                      ),
                                      actionLabel: t("Archive"),
                                      onConfirm: () =>
                                        save({
                                          url: `/api/admin/products?id=${p.id}`,
                                          method: "DELETE",
                                        }),
                                    });
                                  },
                                }
                              : undefined
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {section === "orders" && (
          <section className="admin-panel">
            <OrderList orders={data.orders} />
          </section>
        )}
        {section === "payments" && (
          <section className="review-list">
            {data.payments.map(payment => (
              <PaymentReview
                key={payment.id}
                payment={payment}
                pending={mutation.isPending || refreshing}
                save={save}
              />
            ))}
            {!data.payments.length && (
              <EmptyTable
                label="Payments"
                headers={[
                  "Payment method",
                  "Sender name",
                  "Price",
                  "Status",
                  "Actions",
                ]}
                message="No payments found."
              />
            )}
          </section>
        )}
        {section === "categories" && (
          <section className="admin-panel">
            <div className="section-heading">
              <p>{t("Organize the catalogue into clear collections.")}</p>
              <Button
                ref={addActionRef}
                variant="brand"
                size="brand"
                className="button button-primary"
                onClick={event => {
                  actionTriggerRef.current = event.currentTarget;
                  setCategory(null);
                }}
              >
                {t("Add category")}
              </Button>
            </div>
            {data.categories.map(c => (
              <article className="record-row" key={c.id}>
                <div>
                  <strong>{c.name}</strong>
                  <p>{c.description || c.slug}</p>
                </div>
                <RowActions
                  name={c.name}
                  editLabel={t("Edit category")}
                  disabled={mutation.isPending || refreshing}
                  onEdit={trigger => {
                    actionTriggerRef.current = trigger;
                    setCategory(c);
                  }}
                  destructiveAction={{
                    label: t("Delete"),
                    icon: Trash2,
                    onSelect: trigger => {
                      actionTriggerRef.current = trigger;
                      setConfirmation({
                        title: t("Delete"),
                        description: t(
                          "Delete category {name}? Categories containing products cannot be deleted.",
                          { name: c.name }
                        ),
                        actionLabel: t("Delete"),
                        onConfirm: () =>
                          save({
                            url: `/api/admin/categories?id=${c.id}`,
                            method: "DELETE",
                          }),
                      });
                    },
                  }}
                />
              </article>
            ))}
            {!data.categories.length && (
              <EmptyTable
                label="Categories"
                headers={["Name", "Description", "Actions"]}
                message="No categories found."
              />
            )}
          </section>
        )}
        {paginated && (
          <>
            <span className="sr-only" role="status">
              {refreshing ? t("Loading page…") : ""}
            </span>
            <Pagination
              pagination={data.pagination}
              disabled={refreshing || mutation.isPending}
              onPageChange={page => updateView({ ...view, page })}
            />
          </>
        )}
      </div>
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
        onCloseAutoFocus={restoreActionFocus}
        pending={mutation.isPending}
        title={product ? t("Edit product") : t("Add product")}
        onClose={() => setProduct(undefined)}
      >
        {product !== undefined && (
          <ProductForm
            key={product?.id ?? "new"}
            product={product}
            categories={data.categoryOptions}
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
        onCloseAutoFocus={restoreActionFocus}
        pending={mutation.isPending}
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
              <Input
                name="name"
                required
                minLength={2}
                defaultValue={category?.name}
              />
            </label>
            <label>
              {t("Description")}
              <Textarea
                aria-label={t("Description")}
                name="description"
                defaultValue={category?.description ?? ""}
              />
            </label>
            <Button
              variant="brand"
              size="brand"
              className="button button-primary"
              disabled={mutation.isPending}
            >
              {t("Save category")}
            </Button>
          </form>
        )}
      </Modal>
      {confirmation && (
        <ConfirmAction
          {...confirmation}
          open
          onOpenChange={open => {
            if (!open) setConfirmation(null);
          }}
          onCloseAutoFocus={restoreActionFocus}
        />
      )}
    </>
  );
}
function Modal({
  open,
  pending = false,
  title,
  onClose,
  onCloseAutoFocus,
  children,
}: {
  open: boolean;
  pending?: boolean;
  title: string;
  onClose: () => void;
  onCloseAutoFocus?: (event: Event) => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        if (!value && !pending) onClose();
      }}
    >
      <DialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        branded
        showCloseButton={false}
        overlayClassName="modal-overlay"
        className="modal-content"
        aria-describedby={undefined}
      >
        <div className="section-heading modal-heading">
          <DialogTitle>{title}</DialogTitle>
          <DialogClose
            disabled={pending}
            className="button button-secondary"
            aria-label={t("Close dialog")}
          >
            {t("Close")}
          </DialogClose>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}
function OrderList({ orders }: { orders: AdminOverview["orders"] }) {
  const { t, intlLocale } = useI18n();
  const client = useQueryClient();
  const complete = useMutation({
    mutationFn: (id: number) =>
      api(`/api/admin/orders/${id}/complete`, { method: "PATCH" }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin"] }),
        client.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
      toast.success(t("Delivery completed"));
    },
  });
  useEffect(() => {
    if (!/^#order-\d+$/.test(window.location.hash)) return;
    const target = document.getElementById(window.location.hash.slice(1));
    if (target instanceof HTMLDetailsElement) {
      target.open = true;
      target.scrollIntoView({ block: "center" });
      target.focus({ preventScroll: true });
    }
  }, [orders]);
  return orders.length ? (
    <div>
      {orders.map(order => (
        <details
          className="order-detail"
          key={order.id}
          id={`order-${order.id}`}
          tabIndex={-1}
        >
          <summary>
            <strong>{t("Order #{id}", { id: order.id })}</strong>
            <span>{order.customerName}</span>
            <span>{formatPrice(order.total, intlLocale)}</span>
            <span className={`pill ${order.orderStatus}`}>
              {t(adminStatusLabels[order.orderStatus])}
            </span>
          </summary>
          <p>
            <Link href={`/orders/${order.id}`}>{t("View order details")}</Link>
          </p>
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
            {t("Payment status:")} {t(adminStatusLabels[order.paymentStatus])}
          </p>
          {order.completedAt && (
            <p>
              {t("Delivered")} · {formatDate(order.completedAt, intlLocale)} ·{" "}
              {t("Administrator #{id}", { id: order.completedBy ?? "—" })}
            </p>
          )}
          {order.paymentStatus === "approved" &&
            order.orderStatus === "paid" && (
              <ConfirmAction
                title={t("Mark order #{id} as delivered?", { id: order.id })}
                description={t(
                  "Confirm that all products in this order have been delivered. The customer will be notified."
                )}
                actionLabel={t("Mark as delivered")}
                onConfirm={async () => {
                  await complete.mutateAsync(order.id);
                }}
              >
                <Button
                  variant="brand"
                  size="brand"
                  className="button button-primary"
                  disabled={complete.isPending}
                >
                  {t("Mark as delivered")}
                </Button>
              </ConfirmAction>
            )}
        </details>
      ))}
    </div>
  ) : (
    <EmptyTable
      label="Orders"
      headers={["Orders", "Customer", "Price", "Status"]}
      message="No orders found."
    />
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
            <Textarea
              aria-label={t("Rejection reason")}
              value={reason}
              onChange={e => setReason(e.target.value)}
              minLength={2}
              maxLength={1000}
            />
          </label>
          <div className="row-actions">
            <Button
              variant="brand"
              size="brand"
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
            </Button>
            <Button
              variant="brand"
              size="brand"
              className="button button-secondary"
              disabled={pending || reason.trim().length < 2}
            >
              {t("Reject payment #{id}", { id: payment.id })}
            </Button>
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

  return (
    <form
      className="admin-panel admin-form"
      key={`${method?.id}-${method?.updatedAt}`}
      onSubmit={async e => {
        e.preventDefault();

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
          toast.error(t((e as Error).message), { id: "operation-error" });
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
        <Input
          name="accountName"
          defaultValue={method?.accountName}
          maxLength={160}
        />
      </label>
      <label>
        {t("Account number")}
        <Input
          name="accountNumber"
          defaultValue={method?.accountNumber}
          maxLength={80}
        />
      </label>
      <label>
        {t("Checkout instructions")}
        <Textarea
          aria-label={t("Checkout instructions")}
          name="instructions"
          defaultValue={method?.instructions ?? ""}
          maxLength={1000}
        />
      </label>

      <Button
        variant="brand"
        size="brand"
        className="button button-primary"
        disabled={pending}
      >
        {t("Save {name}", { name })}
      </Button>
    </form>
  );
}
