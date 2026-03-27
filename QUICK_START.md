# 🚀 Quick Start - Auth + Users com Zod + Knex

## 📋 O que foi implementado

✅ Validação HTTP com `nestjs-zod`
✅ Módulos organizados em arquitetura feature-first
✅ Padrão Use Cases aplicado
✅ Exemplo de login com validação Zod
✅ Banco com `Knex`
✅ CRUD de `users` com `use-cases + Knex`
✅ Documentação completa

## 🎯 Estrutura Criada

```
src/
├── modules/auth/
│   ├── application/use-cases/login.use-case.ts
│   ├── presentation/http/controllers/auth.controller.ts
│   ├── presentation/http/dtos/login.dto.ts
│   ├── presentation/http/dtos/auth-response.dto.ts
│   └── auth.module.ts
│
├── modules/users/
│   ├── application/use-cases/
│   ├── domain/entities/user.entity.ts
│   ├── domain/repositories/user.repository.interface.ts
│   ├── infrastructure/persistence/repositories/user.repository.ts
│   ├── infrastructure/persistence/users-persistence.module.ts
│   ├── presentation/http/controllers/users.controller.ts
│   ├── presentation/http/dtos/create-user.dto.ts
│   ├── presentation/http/dtos/find-all-users.dto.ts
│   ├── presentation/http/dtos/user-response.dto.ts
│   └── users.module.ts
│
└── shared/
    ├── http/
    ├── infrastructure/
    └── session-storage/
```

## ⚡ Como Testar

### 1. Rodar banco de dados
```bash
npm run dev:dependencies
```

### 2. Rodar migration
```bash
npm run migrate:latest
```

### 3. Popular com dados de teste
```bash
npm run seed:run
```

### 4. Iniciar servidor
```bash
npm run start:dev
```

### 5. Testar endpoint de login

Credenciais iniciais da seed:

```bash
email: admin@cspeixes.local
password: admin123456
```

Troque esses valores no `.env` antes de usar em ambiente compartilhado.

**Request:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cspeixes.local",
    "password": "admin123456"
  }'
```

**Response esperado:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-aqui",
      "email": "admin@cspeixes.local",
      "name": "Administrador",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "message": "Login successful"
  }
}
```

### 6. Testar CRUD de users

**Criar usuário:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

**Listar usuários:**
```bash
curl "http://localhost:3000/users?pageCount=1&recordsPerPage=10"
```

### 7. Testar validação Zod

**Email inválido:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "email-invalido",
    "password": "123"
  }'
```

**Response esperado (400):**
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "errors": [
      {
        "path": ["email"],
        "message": "Must be a valid email address"
      },
      {
        "path": ["password"],
        "message": "Password must be at least 6 characters"
      }
    ]
  }
}
```

## 📚 Documentação

- **README.md**: Referência principal do estado atual do projeto
- **Swagger**: http://localhost:3000/docs

## 🎨 Criando Novos Endpoints

### 1. Criar DTO com Zod
```typescript
// dtos/register.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

export class RegisterDto extends createZodDto(RegisterSchema) {}
```

### 2. Criar Use Case
```typescript
// use-cases/register.use-case.ts
@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: RegisterInput): Promise<User> {
    // Lógica de negócio aqui
  }
}
```

### 3. Adicionar no Controller
```typescript
@Post('register')
async register(@Body() dto: RegisterDto) {
  return await this.registerUseCase.execute(dto);
}
```

## 🔑 Principais Mudanças

### DTOs explícitos com Zod:
```typescript
const LoginSchema = z.object({
  email: z.string().email().transform(val => val.toLowerCase()),
  password: z.string().min(6),
});

export class LoginDto extends createZodDto(LoginSchema) {}
```

## 🎯 Benefícios

✅ **Type Safety**: Inferência automática de tipos
✅ **Consistência**: Mesmo padrão de validação para todos os endpoints
✅ **DX**: Menos boilerplate
✅ **Transformações**: Built-in no schema
✅ **Composição**: Schemas reutilizáveis
✅ **Swagger**: Integração nativa

## 📖 Próximos Passos

1. Implementar JWT tokens
2. Adicionar endpoint de registro
3. Criar guards de autorização
4. Adicionar refresh tokens
5. Implementar testes E2E

## 🐛 Troubleshooting

### Erro de compilação
```bash
npm run build
```

### Banco não conecta
```bash
docker-compose down
npm run dev:dependencies
```

### Migration não roda
```bash
npm run migrate:rollback
npm run migrate:latest
```

### Seed não roda
```bash
npm run seed:status
npm run seed:run
```

## 💡 Dicas

- Use `z.coerce.number()` para converter query params
- Use `z.transform()` para normalizar dados
- Use `z.refine()` para validações customizadas
- Use `z.discriminatedUnion()` para união de tipos
- Schemas Zod são reutilizáveis entre frontend e backend!

Divirta-se! 🎉
