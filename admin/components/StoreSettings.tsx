"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useI18n } from "./I18nProvider";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { NativeSelect } from "./ui/native-select";
import { QueryState } from "./Operations";
import {
  documentKeys,
  defaultDocuments,
  type StoreDocument,
} from "@marketplace/shared/store";
import type {
  getStoreDocument,
  getStoreSettings,
} from "@marketplace/server/store";
import { locales, localeNames } from "@marketplace/shared/i18n";
import { baseCurrency, currencies } from "@marketplace/shared/currency";

type Settings = Awaited<ReturnType<typeof getStoreSettings>>;
type Document = Awaited<ReturnType<typeof getStoreDocument>>;
export function StoreSettings() {
  const { t, locale } = useI18n(),
    [key, setKey] = useState<string>("how-to-buy"),
    [language, setLanguage] = useState<string>(locale);
  const settings = useQuery({
    queryKey: ["admin", "store-settings"],
    queryFn: () => api<Settings>("/api/admin/settings/store"),
    refetchOnWindowFocus: false,
  });
  const document = useQuery({
    queryKey: ["admin", "content", key, language],
    queryFn: ({ signal }) =>
      api<Document>(
        `/api/admin/content?${new URLSearchParams({ key, locale: language })}`,
        { signal }
      ),
    refetchOnWindowFocus: false,
  });
  return (
    <div className="operations-page">
      <QueryState query={settings}>
        {settings.data && (
          <SettingsForm
            key={`${settings.data.revision}`}
            initial={settings.data}
          />
        )}
      </QueryState>
      <section className="admin-panel">
        <h2>{t("Store content")}</h2>
        <p>
          {t(
            "Edit each language separately. Saving publishes the content immediately."
          )}
        </p>
        <div className="page-actions">
          <label>
            {t("Page")}
            <NativeSelect
              aria-label={t("Page")}
              value={key}
              onChange={e => setKey(e.target.value)}
            >
              {documentKeys.map(k => (
                <option value={k} key={k}>
                  {t(defaultDocuments[k].title)}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label>
            {t("Language")}
            <NativeSelect
              aria-label={t("Language")}
              value={language}
              onChange={e => setLanguage(e.target.value)}
            >
              {locales.map(l => (
                <option value={l} key={l}>
                  {localeNames[l]}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>
        <QueryState query={document}>
          {document.data && (
            <DocumentForm
              key={`${key}:${language}:${document.data.revision}`}
              initial={document.data}
            />
          )}
        </QueryState>
      </section>
    </div>
  );
}
function SettingsForm({ initial }: { initial: Settings }) {
  const { t } = useI18n(),
    client = useQueryClient();
  const [data, setData] = useState({
    supportEmail: initial.supportEmail,
    telegramUsername: initial.telegramUsername,
    supportHours: initial.supportHours,
    usdRate: initial.usdRate ?? "",
    sgdRate: initial.sgdRate ?? "",
    mmkRate: initial.mmkRate ?? "",
  });
  const mutation = useMutation({
    mutationFn: () =>
      api("/api/admin/settings/store", {
        method: "PATCH",
        body: JSON.stringify({
          ...data,
          usdRate: data.usdRate || null,
          sgdRate: data.sgdRate || null,
          mmkRate: data.mmkRate || null,
          revision: initial.revision,
        }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["admin", "store-settings"] });
      toast.success(t("Changes saved."));
    },
  });
  return (
    <section className="admin-panel">
      <h2>{t("Store settings")}</h2>
      <form
        className="support-form"
        onSubmit={e => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <label>
          {t("Support email")}
          <Input
            type="email"
            required
            maxLength={320}
            value={data.supportEmail}
            disabled={mutation.isPending}
            onChange={e => setData({ ...data, supportEmail: e.target.value })}
          />
        </label>
        <label>
          {t("Telegram username")}
          <Input
            required
            pattern="[a-zA-Z][a-zA-Z0-9_]{4,31}"
            value={data.telegramUsername}
            disabled={mutation.isPending}
            onChange={e =>
              setData({ ...data, telegramUsername: e.target.value })
            }
          />
        </label>
        <label>
          {t("Support hours")}
          <Input
            maxLength={300}
            value={data.supportHours}
            disabled={mutation.isPending}
            onChange={e => setData({ ...data, supportHours: e.target.value })}
          />
        </label>
        <p>
          {t("Leave support hours blank until your schedule is confirmed.")}
        </p>
        <fieldset className="content-section">
          <legend>{t("Exchange rates")}</legend>
          <p>
            {t("Product prices and reports use {currency}.", {
              currency: baseCurrency,
            })}
          </p>
          {currencies
            .filter(value => value !== baseCurrency)
            .map(value => {
              const field = `${value.toLowerCase()}Rate` as
                | "usdRate"
                | "sgdRate"
                | "mmkRate";
              return (
                <label key={value}>
                  {`1 ${baseCurrency} = ${value}`}
                  <Input
                    aria-label={`1 ${baseCurrency} = ${value}`}
                    type="number"
                    inputMode="decimal"
                    min="0.00000001"
                    max="99999999.99999999"
                    step="0.00000001"
                    value={data[field]}
                    disabled={mutation.isPending}
                    onChange={e =>
                      setData({ ...data, [field]: e.target.value })
                    }
                  />
                </label>
              );
            })}
          <p>
            {t(
              "Leave a rate blank to disable that currency. Existing orders keep their confirmed rate and total."
            )}
          </p>
        </fieldset>
        <Button type="submit" disabled={mutation.isPending}>
          {t(mutation.isPending ? "Saving…" : "Save changes")}
        </Button>
      </form>
    </section>
  );
}
function DocumentForm({ initial }: { initial: Document }) {
  const { t } = useI18n(),
    client = useQueryClient(),
    [content, setContent] = useState<StoreDocument>(initial.content);
  const mutation = useMutation({
    mutationFn: () =>
      api("/api/admin/content", {
        method: "PATCH",
        body: JSON.stringify({
          key: initial.key,
          locale: initial.locale,
          content,
          revision: initial.revision,
        }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: ["admin", "content", initial.key, initial.locale],
      });
      toast.success(t("Changes saved."));
    },
  });
  function updateSection(
    index: number,
    field: "heading" | "body",
    value: string
  ) {
    setContent(c => ({
      ...c,
      sections: c.sections.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      ),
    }));
  }
  return (
    <form
      className="support-form"
      onSubmit={e => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <label>
        {t("Title")}
        <Input
          required
          maxLength={180}
          value={content.title}
          disabled={mutation.isPending}
          onChange={e => setContent({ ...content, title: e.target.value })}
        />
      </label>
      <label>
        {t("Description")}
        <Textarea
          maxLength={600}
          value={content.description}
          disabled={mutation.isPending}
          onChange={e =>
            setContent({ ...content, description: e.target.value })
          }
        />
      </label>
      {content.sections.map((section, index) => (
        <fieldset className="content-section" key={index}>
          <legend>{t("Section {number}", { number: index + 1 })}</legend>
          <label>
            {t("Heading")}
            <Input
              required
              maxLength={180}
              value={section.heading}
              disabled={mutation.isPending}
              onChange={e => updateSection(index, "heading", e.target.value)}
            />
          </label>
          <label>
            {t("Body")}
            <Textarea
              required
              maxLength={6000}
              value={section.body}
              disabled={mutation.isPending}
              onChange={e => updateSection(index, "body", e.target.value)}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={content.sections.length <= 1 || mutation.isPending}
            onClick={() =>
              setContent({
                ...content,
                sections: content.sections.filter((_s, i) => i !== index),
              })
            }
          >
            {t("Remove section")}
          </Button>
        </fieldset>
      ))}
      <div className="page-actions">
        <Button
          type="button"
          variant="outline"
          disabled={content.sections.length >= 20 || mutation.isPending}
          onClick={() =>
            setContent({
              ...content,
              sections: [...content.sections, { heading: "", body: "" }],
            })
          }
        >
          {t("Add section")}
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {t(mutation.isPending ? "Saving…" : "Save and publish")}
        </Button>
      </div>
    </form>
  );
}
