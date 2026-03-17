# NestJS API Scaffold

Template base para criação de APIs RESTful com NestJS, Fastify, PostgreSQL e Redis.

## Stack

- **Framework**: NestJS + Fastify
- **Database**: PostgreSQL + TypeORM + NICOT
- **Cache/Sessions**: Redis
- **Queue**: Bull
- **Validation**: nestjs-zod + DTOs entity-driven do NICOT
- **Documentation**: Swagger + Scalar UI

## Arquitetura

```
src/
├── application/        # Orquestração da aplicação e adapters de entrada
│   ├── http/
│   │   └── common/     # Utilitários compartilhados
│   └── users/          # Serviços de aplicação do recurso users
├── domain/             # Lógica de negócio (services, repositories, entities)
│   └── common/         # Serviços compartilhados (SessionStorage)
├── infrastructure/     # Infraestrutura (database, cache, i18n, queue)
│   ├── cache/          # Redis cache service
│   ├── database/       # TypeORM + migrations
│   ├── i18n/           # Internacionalização
│   ├── queue/          # Bull queue
│   └── ws-adapter/     # Socket.io com Redis adapter
└── config/             # Configurações da aplicação
```

## Setup

### 1. Clone e instale dependências

```bash
npm install
```

### 2. Configure variáveis de ambiente

```bash
cp .env.example .env
```

### 3. Inicie os serviços (PostgreSQL + Redis)

```bash
npm run dev:dependencies
# ou
docker-compose up -d
```

### 4. Execute as migrations

```bash
npm run migrate:latest
```

### 5. Inicie o servidor

```bash
npm run dev
```

## Comandos

```bash
# Desenvolvimento
npm run dev                 # Docker + migrations + watch mode

# Build
npm run build

# Lint
npm run lint

# Testes
npm test                    # Todos os testes
npm run test:watch          # Watch mode
npm run test:e2e            # Testes e2e

# Migrations (TypeORM)
npm run migrate:make nome   # Criar migration
npm run migrate:latest      # Executar migrations
npm run migrate:rollback    # Reverter última migration
```

## Documentação

- **Scalar UI**: http://localhost:3000/docs
- **Swagger JSON**: http://localhost:3000/swagger/json
- **Swagger YAML**: http://localhost:3000/swagger/yaml

## Padrões

### DTOs
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  email: string;
}
```

### Repositories
```typescript
@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }
}
```

### Controllers
```typescript
@Controller('users')
export class UserController {
  @Get(':id')
  @ApiDoc({ summary: 'Get user by ID', response: UserResponseDto })
  async findOne(@UsersResource.idParam() id: string) {
    const result = await this.userService.findOne(id);
    return ResponseHelper.success(result.data, result.message);
  }

  @Post()
  @UseInterceptors(TransactionalTypeOrmInterceptor())
  async create(@UsersResource.createParam() dto: CreateUserDto) {
    const result = await this.userService.create(dto);
    return ResponseHelper.success(result.data, result.message);
  }
}
```

### NICOT + transação request-scoped

- `TransactionalTypeOrmModule.forFeature([User])` fornece o repositório transacional do NICOT.
- `@InjectTransactionalRepository(User)` deve ser usado nos serviços CRUD gerados pelo NICOT.
- `@UseInterceptors(TransactionalTypeOrmInterceptor())` deve ficar apenas nos endpoints de escrita.
- `auth/login` continua customizado e usa `InjectRepository(User)` normalmente, fora do contexto transacional request-scoped.

### Decorators Disponíveis
- `@Public()` - Marca rota como pública (sem autenticação)
- `@CurrentUser()` - Obtém usuário da sessão
- `@ApiDoc()` - Documentação Swagger simplificada
- `@CacheKey()` / `@CacheTTL()` - Cache de resposta

## Estrutura de Resposta

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "meta": { "page": 1, "limit": 10, "total": 100 },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```
