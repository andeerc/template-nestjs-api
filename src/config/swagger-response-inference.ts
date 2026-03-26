import type { OpenAPIObject } from '@nestjs/swagger';
import path from 'node:path';
import ts from 'typescript';

type InferenceContext = {
  checker: ts.TypeChecker;
  document: OpenAPIObject;
  schemas: Record<string, any>;
  buildingSchemas: Set<string>;
};

type ResponseHelperKind = 'success' | 'paginated' | 'error';

type PropertyDocMetadata = {
  excludeFromResponse: boolean;
  required?: boolean;
  schema: Record<string, unknown>;
};

const API_RESPONSE_BASE_SCHEMA_NAME = 'ApiResponseDtoInferred';
const PAGINATION_META_SCHEMA_NAME = 'PaginationMetaDtoInferred';
const SUCCESS_RESPONSE_DESCRIPTION = 'Operação realizada com sucesso';

const HTTP_METHOD_DECORATORS = new Map<string, string>([
  ['Get', 'get'],
  ['Post', 'post'],
  ['Patch', 'patch'],
  ['Put', 'put'],
  ['Delete', 'delete'],
]);

export function enrichSwaggerResponsesFromSource(
  document: OpenAPIObject,
): OpenAPIObject {
  if (!document.paths) {
    return document;
  }

  const program = createProgramFromTsConfig();
  if (!program) {
    return document;
  }

  const checker = program.getTypeChecker();
  document.components ??= {};
  document.components.schemas ??= {};
  ensureBaseResponseSchemas(document.components.schemas);

  const context: InferenceContext = {
    checker,
    document,
    schemas: document.components.schemas,
    buildingSchemas: new Set<string>(),
  };

  for (const sourceFile of program.getSourceFiles()) {
    if (
      sourceFile.isDeclarationFile ||
      !sourceFile.fileName.endsWith('.controller.ts')
    ) {
      continue;
    }

    visitControllerClasses(sourceFile, context);
  }

  return document;
}

function createProgramFromTsConfig(): ts.Program | null {
  const tsConfigPath = ts.findConfigFile(
    process.cwd(),
    ts.sys.fileExists,
    'tsconfig.json',
  );
  if (!tsConfigPath) {
    return null;
  }

  const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
  if (configFile.error) {
    return null;
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(tsConfigPath),
  );
  if (parsedConfig.errors.length > 0) {
    return null;
  }

  return ts.createProgram({
    rootNames: parsedConfig.fileNames,
    options: parsedConfig.options,
  });
}

function visitControllerClasses(
  sourceFile: ts.SourceFile,
  context: InferenceContext,
) {
  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isClassDeclaration(node) || !node.name) {
      return;
    }

    const controllerDecorator = getDecoratorCall(node, 'Controller');
    if (!controllerDecorator) {
      return;
    }

    const controllerPath = getFirstStringArgument(controllerDecorator);

    for (const member of node.members) {
      if (!ts.isMethodDeclaration(member) || !member.name) {
        continue;
      }

      const apiDocDecorator = getDecoratorCall(member, 'ApiDoc');
      if (!apiDocDecorator) {
        continue;
      }

      if (hasObjectLiteralProperty(apiDocDecorator, 'response')) {
        continue;
      }

      const httpDecorator = getHttpDecorator(member);
      if (!httpDecorator) {
        continue;
      }

      const httpMethod = HTTP_METHOD_DECORATORS.get(
        httpDecorator.decoratorName,
      );
      if (!httpMethod) {
        continue;
      }

      const methodPath = getFirstStringArgument(httpDecorator.decorator);
      const summary = getStringPropertyFromDecorator(apiDocDecorator, 'summary');
      const isPaginated = getBooleanPropertyFromDecorator(
        apiDocDecorator,
        'isPaginated',
      );

      const operation = findOperation(
        context.document.paths ?? {},
        httpMethod,
        controllerPath,
        methodPath,
        summary,
      );
      if (!operation) {
        continue;
      }

      const signature = context.checker.getSignatureFromDeclaration(member);
      if (!signature) {
        continue;
      }

      const returnType = context.checker.getReturnTypeOfSignature(signature);
      const resolvedType = unwrapPromiseType(returnType, context.checker);
      if (!resolvedType) {
        continue;
      }

      const helperKind = detectResponseHelperKind(member);
      const declaredApiResponseDataType = getDeclaredApiResponseDataType(
        member,
        context.checker,
      );
      const responseSchema = buildResponseSchema(
        resolvedType,
        context,
        helperKind,
        isPaginated,
        declaredApiResponseDataType,
      );

      operation.responses ??= {};
      operation.responses['200'] = {
        description: SUCCESS_RESPONSE_DESCRIPTION,
        content: {
          'application/json': {
            schema: responseSchema,
          },
        },
      };
    }
  });
}

function buildResponseSchema(
  type: ts.Type,
  context: InferenceContext,
  helperKind: ResponseHelperKind | null,
  isPaginated: boolean,
  declaredApiResponseDataType?: ts.Type | null,
): any {
  const shouldIncludeMeta = helperKind === 'paginated' || isPaginated;

  if (isApiResponseDtoType(type)) {
    return buildApiResponseSchema(
      type,
      context,
      shouldIncludeMeta,
      declaredApiResponseDataType,
    );
  }

  const dataSchema = applyNullability(buildSchemaForType(type, context), type);
  const normalizedDataSchema = shouldIncludeMeta
    ? ensureArraySchema(dataSchema)
    : dataSchema;

  return buildEnvelopeSchema(normalizedDataSchema, shouldIncludeMeta, context);
}

function buildEnvelopeSchema(
  dataSchema: any,
  isPaginated: boolean,
  context: InferenceContext,
): any {
  const baseSchema = cloneSchema(
    context.schemas[API_RESPONSE_BASE_SCHEMA_NAME] ?? {},
  );

  baseSchema.type = 'object';
  baseSchema.properties ??= {};
  baseSchema.required ??= [];
  baseSchema.properties.data = dataSchema;

  if (isPaginated) {
    baseSchema.properties.meta = {
      $ref: `#/components/schemas/${PAGINATION_META_SCHEMA_NAME}`,
    };
    if (!baseSchema.required.includes('meta')) {
      baseSchema.required.push('meta');
    }
  } else {
    delete baseSchema.properties.meta;
    baseSchema.required = baseSchema.required.filter(
      (propertyName: string) => propertyName !== 'meta',
    );
  }

  return baseSchema;
}

function buildApiResponseSchema(
  type: ts.Type,
  context: InferenceContext,
  includeMeta: boolean,
  declaredDataType?: ts.Type | null,
): any {
  const dataType = declaredDataType ?? getApiResponseDataType(type, context.checker);
  const dataSchema = dataType
    ? applyNullability(buildSchemaForType(dataType, context), dataType)
    : { type: 'object', nullable: true };
  const normalizedDataSchema = includeMeta
    ? ensureArraySchema(dataSchema)
    : dataSchema;

  return buildEnvelopeSchema(normalizedDataSchema, includeMeta, context);
}

function buildSchemaForType(type: ts.Type, context: InferenceContext): any {
  const normalizedType = removeNullableTypes(type);

  if (isNullType(normalizedType)) {
    return {
      nullable: true,
      example: null,
    };
  }

  if (isStringType(normalizedType)) {
    return { type: 'string' };
  }

  if (isNumberType(normalizedType)) {
    return { type: 'number' };
  }

  if (isBooleanType(normalizedType)) {
    return { type: 'boolean' };
  }

  if (isDateType(normalizedType)) {
    return { type: 'string', format: 'date-time' };
  }

  const enumSchema = buildEnumSchema(normalizedType);
  if (enumSchema) {
    return enumSchema;
  }

  if (normalizedType.isUnion()) {
    return {
      oneOf: normalizedType.types
        .filter((member) => !isNullableType(member))
        .map((member) => buildSchemaForType(member, context)),
    };
  }

  if (normalizedType.isIntersection()) {
    return {
      allOf: normalizedType.types.map((member) =>
        buildSchemaForType(member, context),
      ),
    };
  }

  const arrayElementType = getArrayElementType(normalizedType, context.checker);
  if (arrayElementType) {
    return {
      type: 'array',
      items: buildSchemaForType(arrayElementType, context),
    };
  }

  if (normalizedType.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
    return { type: 'object', nullable: true };
  }

  const symbol = normalizedType.aliasSymbol ?? normalizedType.getSymbol();
  const properties = context.checker.getPropertiesOfType(normalizedType);
  if (properties.length === 0) {
    return { type: 'object', nullable: true };
  }

  if (!symbol || isAnonymousSymbol(symbol)) {
    return buildObjectSchema(normalizedType, context);
  }

  const schemaName = getSchemaName(symbol, normalizedType);
  if (!context.schemas[schemaName] && !context.buildingSchemas.has(schemaName)) {
    context.buildingSchemas.add(schemaName);
    context.schemas[schemaName] = buildObjectSchema(normalizedType, context);
    context.buildingSchemas.delete(schemaName);
  }

  return { $ref: `#/components/schemas/${schemaName}` };
}

function buildObjectSchema(type: ts.Type, context: InferenceContext): any {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const property of context.checker.getPropertiesOfType(type)) {
    const declaration =
      property.valueDeclaration ??
      property.declarations?.find(
        (candidate) =>
          ts.isPropertyDeclaration(candidate) ||
          ts.isPropertySignature(candidate) ||
          ts.isParameter(candidate),
      );

    if (!declaration) {
      continue;
    }

    const propertyType = context.checker.getTypeOfSymbolAtLocation(
      property,
      declaration,
    );
    if (propertyType.getCallSignatures().length > 0) {
      continue;
    }

    const propertyDocMetadata = getPropertyDocMetadata(declaration);
    if (propertyDocMetadata.excludeFromResponse) {
      continue;
    }

    const propertySchema = mergeSchemaMetadata(
      applyNullability(buildSchemaForType(propertyType, context), propertyType),
      propertyDocMetadata.schema,
    );

    properties[property.getName()] = propertySchema;

    if (
      propertyDocMetadata.required !== false &&
      !isOptionalProperty(property, declaration, propertyType)
    ) {
      required.push(property.getName());
    }
  }

  const schema: any = {
    type: 'object',
    properties,
  };

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}

function getSchemaName(symbol: ts.Symbol, type: ts.Type): string {
  const directName = symbol.getName();
  const baseName =
    directName && !isAnonymousSymbolName(directName)
      ? directName
      : (type.aliasSymbol ?? type.getSymbol())?.getName() || 'AnonymousType';

  return `${baseName}Inferred`;
}

function buildEnumSchema(type: ts.Type): any | null {
  if (!type.isUnion()) {
    return null;
  }

  const members = type.types.filter(
    (member) =>
      (member.flags & ts.TypeFlags.StringLiteral) !== 0 ||
      (member.flags & ts.TypeFlags.NumberLiteral) !== 0,
  );

  if (
    members.length === 0 ||
    members.length !== type.types.filter((member) => !isNullableType(member)).length
  ) {
    return null;
  }

  const values = members.map((member) => (member as ts.LiteralType).value);
  const valueType = typeof values[0] === 'number' ? 'number' : 'string';
  return {
    type: valueType,
    enum: values,
  };
}

function getArrayElementType(
  type: ts.Type,
  checker: ts.TypeChecker,
): ts.Type | null {
  if (checker.isArrayType(type)) {
    return checker.getTypeArguments(type as ts.TypeReference)[0] ?? null;
  }

  if (checker.isTupleType(type)) {
    return checker.getTypeArguments(type as ts.TypeReference)[0] ?? null;
  }

  return null;
}

function unwrapPromiseType(type: ts.Type, checker: ts.TypeChecker): ts.Type {
  const symbol = type.aliasSymbol ?? type.getSymbol();
  if (symbol?.getName() === 'Promise') {
    const promisedType = getTypeArgument(type, checker, 0);
    if (promisedType) {
      return promisedType;
    }
  }

  return type;
}

function removeNullableTypes(type: ts.Type): ts.Type {
  if (!type.isUnion()) {
    return type;
  }

  const nonNullableTypes = type.types.filter((member) => !isNullableType(member));
  if (nonNullableTypes.length === 1) {
    return nonNullableTypes[0];
  }

  return type;
}

function getApiResponseDataType(
  type: ts.Type,
  checker: ts.TypeChecker,
): ts.Type | null {
  if (isApiResponseDtoType(type)) {
    const dataType = getTypeArgument(type, checker, 0);
    if (dataType) {
      return dataType;
    }
  }

  const dataProperty = type.getProperty('data');
  const declaration = dataProperty?.valueDeclaration ?? dataProperty?.declarations?.[0];
  if (!dataProperty || !declaration) {
    return null;
  }

  return checker.getTypeOfSymbolAtLocation(dataProperty, declaration);
}

function getDeclaredApiResponseDataType(
  member: ts.MethodDeclaration,
  checker: ts.TypeChecker,
): ts.Type | null {
  if (!member.type) {
    return null;
  }

  const responseTypeNode = unwrapPromiseTypeNode(member.type);
  if (!responseTypeNode || !isTypeReferenceNamed(responseTypeNode, 'ApiResponseDto')) {
    return null;
  }

  const [dataTypeNode] = responseTypeNode.typeArguments ?? [];
  if (!dataTypeNode) {
    return null;
  }

  return checker.getTypeFromTypeNode(dataTypeNode);
}

function ensureBaseResponseSchemas(schemas: Record<string, any>) {
  schemas[API_RESPONSE_BASE_SCHEMA_NAME] ??= {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        description: 'Indica se a requisição foi bem-sucedida',
      },
      message: {
        type: 'string',
        description: 'Mensagem de resposta',
        nullable: true,
      },
      data: {
        description: 'Dados da resposta',
        nullable: true,
      },
      meta: {
        $ref: `#/components/schemas/${PAGINATION_META_SCHEMA_NAME}`,
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
        description: 'Timestamp da resposta',
      },
    },
    required: ['success', 'data', 'timestamp'],
  };

  schemas[PAGINATION_META_SCHEMA_NAME] ??= {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        description: 'Página atual',
        example: 1,
      },
      limit: {
        type: 'number',
        description: 'Itens por página',
        example: 10,
      },
      total: {
        type: 'number',
        description: 'Total de itens',
        example: 100,
      },
      totalPages: {
        type: 'number',
        description: 'Total de páginas',
        example: 10,
      },
      hasNextPage: {
        type: 'boolean',
        description: 'Tem próxima página',
        example: true,
      },
      hasPrevPage: {
        type: 'boolean',
        description: 'Tem página anterior',
        example: false,
      },
    },
    required: ['page', 'limit', 'total', 'totalPages', 'hasNextPage', 'hasPrevPage'],
  };
}

function cloneSchema<T>(schema: T): T {
  return JSON.parse(JSON.stringify(schema)) as T;
}

function getTypeArgument(
  type: ts.Type,
  checker: ts.TypeChecker,
  index: number,
): ts.Type | null {
  const aliasTypeArgument = type.aliasTypeArguments?.[index];
  if (aliasTypeArgument) {
    return aliasTypeArgument;
  }

  const directTypeArgument = (type as ts.TypeReference).typeArguments?.[index];
  if (directTypeArgument) {
    return directTypeArgument;
  }

  const checkerTypeArgument = checker.getTypeArguments(type as ts.TypeReference)[index];
  return checkerTypeArgument ?? null;
}

function unwrapPromiseTypeNode(typeNode: ts.TypeNode): ts.TypeReferenceNode | null {
  if (ts.isTypeReferenceNode(typeNode) && isTypeReferenceNamed(typeNode, 'Promise')) {
    const [innerTypeNode] = typeNode.typeArguments ?? [];
    return innerTypeNode && ts.isTypeReferenceNode(innerTypeNode)
      ? innerTypeNode
      : null;
  }

  return ts.isTypeReferenceNode(typeNode) ? typeNode : null;
}

function isTypeReferenceNamed(
  typeNode: ts.TypeReferenceNode,
  typeName: string,
): boolean {
  return ts.isIdentifier(typeNode.typeName) && typeNode.typeName.text === typeName;
}

function applyNullability(schema: any, type: ts.Type): any {
  if (!includesNull(type)) {
    return schema;
  }

  if (schema?.nullable === true) {
    return schema;
  }

  if (schema?.$ref) {
    return {
      allOf: [schema],
      nullable: true,
    };
  }

  return {
    ...schema,
    nullable: true,
  };
}

function ensureArraySchema(schema: any): any {
  if (schema?.type === 'array') {
    return schema;
  }

  return {
    type: 'array',
    items: schema,
  };
}

function mergeSchemaMetadata(
  schema: any,
  metadata: Record<string, unknown>,
): any {
  if (Object.keys(metadata).length === 0) {
    return schema;
  }

  if (schema?.$ref) {
    return {
      allOf: [schema],
      ...metadata,
    };
  }

  return {
    ...schema,
    ...metadata,
  };
}

function isApiResponseDtoType(type: ts.Type): boolean {
  const symbol = type.aliasSymbol ?? type.getSymbol();
  return symbol?.getName() === 'ApiResponseDto';
}

function isAnonymousSymbol(symbol: ts.Symbol): boolean {
  return isAnonymousSymbolName(symbol.getName());
}

function isAnonymousSymbolName(name: string): boolean {
  return name === '__type' || name === '__object';
}

function isNullType(type: ts.Type): boolean {
  return (type.flags & ts.TypeFlags.Null) !== 0;
}

function includesNull(type: ts.Type): boolean {
  return (
    type.isUnion() &&
    type.types.some(
      (member) =>
        isNullableType(member) && (member.flags & ts.TypeFlags.Null) !== 0,
    )
  );
}

function isNullableType(type: ts.Type): boolean {
  return (
    (type.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void)) !== 0
  );
}

function isOptionalProperty(
  symbol: ts.Symbol,
  declaration: ts.Declaration,
  type: ts.Type,
): boolean {
  if ((symbol.flags & ts.SymbolFlags.Optional) !== 0) {
    return true;
  }

  if (
    (ts.isPropertyDeclaration(declaration) ||
      ts.isPropertySignature(declaration) ||
      ts.isParameter(declaration)) &&
    declaration.questionToken
  ) {
    return true;
  }

  return (
    type.isUnion() &&
    type.types.some((member) => (member.flags & ts.TypeFlags.Undefined) !== 0)
  );
}

function isStringType(type: ts.Type): boolean {
  return (
    (type.flags & (ts.TypeFlags.String | ts.TypeFlags.StringLiteral | ts.TypeFlags.StringLike)) !== 0
  );
}

function isNumberType(type: ts.Type): boolean {
  return (
    (type.flags & (ts.TypeFlags.Number | ts.TypeFlags.NumberLiteral | ts.TypeFlags.NumberLike)) !== 0
  );
}

function isBooleanType(type: ts.Type): boolean {
  return (type.flags & (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral)) !== 0;
}

function isDateType(type: ts.Type): boolean {
  const symbol = type.getSymbol();
  return symbol?.getName() === 'Date';
}

function findOperation(
  paths: Record<string, Record<string, any>>,
  httpMethod: string,
  controllerPath: string,
  methodPath: string,
  summary?: string,
): any | null {
  const normalizedRoute = normalizeRoute(joinPaths(controllerPath, methodPath));
  const exactMatch = paths[normalizedRoute]?.[httpMethod];
  if (exactMatch) {
    return exactMatch;
  }

  const matches = Object.entries(paths).filter(([route, operations]) => {
    if (!operations?.[httpMethod]) {
      return false;
    }

    return normalizeRoute(route).endsWith(normalizedRoute);
  });

  if (matches.length === 1) {
    return matches[0][1][httpMethod];
  }

  if (summary) {
    const bySummary = matches.find(
      ([, operations]) => operations[httpMethod]?.summary === summary,
    );
    if (bySummary) {
      return bySummary[1][httpMethod];
    }
  }

  return null;
}

function joinPaths(...parts: string[]): string {
  const joined = parts.filter(Boolean).join('/').replace(/\/+/g, '/');
  return joined.startsWith('/') ? joined : `/${joined}`;
}

function normalizeRoute(route: string): string {
  const normalized = route.replace(/\/+/g, '/').replace(/:(\w+)/g, '{$1}').replace(/\/$/, '');
  return normalized.startsWith('/') ? normalized || '/' : `/${normalized}`;
}

function getHttpDecorator(
  node: ts.MethodDeclaration,
): { decoratorName: string; decorator: ts.Decorator } | null {
  for (const decoratorName of HTTP_METHOD_DECORATORS.keys()) {
    const decorator = getDecorator(node, decoratorName);
    if (decorator) {
      return { decoratorName, decorator };
    }
  }

  return null;
}

function getDecoratorCall(node: ts.Node, decoratorName: string): ts.CallExpression | null {
  const decorator = getDecorator(node, decoratorName);
  if (!decorator) {
    return null;
  }

  return ts.isCallExpression(decorator.expression) ? decorator.expression : null;
}

function getDecorator(node: ts.Node, decoratorName: string): ts.Decorator | null {
  for (const decorator of getNodeDecorators(node)) {
    const expression = decorator.expression;

    if (
      ts.isCallExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === decoratorName
    ) {
      return decorator;
    }

    if (ts.isIdentifier(expression) && expression.text === decoratorName) {
      return decorator;
    }
  }

  return null;
}

function getNodeDecorators(node: ts.Node): readonly ts.Decorator[] {
  return ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : [];
}

function getFirstStringArgument(call: ts.CallExpression | ts.Decorator): string {
  const expression = ts.isDecorator(call) ? call.expression : call;
  if (!ts.isCallExpression(expression)) {
    return '';
  }

  const [firstArgument] = expression.arguments;
  return firstArgument && ts.isStringLiteralLike(firstArgument) ? firstArgument.text : '';
}

function hasObjectLiteralProperty(
  call: ts.CallExpression,
  propertyName: string,
): boolean {
  const objectLiteral = getObjectLiteralArgument(call);
  if (!objectLiteral) {
    return false;
  }

  return objectLiteral.properties.some(
    (property) =>
      ts.isPropertyAssignment(property) &&
      getPropertyName(property.name) === propertyName,
  );
}

function getStringPropertyFromDecorator(
  call: ts.CallExpression,
  propertyName: string,
): string | undefined {
  const initializer = getObjectLiteralPropertyInitializer(call, propertyName);
  return initializer && ts.isStringLiteralLike(initializer) ? initializer.text : undefined;
}

function getBooleanPropertyFromDecorator(
  call: ts.CallExpression,
  propertyName: string,
): boolean {
  const initializer = getObjectLiteralPropertyInitializer(call, propertyName);
  return initializer?.kind === ts.SyntaxKind.TrueKeyword;
}

function detectResponseHelperKind(
  node: ts.MethodDeclaration,
): ResponseHelperKind | null {
  if (!node.body) {
    return null;
  }

  for (const statement of node.body.statements) {
    if (!ts.isReturnStatement(statement) || !statement.expression) {
      continue;
    }

    const helperKind = getResponseHelperKindFromExpression(statement.expression);
    if (helperKind) {
      return helperKind;
    }
  }

  return null;
}

function getResponseHelperKindFromExpression(
  expression: ts.Expression,
): ResponseHelperKind | null {
  const unwrappedExpression = ts.isParenthesizedExpression(expression)
    ? expression.expression
    : expression;

  if (!ts.isCallExpression(unwrappedExpression)) {
    return null;
  }

  const callee = unwrappedExpression.expression;
  if (
    !ts.isPropertyAccessExpression(callee) ||
    !ts.isIdentifier(callee.expression) ||
    callee.expression.text !== 'ResponseHelper'
  ) {
    return null;
  }

  const methodName = callee.name.text;
  if (methodName === 'success' || methodName === 'paginated' || methodName === 'error') {
    return methodName;
  }

  return null;
}

function getPropertyDocMetadata(declaration: ts.Declaration): PropertyDocMetadata {
  if (getDecorator(declaration, 'NotInResult') || getDecorator(declaration, 'ApiHideProperty')) {
    return {
      excludeFromResponse: true,
      schema: {},
    };
  }

  const apiPropertyDecorator =
    getDecoratorCall(declaration, 'ApiProperty') ??
    getDecoratorCall(declaration, 'ApiPropertyOptional');
  if (!apiPropertyDecorator) {
    return {
      excludeFromResponse: false,
      schema: {},
    };
  }

  const objectLiteral = getObjectLiteralArgument(apiPropertyDecorator);
  const schemaMetadata: Record<string, unknown> = {};

  for (const key of ['description', 'format']) {
    const value = getLiteralPropertyValue(objectLiteral, key);
    if (typeof value === 'string') {
      schemaMetadata[key] = value;
    }
  }

  for (const key of ['example', 'default', 'enum']) {
    const value = getLiteralPropertyValue(objectLiteral, key);
    if (value !== undefined) {
      schemaMetadata[key] = value;
    }
  }

  for (const key of ['nullable', 'readOnly', 'writeOnly', 'deprecated']) {
    const value = getLiteralPropertyValue(objectLiteral, key);
    if (typeof value === 'boolean') {
      schemaMetadata[key] = value;
    }
  }

  const requiredValue = getLiteralPropertyValue(objectLiteral, 'required');
  const writeOnly = schemaMetadata.writeOnly === true;

  return {
    excludeFromResponse: writeOnly,
    required:
      typeof requiredValue === 'boolean'
        ? requiredValue
        : ts.isCallExpression(apiPropertyDecorator) &&
            ts.isIdentifier(apiPropertyDecorator.expression) &&
            apiPropertyDecorator.expression.text === 'ApiPropertyOptional'
          ? false
          : undefined,
    schema: schemaMetadata,
  };
}

function getObjectLiteralArgument(
  call: ts.CallExpression,
): ts.ObjectLiteralExpression | null {
  const objectLiteral = call.arguments.find((argument) =>
    ts.isObjectLiteralExpression(argument),
  );
  return objectLiteral && ts.isObjectLiteralExpression(objectLiteral)
    ? objectLiteral
    : null;
}

function getObjectLiteralPropertyInitializer(
  call: ts.CallExpression,
  propertyName: string,
): ts.Expression | undefined {
  const objectLiteral = getObjectLiteralArgument(call);
  if (!objectLiteral) {
    return undefined;
  }

  const property = objectLiteral.properties.find(
    (candidate) =>
      ts.isPropertyAssignment(candidate) &&
      getPropertyName(candidate.name) === propertyName,
  );

  return property && ts.isPropertyAssignment(property) ? property.initializer : undefined;
}

function getLiteralPropertyValue(
  objectLiteral: ts.ObjectLiteralExpression | null,
  propertyName: string,
): unknown {
  if (!objectLiteral) {
    return undefined;
  }

  const property = objectLiteral.properties.find(
    (candidate) =>
      ts.isPropertyAssignment(candidate) &&
      getPropertyName(candidate.name) === propertyName,
  );
  if (!property || !ts.isPropertyAssignment(property)) {
    return undefined;
  }

  return getLiteralExpressionValue(property.initializer);
}

function getLiteralExpressionValue(expression: ts.Expression): unknown {
  if (ts.isStringLiteralLike(expression)) {
    return expression.text;
  }

  if (ts.isNumericLiteral(expression)) {
    return Number(expression.text);
  }

  if (expression.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }

  if (expression.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }

  if (expression.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }

  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.map((element) => getLiteralExpressionValue(element));
  }

  if (ts.isObjectLiteralExpression(expression)) {
    const result: Record<string, unknown> = {};
    for (const property of expression.properties) {
      if (!ts.isPropertyAssignment(property)) {
        continue;
      }

      const propertyName = getPropertyName(property.name);
      if (!propertyName) {
        continue;
      }

      result[propertyName] = getLiteralExpressionValue(property.initializer);
    }

    return result;
  }

  return undefined;
}

function getPropertyName(name: ts.PropertyName): string | undefined {
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteralLike(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text;
  }

  return undefined;
}
