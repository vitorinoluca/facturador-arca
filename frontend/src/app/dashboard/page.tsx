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
    <main className="mx-auto max-w-3xl flex-1 space-y-10 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Facturador ARCA</h1>
        <button onClick={handleLogout} className="text-sm underline">
          Cerrar sesión
        </button>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <CredentialsSection credentials={credentials} onCreated={loadAll} />
      <InvoicesSection credentials={credentials} invoices={invoices} onCreated={loadAll} />
    </main>
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
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Credenciales de ARCA</h2>
      <ul className="space-y-1 text-sm">
        {credentials.map((c) => (
          <li key={c.id}>
            CUIT {c.cuit} — {c.environment}
          </li>
        ))}
        {credentials.length === 0 && <li className="text-gray-500">Todavía no cargaste ninguna.</li>}
      </ul>
      <form onSubmit={handleSubmit} className="space-y-2 rounded border p-4">
        <input
          placeholder="CUIT (11 dígitos, sin guiones)"
          value={cuit}
          onChange={(e) => setCuit(e.target.value)}
          required
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Certificado (.crt, contenido PEM)"
          value={cert}
          onChange={(e) => setCert(e.target.value)}
          required
          rows={3}
          className="w-full rounded border px-3 py-2 font-mono text-xs"
        />
        <textarea
          placeholder="Clave privada (.key, contenido PEM)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          required
          rows={3}
          className="w-full rounded border px-3 py-2 font-mono text-xs"
        />
        <select
          value={environment}
          onChange={(e) => setEnvironment(e.target.value as "testing" | "production")}
          className="w-full rounded border px-3 py-2 text-sm"
        >
          <option value="testing">Testing (homologación)</option>
          <option value="production">Producción</option>
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Agregar credencial"}
        </button>
      </form>
    </section>
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
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Facturas</h2>
      <form onSubmit={handleSubmit} className="space-y-2 rounded border p-4">
        <select
          value={credentialId}
          onChange={(e) => setCredentialId(e.target.value)}
          required
          className="w-full rounded border px-3 py-2 text-sm"
        >
          <option value="">Elegí una credencial</option>
          {credentials.map((c) => (
            <option key={c.id} value={c.id}>
              CUIT {c.cuit} ({c.environment})
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Punto de venta"
          value={salesPoint}
          onChange={(e) => setSalesPoint(e.target.value)}
          required
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <input
          type="number"
          step="0.01"
          placeholder="Monto"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <input
          placeholder="CUIT del cliente (opcional, consumidor final si se deja vacío)"
          value={clientCuit}
          onChange={(e) => setClientCuit(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || credentials.length === 0}
          className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? "Emitiendo..." : "Emitir factura"}
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-1">Fecha</th>
            <th>Monto</th>
            <th>CAE</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-b">
              <td className="py-1">{new Date(inv.createdAt).toLocaleDateString()}</td>
              <td>${inv.amount}</td>
              <td>{inv.cae ?? "—"}</td>
              <td className={inv.status === "issued" ? "text-green-600" : "text-red-600"}>
                {inv.status === "issued" ? "emitida" : "falló"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
