"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  BadgePercent,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Layers,
  Mail,
  Plus,
  Search,
  ShieldAlert,
  Store,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { PageResult, Seller, SellerStatus } from "@/types";

type Summary = { total: number; active: number; suspended: number };
type CommissionTarget = { seller: Seller; value: string };
type SuspendTarget = { seller: Seller; reason: string };
const PAGE_SIZE = 10;

function StatCard({ title, value, icon: Icon, tone }: { title: string; value: number | string | null; icon: typeof Store; tone: string }) {
  return (
    <div className={`flex min-h-[86px] items-center gap-3 rounded-xl px-4 py-4 sm:px-5 ${tone}`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/75"><Icon size={22} /></span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-slate-700 sm:text-sm">{title}</span>
        <span className="mt-0.5 block text-2xl font-bold leading-none text-slate-950">{value === null ? "—" : typeof value === "number" ? value.toLocaleString() : value}</span>
      </span>
    </div>
  );
}

export default function VendorsPage() {
  const [items, setItems] = useState<Seller[]>([]);
  const [status, setStatus] = useState<"" | SellerStatus>("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [commissionTarget, setCommissionTarget] = useState<CommissionTarget | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<SuspendTarget | null>(null);

  useEffect(() => {
    const nextQuery = search.trim();
    if (nextQuery === query) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setPage(1);
      setQuery(nextQuery);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, search]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (status) params.set("status", status);
    if (query) params.set("q", query);
    return api<PageResult<Seller>>(`/admin/sellers?${params}`);
  }, [page, query, status]);

  const loadSummary = useCallback(async () => {
    const [all, active, suspended] = await Promise.all([
      api<PageResult<Seller>>("/admin/sellers?limit=1"),
      api<PageResult<Seller>>("/admin/sellers?status=active&limit=1"),
      api<PageResult<Seller>>("/admin/sellers?status=suspended&limit=1"),
    ]);
    setSummary({ total: all.total, active: active.total, suspended: suspended.total });
  }, []);

  const refresh = useCallback(async () => {
    const [result] = await Promise.all([load(), loadSummary()]);
    setItems(result.items);
    setPages(result.pages);
    setTotal(result.total);
  }, [load, loadSummary]);

  useEffect(() => {
    let active = true;
    load().then((result) => {
      if (!active) return;
      setItems(result.items);
      setPages(result.pages);
      setTotal(result.total);
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : "Could not load vendors.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(loadSummary).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : "Could not load vendor totals.");
    });
    return () => { active = false; };
  }, [loadSummary]);

  async function saveCommission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!commissionTarget) return;
    const percent = Number(commissionTarget.value);
    if (!Number.isFinite(percent) || percent < 0 || percent > 50) {
      setError("Commission must be between 0 and 50 percent.");
      return;
    }

    const { seller } = commissionTarget;
    setBusy(seller.id);
    setError("");
    setNotice("");
    try {
      await api(`/admin/sellers/${seller.id}/commission`, {
        method: "PATCH",
        body: JSON.stringify({ commissionBps: Math.round(percent * 100) }),
      });
      setNotice(`Commission for ${seller.storeName} updated to ${percent}%.`);
      setCommissionTarget(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update commission.");
    } finally {
      setBusy("");
    }
  }

  async function changeStatus(seller: Seller, action: "suspend" | "activate", reason?: string) {
    setBusy(seller.id);
    setError("");
    setNotice("");
    try {
      await api(`/admin/sellers/${seller.id}/${action}`, {
        method: "POST",
        ...(reason ? { body: JSON.stringify({ reason: reason.trim() }) } : {}),
      });
      setNotice(`${seller.storeName} was ${action === "suspend" ? "suspended" : "reactivated"}.`);
      setSuspendTarget(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action} vendor.`);
    } finally {
      setBusy("");
    }
  }

  function movePage(nextPage: number) {
    setPage(nextPage);
    setLoading(true);
  }

  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[27px] font-bold tracking-tight text-slate-950">Vendors</h2>
          <p className="mt-1 text-sm text-slate-600">Manage marketplace vendors and commission.</p>
        </div>
        <Link href="/applications" className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700">
          <Plus size={17} /> Add Vendor
        </Link>
      </div>

      {notice && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Vendors" value={summary?.total ?? null} icon={Store} tone="bg-violet-100/80 text-violet-600" />
        <StatCard title="Active Vendors" value={summary?.active ?? null} icon={CircleCheck} tone="bg-emerald-100/80 text-emerald-600" />
        <StatCard title="Suspended Vendors" value={summary?.suspended ?? null} icon={ShieldAlert} tone="bg-rose-100/80 text-rose-600" />
        <StatCard title="Default Commission" value="10%" icon={Layers} tone="bg-blue-100/80 text-blue-600" />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter vendors by status">
          {([
            { label: "All Vendors", value: "", count: summary?.total },
            { label: "Active", value: "active", count: summary?.active },
            { label: "Suspended", value: "suspended", count: summary?.suspended },
          ] as const).map((filter) => (
            <button
              key={filter.value}
              onClick={() => { setLoading(true); setPage(1); setStatus(filter.value); }}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${status === filter.value ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700"}`}
            >
              {filter.label} {filter.count === undefined ? "" : `(${filter.count})`}
            </button>
          ))}
        </div>
        <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-slate-500 sm:max-w-[270px]">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vendors..." className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
          {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="rounded p-0.5 hover:bg-slate-100"><X size={15} /></button>}
        </label>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-100/90 text-xs text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Store / Vendor</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 text-center font-semibold">Products</th>
                <th className="px-4 py-3 text-center font-semibold">Commission</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && items.map((seller, index) => (
                <tr key={seller.id} className="transition-colors hover:bg-slate-50/70">
                  <td className="px-4 py-3.5 text-slate-500">{(page - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0b132b] text-white"><Store size={18} /></span>
                      <span className="min-w-0">
                        <span className="block max-w-[190px] truncate font-semibold text-slate-900">{seller.storeName}</span>
                        <span className="mt-0.5 block max-w-[190px] truncate text-xs text-slate-500">/{seller.slug}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="mb-1 flex items-center gap-2 text-xs text-slate-700"><Mail size={14} className="shrink-0 text-slate-500" /><span className="max-w-[200px] truncate">{seller.email}</span></span>
                    <span className="flex items-center gap-2 text-xs text-slate-500"><span className="w-[14px] text-center">☎</span>{seller.phone || "No phone provided"}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center font-medium text-slate-800">{seller.productCount ?? 0}</td>
                  <td className="px-4 py-3.5 text-center"><span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700">{((seller.commissionBps ?? 1000) / 100).toLocaleString()}%</span></td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${seller.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{seller.status === "active" ? "Active" : "Suspended"}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button disabled={busy === seller.id} onClick={() => setCommissionTarget({ seller, value: ((seller.commissionBps ?? 1000) / 100).toString() })} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-violet-300 px-3 py-2 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-50 disabled:opacity-50">
                        <BadgePercent size={15} /> Set Commission
                      </button>
                      <button
                        disabled={busy === seller.id}
                        onClick={() => seller.status === "active"
                          ? setSuspendTarget({ seller, reason: "" })
                          : void changeStatus(seller, "activate")}
                        aria-label={seller.status === "active" ? `Suspend ${seller.storeName}` : `Reactivate ${seller.storeName}`}
                        title={seller.status === "active" ? "Suspend vendor" : "Reactivate vendor"}
                        className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      >
                        {seller.status === "active" ? <ShieldAlert size={16} /> : <Check size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {loading && <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-slate-500">Loading vendors…</td></tr>}
              {!loading && !items.length && <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-slate-500">{query ? `No vendors match “${query}”.` : "No vendors found for this filter."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-slate-500">Showing {firstItem}–{lastItem} of {total} vendors</span>
        <nav aria-label="Vendor pages" className="flex items-center gap-1.5">
          <button aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => movePage(page - 1)} className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={17} /></button>
          {Array.from({ length: Math.min(pages, 5) }, (_, index) => {
            const pageNumber = pages <= 5 ? index + 1 : Math.max(1, Math.min(page - 2, pages - 4)) + index;
            return <button key={pageNumber} aria-current={page === pageNumber ? "page" : undefined} onClick={() => movePage(pageNumber)} className={`grid size-9 place-items-center rounded-lg border text-sm font-medium ${page === pageNumber ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{pageNumber}</button>;
          })}
          {pages > 5 && <><span className="px-1 text-slate-400">…</span><button onClick={() => movePage(pages)} className={`grid size-9 place-items-center rounded-lg border text-sm font-medium ${page === pages ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{pages}</button></>}
          <button aria-label="Next page" disabled={page >= pages || loading} onClick={() => movePage(page + 1)} className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={17} /></button>
        </nav>
      </div>

      {commissionTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setCommissionTarget(null); }}>
          <form onSubmit={(event) => void saveCommission(event)} className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between">
              <div><h3 className="text-lg font-bold text-slate-950">Set Commission</h3><p className="mt-1 text-xs text-slate-500">Update platform commission for this vendor.</p></div>
              <button type="button" disabled={Boolean(busy)} onClick={() => setCommissionTarget(null)} aria-label="Close dialog" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"><X size={19} /></button>
            </div>
            <label className="mt-5 block text-xs font-medium text-slate-600">Vendor</label>
            <div className="mt-1.5 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
              <span className="grid size-9 place-items-center rounded-full bg-[#0b132b] text-white"><Store size={17} /></span>
              <span><span className="block text-sm font-semibold text-slate-900">{commissionTarget.seller.storeName}</span><span className="block text-xs text-slate-500">/{commissionTarget.seller.slug}</span></span>
            </div>
            <label htmlFor="commission-percent" className="mt-5 block text-xs font-medium text-slate-700">Commission (%) <span className="text-rose-600">*</span></label>
            <div className="mt-1.5 flex items-center rounded-lg border border-slate-300 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100">
              <input id="commission-percent" type="number" min="0" max="50" step="0.01" required value={commissionTarget.value} onChange={(event) => setCommissionTarget((target) => target ? { ...target, value: event.target.value } : null)} className="min-w-0 flex-1 rounded-l-lg px-3 py-2.5 text-sm outline-none" />
              <span className="px-3 text-sm font-semibold text-slate-500">%</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Platform keeps {Number(commissionTarget.value) || 0}% and vendor receives {Math.max(0, 100 - (Number(commissionTarget.value) || 0))}% of the order amount.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={Boolean(busy)} onClick={() => setCommissionTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"><BadgePercent size={16} />{busy ? "Updating…" : "Update"}</button>
            </div>
          </form>
        </div>
      )}

      {suspendTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setSuspendTarget(null); }}>
          <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between">
              <div><h3 className="text-lg font-bold text-slate-950">Suspend Vendor</h3><p className="mt-1 text-xs text-slate-500">{suspendTarget.seller.storeName}</p></div>
              <button disabled={Boolean(busy)} onClick={() => setSuspendTarget(null)} aria-label="Close dialog" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"><X size={19} /></button>
            </div>
            <label htmlFor="suspension-reason" className="mt-5 block text-sm font-medium text-slate-700">Reason <span className="text-rose-600">*</span></label>
            <textarea id="suspension-reason" rows={3} minLength={5} maxLength={500} required value={suspendTarget.reason} onChange={(event) => setSuspendTarget((target) => target ? { ...target, reason: event.target.value } : null)} placeholder="Enter a reason (at least 5 characters)" className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
            <div className="mt-5 flex justify-end gap-2">
              <button disabled={Boolean(busy)} onClick={() => setSuspendTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button disabled={busy === suspendTarget.seller.id || suspendTarget.reason.trim().length < 5} onClick={() => void changeStatus(suspendTarget.seller, "suspend", suspendTarget.reason)} className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{busy === suspendTarget.seller.id ? "Suspending…" : "Suspend Vendor"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
