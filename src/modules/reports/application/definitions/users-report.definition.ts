import { Inject, Injectable } from '@nestjs/common';
import { toPublicUser, type PublicUser } from '@/modules/users/domain/entities/user.entity';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '@/modules/users/domain/repositories/user.repository.interface';
import { BaseReportDefinition } from './base-report.definition';
import type { ExportUsersReportFilters } from '../use-cases/export-users-report.use-case';
import type { ReportColumn, ReportSummaryItem } from '../types/report.types';
import { buildReportFileName, formatReportDate } from '../utils/report-value.util';

@Injectable()
export class UsersReportDefinition extends BaseReportDefinition<ExportUsersReportFilters, PublicUser> {
  protected readonly key = 'relatorio-usuarios';
  protected readonly title = 'Relatório de usuários';

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {
    super();
  }

  protected buildDescription(
    filters: ExportUsersReportFilters,
    _rows: PublicUser[],
  ): string {
    const filterSummary = this.describeFilters(filters);

    return `Exportação de usuários cadastrados. ${filterSummary}.`;
  }

  protected override buildFileName(generatedAt: Date): string {
    return buildReportFileName('usuarios', generatedAt);
  }

  protected override buildSummary(
    filters: ExportUsersReportFilters,
    rows: PublicUser[],
    generatedAt: Date,
  ): ReportSummaryItem[] {
    return [
      {
        label: 'Gerado em',
        value: formatReportDate(generatedAt),
      },
      {
        label: 'Total de registros',
        value: String(rows.length),
      },
      {
        label: 'Filtros aplicados',
        value: this.describeFilters(filters),
      },
    ];
  }

  protected getColumns(): ReportColumn<PublicUser>[] {
    return [
      {
        key: 'name',
        header: 'Nome',
        width: 18,
      },
      {
        key: 'email',
        header: 'E-mail',
        width: 26,
      },
      {
        key: 'createdAt',
        header: 'Criado em',
        width: 20,
      },
      {
        key: 'updatedAt',
        header: 'Atualizado em',
        width: 20,
      },
    ];
  }

  protected async getRows(filters: ExportUsersReportFilters): Promise<PublicUser[]> {
    const result = await this.userRepository.findAll({
      id: filters.id,
      email: filters.email,
      name: filters.name,
      paginate: false,
    });

    return result.data.map(toPublicUser);
  }

  private describeFilters(filters: ExportUsersReportFilters): string {
    const appliedFilters: string[] = [];

    if (filters.id) {
      appliedFilters.push(`ID: ${filters.id}`);
    }

    if (filters.email) {
      appliedFilters.push(`E-mail: ${filters.email}`);
    }

    if (filters.name) {
      appliedFilters.push(`Nome: ${filters.name}`);
    }

    return appliedFilters.length > 0
      ? appliedFilters.join(' | ')
      : 'Sem filtros';
  }
}
