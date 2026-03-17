import { FastifySessionObject } from "@fastify/session";
import { AsyncLocalStorage } from "async_hooks";

export class SessionStorageService {
  private _storage = new AsyncLocalStorage<FastifySessionObject>();
  constructor() {}

  get storage(): AsyncLocalStorage<FastifySessionObject> {
    return this._storage;
  }

  getStorageData(): FastifySessionObject | undefined {
    return this._storage.getStore();
  }

  setStorageData(data: FastifySessionObject): void {
    this._storage.enterWith(data);
  }

  updateStorageData(partialData: Partial<FastifySessionObject>): void {
    const currentData = this._storage.getStore();
    if (currentData) {
      const updatedData = { ...currentData, ...partialData };
      this._storage.enterWith(updatedData);
    }
  }
}
