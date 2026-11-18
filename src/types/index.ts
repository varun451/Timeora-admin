export type AccountStatus = "active" | "blocked";
export type SellerStatus = "active" | "suspended";
export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "customer" | "seller" | "admin" | "super_admin";
  status?: AccountStatus;
  createdAt?: string;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface Seller {
  id: string;
  userId: string;
  storeName: string;
  slug: string;
  ownerName: string;
  email: string;
  phone: string;
  status: SellerStatus;
  commissionBps?: number;
  suspensionReason?: string;
  productCount?: number;
  createdAt?: string;
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  sku: string;
  brand: string;
  category: string;
  gender: "men" | "women";
  price: number;
  stock: number;
  images?: string[];
  description?: string;
  discountPercent?: number;
  status: "draft" | "pending" | "approved" | "rejected";
  availability: "active" | "hidden";
  sellerActive: boolean;
  published: boolean;
  seller: { id: string; storeName: string; ownerName: string; slug: string } | null;
  isFeatured: boolean;
  createdAt?: string;
}

export interface SellerApplication {
  id: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  status: ApplicationStatus;
  createdAt: string;
}
