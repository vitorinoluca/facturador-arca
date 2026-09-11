"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearToken, isLoggedIn } from "@/lib/api";

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
  const [credentials, setCredentials] = useState<Credential[]>([]);
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

  return (
    <div className="min-h-full bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Facturador ARCA</h1>
            <p className="text-xs text-gray-500">Facturación electrónica para monotributistas</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <HelpPanel />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
          <CredentialsSection credentials={credentials} onCreated={loadAll} />
          <InvoicesSection credentials={credentials} invoices={invoices} onCreated={loadAll} />
        </div>
      </main>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      {children}
      {hint && <span className="block text-[11px] leading-snug text-gray-400">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const monoInputClass = inputClass + " font-mono text-xs";
const primaryButtonClass =
  "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";

function Badge({ status }: { status: "issued" | "failed" }) {
  const isOk = status === "issued";
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
        (isOk ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")
      }
    >
      {isOk ? "Emitida" : "Falló"}
    </span>
  );
}

function HelpPanel() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <span className="text-sm font-medium text-indigo-900">
          ¿De dónde saco el CUIT, el certificado y el token? — guía rápida
        </span>
        <span className="text-indigo-500">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-indigo-100 px-5 py-4 text-sm text-indigo-950">
          <div>
            <p className="font-semibold">1. CUIT</p>
            <p className="text-indigo-900/80">
              El tuyo, sin guiones. Lo encontrás en tu constancia de inscripción de ARCA o en
              cualquier factura que hayas emitido.
            </p>
          </div>

          <div>
            <p className="font-semibold">2. Certificado y clave privada</p>
            <ol className="ml-4 list-decimal space-y-1 text-indigo-900/80">
              <li>
                Generá un par clave/CSR con OpenSSL:{" "}
                <code className="rounded bg-white px-1 py-0.5 text-xs">
                  openssl genrsa -out clave.key 2048
                </code>{" "}
                y después{" "}
                <code className="rounded bg-white px-1 py-0.5 text-xs">
                  openssl req -new -key clave.key -subj &quot;/CN=tu-alias/serialNumber=CUIT
                  tuCUIT&quot; -out pedido.csr
                </code>
                .
              </li>
              <li>
                Entrá a{" "}
                <a
                  href="https://auth.afip.gob.ar/contribuyente_/login.xhtml"
                  target="_blank"
                  className="underline"
                >
                  ARCA con tu Clave Fiscal
                </a>{" "}
                → buscá el servicio <strong>WSASS - Autogestión Certificados Homologación</strong>{" "}
                (para testing) o <strong>Administración de Certificados Digitales</strong> (para
                producción).
              </li>
              <li>Pegá el contenido del `.csr` ahí y te devuelve el certificado.</li>
              <li>
                Dentro del mismo servicio, autorizá el certificado al servicio{" "}
                <code className="rounded bg-white px-1 py-0.5 text-xs">wsfe</code> (Facturación
                Electrónica).
              </li>
            </ol>
          </div>

          <div>
            <p className="font-semibold">3. Token de AfipSDK (variable de entorno del servidor)</p>
            <p className="text-indigo-900/80">
              Registrate gratis en{" "}
              <a href="https://afipsdk.com" target="_blank" className="underline">
                afipsdk.com
              </a>{" "}
              y sacá tu <code className="rounded bg-white px-1 py-0.5 text-xs">access_token</code>{" "}
              desde su panel. Se configura una sola vez en el servidor (
              <code className="rounded bg-white px-1 py-0.5 text-xs">AFIPSDK_ACCESS_TOKEN</code>
              ), no en esta pantalla.
            </p>
          </div>

          <div>
            <p className="font-semibold">4. Testing vs. Producción</p>
            <p className="text-indigo-900/80">
              Usá siempre <strong>Testing</strong> para probar — no genera comprobantes reales.
              Cambiá a <strong>Producción</strong> solo cuando quieras facturar de verdad (requiere
              un certificado distinto, asociado al servicio de producción).
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function CredentialsSection({
  credentials,
  onCreated,
}: {
  credentials: Credential[];
  onCreated: () => void;
}) {
  const [cuit, setCuit] = useState("");
  const [cert, setCert] = useState("");
  const [key, setKey] = useState("");
  const [environment, setEnvironment] = useState<"testing" | "production">("testing");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/afip-credentials", {
        method: "POST",
        body: JSON.stringify({ cuit, cert, key, environment }),
      });
      setCuit("");
      setCert("");
      setKey("");
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Credenciales de ARCA" subtitle="Certificado por CUIT, guardado encriptado">
      <div className="mb-4 space-y-1.5">
        {credentials.length === 0 && (
          <p className="text-sm text-gray-400">Todavía no cargaste ninguna.</p>
        )}
        {credentials.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
          >
            <span className="font-medium text-gray-800">CUIT {c.cuit}</span>
            <span
              className={
                "rounded-full px-2 py-0.5 text-xs font-medium " +
                (c.environment === "production"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-gray-200 text-gray-600")
              }
            >
              {c.environment === "production" ? "Producción" : "Testing"}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
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
            rows={3}
            className={monoInputClass}
          />
        </Field>

        <Field label="Clave privada (.key)" hint="Nunca sale de tu servidor — se guarda encriptada">
          <textarea
            placeholder="-----BEGIN PRIVATE KEY-----"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
            rows={3}
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className={primaryButtonClass + " w-full"}>
          {loading ? "Guardando..." : "Agregar credencial"}
        </button>
      </form>
    </Card>
  );
}

function InvoicesSection({
  credentials,
  invoices,
  onCreated,
}: {
  credentials: Credential[];
  invoices: Invoice[];
  onCreated: () => void;
}) {
  const [credentialId, setCredentialId] = useState("");
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
          credentialId,
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
    <Card title="Facturas" subtitle="Factura C — consumidor final o con CUIT">
      <form onSubmit={handleSubmit} className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Credencial">
            <select
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
              required
              className={inputClass}
            >
              <option value="">Elegí una credencial</option>
              {credentials.map((c) => (
                <option key={c.id} value={c.id}>
                  CUIT {c.cuit} ({c.environment})
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Punto de venta">
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
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className={inputClass}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="CUIT del cliente" hint="Opcional — se factura a consumidor final si se deja vacío">
            <input
              value={clientCuit}
              onChange={(e) => setClientCuit(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading || credentials.length === 0}
            className={primaryButtonClass}
          >
            {loading ? "Emitiendo..." : "Emitir factura"}
          </button>
          {credentials.length === 0 && (
            <span className="ml-3 text-xs text-gray-400">Cargá una credencial primero.</span>
          )}
        </div>
      </form>

      {invoices.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no emitiste ninguna factura.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="py-2 font-medium">Fecha</th>
                <th className="font-medium">Monto</th>
                <th className="font-medium">CAE</th>
                <th className="font-medium">Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2.5 text-gray-600">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="text-gray-900">
                    ${Number(inv.amount).toLocaleString("es-AR")}
                  </td>
                  <td className="font-mono text-xs text-gray-500">{inv.cae ?? "—"}</td>
                  <td>
                    <Badge status={inv.status} />
                  </td>
                  <td className="text-right">
                    {inv.status === "issued" && <PdfLink invoiceId={inv.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function PdfLink({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const { url } = await api<{ url: string }>(`/invoices/${invoiceId}/pdf`, { method: "GET" });
      window.open(url, "_blank");
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
    >
      {loading ? "generando..." : "Ver PDF"}
    </button>
  );
}
