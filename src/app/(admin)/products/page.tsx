"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Box,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Eye,
  Mars,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  CircleX,
  PauseCircle,
  Venus,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AdminProduct, PageResult } from "@/types";

type Summary = { total: number; active: number; outOfStock: number; inactive: number };
type ProductGender = "men" | "women";
type ProductFormState = {
  name: string;
  brand: string;
  category: ProductGender;
  price: string;
  stock: string;
  sellerId: string;
  availability: "active" | "hidden";
};
const PAGE_SIZE = 5;
const EMPTY_FORM: ProductFormState = {
  name: "",
  brand: "",
  category: "men",
  price: "",
  stock: "0",
  sellerId: "",
  availability: "active",
};

function StatCard({ title, value, icon: Icon, tone }: { title: string; value: number | null; icon: typeof Box; tone: string }) {
  return (
    <div className={`flex min-h-[82px] items-center gap-3 rounded-xl px-4 py-4 sm:px-5 ${tone}`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/75"><Icon size={22} /></span>
      <span>
        <span className="block text-xs font-medium text-slate-700 sm:text-sm">{title}</span>
        <span className="mt-0.5 block text-2xl font-bold leading-none text-slate-950">{value === null ? "—" : value.toLocaleString()}</span>
      </span>
    </div>
  );
}

function productState(product: AdminProduct): "Active" | "Out of Stock" | "Inactive" {
  const isPublished = product.published && product.status === "approved" && product.availability === "active" && product.sellerActive;
  if (!isPublished) return "Inactive";
  return product.stock > 0 ? "Active" : "Out of Stock";
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);
}

function productForm(product?: AdminProduct): ProductFormState {
  if (!product) return { ...EMPTY_FORM };
  return {
    name: product.name,
    brand: product.brand,
    category: product.gender,
    price: String(product.price),
    stock: String(product.stock),
    sellerId: product.seller?.id ?? "",
    availability: product.availability,
  };
}

export default function ProductsPage() {
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busy, setBusy] = useState("");
  const [viewProduct, setViewProduct] = useState<AdminProduct | null>(null);
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<ProductFormState>({ ...EMPTY_FORM });

  const loadProducts = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (query) params.set("q", query);
    if (statusFilter) params.set("status", statusFilter);
    return api<PageResult<AdminProduct>>(`/admin/products?${params}`);
  }, [page, query, statusFilter]);

  const loadSummary = useCallback(async () => {
    const result = await api<Summary>("/admin/products/summary");
    setSummary(result);
  }, []);

  const refresh = useCallback(async () => {
    const [result] = await Promise.all([loadProducts(), loadSummary()]);
    setItems(result.items);
    setPages(result.pages);
    setTotal(result.total);
  }, [loadProducts, loadSummary]);

  useEffect(() => {
    let active = true;
    loadProducts().then((result) => {
      if (!active) return;
      setItems(result.items);
      setPages(result.pages);
      setTotal(result.total);
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : "Could not load products.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [loadProducts]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => api<Summary>("/admin/products/summary")).then((productSummary) => {
      if (!active) return;
      setSummary(productSummary);
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : "Could not load product totals.");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (search.trim() === query) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setPage(1);
      setQuery(search.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, search]);

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      setError("Enter a valid product price and non-negative whole-number stock.");
      return;
    }

    const body = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      gender: form.category,
      price,
      stock,
      availability: form.availability,
    };
    const productId = editProduct?.id ?? "new-product";
    setBusy(productId);
    setError("");
    setNotice("");
    try {
      if (!editProduct) return;
      await api(`/admin/products/${editProduct.id}`, { method: "PATCH", body: JSON.stringify(body) });
      setNotice(`${form.name} was updated.`);
      setEditProduct(null);
      setForm({ ...EMPTY_FORM });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save product.");
    } finally {
      setBusy("");
    }
  }

  async function deleteProduct(product: AdminProduct) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setBusy(product.id);
    setError("");
    setNotice("");
    try {
      await api(`/admin/products/${product.id}`, { method: "DELETE" });
      setNotice(`${product.name} was deleted.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete product.");
    } finally {
      setBusy("");
    }
  }

  function changeStatusFilter(nextFilter: string) {
    if (statusFilter === nextFilter && page === 1) return;
    setLoading(true);
    setPage(1);
    setStatusFilter(nextFilter);
  }

  function movePage(nextPage: number) {
    setLoading(true);
    setPage(nextPage);
  }

  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[27px] font-bold tracking-tight text-slate-950">My Products</h2>
          <p className="mt-1 text-sm text-slate-600">Manage your TIMEORA store products.</p>
        </div>
        <Link href="/products/new" className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700">
          <Plus size={17} /> Add Product
        </Link>
      </div>

      {notice && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Products" value={summary?.total ?? null} icon={Box} tone="bg-violet-100/80 text-violet-600" />
        <StatCard title="Active Products" value={summary?.active ?? null} icon={CircleCheck} tone="bg-emerald-100/80 text-emerald-600" />
        <StatCard title="Out of Stock" value={summary?.outOfStock ?? null} icon={PauseCircle} tone="bg-amber-100/80 text-amber-600" />
        <StatCard title="Inactive" value={summary?.inactive ?? null} icon={CircleX} tone="bg-rose-100/80 text-rose-600" />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-[42px] w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3.5 text-slate-500 sm:max-w-[445px]">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products by name..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
          {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="rounded p-0.5 hover:bg-slate-100"><X size={15} /></button>}
        </label>
        <div className="sm:flex">
          <select aria-label="Filter products" value={statusFilter} onChange={(event) => changeStatusFilter(event.target.value)} className="h-[42px] w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 sm:w-auto sm:min-w-[190px]">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="inactive">Inactive</option>
            <option value="rejected">Rejected</option>
            <option value="men">Men</option>
            <option value="women">Women</option>
          </select>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-100/90 text-xs text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 text-center font-semibold">Category</th>
                <th className="px-4 py-3 text-center font-semibold">Price</th>
                <th className="px-4 py-3 text-center font-semibold">Stock</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && items.map((product) => {
                const state = productState(product);
                const image = product.images?.[0];
                return (
                  <tr key={product.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100">
                          {image ? <Image src={image} alt="" width={44} height={44} unoptimized className="size-full object-cover" /> : <Box size={22} className="text-slate-400" />}
                        </div>
                        <span className="min-w-0">
                          <span className="block max-w-[260px] truncate font-semibold text-slate-900">{product.name}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                        product.gender === "women" ? "bg-pink-100 text-pink-700" : "bg-sky-100 text-sky-700"
                      }`}>
                        {product.gender === "women" ? <Venus size={14} /> : <Mars size={14} />}
                        {product.gender === "women" ? "Women" : "Men"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center font-semibold text-slate-800">{formatPrice(product.price)}</td>
                    <td className="px-4 py-2.5 text-center font-medium text-slate-800">{product.stock}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${state === "Active" ? "bg-emerald-100 text-emerald-700" : state === "Out of Stock" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>{state}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <button aria-label={`View ${product.name}`} onClick={() => setViewProduct(product)} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-violet-600 hover:bg-violet-50"><Eye size={18} /></button>
                        <button aria-label={`Edit ${product.name}`} disabled={busy === product.id} onClick={() => { setForm(productForm(product)); setEditProduct(product); }} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-800 hover:bg-slate-100 disabled:opacity-50"><Pencil size={17} /></button>
                        <button aria-label={`Delete ${product.name}`} disabled={busy === product.id} onClick={() => void deleteProduct(product)} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={17} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {loading && <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-slate-500">Loading products…</td></tr>}
              {!loading && !items.length && <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-slate-500">{query ? `No products match “${query}”.` : "No products found for these filters."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-slate-500">Showing {start}–{end} of {total} products</span>
        <nav aria-label="Product pages" className="flex items-center gap-1.5">
          <button aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => movePage(page - 1)} className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={17} /></button>
          {Array.from({ length: Math.min(pages, 3) }, (_, index) => {
            const pageNumber = pages <= 3 ? index + 1 : Math.max(1, Math.min(page - 1, pages - 2)) + index;
            return <button key={pageNumber} aria-current={page === pageNumber ? "page" : undefined} onClick={() => movePage(pageNumber)} className={`grid size-9 place-items-center rounded-lg border text-sm font-medium ${page === pageNumber ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{pageNumber}</button>;
          })}
          {pages > 3 && <><span className="px-1 text-slate-400">…</span><button onClick={() => movePage(pages)} className={`grid size-9 place-items-center rounded-lg border text-sm font-medium ${page === pages ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{pages}</button></>}
          <button aria-label="Next page" disabled={page >= pages || loading} onClick={() => movePage(page + 1)} className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={17} /></button>
        </nav>
      </div>

      {editProduct && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setEditProduct(null); }}>
          <form onSubmit={(event) => void saveProduct(event)} className="my-auto w-full max-w-[500px] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between">
              <div><h3 className="text-lg font-bold text-slate-950">Edit Product</h3><p className="mt-1 text-xs text-slate-500">Update product details.</p></div>
              <button type="button" disabled={Boolean(busy)} onClick={() => setEditProduct(null)} aria-label="Close dialog" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"><X size={19} /></button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-800 sm:col-span-2">Product name <span className="text-rose-600">*</span>
                <input required minLength={2} maxLength={120} value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100" />
              </label>
              <label className="text-sm font-medium text-slate-800">Brand <span className="text-rose-600">*</span>
                <input required maxLength={60} value={form.brand} onChange={(event) => setForm((value) => ({ ...value, brand: event.target.value }))} className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100" />
              </label>
              <label className="text-sm font-medium text-slate-800">Category <span className="text-rose-600">*</span>
                <select required value={form.category} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value as ProductGender }))} className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100">
                  <option value="men">Men</option>
                  <option value="women">Women</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-800">Price (₹) <span className="text-rose-600">*</span>
                <input required type="number" min="0" step="1" value={form.price} onChange={(event) => setForm((value) => ({ ...value, price: event.target.value }))} className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100" />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm font-medium text-slate-800">Availability
                  <select value={form.availability} onChange={(event) => setForm((value) => ({ ...value, availability: event.target.value as "active" | "hidden" }))} className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"><option value="active">Active</option><option value="hidden">Inactive</option></select>
                </label>
                <label className="text-sm font-medium text-slate-800">Stock <span className="text-rose-600">*</span>
                  <input required type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm((value) => ({ ...value, stock: event.target.value }))} className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100" />
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={Boolean(busy)} onClick={() => setEditProduct(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={Boolean(busy)} className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">{busy ? "Saving…" : "Save Changes"}</button>
            </div>
          </form>
        </div>
      )}

      {viewProduct && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewProduct(null); }}>
          <div className="w-full max-w-[460px] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between">
              <div><h3 className="text-lg font-bold text-slate-950">Product Details</h3><p className="mt-1 text-xs text-slate-500">{viewProduct.slug}</p></div>
              <button onClick={() => setViewProduct(null)} aria-label="Close dialog" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"><X size={19} /></button>
            </div>
            {viewProduct.images?.[0] && <Image src={viewProduct.images[0]} alt={viewProduct.name} width={420} height={220} unoptimized className="mt-4 h-44 w-full rounded-xl bg-slate-100 object-cover" />}
            <h4 className="mt-4 text-base font-semibold text-slate-950">{viewProduct.name}</h4>
            <p className="mt-1 text-sm text-slate-600">{viewProduct.brand} · {viewProduct.category}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
              <div><dt className="text-xs text-slate-500">Vendor</dt><dd className="mt-1 truncate font-medium">{viewProduct.seller?.storeName ?? "Direct"}</dd></div>
              <div><dt className="text-xs text-slate-500">Price</dt><dd className="mt-1 font-medium">{formatPrice(viewProduct.price)}</dd></div>
              <div><dt className="text-xs text-slate-500">Stock</dt><dd className="mt-1 font-medium">{viewProduct.stock}</dd></div>
              <div><dt className="text-xs text-slate-500">Status</dt><dd className="mt-1 font-medium">{productState(viewProduct)}</dd></div>
              <div><dt className="text-xs text-slate-500">Discount</dt><dd className="mt-1 font-medium">{viewProduct.discountPercent ?? 0}%</dd></div>
            </dl>
            {viewProduct.description && <p className="mt-4 text-sm leading-6 text-slate-600">{viewProduct.description}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
