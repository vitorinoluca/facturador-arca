"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, apiBlob, clearToken, isLoggedIn } from "@/lib/api";

type Credential = { id: string; cuit: string; environment: "testing" | "production" };
type Invoice = {
  id: string;
  salesPoint: number;
  amount: string;
  clientCuit?: string;
  cae?: string;
  caeExpiration?: string;
  voucherNumber?: number;
  status: "issued" | "failed";
  errorMessage?: string;
  createdAt: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState<Credential[] | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    void loadAll();
  }, [router]);

  async function loadAll() {
    try {
      const [creds, invs] = await Promise.all([
        api<Credential[]>("/afip-credentials"),
        api<Invoice[]>("/invoices"),
      ]);
      setCredentials(creds);
      setInvoices(invs);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  const credential = credentials?.[0] ?? null;

  return (
    <div className="min-h-full bg-paper">
      <Masthead credential={credential} onLogout={handleLogout} />

      <main className="mx-auto max-w-4xl px-6 py-8">
        {error && (
          <div className="mb-6 border border-status-failed/30 bg-status-failed-tint px-4 py-2 text-sm text-status-failed">
            {error}
          </div>
        )}

        {credentials === null ? null : credential === null ? (
          <CredentialOnboarding onCreated={loadAll} />
        ) : (
          <>
            <HelpStrip />
            <QuickEntryRow credential={credential} onCreated={loadAll} />
            <Ledger invoices={invoices} />
          </>
        )}
      </main>
    </div>
  );
}

/* ---------- Masthead ---------- */

function SealMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="16" cy="16" r="13.2" />
      <path d="M10.5 16.2l3.6 3.6 7.4-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Masthead({
  credential,
  onLogout,
}: {
  credential: Credential | null;
  onLogout: () => void;
}) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-4xl items-end justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <SealMark className="h-8 w-8 shrink-0 text-accent" />
          <div>
            <h1 className="font-serif text-xl font-semibold leading-none text-ink">
              Facturador ARCA
            </h1>
            <p className="mt-1 text-xs text-ink-muted">
              Emisión de Factura C — WSFEv1
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {credential && (
            <div className="hidden text-right text-xs leading-tight text-ink-muted sm:block">
              <div className="font-mono text-ink">CUIT {credential.cuit}</div>
              <div>
                {credential.environment === "production" ? "Ambiente: producción" : "Ambiente: testing"}
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            className="border border-line px-3 py-1.5 text-xs text-ink-muted hover:border-line-strong hover:text-ink"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}

/* ---------- shared field styles ---------- */

const inputClass =
  "w-full border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none";
const monoInputClass = inputClass + " font-mono text-xs";
const primaryButtonClass =
  "border border-accent bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      {children}
      {hint && <span className="block text-[11px] leading-snug text-ink-faint">{hint}</span>}
    </label>
  );
}

/* ---------- credential onboarding (no credential yet) ---------- */

function CredentialOnboarding({ onCreated }: { onCreated: () => void }) {
  const [cuit, setCuit] = useState("");
  const [cert, setCert] = useState("");
  const [key, setKey] = useState("");
  const [environment, setEnvironment] = useState<"testing" | "production">("testing");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/afip-credentials", {
        method: "POST",
        body: JSON.stringify({ cuit, cert, key, environment }),
      });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-line bg-surface">
      <div className="border-b border-line px-6 py-5">
        <h2 className="font-serif text-lg font-semibold text-ink">Alta de credencial ARCA</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Necesitás cargar tu certificado antes de poder emitir. Se guarda encriptado y solo se usa
          para llamar a ARCA en tu nombre.
        </p>
      </div>

      <button
        onClick={() => setGuideOpen((v) => !v)}
        className="flex w-full items-center justify-between border-b border-line px-6 py-3 text-left text-sm text-accent"
      >
        <span>¿De dónde saco el CUIT, el certificado y el token?</span>
        <span>{guideOpen ? "ocultar" : "ver guía"}</span>
      </button>
      {guideOpen && <Guide />}

      <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
        <Field label="CUIT">
          <input
            placeholder="20460137749"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Certificado (.crt)" hint="Contenido completo del archivo, incluidas las líneas BEGIN/END">
          <textarea
            placeholder="-----BEGIN CERTIFICATE-----"
            value={cert}
            onChange={(e) => setCert(e.target.value)}
            required
            rows={4}
            className={monoInputClass}
          />
        </Field>

        <Field label="Clave privada (.key)" hint="Nunca sale de tu servidor — se guarda encriptada">
          <textarea
            placeholder="-----BEGIN PRIVATE KEY-----"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
            rows={4}
            className={monoInputClass}
          />
        </Field>

        <Field label="Ambiente">
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as "testing" | "production")}
            className={inputClass}
          >
            <option value="testing">Testing (homologación)</option>
            <option value="production">Producción</option>
          </select>
        </Field>

        {error && <p className="text-sm text-status-failed">{error}</p>}

        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? "Guardando..." : "Guardar credencial"}
        </button>
      </form>
    </div>
  );
}

function Guide() {
  return (
    <div className="space-y-4 border-b border-line bg-paper px-6 py-5 text-sm text-ink">
      <div>
        <p className="font-medium">1. CUIT</p>
        <p className="text-ink-muted">
          El tuyo, sin guiones. Lo encontrás en tu constancia de inscripción de ARCA o en cualquier
          factura que hayas emitido.
        </p>
      </div>
      <div>
        <p className="font-medium">2. Certificado y clave privada</p>
        <ol className="ml-4 list-decimal space-y-1 text-ink-muted">
          <li>
            Generá un par clave/CSR con OpenSSL:{" "}
            <code className="bg-surface px-1 py-0.5 font-mono text-xs">
              openssl genrsa -out clave.key 2048
            </code>{" "}
            y después{" "}
            <code className="bg-surface px-1 py-0.5 font-mono text-xs">
              openssl req -new -key clave.key -subj &quot;/CN=alias/serialNumber=CUIT tuCUIT&quot; -out
              pedido.csr
            </code>
            .
          </li>
          <li>
            Entrá a{" "}
            <a href="https://auth.afip.gob.ar/contribuyente_/login.xhtml" target="_blank" className="text-accent underline">
              ARCA con tu Clave Fiscal
            </a>{" "}
            → buscá <strong>WSASS - Autogestión Certificados Homologación</strong> (testing) o{" "}
            <strong>Administración de Certificados Digitales</strong> (producción).
          </li>
          <li>Pegá el contenido del `.csr` ahí y te devuelve el certificado.</li>
          <li>
            Dentro del mismo servicio, autorizá el certificado al servicio{" "}
            <code className="bg-surface px-1 py-0.5 font-mono text-xs">wsfe</code>.
          </li>
        </ol>
      </div>
      <div>
        <p className="font-medium">3. Token de AfipSDK</p>
        <p className="text-ink-muted">
          Registrate gratis en{" "}
          <a href="https://afipsdk.com" target="_blank" className="text-accent underline">
            afipsdk.com
          </a>{" "}
          y configurá el <code className="bg-surface px-1 py-0.5 font-mono text-xs">access_token</code>{" "}
          como <code className="bg-surface px-1 py-0.5 font-mono text-xs">AFIPSDK_ACCESS_TOKEN</code>{" "}
          en el servidor — no en esta pantalla.
        </p>
      </div>
      <div>
        <p className="font-medium">4. Testing vs. producción</p>
        <p className="text-ink-muted">
          Usá <strong>testing</strong> para probar, no genera comprobantes reales. Cambiá a{" "}
          <strong>producción</strong> solo cuando quieras facturar de verdad.
        </p>
      </div>
    </div>
  );
}

function HelpStrip() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6 border border-line">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-xs text-ink-muted hover:text-ink"
      >
        <span>Guía: certificado, CUIT y token</span>
        <span>{open ? "ocultar" : "ver"}</span>
      </button>
      {open && <Guide />}
    </div>
  );
}

/* ---------- quick entry (emitir factura, estilo boleta) ---------- */

function QuickEntryRow({ credential, onCreated }: { credential: Credential; onCreated: () => void }) {
  const [salesPoint, setSalesPoint] = useState("1");
  const [amount, setAmount] = useState("");
  const [clientCuit, setClientCuit] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/invoices", {
        method: "POST",
        body: JSON.stringify({
          credentialId: credential.id,
          salesPoint: Number(salesPoint),
          amount: Number(amount),
          clientCuit: clientCuit || undefined,
        }),
      });
      setAmount("");
      setClientCuit("");
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 border border-line bg-surface">
      <div className="border-b border-line px-5 py-3">
        <h2 className="font-serif text-base font-semibold text-ink">Nueva factura</h2>
      </div>
      <div className="grid gap-4 px-5 py-5 sm:grid-cols-[100px_160px_1fr_auto] sm:items-end">
        <Field label="Pto. venta" hint="1 si es tu único punto de venta">
          <input
            type="number"
            value={salesPoint}
            onChange={(e) => setSalesPoint(e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Monto">
          <input
            type="number"
            step="0.01"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className={inputClass + " tabular-nums"}
          />
        </Field>
        <Field label="CUIT del cliente" hint="Vacío = consumidor final">
          <input value={clientCuit} onChange={(e) => setClientCuit(e.target.value)} className={inputClass} />
        </Field>
        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? "Emitiendo..." : "Emitir"}
        </button>
      </div>
      {error && (
        <p className="border-t border-status-failed/30 bg-status-failed-tint px-5 py-2 text-sm text-status-failed">
          {error}
        </p>
      )}
    </form>
  );
}

/* ---------- ledger (historial) ---------- */

function StatusMark({ status }: { status: "issued" | "failed" }) {
  if (status === "issued") {
    return (
      <span className="inline-flex items-center gap-1.5 text-status-issued">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="8" cy="8" r="6.4" />
          <path d="M5.2 8.1l1.8 1.8 3.6-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-medium">Emitida</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-status-failed">
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="8" cy="8" r="6.4" />
        <path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" strokeLinecap="round" />
      </svg>
      <span className="text-sm font-medium">Falló</span>
    </span>
  );
}

function Ledger({ invoices }: { invoices: Invoice[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="border border-line bg-surface">
      <div className="border-b border-line px-5 py-3">
        <h2 className="font-serif text-base font-semibold text-ink">Historial de comprobantes</h2>
      </div>

      {invoices.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-ink-faint">
          Todavía no emitiste ninguna factura.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-2 font-medium">Fecha</th>
              <th className="px-2 py-2 text-right font-medium">Monto</th>
              <th className="px-2 py-2 font-medium">CAE</th>
              <th className="px-2 py-2 font-medium">Estado</th>
              <th className="px-5 py-2 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <Fragment key={inv.id}>
                <tr className="border-b border-line last:border-0">
                  <td className="px-5 py-3 text-ink-muted">
                    {new Date(inv.createdAt).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-2 py-3 text-right font-medium tabular-nums text-ink">
                    ${Number(inv.amount).toLocaleString("es-AR")}
                  </td>
                  <td className="px-2 py-3 font-mono text-xs tracking-tight text-ink-muted">
                    {inv.cae ?? "—"}
                  </td>
                  <td className="px-2 py-3">
                    <StatusMark status={inv.status} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    {inv.status === "issued" && <PdfLink invoiceId={inv.id} />}
                    {inv.status === "failed" && (
                      <button
                        onClick={() => toggle(inv.id)}
                        className="text-xs font-medium text-status-failed underline"
                      >
                        {expanded.has(inv.id) ? "ocultar" : "ver por qué falló"}
                      </button>
                    )}
                  </td>
                </tr>
                {inv.status === "failed" && expanded.has(inv.id) && (
                  <tr className="border-b border-line bg-status-failed-tint/40">
                    <td colSpan={5} className="px-5 py-3 font-mono text-xs text-status-failed">
                      {inv.errorMessage}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PdfLink({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const blob = await apiBlob(`/invoices/${invoiceId}/pdf`);
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank");
      // se revoca después de un rato para no filtrar memoria; la pestaña nueva ya
      // cargó el PDF en su propio contexto para entonces
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleClick} disabled={loading} className="text-xs font-medium text-accent underline disabled:opacity-50">
      {loading ? "generando..." : "ver PDF"}
    </button>
  );
}
