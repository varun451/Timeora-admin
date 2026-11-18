"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ApplicationStatus, PageResult, SellerApplication } from "@/types";

export default function ApplicationsPage() {
  const [items, setItems] = useState<SellerApplication[]>([]);
  const [status, setStatus] = useState<"" | ApplicationStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const query = status ? `?status=${status}` : "";
    return api<PageResult<SellerApplication>>(`/admin/applications${query}`);
  }, [status]);

  useEffect(() => {
    let active = true;
    load().then((result) => {
      if (active) setItems(result.items);
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : "Could not load applications.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [load]);

  async function review(application: SellerApplication, decision: "approve" | "reject") {
    let reason: string | null = null;
    if (decision === "approve") {
      if (!confirm(`Approve ${application.storeName}? This grants the applicant seller access.`)) return;
    } else {
      reason = prompt(`Reason for rejecting ${application.storeName} (at least 5 characters):`);
      if (reason === null) return;
      if (reason.trim().length < 5) {
        setError("Enter a rejection reason of at least 5 characters.");
        return;
      }
    }

    setBusy(application.id);
    setError("");
    setNotice("");
    try {
      await api(`/admin/applications/${application.id}/${decision}`, {
        method: "POST",
        ...(reason ? { body: JSON.stringify({ reason: reason.trim() }) } : {}),
      });
      setNotice(`${application.storeName} application ${decision === "approve" ? "approved" : "rejected"}.`);
      const result = await load();
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${decision} application.`);
    } finally {
      setBusy("");
    }
  }

  return (
    <section>
      <div className="mb-7"><p className="text-xs uppercase tracking-[0.18em] text-[#78827d]">Vendor management</p><h1 className="mt-2 text-3xl font-semibold">Applications</h1><p className="mt-2 text-sm text-[#78827d]">Review new vendor applications and grant or deny seller access.</p></div>
      {notice && <p role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mb-5 flex flex-wrap gap-2">
        {([{ label: "Pending", value: "pending" }, { label: "Approved", value: "approved" }, { label: "Rejected", value: "rejected" }, { label: "All", value: "" }] as const).map((filter) => (
          <button key={filter.value} onClick={() => { setLoading(true); setStatus(filter.value); }} className={`rounded-full px-3.5 py-2 text-xs capitalize ${status === filter.value ? "bg-[#183a2e] text-white" : "border border-[#dfe4df] bg-white text-[#59645e] hover:bg-[#f1f3f0]"}`}>{filter.label}</button>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-[#e6e9e5] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-[#f7f8f6] text-xs uppercase tracking-wider text-[#78827d]"><tr><th className="px-5 py-3.5 font-medium">Store / owner</th><th className="px-5 py-3.5 font-medium">Contact</th><th className="px-5 py-3.5 font-medium">Submitted</th><th className="px-5 py-3.5 font-medium">Status</th><th className="px-5 py-3.5 text-right font-medium">Review</th></tr></thead>
            <tbody className="divide-y divide-[#e6e9e5]">
              {!loading && items.map((application) => <tr key={application.id}>
                <td className="px-5 py-4"><p className="font-medium">{application.storeName}</p><p className="mt-1 text-xs text-[#78827d]">{application.ownerName}</p></td>
                <td className="px-5 py-4 text-xs"><p>{application.email}</p><p className="mt-1 text-[#78827d]">{application.phone}</p></td>
                <td className="px-5 py-4 text-xs text-[#78827d]">{new Date(application.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-4"><span className="rounded-full bg-[#f1f3f0] px-2.5 py-1 text-[11px] capitalize">{application.status}</span></td>
                <td className="px-5 py-4 text-right">{application.status === "pending" ? <div className="flex justify-end gap-2"><button disabled={busy === application.id} onClick={() => void review(application, "reject")} className="rounded-md border border-[#dfe4df] px-3 py-2 text-xs hover:bg-[#f7f8f6] disabled:opacity-50">Reject</button><button disabled={busy === application.id} onClick={() => void review(application, "approve")} className="rounded-md bg-[#183a2e] px-3 py-2 text-xs text-white hover:bg-[#214e3d] disabled:opacity-50">{busy === application.id ? "Saving…" : "Approve"}</button></div> : <span className="text-xs text-[#78827d]">Reviewed</span>}</td>
              </tr>)}
              {loading && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#78827d]">Loading applications…</td></tr>}
              {!loading && !items.length && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#78827d]">No applications found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
