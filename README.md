# facturador-arca

[![CI](https://github.com/vitorinoluca/facturador-arca/actions/workflows/ci.yml/badge.svg)](https://github.com/vitorinoluca/facturador-arca/actions/workflows/ci.yml)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

Facturación electrónica (ARCA/WSFEv1) para monotributistas. Los usuarios delegan la
facturación electrónica en el CUIT de la app desde ARCA (dos clicks, sin certificados de su
parte) y emiten facturas C reales desde una UI simple.

## Demo

🔗 [facturador-arca.fluxify.site](https://facturador-arca.fluxify.site)

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

## Instalación

```bash
git clone https://github.com/vitorinoluca/facturador-arca.git
cd facturador-arca
```

**Backend** (`backend/`):

```bash
cd backend
cp .env.example .env   # completar DATABASE_URL, JWT_SECRET, AFIPSDK_ACCESS_TOKEN, etc.
npm install
npm run start:dev
```

**Frontend** (`frontend/`):

```bash
cd frontend
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_AFIP_APP_CUIT
npm install
npm run dev
```

También hay `docker-compose.yml` para levantar PostgreSQL local.

## Arquitectura

Backend NestJS con PostgreSQL/TypeORM y frontend Next.js separados (`backend/`, `frontend/`),
cada uno con su propio `package.json`. En producción corren como dos proyectos independientes.

## Deploy

Backend y frontend corren como dos proyectos separados en Vercel (monorepo, un
`rootDirectory` por proyecto) con Postgres de Vercel (Neon). El backend expone la app de
Nest como función serverless en `backend/api/index.ts`; las migraciones corren como parte
del build (`vercel.json`).
El frontend proxea `/api/*` al backend (rewrite en `next.config.ts`, variable
`BACKEND_URL`), así que todo se sirve desde un único dominio.

<!-- TODO: agregar captura -->
