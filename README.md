# facturador-arca

[![CI](https://github.com/vitorinoluca/facturador-arca/actions/workflows/ci.yml/badge.svg)](https://github.com/vitorinoluca/facturador-arca/actions/workflows/ci.yml)

Facturación electrónica (ARCA/WSFEv1) para monotributistas. Cada usuario carga su propio
certificado ARCA y emite facturas C reales desde una UI simple, sin entrar al portal de ARCA.

## Stack

- **Backend**: NestJS, TypeScript, PostgreSQL (TypeORM), JWT, `@afipsdk/afip.js`.
- **Frontend**: Next.js (App Router), Tailwind.

## Cómo funciona

Cada usuario tiene que generar su propio certificado digital en ARCA (Administrador de
Relaciones de Clave Fiscal → WSFEv1) y cargarlo acá. El certificado y la clave privada se
guardan encriptados (AES-256-GCM) y solo se usan server-side para llamar a la API de ARCA en
nombre de ese usuario — nunca se exponen por HTTP.

## Setup

```bash
docker compose up -d          # Postgres

cd backend
cp .env.example .env          # completar JWT_SECRET, CREDENTIALS_ENCRYPTION_KEY, AFIPSDK_ACCESS_TOKEN
npm install
npm run start:dev             # http://localhost:3001, Swagger en /api

cd ../frontend
cp .env.local.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

`AFIPSDK_ACCESS_TOKEN` se obtiene gratis registrándose en https://afipsdk.com — la librería
`@afipsdk/afip.js` pasa por su proxy en vez de hablar directo con los webservices de ARCA.

## Alcance actual (MVP)

- Registro/login con JWT.
- Carga de certificado ARCA por usuario (multi-tenant, cada uno factura con su propio CUIT).
- Emisión de Factura C (consumidor final o con CUIT) vía WSFEv1.
- Historial de facturas emitidas.

Fuera de alcance por ahora: notas de crédito, Factura A/B, facturación recurrente.
