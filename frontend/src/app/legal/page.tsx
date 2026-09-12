import Link from "next/link";
import { SealMark } from "@/components/seal-mark";
import { Footer } from "@/components/footer";

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-paper">
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
            Facturador ARCA se ofrece &quot;tal cual&quot; (as-is), a título gratuito y como
            proyecto de portfolio — sin garantía de disponibilidad, exactitud ni continuidad del
            servicio. Usarlo es voluntario, y las facturas que emitas quedan a tu nombre y bajo tu
            exclusiva responsabilidad fiscal, igual que si las hubieras emitido desde el portal de
            ARCA. Revisá siempre los datos de cada comprobante antes de emitir — un CAE ya está
            registrado ante ARCA y no se puede deshacer.
          </p>
          <p className="text-ink-muted">
            No garantizo indemnidad frente a errores del servicio, caídas de ARCA, o fallas del
            certificado compartido, y no respondo por daños indirectos, lucro cesante, ni
            sanciones fiscales derivadas del uso de la app. Al ser un modelo de certificado único,
            un problema acá (un bug, una filtración del certificado) puede afectar a todos los
            usuarios delegados a la vez — es la misma arquitectura que usan otros facturadores
            electrónicos de terceros, y conviene tenerlo presente.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium text-ink">Tus derechos sobre tus datos (Ley 25.326)</h2>
          <p className="text-ink-muted">
            Como titular de tus datos personales, tenés derecho a acceder, rectificar y pedir la
            eliminación de los que tengamos guardados: tu email, tu CUIT, y los datos de
            facturación (razón social, domicilio, Ingresos Brutos, inicio de actividades).
            Escribime a{" "}
            <a href="mailto:valentinvitorino28@gmail.com" className="text-accent underline">
              valentinvitorino28@gmail.com
            </a>{" "}
            para ejercer cualquiera de estos derechos — la Agencia de Acceso a la Información
            Pública (AAIP) es la autoridad de control de la Ley 25.326, por si preferís reclamar
            ahí directamente.
          </p>
          <p className="text-ink-muted">
            Revocar la delegación en ARCA no borra tus datos de esta app automáticamente — son dos
            trámites distintos. Si me pedís la baja de tu cuenta, elimino tus datos personales y de
            facturación de la base en un plazo máximo de 30 días desde el pedido. Las facturas que
            ya emitiste siguen existiendo de todos modos: son registros fiscales de ARCA, no un
            archivo que dependa de esta app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-medium text-ink">Ley aplicable</h2>
          <p className="text-ink-muted">
            Este proyecto se rige por las leyes de la República Argentina. Cualquier controversia
            se resolverá ante los tribunales ordinarios competentes.
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

        <section className="space-y-2">
          <h2 className="font-medium text-ink">Contacto</h2>
          <p className="text-ink-muted">
            Para consultas legales, de privacidad, o para reportar un problema de seguridad,
            escribime a{" "}
            <a href="mailto:valentinvitorino28@gmail.com" className="text-accent underline">
              valentinvitorino28@gmail.com
            </a>
            .
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
