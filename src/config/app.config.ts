import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import fastifySession from '@fastify/session';
import {
  ClassSerializerInterceptor,
  INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import compression from 'compression';
import { ZodValidationPipe } from 'nestjs-zod';
import { ResponseInterceptor } from '@/shared/http/interceptors/response.interceptor';
import { envConfig } from './env.config';
import { createSessionConfig } from './session.config';
import { enrichSwaggerResponsesFromSource } from './swagger-response-inference';

export class AppConfig {
  static async setup(app: INestApplication & NestFastifyApplication) {
    // Compression
    app.use(compression({
      filter: () => { return true; },
      threshold: 0
    }));

    // CORS
    app.enableCors({
      origin: (origin, callback) => {
        const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];

        if (!origin ||
          origin === 'null' ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
          /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
          /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
          allowedOrigins.includes(origin)) {
          callback(null, true);
        } else if (allowedOrigins.length === 0 || allowedOrigins[0] === '*') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type, Accept, Authorization',
      credentials: true,
    });

    await app.register(fastifyCookie);
    await app.register(fastifyMultipart);
    await app.register(fastifySession, await createSessionConfig());

    app.useGlobalPipes(new ZodValidationPipe());

    app.useGlobalInterceptors(
      new ResponseInterceptor(),
      new ClassSerializerInterceptor(app.get(Reflector)),
    );

    // Helmet
    const cspConfig = envConfig.isProduction ? {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          scriptSrcAttr: ["'none'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdn.jsdelivr.net',
            'https://fonts.googleapis.com',
          ],
          styleSrcElem: [
            "'self'",
            'https://cdn.jsdelivr.net',
            'https://fonts.googleapis.com',
            "'unsafe-inline'",
          ],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: [
            "'self'",
            'https://cdn.jsdelivr.net',
            'https://fonts.gstatic.com',
            'data:',
          ],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
    } : {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdn.jsdelivr.net',
            'https://fonts.googleapis.com',
          ],
          styleSrcElem: [
            "'self'",
            'https://cdn.jsdelivr.net',
            'https://fonts.googleapis.com',
            "'unsafe-inline'",
          ],
          imgSrc: ["'self'", 'data:', 'https:', 'http:'],
          connectSrc: ["'self'", 'http:', 'ws:', 'wss:'],
          fontSrc: [
            "'self'",
            'https://cdn.jsdelivr.net',
            'https://fonts.gstatic.com',
            'data:',
          ],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: null,
        },
      },
    };

    await app.register(fastifyHelmet as any, cspConfig as any);

    this.setupSwagger(app);
  }

  private static setupSwagger(app: INestApplication & NestFastifyApplication) {
    const config = new DocumentBuilder()
      .addServer(`${envConfig.apiUrl}`, 'Server')
      .setTitle(envConfig.app.name)
      .setDescription(envConfig.app.description)
      .setVersion('1.0')
      .build();

    const document = enrichSwaggerResponsesFromSource(
      SwaggerModule.createDocument(app, config),
    );

    // Scalar UI
    app.use(
      '/docs',
      apiReference({
        content: document,
        showDeveloperTools: 'never',
        theme: 'bluePlanet',
        darkMode: true,
        withFastify: true,
        layout: 'modern',
        pageTitle: `${envConfig.app.name} Docs`,
      }),
    );

    // Swagger endpoints
    SwaggerModule.setup('swagger', app, document, {
      jsonDocumentUrl: '/swagger/json',
      yamlDocumentUrl: '/swagger/yaml',
      swaggerUiEnabled: false,
    });
  }
}
