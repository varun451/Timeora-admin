"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Box,
  CircleUserRound,
  Plus,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PageResult, Seller, SellerApplication, AdminUser } from "@/types";

type Summary = { customers: number; vendors: number; products: number; applications: number };

const cardStyles = [
  { icon: "bg-violet-100 text-violet-600", card: "bg-gradient-to-br from-[#f3eaff] to-[#f8f2ff]" },
  { icon: "bg-blue-100 text-blue-600", card: "bg-gradient-to-br from-[#e7f2ff] to-[#f0f7ff]" },
  { icon: "bg-emerald-100 text-emerald-600", card: "bg-gradient-to-br from-[#e7f9ec] to-[#f0fcf3]" },
  { icon: "bg-orange-100 text-orange-600", card: "bg-gradient-to-br from-[#fff0e3] to-[#fff7ef]" },
];

function Metric({ label, value, icon: Icon, href, index }: { label: string; value: number | null; icon: LucideIcon; href: string; index: number }) {
  const style = cardStyles[index];
  return (
    <Link href={href} className={`flex min-h-[112px] items-center gap-5 rounded-xl p-5 transition-transform hover:-translate-y-0.5 sm:px-7 ${style.card}`}>
      <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${style.icon}`}><Icon size={27} strokeWidth={2} /></span>
      <span>
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        <span className="mt-1 block text-[27px] font-bold leading-none tracking-tight text-slate-950">{value === null ? "—" : value.toLocaleString()}</span>
      </span>
    </Link>
  );
}

function dateLabel(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [vendors, setVendors] = useState<Seller[]>([]);
  const [customers, setCustomers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      api<PageResult<AdminUser>>("/admin/users?limit=3"),
      api<PageResult<Seller>>("/admin/sellers?limit=3"),
      api<PageResult<SellerApplication>>("/admin/applications?status=pending&limit=4"),
      api<PageResult<{ id: string }>>("/admin/products?limit=1"),
    ])
      .then(([users, sellers, pending, products]) => {
        if (!active) return;
        setSummary({
          customers: users.total,
          vendors: sellers.total,
          products: products.total,
          applications: pending.total,
        });
        setCustomers(users.items);
        setVendors(sellers.items);
        setApplications(pending.items);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load dashboard.");
      });
    return () => { active = false; };
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[25px] font-bold tracking-tight text-slate-950">Welcome, Admin <span aria-hidden="true">👋</span></h2>
        <p className="mt-1 text-sm text-slate-600">Manage users, vendors, products and applications.</p>
      </div>
      {error && <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total Users" value={summary?.customers ?? null} icon={Users} href="/users" index={0} />
        <Metric label="Total Vendors" value={summary?.vendors ?? null} icon={Store} href="/vendors" index={1} />
        <Metric label="Total Products" value={summary?.products ?? null} icon={Box} href="/vendors" index={2} />
        <Metric label="Pending Applications" value={summary?.applications ?? null} icon={BadgeCheck} href="/applications" index={3} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
          <div className="flex items-center justify-between px-5 pb-4 pt-5 sm:px-6">
            <div>
              <h3 className="font-semibold text-slate-950">Pending Applications</h3>
              <p className="mt-1 text-xs text-slate-500">Vendor applications waiting for review</p>
            </div>
            <Link href="/applications" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800">View All <ArrowRight size={14} /></Link>
          </div>
          {applications.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">No pending applications.</div>
          ) : (
            <div className="overflow-x-auto px-4 pb-4 sm:px-5">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-slate-100 text-xs text-slate-600">
                  <tr><th className="rounded-l-md px-3 py-2.5 font-semibold">Vendor</th><th className="px-3 py-2.5 font-semibold">Owner</th><th className="px-3 py-2.5 font-semibold">Applied</th><th className="rounded-r-md px-3 py-2.5 font-semibold">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((application) => (
                    <tr key={application.id}>
                      <td className="px-3 py-3 font-medium text-slate-900">{application.storeName}</td>
                      <td className="px-3 py-3 text-slate-600">{application.ownerName}</td>
                      <td className="px-3 py-3 text-slate-600">{dateLabel(application.createdAt)}</td>
                      <td className="px-3 py-3"><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">Pending</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6">
          <h3 className="font-semibold text-slate-950">Quick Actions</h3>
          <p className="mt-1 text-xs text-slate-500">Common admin tasks</p>
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <Link href="/applications" className="flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-xl bg-violet-50 px-2 text-center text-xs font-medium text-slate-800 transition-colors hover:bg-violet-100">
              <span className="text-violet-600"><Plus size={26} /></span>Review<br className="sm:hidden" /> Applications
            </Link>
            <Link href="/vendors" className="flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-xl bg-blue-50 px-2 text-center text-xs font-medium text-slate-800 transition-colors hover:bg-blue-100">
              <span className="text-blue-600"><Store size={26} /></span>Manage Vendors
            </Link>
            <Link href="/users" className="flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-xl bg-emerald-50 px-2 text-center text-xs font-medium text-slate-800 transition-colors hover:bg-emerald-100">
              <span className="text-emerald-600"><CircleUserRound size={26} /></span>Manage Users
            </Link>
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
          <div className="flex items-center justify-between px-5 pb-3 pt-5 sm:px-6">
            <h3 className="font-semibold text-slate-950">Recent Vendors</h3>
            <Link href="/vendors" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800">View All <ArrowRight size={14} /></Link>
          </div>
          {vendors.length === 0 ? <p className="px-6 py-8 text-sm text-slate-500">No vendors to show yet.</p> : (
            <div className="divide-y divide-slate-100 px-5 pb-2 sm:px-6">
              {vendors.map((vendor) => (
                <div key={vendor.id} className="flex items-center gap-3 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700"><Store size={17} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{vendor.storeName}</span>
                    <span className="block truncate text-xs text-slate-500">{vendor.productCount ?? 0} products · Joined {dateLabel(vendor.createdAt)}</span>
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${vendor.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{vendor.status === "active" ? "Active" : "Suspended"}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
          <div className="flex items-center justify-between px-5 pb-3 pt-5 sm:px-6">
            <h3 className="font-semibold text-slate-950">Recent Users</h3>
            <Link href="/users" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800">View All <ArrowRight size={14} /></Link>
          </div>
          {customers.length === 0 ? <p className="px-6 py-8 text-sm text-slate-500">No customers to show yet.</p> : (
            <div className="divide-y divide-slate-100 px-5 pb-2 sm:px-6">
              {customers.map((customer, index) => (
                <div key={customer.id} className="flex items-center gap-3 py-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${["bg-violet-100 text-violet-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700"][index % 3]}`}>{initials(customer.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{customer.name}</span>
                    <span className="block truncate text-xs text-slate-500">{customer.email}</span>
                  </span>
                  <span className="text-right text-xs text-slate-500">{dateLabel(customer.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
