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
          <h2 className="font-medium text-ink">Cómo se factura en tu nombre</h2>
          <p className="text-ink-muted">
            La app opera con <strong>un único certificado de ARCA, propio</strong>. Vos no cargás
            ningún certificado: delegás la Facturación Electrónica en ese CUIT desde el
            Administrador de Relaciones de Clave Fiscal de ARCA — dos clicks, revocables en
            cualquier momento desde ahí mismo, sin depender de esta app. Cada factura sale emitida
            a tu nombre y con tu CUIT, aunque el certificado que la autoriza técnicamente ante
            ARCA sea el de la app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium text-ink">Qué datos guarda</h2>
          <p className="text-ink-muted">
            Tu email (para el login), tu CUIT, y los datos que van impresos en la factura (razón
            social, domicilio, Ingresos Brutos, inicio de actividades). Ningún certificado ni clave
            privada tuya — esos no existen de tu lado en este modelo.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium text-ink">Qué NO pide esta app</h2>
          <p className="text-ink-muted">
            Nunca te va a pedir tu Clave Fiscal, ni un certificado, ni una clave privada. Lo único
            que hacés en ARCA es autorizar (delegar) — un trámite público y revocable, no
            compartís ningún secreto.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium text-ink">Responsabilidad</h2>
          <p className="text-ink-muted">
            Las facturas que emitas quedan a tu nombre y bajo tu responsabilidad fiscal, igual que
            si las hubieras emitido desde el portal de ARCA. Revisá siempre los datos antes de
            emitir — un comprobante con CAE ya está registrado ante ARCA. Al ser un modelo de
            certificado único, un problema en la app (un bug, una filtración del certificado)
            puede afectar a todos los usuarios delegados a la vez — es la misma arquitectura que
            usan otros facturadores electrónicos de terceros, y conviene tenerlo presente.
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
