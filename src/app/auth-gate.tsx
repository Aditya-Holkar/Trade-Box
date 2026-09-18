"use client";

import { FormEvent, ReactNode, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const result =
      mode === "sign-in"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ name, email, password });

    setBusy(false);
    if (result.error) {
      setMessage(result.error.message ?? "Authentication failed.");
    }
  }

  async function signOut() {
    await authClient.signOut();
  }

  if (isPending) {
    return (
      <section className="mt-4 rounded border border-[#1b2532] bg-[#0b1017] p-8 text-center text-sm text-[#7f8da1]">
        Loading secure research session…
      </section>
    );
  }

  if (!session) {
    return (
      <section className="mt-4 grid gap-6 rounded border border-[#1b2532] bg-[#0b1017] p-5 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="text-xs font-bold tracking-[.18em] text-[#5eead4]">SECURE RESEARCH WORKSPACE</div>
          <h2 className="mt-2 text-xl font-semibold">Sign in to Trade Box</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#9aa8ba]">
            Market intelligence, watchlists and research state are kept behind an authenticated session.
          </p>
        </div>
        <form onSubmit={submit} className="rounded border border-[#1b2532] bg-[#101722] p-4">
          <div className="mb-3 flex gap-2 text-[10px] font-bold tracking-widest">
            <button type="button" onClick={() => setMode("sign-in")} className={mode === "sign-in" ? "text-[#5eead4]" : "text-[#617086]"}>SIGN IN</button>
            <button type="button" onClick={() => setMode("sign-up")} className={mode === "sign-up" ? "text-[#5eead4]" : "text-[#617086]"}>CREATE ACCOUNT</button>
          </div>
          {mode === "sign-up" && <input value={name} onChange={e => setName(e.target.value)} required placeholder="Name" className="mb-2 w-full rounded border border-[#263444] bg-[#0b1017] px-3 py-2 text-sm outline-none" />}
          <input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="Email" className="mb-2 w-full rounded border border-[#263444] bg-[#0b1017] px-3 py-2 text-sm outline-none" />
          <input value={password} onChange={e => setPassword(e.target.value)} required minLength={8} type="password" placeholder="Password" className="mb-2 w-full rounded border border-[#263444] bg-[#0b1017] px-3 py-2 text-sm outline-none" />
          {message && <div className="mb-2 text-xs text-[#f08a9a]">{message}</div>}
          <button disabled={busy} className="w-full rounded border border-[#5eead4] px-3 py-2 text-xs font-bold text-[#5eead4] disabled:opacity-50">
            {busy ? "AUTHENTICATING…" : mode === "sign-in" ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section>
      <div className="mt-4 flex items-center justify-between rounded border border-[#23413d] bg-[#0c1516] px-4 py-2">
        <div className="text-[10px] tracking-widest text-[#5eead4]">AUTHENTICATED · {session.user.email}</div>
        <button onClick={signOut} className="text-[10px] font-bold tracking-widest text-[#9aa8ba] hover:text-[#f08a9a]">SIGN OUT</button>
      </div>
      {children}
    </section>
  );
}
