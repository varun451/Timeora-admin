"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownToLine,
  Box,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleX,
  CreditCard,
  Eye,
  Layers,
  MapPin,
  MoreHorizontal,
  Package,
  PackageCheck,
  Search,
  ShoppingCart,
  UserRound,
  Truck,
  X,
} from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";

type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
type OrderItem = { productId: string; name: string; images?: string[]; unitPrice: number; quantity: number };
type Order = {
  id: string;
  items: OrderItem[];
  shippingAddress: { name?: string; phone?: string; line1?: string; line2?: string; city?: string; state?: string; pincode?: string };
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  paymentMethod: "razorpay" | "cod";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  status: OrderStatus;
  createdAt: string;
  customer: { name: string; email: string; phone?: string };
};
type PageResult<T> = { items: T[]; total: number; page: number; pages: number };
type Summary = { total: number; processing: number; shipped: number; delivered: number; cancelled: number };
type TabStatus = "" | "processing" | "shipped" | "delivered" | "cancelled";

const PAGE_SIZE = 5;
const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "processing",
  processing: "shipped",
  shipped: "delivered",
};

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function orderNumber(id: string) {
  return `#TM${id.slice(-6).toUpperCase()}`;
}

function statusStyle(status: OrderStatus) {
  if (status === "delivered") return "bg-emerald-100 text-emerald-700";
  if (status === "shipped") return "bg-blue-100 text-blue-700";
  if (status === "processing" || status === "confirmed" || status === "pending") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function StatCard({ title, value, icon: Icon, tone }: { title: string; value: number | null; icon: typeof ShoppingCart; tone: string }) {
  return (
    <div className={`flex min-h-[76px] items-center gap-3 rounded-xl px-4 py-3.5 ${tone}`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/80"><Icon size={21} /></span>
      <span>
        <span className="block text-xs font-medium text-slate-700">{title}</span>
        <span className="mt-0.5 block text-2xl font-bold leading-none text-slate-950">{value === null ? "—" : value.toLocaleString()}</span>
      </span>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tab, setTab] = useState<TabStatus>("");
  const [statusDraft, setStatusDraft] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [menuOrder, setMenuOrder] = useState("");

  const makeParams = useCallback((requestedPage: number, requestedLimit: number) => {
    const params = new URLSearchParams({ page: String(requestedPage), limit: String(requestedLimit) });
    const effectiveStatus = statusFilter || tab;
    if (effectiveStatus) params.set("status", effectiveStatus);
    if (query) params.set("q", query);
    if (dateRange !== "all") {
      const days = Number(dateRange);
      params.set("dateFrom", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
    }
    return params;
  }, [dateRange, query, statusFilter, tab]);

  const loadOrders = useCallback(async () => {
    return api<PageResult<Order>>(`/admin/orders?${makeParams(page, PAGE_SIZE)}`);
  }, [makeParams, page]);

  const loadSummary = useCallback(async () => {
    const result = await api<Summary>("/admin/orders/summary");
    setSummary(result);
  }, []);

  const refresh = useCallback(async () => {
    const [result] = await Promise.all([loadOrders(), loadSummary()]);
    setOrders(result.items);
    setPages(result.pages);
    setTotal(result.total);
  }, [loadOrders, loadSummary]);

  useEffect(() => {
    let active = true;
    loadOrders().then((result) => {
      if (!active) return;
      setOrders(result.items);
      setPages(result.pages);
      setTotal(result.total);
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : "Could not load orders.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [loadOrders]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(loadSummary).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : "Could not load order totals.");
    });
    return () => { active = false; };
  }, [loadSummary]);

  useEffect(() => {
    if (search.trim() === query) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setPage(1);
      setQuery(search.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, search]);

  async function updateStatus(order: Order, status: OrderStatus) {
    setBusy(order.id);
    setError("");
    setNotice("");
    try {
      await api(`/admin/orders/${encodeURIComponent(order.id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setNotice(`${orderNumber(order.id)} marked ${status}.`);
      setMenuOrder("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order status.");
    } finally {
      setBusy("");
    }
  }

  async function exportOrders() {
    setBusy("export");
    setError("");
    try {
      const first = await api<PageResult<Order>>(`/admin/orders?${makeParams(1, 100)}`);
      const allOrders = [...first.items];
      for (let currentPage = 2; currentPage <= first.pages; currentPage += 1) {
        const result = await api<PageResult<Order>>(`/admin/orders?${makeParams(currentPage, 100)}`);
        allOrders.push(...result.items);
      }
      const csv = [
        ["Order ID", "Customer", "Email", "Products", "Amount", "Payment", "Status", "Order Date"],
        ...allOrders.map((order) => [
          orderNumber(order.id),
          order.customer.name,
          order.customer.email,
          order.items.map((item) => `${item.name} x${item.quantity}`).join("; "),
          order.total,
          order.paymentStatus,
          order.status,
          formatDate(order.createdAt),
        ]),
      ].map((row) => row.map((field) => `"${String(field ?? "").replaceAll("\"", "\"\"")}"`).join(",")).join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "timeora-orders.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export orders.");
    } finally {
      setBusy("");
    }
  }

  function applyFilters() {
    if (statusDraft === statusFilter && page === 1) return;
    setLoading(true);
    setPage(1);
    setTab("");
    setStatusFilter(statusDraft);
  }

  function selectTab(value: TabStatus) {
    setLoading(true);
    setPage(1);
    setTab(value);
    setStatusFilter("");
    setStatusDraft("");
  }

  function movePage(nextPage: number) {
    setLoading(true);
    setPage(nextPage);
  }

  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const tabs: { label: string; value: TabStatus; count: number | undefined; icon: typeof ShoppingCart }[] = [
    { label: "All Orders", value: "", count: summary?.total, icon: ShoppingCart },
    { label: "Processing", value: "processing", count: summary?.processing, icon: Box },
    { label: "Shipped", value: "shipped", count: summary?.shipped, icon: Truck },
    { label: "Delivered", value: "delivered", count: summary?.delivered, icon: CheckCircle2 },
    { label: "Cancelled", value: "cancelled", count: summary?.cancelled, icon: CircleX },
  ];

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[27px] font-bold tracking-tight text-slate-950">Order Management</h2>
          <p className="mt-1 text-sm text-slate-600">View, manage, and update customer orders.</p>
        </div>
        <button onClick={() => void exportOrders()} disabled={busy === "export"} className="inline-flex items-center gap-2 rounded-lg border border-violet-400 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60">
          <ArrowDownToLine size={17} /> {busy === "export" ? "Exporting…" : "Export Orders"}
        </button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Orders" value={summary?.total ?? null} icon={ShoppingCart} tone="bg-violet-100/80 text-violet-600" />
        <StatCard title="Completed" value={summary?.delivered ?? null} icon={CheckCircle2} tone="bg-emerald-100/80 text-emerald-600" />
        <StatCard title="Processing" value={summary?.processing ?? null} icon={Box} tone="bg-amber-100/80 text-amber-600" />
        <StatCard title="Shipped" value={summary?.shipped ?? null} icon={Truck} tone="bg-blue-100/80 text-blue-600" />
        <StatCard title="Cancelled" value={summary?.cancelled ?? null} icon={CircleX} tone="bg-rose-100/80 text-rose-600" />
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto border-b border-slate-200 pb-3">
        {tabs.map(({ label, value, count, icon: Icon }) => (
          <button key={label} onClick={() => selectTab(value)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${tab === value && !statusFilter ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
            <Icon size={15} />{label} ({count ?? "—"})
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <label className="flex h-[40px] w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-slate-500 xl:max-w-[390px]">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by Order ID, Customer or Email..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
          {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="rounded p-0.5 hover:bg-slate-100"><X size={15} /></button>}
        </label>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-slate-500">
            <CalendarDays size={16} />
            <select aria-label="Filter by date" value={dateRange} onChange={(event) => { setLoading(true); setPage(1); setDateRange(event.target.value); }} className="min-w-0 bg-transparent text-sm text-slate-800 outline-none">
              <option value="all">All Time</option><option value="7">Last 7 Days</option><option value="30">Last 30 Days</option><option value="90">Last 90 Days</option>
            </select>
          </label>
          <select aria-label="Filter by status" value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)} className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 sm:min-w-[140px]">
            <option value="">All Status</option>
            <option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option>
          </select>
          <button onClick={applyFilters} className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-violet-400 px-4 text-sm font-semibold text-violet-700 hover:bg-violet-50 sm:col-span-1"><Search size={16} /> Filter</button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-slate-100/90 text-xs text-slate-700">
              <tr>
                <th className="px-3 py-3 font-semibold">Order ID</th><th className="px-3 py-3 font-semibold">Customer</th><th className="px-3 py-3 font-semibold">Products</th><th className="px-3 py-3 text-center font-semibold">Amount</th><th className="px-3 py-3 font-semibold">Payment</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 font-semibold">Order Date</th><th className="px-3 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && orders.map((order) => {
                const next = nextStatus[order.status];
                const canAdvance = Boolean(next) && !(order.paymentMethod === "razorpay" && order.paymentStatus !== "paid");
                const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <tr key={order.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-3"><span className="font-bold text-violet-700">{orderNumber(order.id)}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{order.customer.name.trim().charAt(0).toUpperCase() || "C"}</span>
                        <span className="min-w-0"><span className="block max-w-[150px] truncate text-xs font-semibold text-slate-900">{order.customer.name}</span><span className="block max-w-[150px] truncate text-[11px] text-slate-500">{order.customer.email}</span></span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex max-w-[145px] items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500"><Box size={16} /></span><span className="truncate text-xs text-slate-700">{itemCount} {itemCount === 1 ? "Item" : "Items"}</span></div>
                    </td>
                    <td className="px-3 py-3 text-center text-xs font-bold text-slate-900">{formatPrice(order.total)}</td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${order.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{order.paymentStatus === "paid" ? "✓ Paid" : order.paymentStatus}</span></td>
                    <td className="px-3 py-3"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusStyle(order.status)}`}>{order.status}</span></td>
                    <td className="px-3 py-3 text-[11px] text-slate-700">{formatDate(order.createdAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button aria-label={`View ${orderNumber(order.id)}`} onClick={() => setSelectedOrder(order)} className="grid size-8 place-items-center rounded-lg border border-slate-200 text-violet-600 hover:bg-violet-50"><Eye size={16} /></button>
                        {canAdvance && <button aria-label={`Mark ${orderNumber(order.id)} as ${next}`} disabled={busy === order.id} onClick={() => void updateStatus(order, next!)} title={`Mark ${next}`} className="grid size-8 place-items-center rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50"><PackageCheck size={16} /></button>}
                        <div className="relative">
                          <button aria-label={`More actions for ${orderNumber(order.id)}`} onClick={() => setMenuOrder((current) => current === order.id ? "" : order.id)} className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"><MoreHorizontal size={17} /></button>
                          {menuOrder === order.id && <div className="absolute right-0 top-9 z-10 w-44 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">{next ? <button disabled={busy === order.id} onClick={() => void updateStatus(order, next)} className="w-full rounded-md px-3 py-2 text-left text-xs capitalize text-slate-700 hover:bg-slate-50 disabled:opacity-50">Mark as {next}</button> : <p className="px-3 py-2 text-xs text-slate-500">No further actions</p>}</div>}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {loading && <tr><td colSpan={8} className="px-5 py-14 text-center text-sm text-slate-500">Loading orders…</td></tr>}
              {!loading && !orders.length && <tr><td colSpan={8} className="px-5 py-14 text-center text-sm text-slate-500">{query ? `No orders match “${query}”.` : "No orders found for these filters."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-slate-500">Showing {start}–{end} of {total} orders</span>
        <nav aria-label="Order pages" className="flex items-center gap-1.5">
          <button aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => movePage(page - 1)} className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={17} /></button>
          {Array.from({ length: Math.min(pages, 5) }, (_, index) => {
            const pageNumber = pages <= 5 ? index + 1 : Math.max(1, Math.min(page - 2, pages - 4)) + index;
            return <button key={pageNumber} aria-current={page === pageNumber ? "page" : undefined} onClick={() => movePage(pageNumber)} className={`grid size-9 place-items-center rounded-lg border text-sm font-medium ${page === pageNumber ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{pageNumber}</button>;
          })}
          {pages > 5 && <><span className="px-1 text-slate-400">…</span><button onClick={() => movePage(pages)} className={`grid size-9 place-items-center rounded-lg border text-sm font-medium ${page === pages ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{pages}</button></>}
          <button aria-label="Next page" disabled={page >= pages || loading} onClick={() => movePage(page + 1)} className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={17} /></button>
        </nav>
      </div>

      {selectedOrder && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedOrder(null); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="order-detail-title" className="my-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-8">
            <div>
              <h3 id="order-detail-title" className="text-xl font-bold text-slate-950 sm:text-2xl">Order {orderNumber(selectedOrder.id)}</h3>
              <p className="mt-1 text-sm text-slate-500">{formatDate(selectedOrder.createdAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-2 text-sm font-semibold capitalize ${statusStyle(selectedOrder.status)}`}>{selectedOrder.status}</span>
              <button onClick={() => setSelectedOrder(null)} aria-label="Close dialog" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><X size={21} /></button>
            </div>
          </div>
          <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1.55fr_1fr]">
            <div className="space-y-5">
              <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
                <h4 className="flex items-center gap-3 text-base font-bold text-slate-950"><UserRound size={21} /> Customer Details</h4>
                <p className="mt-3 pl-9 font-semibold text-slate-900">{selectedOrder.customer.name}</p>
                <p className="mt-1 pl-9 text-sm text-slate-600">{selectedOrder.customer.email}</p>
                {(selectedOrder.shippingAddress.phone || selectedOrder.customer.phone) && <p className="mt-1 pl-9 text-sm text-slate-600">{selectedOrder.shippingAddress.phone || selectedOrder.customer.phone}</p>}
              </section>
              <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
                <h4 className="flex items-center gap-3 text-base font-bold text-slate-950"><MapPin size={21} /> Delivery Address</h4>
                <div className="mt-3 pl-9 text-sm leading-6 text-slate-700">
                  {selectedOrder.shippingAddress.name && <p className="font-medium">{selectedOrder.shippingAddress.name}</p>}
                  {selectedOrder.shippingAddress.line1 && <p>{selectedOrder.shippingAddress.line1}</p>}
                  {selectedOrder.shippingAddress.line2 && <p>{selectedOrder.shippingAddress.line2}</p>}
                  <p>{[selectedOrder.shippingAddress.city, selectedOrder.shippingAddress.state, selectedOrder.shippingAddress.pincode].filter(Boolean).join(", ") || "Address unavailable"}</p>
                </div>
              </section>
              <section>
                <h4 className="mb-3 flex items-center gap-3 text-base font-bold text-slate-950"><Package size={21} /> Order Items ({selectedOrder.items.length})</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div key={`${item.productId}-${index}`} className="grid grid-cols-[76px_1fr_auto] items-center gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[108px_1fr_auto] sm:gap-4 sm:p-4">
                      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-xl bg-stone">
                        {item.images?.[0] ? <Image src={item.images[0]} alt={item.name} fill unoptimized sizes="108px" className="object-contain p-2" /> : <Box size={28} className="text-slate-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">{item.name}</p>
                        <p className="mt-1 text-sm text-slate-600">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-950">{formatPrice(item.unitPrice * item.quantity)}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatPrice(item.unitPrice)} × {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className="space-y-4">
              <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
                <h4 className="flex items-center gap-3 text-base font-bold text-slate-950"><Layers size={21} /> Order Summary</h4>
                <div className="mt-4 space-y-3 text-sm">
                  <p className="flex justify-between gap-3"><span className="text-slate-600">Subtotal</span><span className="font-medium text-slate-900">{formatPrice(selectedOrder.subtotal)}</span></p>
                  {selectedOrder.discount > 0 && <p className="flex justify-between gap-3"><span className="text-slate-600">Discount</span><span className="font-medium text-emerald-700">−{formatPrice(selectedOrder.discount)}</span></p>}
                  <p className="flex justify-between gap-3 border-t border-slate-100 pt-3"><span className="text-slate-600">Shipping</span><span className={selectedOrder.shippingFee === 0 ? "font-medium text-emerald-700" : "font-medium text-slate-900"}>{selectedOrder.shippingFee === 0 ? "Complimentary" : formatPrice(selectedOrder.shippingFee)}</span></p>
                  <p className="flex justify-between gap-3 rounded-lg bg-amber-50 px-3 py-3 text-base font-bold"><span>Total</span><span>{formatPrice(selectedOrder.total)}</span></p>
                </div>
              </section>
              <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
                <h4 className="flex items-center gap-3 text-base font-bold text-slate-950"><CreditCard size={21} /> Payment Details</h4>
                <div className="mt-4 space-y-3 text-sm">
                  <p className="flex justify-between gap-3"><span className="text-slate-600">Method</span><span className="font-medium text-slate-900">{selectedOrder.paymentMethod === "razorpay" ? "Razorpay (Online)" : "Cash on Delivery"}</span></p>
                  <p className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3"><span className="text-slate-600">Status</span><span className={`rounded-full px-3 py-1.5 font-semibold capitalize ${selectedOrder.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : selectedOrder.paymentStatus === "failed" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{selectedOrder.paymentStatus}</span></p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>}
    </section>
  );
}
