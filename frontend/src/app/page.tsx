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

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "Facturador ARCA",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Facturá en ARCA sin abrir el portal — Factura C con CAE real para monotributistas.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "ARS" },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ_ITEMS.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-paper">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <Nav loggedIn={loggedIn} />
      <Hero loggedIn={loggedIn} />
      <HowItWorks />
      <LedgerPreview />
      <Security />
      <Faq />
      <Footer />
    </div>
  );
}

function Nav({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);

  const links = (
    <>
      <a href="#como-funciona" className="text-ink-muted hover:text-ink" onClick={() => setOpen(false)}>
        Cómo funciona
      </a>
      <a href="#seguridad" className="text-ink-muted hover:text-ink" onClick={() => setOpen(false)}>
        Seguridad
      </a>
      <Link
        href={loggedIn ? "/dashboard" : "/login"}
        className="border border-accent bg-accent px-3 py-1.5 text-center font-medium text-white hover:bg-accent-hover"
        onClick={() => setOpen(false)}
      >
        {loggedIn ? "Ir al panel" : "Ingresar"}
      </Link>
    </>
  );

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <SealMark className="h-6 w-6 shrink-0 text-accent" />
          <span className="truncate font-serif text-sm font-semibold text-ink sm:text-base">
            Facturador ARCA
          </span>
        </div>
        {/* nav completa: visible desde md, sin límite de ancho por link (antes competía
            con el logo y lo hacía wrappear en pantallas angostas) */}
        <nav className="hidden items-center gap-6 text-sm md:flex">{links}</nav>
        <button
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 shrink-0 items-center justify-center text-ink md:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>
      {open && (
        <nav className="flex flex-col gap-4 border-t border-line px-6 py-4 text-sm md:hidden">{links}</nav>
      )}
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
      <p className="mt-2 text-sm font-medium text-accent">Gratis — sin planes pagos</p>
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
    <section id="como-funciona" className="border-y border-line bg-surface py-20">
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

function LedgerPreview() {
  const rows = [
    { fecha: "10/09/2026", monto: "45.000", cae: "86370882189714", estado: "ok" as const },
    { fecha: "08/09/2026", monto: "12.500", cae: "86370881763302", estado: "ok" as const },
    { fecha: "05/09/2026", monto: "8.000", cae: "—", estado: "fail" as const },
  ];

  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <p className="text-xs uppercase tracking-wide text-ink-muted">Así se ve</p>
      <h2 className="mt-1 font-serif text-2xl font-semibold text-ink">
        Un historial, no una lista de exports
      </h2>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">
        Cada fila es trazable: fecha, monto, CAE, y si algo falló, por qué — sin salir de la tabla.
      </p>

      <div className="mt-8 overflow-x-auto border border-line bg-surface">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-2 font-medium">Fecha</th>
              <th className="px-2 py-2 text-right font-medium">Monto</th>
              <th className="px-2 py-2 font-medium">CAE</th>
              <th className="px-2 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.fecha} className="border-b border-line last:border-0">
                <td className="px-5 py-3 text-ink-muted">{r.fecha}</td>
                <td className="px-2 py-3 text-right font-medium tabular-nums text-ink">${r.monto}</td>
                <td className="px-2 py-3 font-mono text-xs tracking-tight text-ink-muted">{r.cae}</td>
                <td className="px-2 py-3">
                  {r.estado === "ok" ? (
                    <span className="inline-flex items-center gap-1.5 text-status-issued">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <circle cx="8" cy="8" r="6.4" />
                        <path d="M5.2 8.1l1.8 1.8 3.6-4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-sm font-medium">Emitida</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-status-failed">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <circle cx="8" cy="8" r="6.4" />
                        <path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" strokeLinecap="round" />
                      </svg>
                      <span className="text-sm font-medium">Falló</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Al nivel de módulo para reusarlo también en el JSON-LD (FAQPage) sin duplicar
// el texto.
const FAQ_ITEMS = [
  {
    q: "¿Necesito mi propio certificado de ARCA?",
    a: "No. Delegás la Facturación Electrónica en el CUIT de la app desde el Administrador de Relaciones de Clave Fiscal — dos clicks, sin generar certificados ni compartir claves.",
  },
  {
    q: "¿Es gratis?",
    a: "Sí, es un proyecto de portfolio sin costo. No hay planes pagos ni límites artificiales.",
  },
  {
    q: "¿Puedo probarlo sin arriesgar nada?",
    a: "Sí — elegís 'Prueba' en el switch de ambiente al emitir una factura. Son comprobantes de prueba (homologación de ARCA), sin CAE real ni validez fiscal, hasta que decidas pasar a 'Real'.",
  },
  {
    q: "¿Qué pasa si quiero dejar de usarlo?",
    a: "Revocás la delegación desde ARCA cuando quieras, sin avisarnos. Tus facturas ya emitidas siguen siendo válidas — quedaron registradas en ARCA, no acá.",
  },
];

function Faq() {
  const items = FAQ_ITEMS;

  return (
    <section className="border-t border-line bg-surface py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="font-serif text-2xl font-semibold text-ink">Preguntas frecuentes</h2>
        <dl className="mt-8 space-y-6">
          {items.map((item) => (
            <div key={item.q}>
              <dt className="font-medium text-ink">{item.q}</dt>
              <dd className="mt-1 text-sm text-ink-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
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
    <section id="seguridad" className="mx-auto max-w-4xl px-6 py-20">
      <h2 className="font-serif text-2xl font-semibold text-ink">Seguridad</h2>
      <div className="mt-8 grid gap-8 sm:grid-cols-3">
        {points.map((p) => (
          <div key={p.title} className="border border-line bg-surface p-5">
            <h3 className="font-medium text-ink">{p.title}</h3>
            <p className="mt-1.5 text-sm text-ink-muted">{p.body}</p>
          </div>
        ))}
      </div>
      <Link href="/legal" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
        Ver términos legales
      </Link>
    </section>
  );
}

