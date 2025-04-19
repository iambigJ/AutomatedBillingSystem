export const AuthPrefix: string = 'teleBot';

export enum CachePrefixes {
  auth = 'auth',
}

export function createCachePreficAuth(teleId: string) {
  return CachePrefixes.auth.concat('.', teleId);
}

export interface UserCache {
  teleId: string;
  role: string;
  productLimit: string;
  categoryLimit: string;
}
