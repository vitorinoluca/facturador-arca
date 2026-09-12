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
