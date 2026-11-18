"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import type { AdminUser, PageResult } from "@/types";

type Customer = AdminUser & { status: "active" | "blocked" };

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    return api<PageResult<Customer>>(`/admin/users?${params}`);
  }, [page, q, status]);

  useEffect(() => {
    let active = true;
    load().then((result) => {
      if (!active) return;
      setItems(result.items);
      setPages(result.pages);
      setTotal(result.total);
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : "Could not load customers.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [load]);

  async function search(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setPage(1);
    setQ(input.trim());
  }

  async function toggle(user: Customer) {
    const action = user.status === "active" ? "block" : "activate";
    if (!confirm(`${action === "block" ? "Block" : "Reactivate"} ${user.name}'s account?`)) return;
    setBusy(user.id);
    setError("");
    setNotice("");
    try {
      await api(`/admin/users/${user.id}/${action}`, { method: "POST" });
      setNotice(`${user.name}'s account was ${action === "block" ? "blocked" : "reactivated"}.`);
      const result = await load();
      setItems(result.items);
      setPages(result.pages);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action} customer.`);
    } finally {
      setBusy("");
    }
  }

  return (
    <section>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs uppercase tracking-[0.18em] text-[#78827d]">Account management</p><h1 className="mt-2 text-3xl font-semibold">Customers</h1></div>
        <p className="text-sm text-[#78827d]">{total.toLocaleString()} customer{total === 1 ? "" : "s"}</p>
      </div>
      {notice && <p role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <form onSubmit={(event) => void search(event)} className="mb-5 flex flex-wrap gap-3 rounded-xl border border-[#e6e9e5] bg-white p-4">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-md border border-[#e6e9e5] px-3">
          <Search size={16} className="text-[#78827d]" />
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search name, email or phone" className="w-full py-2.5 text-sm outline-none" />
        </div>
        <select value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value); setPage(1); }} className="rounded-md border border-[#e6e9e5] bg-white px-3 text-sm">
          <option value="">All statuses</option><option value="active">Active</option><option value="blocked">Blocked</option>
        </select>
        <button className="rounded-md bg-[#183a2e] px-4 py-2 text-sm text-white hover:bg-[#214e3d]">Search</button>
      </form>
      <div className="overflow-hidden rounded-xl border border-[#e6e9e5] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#f7f8f6] text-xs uppercase tracking-wider text-[#78827d]"><tr><th className="px-5 py-3.5 font-medium">Customer</th><th className="px-5 py-3.5 font-medium">Contact</th><th className="px-5 py-3.5 font-medium">Joined</th><th className="px-5 py-3.5 font-medium">Status</th><th className="px-5 py-3.5 text-right font-medium">Action</th></tr></thead>
            <tbody className="divide-y divide-[#e6e9e5]">
              {!loading && items.map((item) => <tr key={item.id}>
                <td className="px-5 py-4 font-medium">{item.name}</td>
                <td className="px-5 py-4 text-xs text-[#78827d]">{item.email}{item.phone && <p className="mt-1">{item.phone}</p>}</td>
                <td className="px-5 py-4 text-xs text-[#78827d]">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}</td>
                <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] capitalize ${item.status === "active" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{item.status}</span></td>
                <td className="px-5 py-4 text-right"><button disabled={busy === item.id} onClick={() => void toggle(item)} className="rounded-md border border-[#dfe4df] px-3 py-2 text-xs hover:bg-[#f7f8f6] disabled:opacity-50">{busy === item.id ? "Saving…" : item.status === "active" ? "Block account" : "Reactivate"}</button></td>
              </tr>)}
              {loading && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#78827d]">Loading customers…</td></tr>}
              {!loading && !items.length && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#78827d]">No customer accounts found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-4 flex justify-between text-sm"><span className="text-[#78827d]">Page {page} of {pages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => { setLoading(true); setPage((value) => value - 1); }} className="rounded-md border border-[#dfe4df] px-3 py-2 disabled:opacity-40">Previous</button><button disabled={page >= pages} onClick={() => { setLoading(true); setPage((value) => value + 1); }} className="rounded-md border border-[#dfe4df] px-3 py-2 disabled:opacity-40">Next</button></div></div>
    </section>
  );
}
