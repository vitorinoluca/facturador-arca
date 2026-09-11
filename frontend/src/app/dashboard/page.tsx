"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, apiBlob, getSession, logout } from "@/lib/api";
import { SealMark } from "@/components/seal-mark";

type Credential = { id: string; cuit: string; environment: "testing" | "production"; businessName: string };
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
    void (async () => {
      const session = await getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      void loadAll();
    })();
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

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  const credential = credentials?.[0] ?? null;

  async function handleDeleteCredential() {
    if (!credential) return;
    if (!confirm("¿Borrar esta credencial? Vas a tener que cargar tus datos de nuevo para volver a facturar.")) {
      return;
    }
    try {
      await api(`/afip-credentials/${credential.id}`, { method: "DELETE" });
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="min-h-full bg-paper">
      <Masthead credential={credential} onLogout={handleLogout} onDeleteCredential={handleDeleteCredential} />

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

function Masthead({
  credential,
  onLogout,
  onDeleteCredential,
}: {
  credential: Credential | null;
  onLogout: () => void;
  onDeleteCredential: () => void;
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
              <div className="text-ink">{credential.businessName}</div>
              <div className="font-mono">
                CUIT {credential.cuit} · {credential.environment === "production" ? "producción" : "testing"}
              </div>
              <button onClick={onDeleteCredential} className="mt-0.5 text-status-failed underline">
                borrar credencial
              </button>
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

const AFIP_APP_CUIT = process.env.NEXT_PUBLIC_AFIP_APP_CUIT ?? "tu-cuit-configuralo-en-env";

function CredentialOnboarding({ onCreated }: { onCreated: () => void }) {
  const [cuit, setCuit] = useState("");
  const [environment, setEnvironment] = useState<"testing" | "production">("testing");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [grossIncome, setGrossIncome] = useState("");
  const [activityStartDate, setActivityStartDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/afip-credentials", {
        method: "POST",
        body: JSON.stringify({
          cuit,
          environment,
          businessName,
          address,
          grossIncome: grossIncome || undefined,
          activityStartDate,
        }),
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
          Antes de emitir, delegá la Facturación Electrónica en nuestro CUIT desde ARCA — sin
          certificados ni claves privadas de tu parte.
        </p>
      </div>

      <Guide />

      <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
        <Field label="CUIT" hint="El que usaste para delegar en ARCA">
          <input
            placeholder="20460137749"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Razón social" hint="Va impresa en el PDF de la factura">
          <input
            placeholder="Tu nombre y apellido, o el nombre de tu actividad"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Domicilio comercial">
          <input
            placeholder="Calle 123, La Plata, Buenos Aires"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ingresos Brutos" hint="Tu N° de IIBB, o dejalo así si estás exento">
            <input
              placeholder="Exento"
              value={grossIncome}
              onChange={(e) => setGrossIncome(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Inicio de actividades">
            <input
              type="date"
              value={activityStartDate}
              onChange={(e) => setActivityStartDate(e.target.value)}
              required
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Ambiente" hint="Usá testing hasta confirmar que la delegación quedó bien hecha">
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
        <p className="font-medium">1. Delegar la facturación electrónica</p>
        <ol className="ml-4 list-decimal space-y-1 text-ink-muted">
          <li>
            Entrá a{" "}
            <a
              href="https://auth.afip.gob.ar/contribuyente_/login.xhtml"
              target="_blank"
              className="text-accent underline"
            >
              ARCA con tu Clave Fiscal
            </a>{" "}
            → <strong>Administrador de Relaciones de Clave Fiscal</strong> → <strong>Nueva Relación</strong>.
          </li>
          <li>
            Elegí: Organismo <strong>AFIP/ARCA</strong>, Servicio <strong>Web Services</strong>,
            Aplicación <strong>Facturación Electrónica</strong>.
          </li>
          <li>
            En <strong>Representante</strong> buscá el CUIT{" "}
            <code className="bg-surface px-1 py-0.5 font-mono text-xs">{AFIP_APP_CUIT}</code> y confirmá
            dos veces.
          </li>
          <li>Si aparece un aviso en rojo sobre no tener un facturador propio registrado, ignoralo.</li>
        </ol>
      </div>
      <div>
        <p className="font-medium">2. Crear tu punto de venta</p>
        <ol className="ml-4 list-decimal space-y-1 text-ink-muted">
          <li>
            En ARCA, entrá a <strong>Administración de puntos de venta y domicilios</strong> →{" "}
            <strong>Agregar</strong>.
          </li>
          <li>Elegí un número de punto de venta que no estés usando.</li>
          <li>
            Sistema: <strong>Facturación Electrónica - Monotributo - Webservice</strong>. Domicilio: tu
            domicilio fiscal.
          </li>
        </ol>
      </div>
      <div>
        <p className="font-medium">3. Cargá tus datos acá abajo</p>
        <p className="text-ink-muted">
          Con la delegación hecha, completá el formulario — el número de punto de venta que creaste va
          en la pantalla de facturas, no acá.
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
        <span>Guía: delegar en otro ambiente (testing/producción)</span>
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
  const [description, setDescription] = useState("");
  const [concept, setConcept] = useState<"1" | "2">("1"); // 1 Productos, 2 Servicios
  const [serviceDateFrom, setServiceDateFrom] = useState("");
  const [serviceDateTo, setServiceDateTo] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // se mantiene la misma key mientras no se emita con éxito: si el usuario reintenta
  // (por un timeout, o un doble click que el disabled no llegó a bloquear) el backend
  // devuelve el resultado ya guardado en vez de facturar dos veces. Se renueva después
  // de cada emisión exitosa para que la próxima factura no reuse la respuesta vieja.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/invoices", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          credentialId: credential.id,
          salesPoint: Number(salesPoint),
          amount: Number(amount),
          clientCuit: clientCuit || undefined,
          description: description || undefined,
          concept: Number(concept),
          ...(concept === "2" && {
            serviceDateFrom,
            serviceDateTo,
            paymentDueDate,
          }),
        }),
      });
      setAmount("");
      setClientCuit("");
      setDescription("");
      setServiceDateFrom("");
      setServiceDateTo("");
      setPaymentDueDate("");
      setIdempotencyKey(crypto.randomUUID());
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
      <div className="space-y-4 px-5 py-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Field label="Descripción" hint="Qué estás facturando — va como ítem en el PDF, vacío = 'Servicio'">
            <input
              placeholder="Ej: Desarrollo de landing page"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Tipo">
            <select value={concept} onChange={(e) => setConcept(e.target.value as "1" | "2")} className={inputClass}>
              <option value="1">Producto</option>
              <option value="2">Servicio</option>
            </select>
          </Field>
        </div>

        {concept === "2" && (
          <div className="grid gap-4 border border-line bg-paper p-4 sm:grid-cols-3">
            <Field label="Servicio desde" hint="Período facturado">
              <input
                type="date"
                value={serviceDateFrom}
                onChange={(e) => setServiceDateFrom(e.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Servicio hasta">
              <input
                type="date"
                value={serviceDateTo}
                onChange={(e) => setServiceDateTo(e.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Vto. de pago">
              <input
                type="date"
                value={paymentDueDate}
                onChange={(e) => setPaymentDueDate(e.target.value)}
                required
                className={inputClass}
              />
            </Field>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-[100px_160px_1fr_auto] sm:items-end">
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
