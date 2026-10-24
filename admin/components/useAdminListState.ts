"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminListUrl,
  defaultAdminListState,
  readAdminListState,
  type AdminListState,
} from "@marketplace/shared/admin-list-state";
import type { AdminListInput } from "@marketplace/shared/pagination";

export function useAdminListState(section: AdminListInput["section"]) {
  const [state, setState] = useState(() => defaultAdminListState(section));
  const [loadedSection, setLoadedSection] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);
  useEffect(() => {
    const read = () => {
      const parsed = readAdminListState(
        new URLSearchParams(window.location.search),
        section
      );
      setState(parsed.state);
      setInvalidLink(parsed.invalid);
      setLoadedSection(section);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [section]);
  const update = useCallback(
    (next: AdminListState, mode: "push" | "replace" = "push") => {
      const url = adminListUrl(new URL(window.location.href), section, next);
      if (
        url !==
        `${window.location.pathname}${window.location.search}${window.location.hash}`
      ) {
        window.history[mode === "push" ? "pushState" : "replaceState"](
          null,
          "",
          url
        );
      }
      setState(next);
      setInvalidLink(false);
    },
    [section]
  );
  return { state, update, ready: loadedSection === section, invalidLink };
}
