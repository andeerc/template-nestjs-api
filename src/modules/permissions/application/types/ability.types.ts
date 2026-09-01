import type { MongoAbility } from "@casl/ability";
import type {
	PermissionActionCode,
	PermissionFeatureCode,
} from "../constants/permissions.constants";

export type AppAbility = MongoAbility<
	[PermissionActionCode, PermissionFeatureCode | "all"]
>;
