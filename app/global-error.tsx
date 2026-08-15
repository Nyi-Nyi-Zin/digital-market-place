"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <html lang="en"><body style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem", fontFamily: "Arial, sans-serif", textAlign: "center" }}><main><p style={{ color: "#7a2cff", fontWeight: 700, letterSpacing: ".12em" }}>MARKETPLACE</p><h1>Something needs another try.</h1><p>Refresh this route or return to the storefront.</p><button type="button" onClick={reset} style={{ marginTop: "1rem", padding: ".8rem 1rem", border: 0, borderRadius: ".7rem", background: "#7a2cff", color: "white", fontWeight: 700 }}>Try again</button></main></body></html>;
}
