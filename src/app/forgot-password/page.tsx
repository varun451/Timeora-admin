"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send reset instructions.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#183a2e] lg:grid-cols-[1fr_0.85fr]">
      <section className="hidden flex-col justify-center p-12 text-white lg:flex xl:p-20">
        <p className="text-sm uppercase tracking-[0.2em] text-[#c2d8ca]">Administrator access</p>
        <h1 className="mt-5 text-5xl font-light leading-tight xl:text-6xl">Secure your<br />workspace.</h1>
        <p className="mt-6 max-w-md text-sm leading-6 text-white/65">We’ll send a one-time password reset link to your administrator email.</p>
      </section>
      <section className="flex items-center justify-center bg-[#f7f8f6] px-5 py-12">
        <div className="w-full max-w-[410px]">
          <p className="text-xs uppercase tracking-[0.2em] text-[#78827d]">Admin account recovery</p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight">Forgot password?</h2>
          {submitted ? (
            <div role="status" className="mt-5 rounded-md border border-[#dfe4df] bg-white p-4 text-sm leading-6 text-[#52615a]">
              If an active account exists for <strong className="text-[#183a2e]">{email}</strong>, reset instructions have been sent. The link expires in 30 minutes.
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm text-[#78827d]">Enter your administrator email and we’ll send you a reset link.</p>
              <form onSubmit={submit} className="mt-8 space-y-5">
                <label className="block text-sm font-medium">
                  Email address
                  <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-md border border-[#dfe4df] bg-white px-3.5 py-3 text-sm font-normal" placeholder="varunmenaria123@gmail.com" />
                </label>
                {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
                <button disabled={busy} className="w-full rounded-md bg-[#183a2e] px-4 py-3 text-sm font-medium text-white hover:bg-[#214e3d] disabled:opacity-60">
                  {busy ? "Sending email…" : "Send reset link"}
                </button>
              </form>
            </>
          )}
          <p className="mt-6 text-sm text-[#78827d]"><Link href="/login" className="text-[#214e3d] underline underline-offset-4">Back to admin sign in</Link></p>
        </div>
      </section>
    </main>
  );
}
