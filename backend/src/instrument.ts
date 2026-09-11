import * as Sentry from '@sentry/nestjs';

// Sin SENTRY_DSN configurado, esto no hace nada — la app funciona igual en local
// sin necesidad de tener una cuenta de Sentry.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.2,
  });
}
