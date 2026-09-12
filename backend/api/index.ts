import type { Express } from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
// Importa el JS ya compilado por `nest build` (dist/), no el TypeScript fuente:
// el bundler de funciones de Vercel no procesa bien los decoradores de Nest
// (emitDecoratorMetadata) si los compila él mismo — este archivo queda liviano
// y sin decoradores, así no tiene ese problema.

/* eslint-disable @typescript-eslint/no-require-imports */
const { createApp } =
  require('../dist/create-app') as typeof import('../src/create-app');
/* eslint-enable @typescript-eslint/no-require-imports */

// El runtime Node de Vercel invoca la función como un handler HTTP normal
// (req, res) — no como un evento de AWS Lambda — así que Nest (que por dentro
// ya es una app Express) se puede exponer tal cual, sin ningún adaptador.
// Se cachea entre invocaciones "warm" del mismo contenedor (queda undefined
// solo en un cold start) para no reiniciar Nest en cada request.
let appPromise: Promise<Express> | undefined;

async function bootstrapApp(): Promise<Express> {
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance() as Express;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  appPromise ??= bootstrapApp();
  const expressApp = await appPromise;
  expressApp(req, res);
}
