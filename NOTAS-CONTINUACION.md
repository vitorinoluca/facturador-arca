# Notas para retomar en la notebook

Repo al día en GitHub (`main` @ `4aba687`), sin cambios pendientes de subir.

## Antes de arrancar en la notebook

1. `git clone https://github.com/vitorinoluca/facturador-arca.git`
2. Pasar `backend/.env` y la carpeta `certs-testing/` desde esta PC (no están en el
   repo, están en `.gitignore` — ver conversación sobre cómo transferirlos: pendrive
   o zip temporal, nunca por un canal que quede guardado en un tercero).
3. `docker compose up -d` (Postgres), luego `backend`: `npm install && npm run start:dev`.
4. `frontend/.env.local` no tiene secretos — recrear desde `.env.local.example` a mano.
5. `frontend`: `npm install && npm run dev`.

## Qué se hizo en la última sesión

- Certificados separados por ambiente (testing/producción) en vez de uno compartido.
- Verificación de delegación en ARCA obligatoria antes de completar el alta de
  credencial (antes se podía cargar todo sin haber delegado).
- El ambiente (testing/producción) pasó de ser parte de la credencial a ser un
  switch por factura — la credencial siempre se crea sobre producción.
- Condición de venta (Contado/Cta. Cte./Tarjetas/Cheque) elegible por factura,
  antes salía fija como "Contado" en el PDF.
- Condición de IVA del receptor (Consumidor Final/Responsable Inscripto/
  Monotributo/Exento) explícita, con el código real de WSFEv1
  (`CondicionIVAReceptorId`) en vez de un valor fijo; CUIT del cliente ahora se
  oculta y no se pide si es Consumidor Final.
- Historial: columnas nuevas "Tipo" y "Período Facturado".
- Fix de alineación en la fila de emisión (Pto. venta/Monto/Condición de
  venta/botón Emitir).

## Pendiente / lo que falta para producción real

Nada de código es bloqueante — el proyecto compila, testea y el CI está verde.
Lo que falta es 100% infraestructura, no quedó ninguna rama de trabajo a medias:

1. **Deploy real** — hoy todo corre en `localhost`. Falta:
   - Frontend → Vercel o Netlify.
   - Backend + Postgres → Render, Railway o Fly (necesita DB administrada, no el
     Postgres local de Docker).
2. **Dominio + HTTPS** — las cookies en modo seguro (`secure`/`sameSite=none`) que
   ya están codificadas para producción solo funcionan bajo HTTPS real.
3. **Variables de entorno cargadas en el hosting elegido** (no solo en `.env`
   local): `JWT_SECRET`, `AFIPSDK_ACCESS_TOKEN`, `AFIP_APP_CERT/KEY_TESTING`,
   `AFIP_APP_CERT/KEY_PRODUCTION`, `AFIP_APP_CUIT`, `DATABASE_URL`,
   `FRONTEND_URL`, y **`NODE_ENV=production`**.
4. **Backups de Postgres** una vez que haya facturas reales — son registros
   fiscales, aunque el comprobante siga válido en ARCA si se pierde la DB local.

Recomendado pero no bloqueante: monitoreo de errores (Sentry), deploy automático
al pushear a `main`, revisar el rate limit del plan free de afipsdk.com si hay
más de un usuario activo.

## Idea que quedó abierta (no empezada)

El usuario preguntó por dockerizar backend + frontend (hoy `docker-compose.yml`
solo levanta Postgres) para no depender de tener Node instalado en cada máquina.
Ofrecí armar Dockerfiles + sumarlos al compose — quedó pendiente de confirmación,
no se tocó nada todavía.

## Ojo con esto a futuro: habilitación automática de puntos de venta (monotributo)

ARCA va a habilitar de oficio los puntos de venta electrónicos a los
monotributistas a partir del **1 de noviembre de 2026**, asociándolos a la
opción "Factura en línea - Monotributo" y al domicilio fiscal del contribuyente
([fuente](https://www.iprofesional.com/impuestos/463473-monotributo-social-y-exentos-de-iva-arca-los-obliga-a-facturar-de-forma-electronica)).

Hoy la guía de "Alta de credencial ARCA" (paso 2, `Guide` en
`frontend/src/app/dashboard/page.tsx`) asume que el usuario siempre tiene que
crear un punto de venta a mano (listado vacío → "Agregar.."). Después de esa
fecha, un monotributista que entre por primera vez puede encontrarse con el
punto de venta ya creado por ARCA — revisar si conviene agregar una aclaración
tipo "si ya tenés uno creado, salteá este paso".

## Qué se hizo en esta sesión (12/09/2026)

- Alta de credencial: al confirmar la delegación, el lookup de datos (razón
  social/domicilio/inicio de actividades) se dispara solo — se sacó el botón
  "Buscar datos".
- Fix de seguridad/datos: el input de CUIT tenía el CUIT real de Luca
  hardcodeado como placeholder (`20460137749`) — se cambió a un placeholder
  genérico (`20XXXXXXXX9`). No era una variable de entorno ni dato de sesión,
  estaba tipeado literal en el JSX.
- Guía de delegación: los pasos 1 y 2 ahora son un acordeón colapsable
  (`GuideStep`), el paso 3 (formulario) queda siempre expandido. El mensaje
  "Delegación confirmada en ARCA" pasó a ser un chip verde con ícono de check
  en vez de texto plano.
- Paso 2 de la guía corregido para que coincida literal con las pantallas
  reales de ARCA: "Administración de puntos de venta y domicilios" → Menú
  Principal → "A/B/M de puntos de venta / emisión" → listado (vacío) →
  "Agregar..".
- Se probó la app públicamente con un túnel de `cloudflared` (para pasarle el
  link a otra sesión de Claude y pedir reseña de diseño) — de paso se
  destaparon y corrigieron dos bugs reales que solo aparecen cross-site:
  - CORS: faltaba `FRONTEND_URL` en el `.env`, así que solo se permitía
    `http://localhost:3000`. Ahora acepta una lista separada por coma.
  - Cookies: sin `NODE_ENV=production` las cookies de auth salían con
    `SameSite=Lax; secure=false`, que el navegador descarta en pedidos
    cross-site (front y back en dominios distintos). Con
    `NODE_ENV=production` salen `SameSite=None; Secure`, que es el
    comportamiento ya pensado en el código para el deploy real.
  - Los túneles eran temporales y ya se bajaron; `.env`/`.env.local` locales
    quedaron como estaban antes de la prueba.
