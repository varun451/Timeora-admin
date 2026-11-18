"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  ShoppingCart,
  Package,
  Store,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AdminUser } from "@/types";

const links: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/vendors", label: "Vendors", icon: Store },
  { href: "/products", label: "Products", icon: Package },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/applications", label: "Applications", icon: BadgeCheck },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [failed, setFailed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api<AdminUser>("/auth/me")
      .then((account) => {
        if (!active) return;
        if (account.role !== "admin" && account.role !== "super_admin") {
          setFailed(true);
          router.replace("/login");
          return;
        }
        setUser(account);
      })
      .catch(() => {
        if (active) {
          setFailed(true);
          router.replace("/login");
        }
      });
    return () => { active = false; };
  }, [router]);

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      router.replace("/login");
    } catch (error) {
      setFailed(true);
      console.error("Could not log out:", error);
    }
  }

  if (!user || failed) {
    return <main className="grid min-h-screen place-items-center text-sm text-[#78827d]">Checking administrator access…</main>;
  }

  const currentPage = pathname === "/products/new"
    ? "Add Product"
    : links.find(({ href }) => href === pathname || (href !== "/" && pathname.startsWith(href)))?.label ?? "Dashboard";
  const initial = user.name.trim().charAt(0).toUpperCase() || "A";

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-[#111827]">
      {mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-slate-950/45 md:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[244px] flex-col bg-[#0b132b] text-white transition-transform md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex min-h-[88px] items-center justify-between border-b border-white/10 px-6 py-2">
          <div className="flex flex-col items-center">
            <Image src="/timeora-logo.png" alt="Timeora" width={1152} height={768} className="h-[56px] w-[84px] object-contain" />
            <p className="text-[10px] text-slate-400">Admin Panel</p>
          </div>
          <button onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="rounded-md p-1 text-slate-400 hover:bg-white/10 md:hidden"><X size={19} /></button>
        </div>

        <nav className="space-y-1 px-3 py-6">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  active ? "bg-violet-600 text-white shadow-md shadow-violet-950/30" : "text-slate-300 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon size={19} strokeWidth={1.9} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mx-4 border-t border-white/10" />
        <div className="mt-auto border-t border-white/10 p-4">
          <button onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-300 hover:bg-white/8 hover:text-white">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <div className="min-h-screen md:ml-[244px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[#e7eaf0] bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex min-w-0 items-center gap-4">
            <button onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="rounded-md p-2 text-slate-700 hover:bg-slate-100 md:hidden"><Menu size={21} /></button>
            <span className="hidden h-7 w-px bg-slate-200 md:block" />
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{currentPage}</h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="relative">
              <button onClick={() => setMenuOpen((open) => !open)} className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-1 text-sm hover:bg-slate-50 sm:gap-3 sm:pl-2">
                <span className="grid size-9 place-items-center rounded-full bg-violet-600 text-base font-semibold text-white">{initial}</span>
                <span className="hidden max-w-32 truncate font-medium sm:block">{user.name}</span>
                <ChevronDown size={16} className="text-slate-500" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 z-30 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <p className="truncate px-3 py-2 text-xs text-slate-500">{user.email}</p>
                  <button onClick={() => void logout()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"><LogOut size={16} /> Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
