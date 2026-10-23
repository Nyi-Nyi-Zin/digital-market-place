import en from "./en.json";
import my from "./my.json";
import th from "./th.json";
import ja from "./ja.json";
import zh from "./zh.json";
import type { Locale } from "../i18n";

type Dictionary = Record<keyof typeof en, string>;
export const dictionaries = { en, my, th, ja, zh } satisfies Record<
  Locale,
  Dictionary
>;
