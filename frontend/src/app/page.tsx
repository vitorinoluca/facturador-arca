"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/api";
import { SealMark } from "@/components/seal-mark";
import { Footer } from "@/components/footer";

export default function LandingPage() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    void getSession().then((session) => setLoggedIn(!!session));
  }, []);

  return (
    <div className="min-h-full bg-paper">
      <Nav loggedIn={loggedIn} />
      <Hero loggedIn={loggedIn} />
      <HowItWorks />
      <Security />
      <Footer />
    </div>
  );
}

function Nav({ loggedIn }: { loggedIn: boolean }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <SealMark className="h-6 w-6 text-accent" />
          <span className="font-serif text-base font-semibold text-ink">Facturador ARCA</span>
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <a href="#como-funciona" className="text-ink-muted hover:text-ink">
            Cómo funciona
          </a>
          <a href="#seguridad" className="text-ink-muted hover:text-ink">
            Seguridad
          </a>
          <Link
            href={loggedIn ? "/dashboard" : "/login"}
            className="border border-accent bg-accent px-3 py-1.5 font-medium text-white hover:bg-accent-hover"
          >
            {loggedIn ? "Ir al panel" : "Ingresar"}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero({ loggedIn }: { loggedIn: boolean }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 text-center">
      <p className="text-xs uppercase tracking-wide text-ink-muted">Para monotributistas</p>
      <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight text-ink sm:text-5xl">
        Facturá en ARCA sin abrir el portal
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base text-ink-muted">
        Delegá la facturación electrónica en dos clicks, sin certificados de tu parte. Después,
        emitir una Factura C con CAE real es un formulario de tres campos.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href={loggedIn ? "/dashboard" : "/register"}
          className="border border-accent bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          {loggedIn ? "Ir al panel" : "Crear cuenta gratis"}
        </Link>
        <a
          href="https://github.com/vitorinoluca/facturador-arca"
          target="_blank"
          className="border border-line px-5 py-2.5 text-sm font-medium text-ink hover:border-line-strong"
        >
          Ver el código
        </a>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Delegás en dos clicks",
      body: "Desde el Administrador de Relaciones de ARCA, sin generar ningún certificado propio.",
    },
    {
      n: "02",
      title: "Completás punto de venta y monto",
      body: "Un formulario de tres campos, como una boleta de depósito. Con o sin CUIT del cliente.",
    },
    {
      n: "03",
      title: "Recibís el CAE al instante",
      body: "La factura queda emitida contra ARCA, con su PDF listo para descargar o mandar por mail.",
    },
  ];

  return (
    <section id="como-funciona" className="border-y border-line bg-surface py-16">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="font-serif text-2xl font-semibold text-ink">Cómo funciona</h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n}>
              <span className="font-serif text-sm text-ink-faint">{s.n}</span>
              <h3 className="mt-1 font-medium text-ink">{s.title}</h3>
              <p className="mt-1.5 text-sm text-ink-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Security() {
  const points = [
    {
      title: "Nunca pedimos tu Clave Fiscal",
      body: "Ni un certificado, ni una clave privada. Delegás desde ARCA — un trámite público y revocable, sin compartir secretos.",
    },
    {
      title: "Revocable en cualquier momento",
      body: "La delegación se saca desde el mismo Administrador de Relaciones de ARCA, sin depender de esta app.",
    },
    {
      title: "Sesión en cookies httpOnly",
      body: "El token de acceso no se guarda en localStorage — un script inyectado (XSS) no puede robarlo.",
    },
  ];

  return (
    <section id="seguridad" className="mx-auto max-w-4xl px-6 py-16">
      <h2 className="font-serif text-2xl font-semibold text-ink">Seguridad</h2>
      <div className="mt-8 grid gap-8 sm:grid-cols-3">
        {points.map((p) => (
          <div key={p.title} className="border border-line bg-surface p-5">
            <h3 className="font-medium text-ink">{p.title}</h3>
            <p className="mt-1.5 text-sm text-ink-muted">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

