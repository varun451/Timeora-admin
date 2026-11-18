"use client";

import Link from "next/link";
import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("The reset link is incomplete. Request a new one.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await api<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setSuccess(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#183a2e] lg:grid-cols-[1fr_0.85fr]">
      <section className="hidden flex-col justify-center p-12 text-white lg:flex xl:p-20">
        <p className="text-sm uppercase tracking-[0.2em] text-[#c2d8ca]">Administrator access</p>
        <h1 className="mt-5 text-5xl font-light leading-tight xl:text-6xl">Choose a new<br />password.</h1>
        <p className="mt-6 max-w-md text-sm leading-6 text-white/65">Your password reset link is single-use and expires after 30 minutes.</p>
      </section>
      <section className="flex items-center justify-center bg-[#f7f8f6] px-5 py-12">
        <div className="w-full max-w-[410px]">
          <p className="text-xs uppercase tracking-[0.2em] text-[#78827d]">Admin account recovery</p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight">{success ? "Password updated" : "Set new password"}</h2>
          {success ? (
            <div role="status" className="mt-5 rounded-md border border-[#dfe4df] bg-white p-4 text-sm leading-6 text-[#52615a]">
              Your password was changed and previous sessions have been signed out.
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-5">
              <label className="block text-sm font-medium">
                New password
                <input required type="password" minLength={8} maxLength={100} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-md border border-[#dfe4df] bg-white px-3.5 py-3 text-sm font-normal" />
              </label>
              <label className="block text-sm font-medium">
                Confirm new password
                <input required type="password" minLength={8} maxLength={100} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-md border border-[#dfe4df] bg-white px-3.5 py-3 text-sm font-normal" />
              </label>
              {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
              <button disabled={busy} className="w-full rounded-md bg-[#183a2e] px-4 py-3 text-sm font-medium text-white hover:bg-[#214e3d] disabled:opacity-60">
                {busy ? "Updating password…" : "Reset password"}
              </button>
            </form>
          )}
          <p className="mt-6 text-sm text-[#78827d]"><Link href="/login" className="text-[#214e3d] underline underline-offset-4">Back to admin sign in</Link></p>
        </div>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#f7f8f6] text-sm text-[#78827d]">Loading…</main>}><ResetPasswordForm /></Suspense>;
}
