import { AsyncLocalStorage } from "async_hooks";
import type { AppSessionContext } from "@/shared/context/app-session-context";

export class SessionStorageService {
	private readonly _storage = new AsyncLocalStorage<AppSessionContext>();

	get storage(): AsyncLocalStorage<AppSessionContext> {
		return this._storage;
	}

	getStorageData(): AppSessionContext | undefined {
		return this._storage.getStore();
	}

	setStorageData(data: AppSessionContext): void {
		this._storage.enterWith(data);
	}

	updateStorageData(partialData: Partial<AppSessionContext>): void {
		const currentData = this._storage.getStore();
		if (!currentData) {
			return;
		}

		this._storage.enterWith({ ...currentData, ...partialData });
	}
}
