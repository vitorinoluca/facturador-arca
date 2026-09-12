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

## Alcance actual (MVP)

- Registro/login (con confirmación de contraseña) y login con Google, refresh token
  rotativo en cookies httpOnly, recuperación de contraseña por email.
- Verificación de email obligatoria: sin confirmar, no se puede delegar ni facturar
  (ni de prueba ni real).
- Delegación de Facturación Electrónica en el CUIT de la app (sin certificados por usuario).
- Emisión de Factura C (consumidor final o con CUIT) vía WSFEv1, con idempotencia.
- Historial de facturas emitidas, PDF descargable.

Fuera de alcance por ahora: notas de crédito, Factura A/B, facturación recurrente.

## Deploy

Backend y frontend corren como dos proyectos separados en Vercel (monorepo, un
`rootDirectory` por proyecto) con Postgres de Vercel (Neon). El backend expone la app de
Nest como función serverless en `backend/api/index.ts`; las migraciones corren como parte
del build (`vercel.json`).
