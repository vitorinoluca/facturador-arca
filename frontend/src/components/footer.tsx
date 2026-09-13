import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-ink-muted sm:flex-row">
        <span>
          Facturador ARCA — desarrollado por{" "}
          <a
            href="https://fluxify.site"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink hover:underline"
          >
            Fluxify
          </a>
          .
        </span>
        <div className="flex gap-4">
          <Link href="/" className="hover:text-ink">
            Inicio
          </Link>
          <Link href="/legal" className="hover:text-ink">
            Legal
          </Link>
          <a
            href="https://github.com/vitorinoluca/facturador-arca"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-ink"
          >
            GitHub
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://github.com/vitorinoluca/facturador-arca/actions/workflows/ci.yml/badge.svg"
              alt="Estado del CI"
              className="h-4"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
