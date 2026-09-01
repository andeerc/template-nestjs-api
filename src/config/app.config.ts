import fastifyHelmet from "@fastify/helmet";
import { ClassSerializerInterceptor, INestApplication } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import compression from "compression";
import { ZodValidationPipe } from "nestjs-zod";
import { ResponseInterceptor } from "@/shared/http/interceptors/response.interceptor";
import { auth } from "../core/auth/better-auth";
import { envConfig } from "./env.config";
import { enrichSwaggerResponsesFromSource } from "./swagger-response-inference";

export class AppConfig {
	static async setup(app: INestApplication & NestFastifyApplication) {
		// Compression
		app.use(
			compression({
				filter: () => {
					return true;
				},
				threshold: 0,
			}),
		);

		// CORS
		app.enableCors({
			origin: (origin, callback) => {
				const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [];

				if (
					!origin ||
					origin === "null" ||
					origin.includes("localhost") ||
					origin.includes("127.0.0.1") ||
					/^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
					/^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
					/^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(
						origin,
					) ||
					allowedOrigins.includes(origin)
				) {
					callback(null, true);
				} else if (allowedOrigins.length === 0 || allowedOrigins[0] === "*") {
					callback(null, true);
				} else {
					callback(new Error("Not allowed by CORS"));
				}
			},
			methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
			allowedHeaders: "Content-Type, Accept, Authorization",
			credentials: true,
		});

		const fastify = app
			.getHttpAdapter()
			.getInstance() as unknown as import("fastify").FastifyInstance & {
			addHook?: unknown;
		};
		// Ensure legacy request.session shim for business controllers (organizations) that still set session
		try {
			const anyFastify = fastify as unknown as {
				addHook: (
					name: string,
					fn: (req: unknown, reply: unknown, done: () => void) => void,
				) => void;
			};
			anyFastify.addHook(
				"onRequest",
				(req: unknown, _reply: unknown, done: () => void) => {
					const r = req as Record<string, unknown>;
					if (!r.session) {
						r.session = { save: async () => {} } as unknown as Record<
							string,
							unknown
						>;
					} else if (
						typeof (r.session as Record<string, unknown>).save !== "function"
					) {
						(r.session as Record<string, unknown>).save = async () => {};
					}
					// Ensure cookie parsing still works via fallback if plugin removed
					done();
				},
			);
		} catch {
			/* ignore */
		}

		// Mount better-auth handler at /api/auth/* (must be before pipes/interceptors)

		// Register catch-all for better-auth (handles /api/auth/*)
		await fastify.register(async (instance) => {
			instance.route({
				method: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
				url: "/api/auth/*",
				handler: async (request, reply) => {
					// Build Fetch API Request from Fastify
					const host = request.headers.host || "localhost";
					const protocol =
						(request.headers["x-forwarded-proto"] as string) ||
						(envConfig.isProduction ? "https" : "http");
					const url = `${protocol}://${host}${request.url}`;
					const headers = new Headers();
					for (const [key, value] of Object.entries(request.headers)) {
						if (value === undefined) continue;
						headers.set(
							key,
							Array.isArray(value) ? value.join(", ") : String(value),
						);
					}
					// Fastify already parses body; forward as JSON if needed
					let body: string | undefined;
					const method = request.method.toUpperCase();
					if (
						method !== "GET" &&
						method !== "HEAD" &&
						request.body !== undefined
					) {
						const contentType = headers.get("content-type") || "";
						if (
							contentType.includes("application/json") &&
							typeof request.body === "object"
						) {
							body = JSON.stringify(request.body);
						} else if (typeof request.body === "string") {
							body = request.body;
						} else if (request.body) {
							try {
								body = JSON.stringify(request.body);
							} catch {
								body = undefined;
							}
						}
					} else if (
						method !== "GET" &&
						method !== "HEAD" &&
						request.rawBody !== undefined
					) {
						body = (request as unknown as { rawBody: string }).rawBody;
					}

					const req = new Request(url, {
						method,
						headers,
						body,
						// @ts-expect-error duplex
						duplex: "half",
					});

					const res = await auth.handler(req);

					reply.status(res.status);
					res.headers.forEach((value, key) => {
						// Avoid overwriting content-length which fastify manages
						if (key.toLowerCase() === "content-length") return;
						reply.header(key, value);
					});
					const text = await res.text();
					return reply.send(text);
				},
			});
		});

		app.useGlobalPipes(new ZodValidationPipe());

		app.useGlobalInterceptors(
			new ResponseInterceptor(),
			new ClassSerializerInterceptor(app.get(Reflector)),
		);

		// Helmet
		const cspConfig = envConfig.isProduction
			? {
					contentSecurityPolicy: {
						directives: {
							defaultSrc: ["'self'"],
							scriptSrc: [
								"'self'",
								"'unsafe-inline'",
								"https://cdn.jsdelivr.net",
							],
							scriptSrcAttr: ["'none'"],
							styleSrc: [
								"'self'",
								"'unsafe-inline'",
								"https://cdn.jsdelivr.net",
								"https://fonts.googleapis.com",
							],
							styleSrcElem: [
								"'self'",
								"https://cdn.jsdelivr.net",
								"https://fonts.googleapis.com",
								"'unsafe-inline'",
							],
							imgSrc: ["'self'", "data:", "https:"],
							connectSrc: ["'self'"],
							fontSrc: [
								"'self'",
								"https://cdn.jsdelivr.net",
								"https://fonts.gstatic.com",
								"data:",
							],
							objectSrc: ["'none'"],
							mediaSrc: ["'self'"],
							frameSrc: ["'none'"],
						},
					},
				}
			: {
					contentSecurityPolicy: {
						directives: {
							defaultSrc: ["'self'"],
							scriptSrc: [
								"'self'",
								"'unsafe-inline'",
								"https://cdn.jsdelivr.net",
							],
							scriptSrcAttr: ["'unsafe-inline'"],
							styleSrc: [
								"'self'",
								"'unsafe-inline'",
								"https://cdn.jsdelivr.net",
								"https://fonts.googleapis.com",
							],
							styleSrcElem: [
								"'self'",
								"https://cdn.jsdelivr.net",
								"https://fonts.googleapis.com",
								"'unsafe-inline'",
							],
							imgSrc: ["'self'", "data:", "https:", "http:"],
							connectSrc: ["'self'", "http:", "ws:", "wss:"],
							fontSrc: [
								"'self'",
								"https://cdn.jsdelivr.net",
								"https://fonts.gstatic.com",
								"data:",
							],
							objectSrc: ["'none'"],
							mediaSrc: ["'self'"],
							frameSrc: ["'none'"],
							upgradeInsecureRequests: null,
						},
					},
				};

		await app.register(fastifyHelmet as any, cspConfig as any);

		AppConfig.setupSwagger(app);
	}

	private static setupSwagger(app: INestApplication & NestFastifyApplication) {
		const config = new DocumentBuilder()
			.addServer(`${envConfig.apiUrl}`, "Server")
			.setTitle(envConfig.app.name)
			.setDescription(envConfig.app.description)
			.setVersion("1.0")
			.build();

		const document = enrichSwaggerResponsesFromSource(
			SwaggerModule.createDocument(app, config),
		);

		// Scalar UI
		app.use(
			"/docs",
			apiReference({
				content: document,
				showDeveloperTools: "never",
				theme: "bluePlanet",
				darkMode: true,
				withFastify: true,
				layout: "modern",
				pageTitle: `${envConfig.app.name} Docs`,
			}),
		);

		// Swagger endpoints
		SwaggerModule.setup("swagger", app, document, {
			jsonDocumentUrl: "/swagger/json",
			yamlDocumentUrl: "/swagger/yaml",
			swaggerUiEnabled: false,
		});
	}
}
