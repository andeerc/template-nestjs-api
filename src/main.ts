import { Logger, LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';
import { Http2ServerRequest } from 'http2';
import { AppModule } from './app.module';
import { AppConfig } from './config/app.config';
import { envConfig } from './config/env.config';
import { SessionIoAdapter } from './shared/infrastructure/websocket/ws-adapter';

async function bootstrap() {
  const logLevels: LogLevel[] = envConfig.isProduction
    ? ['error', 'warn']
    : ['log', 'error', 'warn', 'debug', 'verbose'];

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: envConfig.isDevelopment,
      trustProxy: true,
      genReqId(req: IncomingMessage | Http2ServerRequest): string {
        const traceParentHeader = req.headers.traceparent;
        const traceParent = Array.isArray(traceParentHeader)
          ? traceParentHeader[0]?.split('-')[1]
          : traceParentHeader?.split('-')[1];
        const requestIdHeader = req.headers['x-request-id'];
        const requestId = Array.isArray(requestIdHeader)
          ? requestIdHeader[0]
          : requestIdHeader;

        return requestId ?? traceParent ?? randomUUID();
      },
    }),
    { logger: logLevels },
  );

  await AppConfig.setup(app);

  const wsAdapter = new SessionIoAdapter(app);
  await wsAdapter.connectToRedis();
  app.useWebSocketAdapter(wsAdapter);
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onClose', async () => {
      await wsAdapter.dispose();
    });

  await app.listen({ host: '0.0.0.0', port: envConfig.port }, async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    Logger.log(`${envConfig.app.name} is running!`);
    Logger.log(`API Documentation: ${envConfig.apiUrl}/docs`);
    Logger.log(
      `Swagger JSON: ${envConfig.apiUrl}/swagger/json`,
    );
    Logger.log(
      `Swagger YAML: ${envConfig.apiUrl}/swagger/yaml\n`,
    );
  });
}

void bootstrap();
