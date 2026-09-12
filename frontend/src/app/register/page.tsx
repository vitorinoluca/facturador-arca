"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { SealMark } from "@/components/seal-mark";
import { Footer } from "@/components/footer";
import { Spinner } from "@/components/spinner";
import { GoogleButton } from "@/components/google-button";
import { PasswordInput } from "@/components/password-input";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [registered, setRegistered] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) });
      setRegistered(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await api("/auth/resend-verification", { method: "POST" });
      setResent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setResending(false);
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
          <p className="mt-1 text-xs text-ink-muted">
            {registered ? "Confirmá tu email" : "Creá tu cuenta"}
          </p>
        </div>

        {registered ? (
          <div className="space-y-3 px-8 py-6 text-sm text-ink-muted">
            <p>
              Te mandamos un mail a <strong className="text-ink">{email}</strong> con un link para
              confirmar tu cuenta. Revisá también la carpeta de spam.
            </p>
            {resent ? (
              <p className="text-xs text-status-issued">Mail reenviado.</p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-xs font-medium text-accent underline disabled:opacity-50"
              >
                {resending ? "enviando..." : "no me llegó, reenviar"}
              </button>
            )}
            {error && <p className="text-sm text-status-failed">{error}</p>}
            <Link href="/dashboard" className="block font-medium text-accent underline">
              Ya lo confirmé, ir al panel
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-3 px-8 pt-6">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
              <PasswordInput
                placeholder="Contraseña (mín. 8 caracteres)"
                value={password}
                onChange={setPassword}
                required
                minLength={8}
              />
              <PasswordInput
                placeholder="Repetí la contraseña"
                value={confirmPassword}
                onChange={setConfirmPassword}
                required
                minLength={8}
              />
              {error && <p className="text-sm text-status-failed">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full border border-accent bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <Spinner /> Creando...
                  </span>
                ) : (
                  "Crear cuenta"
                )}
              </button>
            </form>

            <div className="space-y-3 px-8 pb-6 pt-3">
              <div className="flex items-center gap-3 text-xs text-ink-faint">
                <div className="h-px flex-1 bg-line" />
                o
                <div className="h-px flex-1 bg-line" />
              </div>
              <GoogleButton />
              <p className="text-sm text-ink-muted">
                ¿Ya tenés cuenta?{" "}
                <Link href="/login" className="font-medium text-accent underline">
                  Iniciá sesión
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </main>
    <Footer />
    </div>
  );
}
