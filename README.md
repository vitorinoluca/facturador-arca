# facturador-arca

[![CI](https://github.com/vitorinoluca/facturador-arca/actions/workflows/ci.yml/badge.svg)](https://github.com/vitorinoluca/facturador-arca/actions/workflows/ci.yml)

Facturación electrónica (ARCA/WSFEv1) para monotributistas. Los usuarios delegan la
facturación electrónica en el CUIT de la app desde ARCA (dos clicks, sin certificados de su
parte) y emiten facturas C reales desde una UI simple.

## Stack

- **Backend**: NestJS, TypeScript, PostgreSQL (TypeORM), JWT (access + refresh con rotación,
  en cookies httpOnly), `@afipsdk/afip.js`.
- **Frontend**: Next.js (App Router), Tailwind.

## Cómo funciona

La app tiene **un único certificado de ARCA**, propio (configurado por env vars). Cada usuario
delega la Facturación Electrónica en el CUIT de ese certificado desde el Administrador de
Relaciones de Clave Fiscal de ARCA — sin generar ni compartir ningún certificado propio. Ver la
guía paso a paso dentro de la app (pantalla de alta de credencial).

## Setup

```bash
docker compose up -d          # Postgres

cd backend
cp .env.example .env          # completar JWT_SECRET, AFIPSDK_ACCESS_TOKEN, AFIP_APP_CERT/KEY_*
npm install
npm run start:dev             # http://localhost:3001, Swagger en /api

cd ../frontend
cp .env.local.example .env.local  # completar NEXT_PUBLIC_AFIP_APP_CUIT
npm install
npm run dev                   # http://localhost:3000
```

`AFIPSDK_ACCESS_TOKEN` se obtiene gratis registrándose en https://afipsdk.com — la librería
`@afipsdk/afip.js` pasa por su proxy en vez de hablar directo con los webservices de ARCA.

`AFIP_APP_CERT_TESTING`/`AFIP_APP_KEY_TESTING` y `AFIP_APP_CERT_PRODUCTION`/`AFIP_APP_KEY_PRODUCTION`
son los certificados propios de la app (generados en ARCA, uno por ambiente — ARCA no confía el
mismo certificado en testing y producción), con los saltos de línea como `\n` literal en una sola
línea de env var. `AFIP_APP_CUIT` es el CUIT dueño de ambos certificados.

Para que el botón "Buscar datos" (autocompleta razón social y domicilio desde la Constancia de
Inscripción — ARCA no expone la fecha de inicio de actividades en esa respuesta, sigue siendo
manual) funcione, ese mismo certificado necesita estar autorizado además al
servicio **`ws_sr_constancia_inscripcion`** en ARCA (autorización separada de `wsfe`, mismo trámite
del Administrador de Relaciones / WSASS).

## Tests

```bash
cd backend && npm test
```

## Alcance actual (MVP)

- Registro/login con refresh token rotativo, en cookies httpOnly.
- Delegación de Facturación Electrónica en el CUIT de la app (sin certificados por usuario).
- Emisión de Factura C (consumidor final o con CUIT) vía WSFEv1, con idempotencia.
- Historial de facturas emitidas, PDF descargable.

Fuera de alcance por ahora: notas de crédito, Factura A/B, facturación recurrente.
