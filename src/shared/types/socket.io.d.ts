import 'socket.io';
import type { AppSessionContext } from '../context/app-session-context';

declare module 'socket.io' {
  interface SocketData {
    session?: AppSessionContext;
  }
}
