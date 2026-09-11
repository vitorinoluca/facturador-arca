import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-ink-muted sm:flex-row">
        <span>
          Facturador ARCA — desarrollado por Fluxify.
        </span>
        <div className="flex gap-4">
          <Link href="/" className="hover:text-ink">
            Inicio
          </Link>
          <Link href="/legal" className="hover:text-ink">
            Legal
          </Link>
          <a href="https://github.com/vitorinoluca/facturador-arca" target="_blank" className="hover:text-ink">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
