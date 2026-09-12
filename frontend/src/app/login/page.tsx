"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SealMark } from "@/components/seal-mark";
import { Footer } from "@/components/footer";
import { Spinner } from "@/components/spinner";
import { GoogleButton } from "@/components/google-button";
import { PasswordInput } from "@/components/password-input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ?error=google llega tras un callback de OAuth fallido (main navigation, no fetch
  // — por eso se lee de window.location en vez de useSearchParams, que exigiría
  // envolver la página en <Suspense>).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "google") {
      setError("No se pudo iniciar sesión con Google. Probá de nuevo.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.push("/dashboard");
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
          <h1 className="mt-2 font-serif text-lg font-semibold text-ink">Facturador ARCA</h1>
          <p className="mt-1 text-xs text-ink-muted">Iniciá sesión para emitir</p>
        </div>

        <div className="space-y-3 px-8 pt-6">
          <GoogleButton />
          <div className="flex items-center gap-3 text-xs text-ink-faint">
            <div className="h-px flex-1 bg-line" />
            o con tu email
            <div className="h-px flex-1 bg-line" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 px-8 pb-6 pt-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          />
          <PasswordInput placeholder="Contraseña" value={password} onChange={setPassword} required />
          <div className="text-right">
            <Link href="/forgot-password" className="text-xs text-ink-muted hover:text-ink hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          {error && <p className="text-sm text-status-failed">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full border border-accent bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-1.5">
                <Spinner /> Entrando...
              </span>
            ) : (
              "Entrar"
            )}
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
    <Footer />
    </div>
  );
}
