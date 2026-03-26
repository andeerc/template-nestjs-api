export interface AppSessionContext {
  userId?: string;
  email?: string;
  authenticated?: boolean;
}

export interface AppCurrentUser {
  id: string;
  email?: string;
}
