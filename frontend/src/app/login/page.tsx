"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken } = await api<{ accessToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(accessToken);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-paper p-6">
      <div className="w-full max-w-sm border border-line bg-surface">
        <div className="border-b border-line px-8 py-6 text-center">
          <svg viewBox="0 0 32 32" className="mx-auto h-8 w-8 text-accent" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="16" cy="16" r="13.2" />
            <path d="M10.5 16.2l3.6 3.6 7.4-8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="mt-2 font-serif text-lg font-semibold text-ink">Facturador ARCA</h1>
          <p className="mt-1 text-xs text-ink-muted">Iniciá sesión para emitir</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 px-8 py-6">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          />
          {error && <p className="text-sm text-status-failed">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full border border-accent bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
          <p className="text-sm text-ink-muted">
            ¿No tenés cuenta?{" "}
            <Link href="/register" className="font-medium text-accent underline">
              Registrate
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
