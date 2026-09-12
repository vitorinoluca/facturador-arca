import { createApp } from './create-app';

// Servidor tradicional (listen persistente) — para local, Docker, o cualquier host
// que no sea serverless (Render/Railway/Fly). El handler serverless de Vercel vive
// aparte, en api/index.ts, y no pasa por este archivo.
async function bootstrap() {
  const app = await createApp();
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
