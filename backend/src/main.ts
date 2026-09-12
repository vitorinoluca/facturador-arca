import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

// Mitigación de CSRF: la sesión vive en una cookie (necesaria para poder emitir sin
// exponer un token a JS), y en producción sale SameSite=None porque front y back
// viven en dominios distintos — eso reabre CSRF vía un <form> HTML plano (sin JS ni
// headers custom, sin preflight de CORS). La API real solo habla JSON: un <form> no
// puede poner Content-Type: application/json de forma nativa, así que exigirlo acá
// cierra ese vector sin necesitar un token CSRF aparte.
function requireJsonContentType(req: Request, res: Response, next: NextFunction) {
  const mutatesState = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const hasBody = Number(req.headers['content-length'] ?? 0) > 0;
  if (mutatesState && hasBody && !req.is('application/json')) {
    res.status(415).json({ statusCode: 415, message: 'Content-Type debe ser application/json' });
    return;
  }
  next();
}

// Headers básicos de seguridad — sin sumar helmet como dependencia para 3 headers.
function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.use(securityHeaders);
  app.use(requireJsonContentType);

  // FRONTEND_URL puede tener varios orígenes separados por coma (ej. producción +
  // preview de Vercel). Sin la variable, solo se permite el dev server local.
  // credentials:true es necesario para que el navegador mande las cookies de auth.
  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim());
  app.enableCors({ origin: allowedOrigins, credentials: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('facturador-arca API')
    .setDescription('Facturación electrónica (ARCA/WSFEv1) para monotributistas')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
