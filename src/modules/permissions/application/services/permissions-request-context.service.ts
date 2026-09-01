import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";
import type { ResolvedPermissionsContext } from "../types/resolved-permissions-context.type";

interface PermissionsRequestContextStore {
	resolvedPermissions?: ResolvedPermissionsContext;
}

@Injectable()
export class PermissionsRequestContextService {
	private readonly storage =
		new AsyncLocalStorage<PermissionsRequestContextStore>();

	run<T>(callback: () => T): T {
		return this.storage.run({}, callback);
	}

	getResolvedPermissions(): ResolvedPermissionsContext | undefined {
		return this.storage.getStore()?.resolvedPermissions;
	}

	setResolvedPermissions(
		resolvedPermissions: ResolvedPermissionsContext,
	): void {
		const store = this.storage.getStore();

		if (!store) {
			return;
		}

		store.resolvedPermissions = resolvedPermissions;
	}

	clearResolvedPermissions(): void {
		const store = this.storage.getStore();

		if (!store) {
			return;
		}

		store.resolvedPermissions = undefined;
	}
}
