"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { AdminUser } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const account = await api<AdminUser>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (account.role !== "admin" && account.role !== "super_admin") {
        await api("/auth/logout", { method: "POST" });
        setError("This account does not have administrator access.");
        return;
      }
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#183a2e] lg:grid-cols-[1fr_0.85fr]">
      <section className="hidden flex-col justify-between p-12 text-white lg:flex xl:p-20">
        <div className="flex items-center gap-4">
          <Image src="/timeora-logo.png" alt="Timeora" width={1152} height={768} className="h-[64px] w-[96px] object-contain" />
          <p className="mt-1 text-xs tracking-[0.2em] text-white/45">ADMIN CONSOLE</p>
        </div>
        <div className="max-w-xl">
          <p className="text-sm uppercase tracking-[0.2em] text-[#c2d8ca]">Store operations</p>
          <h1 className="mt-5 text-5xl font-light leading-tight xl:text-6xl">One workspace.<br />Every account.</h1>
          <p className="mt-6 max-w-md text-sm leading-6 text-white/65">Review vendor applications, manage seller stores, and protect customer accounts from one secure dashboard.</p>
        </div>
        <p className="text-xs text-white/35">TIMEORA · ADMINISTRATION</p>
      </section>
      <section className="flex items-center justify-center bg-[#f7f8f6] px-5 py-12">
        <div className="w-full max-w-[410px]">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <Image src="/timeora-logo.png" alt="Timeora" width={1152} height={768} className="h-[48px] w-[72px] object-contain" />
            <p className="text-xs font-semibold tracking-[0.3em] text-[#214e3d]">ADMIN</p>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#78827d]">Administrator access</p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-[#78827d]">Sign in using your provisioned admin account.</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block text-sm font-medium">
              Email address
              <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-md border border-[#dfe4df] bg-white px-3.5 py-3 text-sm font-normal" placeholder="varunmenaria123@gmail.com" />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-md border border-[#dfe4df] bg-white px-3.5 py-3 text-sm font-normal" placeholder="Your password" />
            </label>
            <div className="-mt-2 text-right">
              <Link href="/forgot-password" className="text-sm text-[#214e3d] underline underline-offset-4 hover:text-[#183a2e]">Forgot password?</Link>
            </div>
            {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
            <button disabled={busy} className="w-full rounded-md bg-[#183a2e] px-4 py-3 text-sm font-medium text-white hover:bg-[#214e3d] disabled:opacity-60">
              {busy ? "Signing in…" : "Sign in to admin"}
            </button>
          </form>
          <p className="mt-6 text-xs leading-5 text-[#78827d]">Admin accounts are provisioned by the backend seed configuration. Customer or seller accounts cannot access this workspace.</p>
        </div>
      </section>
    </main>
  );
}
