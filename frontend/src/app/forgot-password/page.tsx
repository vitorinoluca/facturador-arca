"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { SealMark } from "@/components/seal-mark";
import { Footer } from "@/components/footer";
import { Spinner } from "@/components/spinner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex flex-1 items-center justify-center bg-paper p-6">
        <div className="w-full max-w-sm border border-line bg-surface">
          <div className="border-b border-line px-8 py-6 text-center">
            <Link href="/" className="inline-block">
              <SealMark className="mx-auto h-8 w-8 text-accent" />
            </Link>
            <h1 className="mt-2 font-serif text-lg font-semibold text-ink">Recuperar contraseña</h1>
            <p className="mt-1 text-xs text-ink-muted">Te mandamos un link para elegir una nueva</p>
          </div>

          {sent ? (
            <div className="space-y-3 px-8 py-6 text-sm text-ink-muted">
              <p>
                Si existe una cuenta con ese email, te llegó un mail con el link. Revisá también la
                carpeta de spam.
              </p>
              <Link href="/login" className="font-medium text-accent underline">
                Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 px-8 py-6">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
              {error && <p className="text-sm text-status-failed">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full border border-accent bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <Spinner /> Enviando...
                  </span>
                ) : (
                  "Mandar link"
                )}
              </button>
              <p className="text-sm text-ink-muted">
                <Link href="/login" className="font-medium text-accent underline">
                  Volver a iniciar sesión
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
