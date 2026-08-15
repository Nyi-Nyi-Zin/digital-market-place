import Link from "next/link";
import { Header } from "../../../components/Header";
import "./payment.css";

export default function PaymentSettingsPage() { return <><Header /><main className="shell simple-page"><p className="eyebrow plain">ADMIN SETTINGS</p><h1>Myanmar payment methods</h1><div className="payment-settings">{["KBZPay", "AYA Pay", "WavePay"].map(method => <section key={method}><h2>{method}</h2><label>Account name<input placeholder="Account holder name" /></label><label>Account number<input placeholder="Payment account number" /></label><label>Checkout instructions<textarea placeholder="Explain how customers should submit their payment proof." /></label><div><button className="button button-primary">Save changes</button><Link className="button button-secondary" href="/admin">Cancel</Link></div></section>)}</div></main></>; }
