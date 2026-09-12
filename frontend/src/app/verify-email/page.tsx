"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { SealMark } from "@/components/seal-mark";
import { Footer } from "@/components/footer";
import { Spinner } from "@/components/spinner";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  // el token es de un solo uso: React (Strict Mode, en dev) invoca los efectos dos
  // veces a propósito, y sin este guard el segundo POST cae sobre un token ya
  // consumido por el primero — si esa respuesta (400) llega después, pisa el "ok"
  // real con un "venció" falso aunque el mail sí haya quedado verificado.
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setStatus("error");
      return;
    }
    api("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) })
      .then(() => setStatus("ok"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex flex-1 items-center justify-center bg-paper p-6">
        <div className="w-full max-w-sm border border-line bg-surface px-8 py-6 text-center">
          <Link href="/" className="inline-block">
            <SealMark className="mx-auto h-8 w-8 text-accent" />
          </Link>

          {status === "loading" && (
            <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-ink-muted">
              <Spinner /> Confirmando tu email...
            </p>
          )}
          {status === "ok" && (
            <>
              <p className="mt-4 text-sm text-ink">Tu email quedó confirmado.</p>
              <Link href="/dashboard" className="mt-3 inline-block font-medium text-accent underline">
                Ir al panel
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <p className="mt-4 text-sm text-status-failed">El link venció o ya se usó.</p>
              <Link href="/dashboard" className="mt-3 inline-block font-medium text-accent underline">
                Ir al panel
              </Link>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
