import Link from "next/link";
import { SealMark } from "@/components/seal-mark";

export default function LegalPage() {
  return (
    <div className="min-h-full bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-6 py-4">
          <SealMark className="h-6 w-6 text-accent" />
          <Link href="/" className="font-serif text-base font-semibold text-ink">
            Facturador ARCA
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-6 py-12 text-sm text-ink">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Legal</h1>
          <p className="mt-1 text-ink-muted">Última actualización: septiembre de 2026.</p>
        </div>

        <section className="space-y-2">
          <h2 className="font-medium text-ink">Qué es esto</h2>
          <p className="text-ink-muted">
            Facturador ARCA es un proyecto de portfolio, sin relación comercial ni institucional
            con ARCA/AFIP. Lo construí para practicar una integración real contra sus webservices
            (WSFEv1) — no es un servicio comercial con soporte garantizado ni SLA.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium text-ink">Qué datos guarda</h2>
          <p className="text-ink-muted">
            Tu email (para el login), tu CUIT, y el certificado + clave privada que vos generás y
            autorizás en ARCA para el servicio de Facturación Electrónica. El certificado y la
            clave se guardan encriptados (AES-256-GCM) y solo se desencriptan server-side en el
            momento de llamar a la API de ARCA — nunca se devuelven por ningún endpoint.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium text-ink">Qué NO pide esta app</h2>
          <p className="text-ink-muted">
            Nunca te va a pedir tu Clave Fiscal. El certificado que cargás acá es un archivo que
            vos mismo generás y autorizás — revocable en cualquier momento desde el Administrador
            de Relaciones de Clave Fiscal de ARCA, sin depender de esta app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium text-ink">Responsabilidad</h2>
          <p className="text-ink-muted">
            Las facturas que emitas quedan a tu nombre y bajo tu responsabilidad fiscal, igual que
            si las hubieras emitido desde el portal de ARCA. Revisá siempre los datos antes de
            emitir — un comprobante con CAE ya está registrado ante ARCA.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium text-ink">Código abierto</h2>
          <p className="text-ink-muted">
            El código completo está disponible en{" "}
            <a
              href="https://github.com/vitorinoluca/facturador-arca"
              target="_blank"
              className="text-accent underline"
            >
              github.com/vitorinoluca/facturador-arca
            </a>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
