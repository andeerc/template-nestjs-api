import {
  AbilityBuilder,
  createMongoAbility,
} from '@casl/ability';
import {
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  parsePermissionCode,
  type PermissionCode,
} from '@/modules/permissions/application/constants/permissions.constants';
import { type IPermissionsRepository, PERMISSIONS_REPOSITORY } from '@/modules/permissions/domain/repositories/permissions.repository.interface';
import { SessionStorageService } from '@/shared/session-storage/session-storage.service';
import type { AppAbility } from '../types/ability.types';
import type { ResolvedPermissionsContext } from '../types/resolved-permissions-context.type';
import { PermissionsRequestContextService } from './permissions-request-context.service';

@Injectable()
export class PermissionsAbilityFactory {
  constructor(
    @Inject(PERMISSIONS_REPOSITORY)
    private readonly permissionsRepository: IPermissionsRepository,
    private readonly sessionStorageService: SessionStorageService,
    private readonly permissionsRequestContextService: PermissionsRequestContextService,
  ) { }

  async buildCurrent(): Promise<ResolvedPermissionsContext> {
    const session = this.sessionStorageService.getStorageData();

    if (!session?.userId) {
      throw new ConflictException('Current user context is not available');
    }

    if (!session.currentOrganizationId) {
      throw new ConflictException('Current organization is not selected');
    }

    return this.buildForUserInOrganization(
      session.userId,
      session.currentOrganizationId,
    );
  }

  async buildForUserInOrganization(
    userId: string,
    organizationId: string,
  ): Promise<ResolvedPermissionsContext> {
    const cachedPermissions =
      this.permissionsRequestContextService.getResolvedPermissions();

    if (
      cachedPermissions &&
      cachedPermissions.userId === userId &&
      cachedPermissions.organizationId === organizationId
    ) {
      return cachedPermissions;
    }

    const snapshot = await this.permissionsRepository.getPermissionSnapshotForUser(
      userId,
      organizationId,
    );

    if (!snapshot) {
      throw new ConflictException('Current organization is not accessible');
    }

    const resolvedPermissions: ResolvedPermissionsContext = {
      ...snapshot,
      ability: this.createAbility(snapshot.effectivePermissionCodes),
    };

    this.permissionsRequestContextService.setResolvedPermissions(
      resolvedPermissions,
    );

    return resolvedPermissions;
  }

  private createAbility(
    permissionCodes: readonly PermissionCode[],
  ): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    permissionCodes.forEach((permissionCode) => {
      const parsedPermission = parsePermissionCode(permissionCode);

      if (!parsedPermission) {
        return;
      }

      can(parsedPermission.action, parsedPermission.feature);
    });

    return build();
  }
}
