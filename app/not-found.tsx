import Link from "next/link";

export default function NotFound() {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem", fontFamily: "Arial, sans-serif", textAlign: "center" }}><div><p style={{ color: "#7a2cff", fontWeight: 700, letterSpacing: ".12em" }}>404</p><h1 style={{ fontSize: "3rem", margin: "0.5rem 0" }}>This page is not available.</h1><p style={{ color: "#6e7384" }}>Return to the marketplace to keep exploring digital products.</p><Link href="/" style={{ display: "inline-block", marginTop: "1.5rem", padding: ".8rem 1rem", borderRadius: ".7rem", background: "#7a2cff", color: "white", fontWeight: 700 }}>Back to marketplace</Link></div></main>;
}
