"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SealMark } from "@/components/seal-mark";
import { Footer } from "@/components/footer";
import { Spinner } from "@/components/spinner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // se lee de window.location (no useSearchParams) para no tener que envolver la
  // página en <Suspense> solo por esto.
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      await api("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, newPassword }) });
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
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
            <h1 className="mt-2 font-serif text-lg font-semibold text-ink">Elegí una contraseña nueva</h1>
          </div>

          {token === null ? (
            <p className="px-8 py-6 text-sm text-status-failed">
              Falta el link completo — abrí el que te llegó por mail.
            </p>
          ) : done ? (
            <p className="px-8 py-6 text-sm text-ink-muted">Contraseña actualizada. Redirigiendo...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 px-8 py-6">
              <input
                type="password"
                placeholder="Contraseña nueva (mín. 8 caracteres)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
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
                    <Spinner /> Guardando...
                  </span>
                ) : (
                  "Guardar contraseña"
                )}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
