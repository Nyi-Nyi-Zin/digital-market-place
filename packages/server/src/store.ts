import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./database";
import { storeDocuments, storeSettings } from "./schema";
import {
  defaultDocuments,
  defaultSettings,
  documentInput,
  documentKey,
  contentLocale,
  settingsInput,
} from "@marketplace/shared/store";
import { createTranslator } from "@marketplace/shared/i18n";
import { dictionaries } from "@marketplace/shared/locales";
import { HttpError } from "./http";
import { recordActivity } from "./activity";

export async function getStoreSettings() {
  const [saved] = await getDb()
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.id, 1));
  return saved ?? { ...defaultSettings, revision: 0, updatedAt: null };
}
export async function getStoreDocument(rawKey: unknown, rawLocale: unknown) {
  const key = documentKey.parse(rawKey),
    locale = contentLocale.parse(rawLocale);
  const [saved] = await getDb()
    .select()
    .from(storeDocuments)
    .where(and(eq(storeDocuments.key, key), eq(storeDocuments.locale, locale)));
  const t = createTranslator(dictionaries[locale]);
  const base = defaultDocuments[key];
  return (
    saved ?? {
      key,
      locale,
      revision: 0,
      updatedAt: null,
      content: {
        title: t(base.title),
        description: t(base.description),
        sections: base.sections.map(s => ({
          heading: t(s.heading),
          body: t(s.body),
        })),
      },
    }
  );
}
export async function saveStoreSettings(actorId: number, raw: unknown) {
  const input = settingsInput
    .extend({ revision: z.number().int().min(0) })
    .parse(raw);
  const { revision, ...data } = input;
  return getDb().transaction(async tx => {
    const rows =
      revision === 0
        ? await tx
            .insert(storeSettings)
            .values({ id: 1, ...data })
            .onConflictDoNothing()
            .returning()
        : await tx
            .update(storeSettings)
            .set({
              ...data,
              revision: sql`${storeSettings.revision} + 1`,
              updatedAt: new Date(),
            })
            .where(
              and(eq(storeSettings.id, 1), eq(storeSettings.revision, revision))
            )
            .returning();
    if (!rows[0])
      throw new HttpError(409, "This content changed. Reload before saving.");
    await recordActivity(tx, actorId, "Store settings updated", "store");
    return rows[0];
  });
}
export async function saveStoreDocument(actorId: number, raw: unknown) {
  const { key, locale, content, revision } = z
    .object({
      key: documentKey,
      locale: contentLocale,
      content: documentInput,
      revision: z.number().int().min(0),
    })
    .parse(raw);
  return getDb().transaction(async tx => {
    const rows =
      revision === 0
        ? await tx
            .insert(storeDocuments)
            .values({ key, locale, content })
            .onConflictDoNothing()
            .returning()
        : await tx
            .update(storeDocuments)
            .set({
              content,
              revision: sql`${storeDocuments.revision} + 1`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(storeDocuments.key, key),
                eq(storeDocuments.locale, locale),
                eq(storeDocuments.revision, revision)
              )
            )
            .returning();
    if (!rows[0])
      throw new HttpError(409, "This content changed. Reload before saving.");
    await recordActivity(
      tx,
      actorId,
      "Store content updated",
      `${key}:${locale}`
    );
    return rows[0];
  });
}
