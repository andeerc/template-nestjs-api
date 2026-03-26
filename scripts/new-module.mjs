#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HELP_TEXT = `Usage:
  npm run new:module -- <module-name> [options]

Arguments:
  <module-name>          Module folder/route name, preferably plural and kebab-case

Options:
  --entity <name>        Singular entity name override
  --no-register          Do not update src/app.module.ts
  --force                Overwrite existing generated files
  --dry-run              Preview the module without writing files
  --help, -h             Show this help message

Examples:
  npm run new:module -- orders
  npm run new:module -- product-categories --entity product-category
  npm run new:module -- reports --dry-run
`;

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function splitWords(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.toLowerCase());
}

function toKebabCase(value) {
  return splitWords(value).join('-');
}

function toCamelCase(value) {
  return splitWords(value)
    .map((word, index) => (index === 0 ? word : capitalize(word)))
    .join('');
}

function toPascalCase(value) {
  return splitWords(value)
    .map(capitalize)
    .join('');
}

function toTitleCase(value) {
  return splitWords(value)
    .map(capitalize)
    .join(' ');
}

function toSentenceCase(value) {
  return splitWords(value).join(' ');
}

function toConstantCase(value) {
  return splitWords(value).join('_').toUpperCase();
}

function singularizeWord(word) {
  if (word.endsWith('ies') && word.length > 3) {
    return `${word.slice(0, -3)}y`;
  }

  if (/(sses|shes|ches|xes|zes)$/.test(word)) {
    return word.slice(0, -2);
  }

  if (word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }

  return word;
}

function singularizeKebab(value) {
  const words = value.split('-');

  if (words.length === 0) {
    return value;
  }

  words[words.length - 1] = singularizeWord(words[words.length - 1]);
  return words.join('-');
}

function parseCommaEntries(block) {
  return block
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function appendImport(content, statement, groupRegex) {
  if (content.includes(statement)) {
    return {
      changed: false,
      content,
    };
  }

  const groupedMatches = [...content.matchAll(groupRegex)];
  const allImports = [...content.matchAll(/^import .+;$/gm)];
  const targetMatches = groupedMatches.length > 0 ? groupedMatches : allImports;

  if (targetMatches.length === 0) {
    return {
      changed: true,
      content: `${statement}\n${content}`,
    };
  }

  const lastMatch = targetMatches[targetMatches.length - 1];
  const insertionIndex = lastMatch.index + lastMatch[0].length;

  return {
    changed: true,
    content: `${content.slice(0, insertionIndex)}\n${statement}${content.slice(insertionIndex)}`,
  };
}

function addArrayItem(content, propertyName, item) {
  const regex = new RegExp(`${propertyName}:\\s*\\[([\\s\\S]*?)\\],`);
  const match = content.match(regex);

  if (!match) {
    throw new Error(`Could not find "${propertyName}" array.`);
  }

  const entries = parseCommaEntries(match[1]);

  if (entries.includes(item)) {
    return {
      changed: false,
      content,
    };
  }

  entries.push(item);

  return {
    changed: true,
    content: content.replace(
      regex,
      `${propertyName}: [\n    ${entries.join(',\n    ')},\n  ],`,
    ),
  };
}

function writeFile(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf8');
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    entityOverride: null,
    force: false,
    help: false,
    register: true,
  };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--entity') {
      const nextArg = argv[index + 1];

      if (!nextArg) {
        fail('Missing value for --entity.');
      }

      options.entityOverride = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--no-register') {
      options.register = false;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg.startsWith('--')) {
      fail(`Unknown option: ${arg}`);
    }

    positionals.push(arg);
  }

  if (!options.entityOverride && positionals[1]) {
    options.entityOverride = positionals[1];
  }

  if (positionals.length > 2) {
    fail('Too many positional arguments.');
  }

  return {
    moduleInput: positionals[0],
    ...options,
  };
}

function createContext(moduleInput, entityOverride) {
  if (!moduleInput) {
    console.log(HELP_TEXT);
    process.exit(1);
  }

  if (/[\\/]/.test(moduleInput)) {
    fail('Module name must be a single feature name without path separators.');
  }

  if (entityOverride && /[\\/]/.test(entityOverride)) {
    fail('Entity name must be a single name without path separators.');
  }

  const moduleName = toKebabCase(moduleInput);
  const entityName = entityOverride
    ? toKebabCase(entityOverride)
    : singularizeKebab(moduleName);

  if (!moduleName || !entityName) {
    fail('Module or entity name could not be normalized.');
  }

  const moduleClass = toPascalCase(moduleName);
  const entityClass = toPascalCase(entityName);

  return {
    createUseCaseClass: `Create${entityClass}UseCase`,
    deleteUseCaseClass: `Delete${entityClass}UseCase`,
    entityClass,
    entityDisplayName: toTitleCase(entityName),
    entityFileName: `${entityName}.entity.ts`,
    entityName,
    entitySentenceName: toSentenceCase(entityName),
    findUseCaseClass: `Find${entityClass}UseCase`,
    idParamDtoClass: `${entityClass}IdParamDto`,
    idParamFileName: `${entityName}-id-param.dto.ts`,
    listDtoClass: `FindAll${moduleClass}Dto`,
    listDtoFileName: `find-all-${moduleName}.dto.ts`,
    listUseCaseClass: `List${moduleClass}UseCase`,
    moduleClass,
    moduleDisplayName: toTitleCase(moduleName),
    moduleFileName: `${moduleName}.module.ts`,
    moduleImportPath: `@/modules/${moduleName}/${moduleName}.module`,
    moduleName,
    moduleSentenceName: toSentenceCase(moduleName),
    persistenceModuleClass: `${moduleClass}PersistenceModule`,
    persistenceModuleFileName: `${moduleName}-persistence.module.ts`,
    repositoryClass: `${entityClass}Repository`,
    repositoryFileName: `${entityName}.repository.ts`,
    repositoryInterfaceName: `I${entityClass}Repository`,
    repositoryInterfaceFileName: `${entityName}.repository.interface.ts`,
    repositoryToken: `${toConstantCase(entityName)}_REPOSITORY`,
    responseDtoClass: `${entityClass}ResponseDto`,
    responseFileName: `${entityName}-response.dto.ts`,
    updateDtoClass: `Update${entityClass}Dto`,
    updateDtoFileName: `update-${entityName}.dto.ts`,
    updateUseCaseClass: `Update${entityClass}UseCase`,
    createDtoClass: `Create${entityClass}Dto`,
    createDtoFileName: `create-${entityName}.dto.ts`,
  };
}

function createEntityTemplate(ctx) {
  return `export class ${ctx.entityClass} {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<${ctx.entityClass}> = {}) {
    Object.assign(this, partial);
  }
}
`;
}

function createRepositoryInterfaceTemplate(ctx) {
  return `import { ${ctx.entityClass} } from '../entities/${ctx.entityName}.entity';

export interface Create${ctx.entityClass}Data {
  name: string;
}

export interface Update${ctx.entityClass}Data {
  name?: string;
}

export interface FindAll${ctx.moduleClass}Filters {
  id?: string;
  name?: string;
  pageCount: number;
  recordsPerPage: number;
}

export interface FindAll${ctx.moduleClass}Result {
  data: ${ctx.entityClass}[];
  total: number;
}

export interface ${ctx.repositoryInterfaceName} {
  findById(id: string): Promise<${ctx.entityClass} | null>;
  findAll(filters: FindAll${ctx.moduleClass}Filters): Promise<FindAll${ctx.moduleClass}Result>;
  create(data: Create${ctx.entityClass}Data): Promise<${ctx.entityClass}>;
  update(id: string, data: Update${ctx.entityClass}Data): Promise<${ctx.entityClass} | null>;
  delete(id: string): Promise<boolean>;
}

export const ${ctx.repositoryToken} = Symbol('${ctx.repositoryInterfaceName}');
`;
}

function createRepositoryTemplate(ctx) {
  return `import { Inject, Injectable } from '@nestjs/common';
import { ${ctx.entityClass} } from '@/modules/${ctx.moduleName}/domain/entities/${ctx.entityName}.entity';
import {
  Create${ctx.entityClass}Data,
  FindAll${ctx.moduleClass}Filters,
  FindAll${ctx.moduleClass}Result,
  ${ctx.repositoryInterfaceName},
  Update${ctx.entityClass}Data,
  ${ctx.repositoryToken},
} from '@/modules/${ctx.moduleName}/domain/repositories/${ctx.entityName}.repository.interface';
import { KNEX_CONNECTION } from '@/shared/infrastructure/database/database.constants';
import { Knex } from 'knex';

const TABLE_NAME = '${ctx.moduleName}';

type ${ctx.entityClass}Row = {
  id: string;
  name: string;
  created_at: Date | string;
  updated_at: Date | string;
};

function normalizeDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function map${ctx.entityClass}(row: ${ctx.entityClass}Row): ${ctx.entityClass} {
  return new ${ctx.entityClass}({
    id: row.id,
    name: row.name,
    createdAt: normalizeDate(row.created_at),
    updatedAt: normalizeDate(row.updated_at),
  });
}

@Injectable()
export class ${ctx.repositoryClass} implements ${ctx.repositoryInterfaceName} {
  constructor(
    @Inject(KNEX_CONNECTION)
    private readonly knex: Knex,
  ) {}

  async findById(id: string): Promise<${ctx.entityClass} | null> {
    const row = await this.knex<${ctx.entityClass}Row>(TABLE_NAME)
      .where({ id })
      .first();

    return row ? map${ctx.entityClass}(row) : null;
  }

  async findAll(filters: FindAll${ctx.moduleClass}Filters): Promise<FindAll${ctx.moduleClass}Result> {
    const query = this.knex<${ctx.entityClass}Row>(TABLE_NAME);

    if (filters.id) {
      query.where('id', filters.id);
    }

    if (filters.name) {
      query.where('name', filters.name);
    }

    const countResult = await query
      .clone()
      .count<{ total: string | number }>({ total: '*' })
      .first();

    const rows = await query
      .clone()
      .select('*')
      .orderBy('created_at', 'desc')
      .offset((filters.pageCount - 1) * filters.recordsPerPage)
      .limit(filters.recordsPerPage);

    return {
      data: rows.map(map${ctx.entityClass}),
      total: Number(countResult?.total ?? 0),
    };
  }

  async create(data: Create${ctx.entityClass}Data): Promise<${ctx.entityClass}> {
    const [row] = await this.knex<${ctx.entityClass}Row>(TABLE_NAME)
      .insert({
        name: data.name,
      })
      .returning('*');

    return map${ctx.entityClass}(row);
  }

  async update(id: string, data: Update${ctx.entityClass}Data): Promise<${ctx.entityClass} | null> {
    const updatePayload: Record<string, unknown> = {};

    if (data.name !== undefined) {
      updatePayload.name = data.name;
    }

    if (Object.keys(updatePayload).length === 0) {
      return this.findById(id);
    }

    const [row] = await this.knex<${ctx.entityClass}Row>(TABLE_NAME)
      .where({ id })
      .update({
        ...updatePayload,
        updated_at: this.knex.fn.now(),
      })
      .returning('*');

    return row ? map${ctx.entityClass}(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const deletedRows = await this.knex(TABLE_NAME)
      .where({ id })
      .del();

    return deletedRows > 0;
  }
}
`;
}

function createPersistenceModuleTemplate(ctx) {
  return `import { Module } from '@nestjs/common';
import { ${ctx.repositoryToken} } from '@/modules/${ctx.moduleName}/domain/repositories/${ctx.entityName}.repository.interface';
import { ${ctx.repositoryClass} } from './repositories/${ctx.entityName}.repository';

@Module({
  providers: [
    {
      provide: ${ctx.repositoryToken},
      useClass: ${ctx.repositoryClass},
    },
  ],
  exports: [${ctx.repositoryToken}],
})
export class ${ctx.persistenceModuleClass} {}
`;
}

function createCreateUseCaseTemplate(ctx) {
  return `import { Inject, Injectable } from '@nestjs/common';
import type {
  Create${ctx.entityClass}Data,
  ${ctx.repositoryInterfaceName},
} from '@/modules/${ctx.moduleName}/domain/repositories/${ctx.entityName}.repository.interface';
import { ${ctx.repositoryToken} } from '@/modules/${ctx.moduleName}/domain/repositories/${ctx.entityName}.repository.interface';

export interface Create${ctx.entityClass}Input extends Create${ctx.entityClass}Data {}

@Injectable()
export class ${ctx.createUseCaseClass} {
  constructor(
    @Inject(${ctx.repositoryToken})
    private readonly repository: ${ctx.repositoryInterfaceName},
  ) {}

  async execute(input: Create${ctx.entityClass}Input) {
    const ${ctx.entityName} = await this.repository.create(input);

    return {
      data: ${ctx.entityName},
      message: '${ctx.entityDisplayName} created successfully',
    };
  }
}
`;
}

function createFindUseCaseTemplate(ctx) {
  return `import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ${ctx.repositoryInterfaceName} } from '@/modules/${ctx.moduleName}/domain/repositories/${ctx.entityName}.repository.interface';
import { ${ctx.repositoryToken} } from '@/modules/${ctx.moduleName}/domain/repositories/${ctx.entityName}.repository.interface';

@Injectable()
export class ${ctx.findUseCaseClass} {
  constructor(
    @Inject(${ctx.repositoryToken})
    private readonly repository: ${ctx.repositoryInterfaceName},
  ) {}

  async execute(id: string) {
    const ${ctx.entityName} = await this.repository.findById(id);

    if (!${ctx.entityName}) {
      throw new NotFoundException('${ctx.entityDisplayName} not found');
    }

    return {
      data: ${ctx.entityName},
      message: '${ctx.entityDisplayName} retrieved successfully',
    };
  }
}
`;
}

function createListUseCaseTemplate(ctx) {
  return `import { Inject, Injectable } from '@nestjs/common';
import type {
  FindAll${ctx.moduleClass}Filters,
  ${ctx.repositoryInterfaceName},
} from '@/modules/${ctx.moduleName}/domain/repositories/${ctx.entityName}.repository.interface';
import { ${ctx.repositoryToken} } from '@/modules/${ctx.moduleName}/domain/repositories/${ctx.entityName}.repository.interface';

export interface List${ctx.moduleClass}Input extends FindAll${ctx.moduleClass}Filters {}

@Injectable()
export class ${ctx.listUseCaseClass} {
  constructor(
    @Inject(${ctx.repositoryToken})
    private readonly repository: ${ctx.repositoryInterfaceName},
  ) {}

  async execute(input: List${ctx.moduleClass}Input) {
    const result = await this.repository.findAll(input);

    return {
      data: result.data,
      pageCount: input.pageCount,
      recordsPerPage: input.recordsPerPage,
      total: result.total,
      message: '${ctx.moduleDisplayName} retrieved successfully',
    };
  }
}
`;
}

function createUpdateUseCaseTemplate(ctx) {
  return `import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ${ctx.repositoryInterfaceName},
  Update${ctx.entityClass}Data,
} from '@/modules/${ctx.moduleName}/domain/repositories/${ctx.entityName}.repository.interface';
import { ${ctx.repositoryToken} } from '@/modules/${ctx.moduleName}/domain/repositories/${ctx.entityName}.repository.interface';

export interface Update${ctx.entityClass}Input extends Update${ctx.entityClass}Data {}

@Injectable()
export class ${ctx.updateUseCaseClass} {
  constructor(
    @Inject(${ctx.repositoryToken})
    private readonly repository: ${ctx.repositoryInterfaceName},
  ) {}

  async execute(id: string, input: Update${ctx.entityClass}Input) {
    const ${ctx.entityName} = await this.repository.update(id, input);

    if (!${ctx.entityName}) {
      throw new NotFoundException('${ctx.entityDisplayName} not found');
    }

    return {
      data: ${ctx.entityName},
      message: '${ctx.entityDisplayName} updated successfully',
    };
  }
}
`;
}

function createDeleteUseCaseTemplate(ctx) {
  return `import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ${ctx.repositoryInterfaceName} } from '@/modules/${ctx.moduleName}/domain/repositories/${ctx.entityName}.repository.interface';
import { ${ctx.repositoryToken} } from '@/modules/${ctx.moduleName}/domain/repositories/${ctx.entityName}.repository.interface';

@Injectable()
export class ${ctx.deleteUseCaseClass} {
  constructor(
    @Inject(${ctx.repositoryToken})
    private readonly repository: ${ctx.repositoryInterfaceName},
  ) {}

  async execute(id: string) {
    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new NotFoundException('${ctx.entityDisplayName} not found');
    }

    return {
      message: '${ctx.entityDisplayName} deleted successfully',
    };
  }
}
`;
}

function createCreateDtoTemplate(ctx) {
  return `import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ${ctx.entityClass}NameSchema = z
  .string({
    message: 'Name is required',
  })
  .trim()
  .min(1, 'Name cannot be empty')
  .max(255, 'Name is too long');

export const Create${ctx.entityClass}Schema = z.object({
  name: ${ctx.entityClass}NameSchema,
});

export class ${ctx.createDtoClass} extends createZodDto(Create${ctx.entityClass}Schema) {}
`;
}

function createUpdateDtoTemplate(ctx) {
  return `import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ${ctx.entityClass}NameSchema } from './create-${ctx.entityName}.dto';

export const Update${ctx.entityClass}Schema = z
  .object({
    name: ${ctx.entityClass}NameSchema.optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    {
      message: 'At least one field must be provided',
    },
  );

export class ${ctx.updateDtoClass} extends createZodDto(Update${ctx.entityClass}Schema) {}
`;
}

function createFindAllDtoTemplate(ctx) {
  return `import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

function emptyStringToUndefined(value) {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return value;
}

export const FindAll${ctx.moduleClass}Schema = z.object({
  id: z.preprocess(
    emptyStringToUndefined,
    z.string().uuid().optional(),
  ),
  name: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(1).max(255).optional(),
  ),
  pageCount: z.coerce.number().int().min(1).default(1),
  recordsPerPage: z.coerce.number().int().min(1).max(100).default(25),
});

export class ${ctx.listDtoClass} extends createZodDto(FindAll${ctx.moduleClass}Schema) {}
`;
}

function createIdParamDtoTemplate(ctx) {
  return `import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ${ctx.idParamDtoClass}Schema = z.object({
  id: z.string().uuid(),
});

export class ${ctx.idParamDtoClass} extends createZodDto(${ctx.idParamDtoClass}Schema) {}
`;
}

function createResponseDtoTemplate(ctx) {
  return `import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ${ctx.entityClass}ResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export class ${ctx.responseDtoClass} extends createZodDto(${ctx.entityClass}ResponseSchema) {}
`;
}

function createDtoIndexTemplate(ctx) {
  return `export * from './${ctx.createDtoFileName.replace('.ts', '')}';
export * from './${ctx.listDtoFileName.replace('.ts', '')}';
export * from './${ctx.idParamFileName.replace('.ts', '')}';
export * from './${ctx.responseFileName.replace('.ts', '')}';
export * from './${ctx.updateDtoFileName.replace('.ts', '')}';
`;
}

function createControllerTemplate(ctx) {
  return `import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { ${ctx.createUseCaseClass} } from '@/modules/${ctx.moduleName}/application/use-cases/create-${ctx.entityName}.use-case';
import { ${ctx.deleteUseCaseClass} } from '@/modules/${ctx.moduleName}/application/use-cases/delete-${ctx.entityName}.use-case';
import { ${ctx.findUseCaseClass} } from '@/modules/${ctx.moduleName}/application/use-cases/find-${ctx.entityName}.use-case';
import { ${ctx.listUseCaseClass} } from '@/modules/${ctx.moduleName}/application/use-cases/list-${ctx.moduleName}.use-case';
import { ${ctx.updateUseCaseClass} } from '@/modules/${ctx.moduleName}/application/use-cases/update-${ctx.entityName}.use-case';
import { ApiDoc } from '@/shared/http/decorators';
import { ResponseHelper } from '@/shared/http/helpers/response-helper';
import {
  ${ctx.createDtoClass},
  ${ctx.listDtoClass},
  ${ctx.idParamDtoClass},
  ${ctx.responseDtoClass},
  ${ctx.updateDtoClass},
} from '../dtos';

@ApiTags('${ctx.moduleDisplayName}')
@Controller('${ctx.moduleName}')
export class ${ctx.moduleClass}Controller {
  constructor(
    private readonly createUseCase: ${ctx.createUseCaseClass},
    private readonly findUseCase: ${ctx.findUseCaseClass},
    private readonly listUseCase: ${ctx.listUseCaseClass},
    private readonly updateUseCase: ${ctx.updateUseCaseClass},
    private readonly deleteUseCase: ${ctx.deleteUseCaseClass},
  ) {}

  @Post()
  @ApiBody({ type: ${ctx.createDtoClass} })
  @ApiDoc({
    summary: 'Create ${ctx.entitySentenceName}',
    response: ${ctx.responseDtoClass},
    commonResponses: ['badRequest', 'unauthorized'],
  })
  async create(@Body() dto: ${ctx.createDtoClass}) {
    const result = await this.createUseCase.execute(dto);
    return ResponseHelper.success(result.data, result.message);
  }

  @Get(':id')
  @ApiDoc({
    summary: 'Get ${ctx.entitySentenceName} by ID',
    response: ${ctx.responseDtoClass},
    commonResponses: ['badRequest', 'unauthorized'],
    params: [
      {
        name: 'id',
        description: '${ctx.entityDisplayName} ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
      },
    ],
  })
  async findOne(@Param() params: ${ctx.idParamDtoClass}) {
    const result = await this.findUseCase.execute(params.id);
    return ResponseHelper.success(result.data, result.message);
  }

  @Get()
  @ApiDoc({
    summary: 'List ${ctx.moduleSentenceName}',
    response: ${ctx.responseDtoClass},
    isPaginated: true,
    commonResponses: ['badRequest', 'unauthorized'],
    query: [
      { name: 'id', description: 'Filter by ${ctx.entitySentenceName} ID' },
      { name: 'name', description: 'Filter by ${ctx.entitySentenceName} name' },
      { name: 'pageCount', description: 'Page number', example: 1 },
      { name: 'recordsPerPage', description: 'Page size', example: 25 },
    ],
  })
  async findAll(@Query() dto: ${ctx.listDtoClass}) {
    const result = await this.listUseCase.execute(dto);
    return ResponseHelper.paginated(
      result.data,
      result.pageCount,
      result.recordsPerPage,
      result.total,
      result.message,
    );
  }

  @Patch(':id')
  @ApiBody({ type: ${ctx.updateDtoClass} })
  @ApiDoc({
    summary: 'Update ${ctx.entitySentenceName}',
    response: ${ctx.responseDtoClass},
    commonResponses: ['badRequest', 'unauthorized'],
    params: [
      {
        name: 'id',
        description: '${ctx.entityDisplayName} ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
      },
    ],
  })
  async update(
    @Param() params: ${ctx.idParamDtoClass},
    @Body() dto: ${ctx.updateDtoClass},
  ) {
    const result = await this.updateUseCase.execute(params.id, dto);
    return ResponseHelper.success(result.data, result.message);
  }

  @Delete(':id')
  @ApiDoc({
    summary: 'Delete ${ctx.entitySentenceName}',
    commonResponses: ['badRequest', 'unauthorized'],
    params: [
      {
        name: 'id',
        description: '${ctx.entityDisplayName} ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
      },
    ],
  })
  async delete(@Param() params: ${ctx.idParamDtoClass}) {
    const result = await this.deleteUseCase.execute(params.id);
    return ResponseHelper.success(null, result.message);
  }
}
`;
}

function createModuleTemplate(ctx) {
  return `import { Module } from '@nestjs/common';
import { ${ctx.createUseCaseClass} } from './application/use-cases/create-${ctx.entityName}.use-case';
import { ${ctx.deleteUseCaseClass} } from './application/use-cases/delete-${ctx.entityName}.use-case';
import { ${ctx.findUseCaseClass} } from './application/use-cases/find-${ctx.entityName}.use-case';
import { ${ctx.listUseCaseClass} } from './application/use-cases/list-${ctx.moduleName}.use-case';
import { ${ctx.updateUseCaseClass} } from './application/use-cases/update-${ctx.entityName}.use-case';
import { ${ctx.persistenceModuleClass} } from './infrastructure/persistence/${ctx.persistenceModuleFileName.replace('.ts', '')}';
import { ${ctx.moduleClass}Controller } from './presentation/http/controllers/${ctx.moduleName}.controller';

@Module({
  imports: [${ctx.persistenceModuleClass}],
  controllers: [${ctx.moduleClass}Controller],
  providers: [
    ${ctx.createUseCaseClass},
    ${ctx.findUseCaseClass},
    ${ctx.listUseCaseClass},
    ${ctx.updateUseCaseClass},
    ${ctx.deleteUseCaseClass},
  ],
})
export class ${ctx.moduleClass}Module {}
`;
}

function buildFilePlan(ctx) {
  const moduleDir = path.join(projectRoot, 'src', 'modules', ctx.moduleName);

  return [
    {
      path: path.join(moduleDir, ctx.moduleFileName),
      content: createModuleTemplate(ctx),
    },
    {
      path: path.join(
        moduleDir,
        'application',
        'use-cases',
        `create-${ctx.entityName}.use-case.ts`,
      ),
      content: createCreateUseCaseTemplate(ctx),
    },
    {
      path: path.join(
        moduleDir,
        'application',
        'use-cases',
        `find-${ctx.entityName}.use-case.ts`,
      ),
      content: createFindUseCaseTemplate(ctx),
    },
    {
      path: path.join(
        moduleDir,
        'application',
        'use-cases',
        `list-${ctx.moduleName}.use-case.ts`,
      ),
      content: createListUseCaseTemplate(ctx),
    },
    {
      path: path.join(
        moduleDir,
        'application',
        'use-cases',
        `update-${ctx.entityName}.use-case.ts`,
      ),
      content: createUpdateUseCaseTemplate(ctx),
    },
    {
      path: path.join(
        moduleDir,
        'application',
        'use-cases',
        `delete-${ctx.entityName}.use-case.ts`,
      ),
      content: createDeleteUseCaseTemplate(ctx),
    },
    {
      path: path.join(moduleDir, 'domain', 'entities', ctx.entityFileName),
      content: createEntityTemplate(ctx),
    },
    {
      path: path.join(
        moduleDir,
        'domain',
        'repositories',
        ctx.repositoryInterfaceFileName,
      ),
      content: createRepositoryInterfaceTemplate(ctx),
    },
    {
      path: path.join(
        moduleDir,
        'infrastructure',
        'persistence',
        ctx.persistenceModuleFileName,
      ),
      content: createPersistenceModuleTemplate(ctx),
    },
    {
      path: path.join(
        moduleDir,
        'infrastructure',
        'persistence',
        'repositories',
        ctx.repositoryFileName,
      ),
      content: createRepositoryTemplate(ctx),
    },
    {
      path: path.join(
        moduleDir,
        'presentation',
        'http',
        'controllers',
        `${ctx.moduleName}.controller.ts`,
      ),
      content: createControllerTemplate(ctx),
    },
    {
      path: path.join(
        moduleDir,
        'presentation',
        'http',
        'dtos',
        ctx.createDtoFileName,
      ),
      content: createCreateDtoTemplate(ctx),
    },
    {
      path: path.join(
        moduleDir,
        'presentation',
        'http',
        'dtos',
        ctx.updateDtoFileName,
      ),
      content: createUpdateDtoTemplate(ctx),
    },
    {
      path: path.join(
        moduleDir,
        'presentation',
        'http',
        'dtos',
        ctx.listDtoFileName,
      ),
      content: createFindAllDtoTemplate(ctx),
    },
    {
      path: path.join(
        moduleDir,
        'presentation',
        'http',
        'dtos',
        ctx.idParamFileName,
      ),
      content: createIdParamDtoTemplate(ctx),
    },
    {
      path: path.join(
        moduleDir,
        'presentation',
        'http',
        'dtos',
        ctx.responseFileName,
      ),
      content: createResponseDtoTemplate(ctx),
    },
    {
      path: path.join(
        moduleDir,
        'presentation',
        'http',
        'dtos',
        'index.ts',
      ),
      content: createDtoIndexTemplate(ctx),
    },
  ];
}

function planRegistrations(ctx, shouldRegister) {
  if (!shouldRegister) {
    return [];
  }

  const appModulePath = path.join(projectRoot, 'src', 'app.module.ts');

  if (!fs.existsSync(appModulePath)) {
    return [];
  }

  const currentContent = fs.readFileSync(appModulePath, 'utf8');
  const importStatement = `import { ${ctx.moduleClass}Module } from '${ctx.moduleImportPath}';`;
  const withImport = appendImport(
    currentContent,
    importStatement,
    /^import .+ from '@\/modules\/.+';$/gm,
  );
  const withRegistration = addArrayItem(
    withImport.content,
    'imports',
    `${ctx.moduleClass}Module`,
  );

  return [
    {
      changed: withImport.changed || withRegistration.changed,
      content: withRegistration.content,
      path: appModulePath,
    },
  ];
}

function formatRelativePath(targetPath) {
  return path.relative(projectRoot, targetPath).replaceAll('\\', '/');
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(HELP_TEXT);
    return;
  }

  const ctx = createContext(options.moduleInput, options.entityOverride);
  const files = buildFilePlan(ctx);
  const registrationUpdates = planRegistrations(ctx, options.register);
  const existingFiles = files.filter((file) => fs.existsSync(file.path));

  if (existingFiles.length > 0 && !options.force) {
    console.error('The following files already exist:');
    existingFiles.forEach((file) => {
      console.error(`- ${formatRelativePath(file.path)}`);
    });
    fail('Use --force to overwrite the generated files.');
  }

  if (options.dryRun) {
    console.log(`Module preview for "${ctx.moduleName}":`);
    files.forEach((file) => {
      const action = fs.existsSync(file.path) ? 'overwrite' : 'create';
      console.log(`- Would ${action} ${formatRelativePath(file.path)}`);
    });
    registrationUpdates.forEach((update) => {
      if (update.changed) {
        console.log(`- Would update ${formatRelativePath(update.path)}`);
      }
    });
    console.log('');
    console.log('Notes:');
    console.log('- Generated module follows the Zod + Knex pattern used by the project');
    console.log('- Generated entity starts with a default "name" field');
    console.log('- Create a migration after adjusting the entity fields');
    return;
  }

  files.forEach((file) => {
    writeFile(file.path, file.content);
  });

  registrationUpdates.forEach((update) => {
    if (update.changed) {
      writeFile(update.path, update.content);
    }
  });

  console.log(`New module created at src/modules/${ctx.moduleName}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unexpected error';
  fail(message);
}
