import serverlessExpress from '@vendia/serverless-express';
// Importa el JS ya compilado por `nest build` (dist/), no el TypeScript fuente:
// el bundler de funciones de Vercel no procesa bien los decoradores de Nest
// (emitDecoratorMetadata) si los compila él mismo — este archivo queda liviano
// y sin decoradores, así no tiene ese problema.

/* eslint-disable @typescript-eslint/no-require-imports */
const { createApp } =
  require('../dist/create-app') as typeof import('../src/create-app');
/* eslint-enable @typescript-eslint/no-require-imports */

// serverless-express no trae tipos propios (es JS puro) y no vale la pena instalar
// @types/aws-lambda solo para tipar esta firma de shim de integración.
type ServerlessHandler = (
  event: unknown,
  context: unknown,
  callback: () => void,
) => unknown;

// Handler serverless de Vercel — se cachea entre invocaciones "warm" del mismo
// contenedor (server queda undefined solo en un cold start) para no reiniciar Nest
// en cada request. Vercel usa el mismo formato de evento que AWS Lambda, de ahí
// serverless-express en vez de un simple app.listen().
let server: ServerlessHandler | undefined;

async function bootstrapServer(): Promise<ServerlessHandler> {
  const app = await createApp();
  await app.init();
  // serverless-express no trae tipos — su valor de retorno es `any` para TS.
  /* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment */
  return serverlessExpress({ app: app.getHttpAdapter().getInstance() });
  /* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment */
}

export default async function handler(
  event: unknown,
  context: unknown,
): Promise<unknown> {
  server = server ?? (await bootstrapServer());
  return server(event, context, () => {});
}
