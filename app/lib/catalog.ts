export type Product = {
  id: number;
  slug: string;
  title: string;
  category: string;
  price: number;
  salePrice?: number;
  rating: number;
  sales: number;
  description: string;
  tone: string;
};

export const categories = ["UI Kits", "Templates", "Figma", "Source Code", "Ebooks", "Notion Templates"];

export const products: Product[] = [
  { id: 1, slug: "aurora-figma-ui-kit", title: "Aurora Figma UI Kit", category: "Figma", price: 39, salePrice: 29, rating: 4.9, sales: 154, description: "A complete visual system for polished web and mobile interfaces.", tone: "violet" },
  { id: 2, slug: "saas-launch-template", title: "SaaS Launch Template", category: "Templates", price: 49, rating: 4.8, sales: 117, description: "High-converting sections for your next product launch.", tone: "blue" },
  { id: 3, slug: "react-dashboard-starter", title: "React Dashboard Starter", category: "Source Code", price: 59, salePrice: 45, rating: 4.9, sales: 92, description: "A practical dashboard foundation for modern web products.", tone: "orange" },
  { id: 4, slug: "creator-notion-os", title: "Creator Notion OS", category: "Notion Templates", price: 24, rating: 4.7, sales: 205, description: "Plan, publish, and manage creative work in one workspace.", tone: "green" },
  { id: 5, slug: "minimal-brand-kit", title: "Minimal Brand Kit", category: "UI Kits", price: 32, rating: 4.8, sales: 77, description: "A refined identity toolkit for fast-moving teams.", tone: "pink" },
  { id: 6, slug: "freelance-client-playbook", title: "Freelance Client Playbook", category: "Ebooks", price: 18, rating: 4.6, sales: 131, description: "A focused guide for winning and managing better client work.", tone: "amber" },
  { id: 7, slug: "ecommerce-component-library", title: "Commerce Component Library", category: "UI Kits", price: 42, salePrice: 35, rating: 4.9, sales: 68, description: "Essential storefront patterns, ready to customize.", tone: "cyan" },
  { id: 8, slug: "product-research-workspace", title: "Product Research Workspace", category: "Notion Templates", price: 22, rating: 4.7, sales: 103, description: "Keep discovery, evidence, and decisions in one clear system.", tone: "rose" },
];

export function formatPrice(price: number) { return `$${price.toFixed(0)}`; }
