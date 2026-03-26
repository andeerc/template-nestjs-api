import '@fastify/session';
import type { AppSessionContext } from '../context/app-session-context';

declare module '@fastify/session' {
  interface FastifySessionObject extends AppSessionContext { }
}
