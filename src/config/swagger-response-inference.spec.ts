import type { OpenAPIObject } from '@nestjs/swagger';
import { enrichSwaggerResponsesFromSource } from './swagger-response-inference';

describe('enrichSwaggerResponsesFromSource', () => {
  it('infers UsersController success and paginated responses from source', () => {
    const document = enrichSwaggerResponsesFromSource(createDocumentStub());

    const createResponse =
      document.paths?.['/users']?.post?.responses?.['200']?.content?.[
        'application/json'
      ]?.schema;
    const listResponse =
      document.paths?.['/users']?.get?.responses?.['200']?.content?.[
        'application/json'
      ]?.schema;
    const getOneResponse =
      document.paths?.['/users/{id}']?.get?.responses?.['200']?.content?.[
        'application/json'
      ]?.schema;
    const updateResponse =
      document.paths?.['/users/{id}']?.patch?.responses?.['200']?.content?.[
        'application/json'
      ]?.schema;

    expect(createResponse?.properties?.data?.$ref).toBe(
      '#/components/schemas/UserInferred',
    );
    expect(getOneResponse?.properties?.data?.$ref).toBe(
      '#/components/schemas/UserInferred',
    );
    expect(listResponse?.properties?.data?.type).toBe('array');
    expect(listResponse?.properties?.data?.items?.$ref).toBe(
      '#/components/schemas/UserInferred',
    );
    expect(listResponse?.properties?.meta?.$ref).toBe(
      '#/components/schemas/PaginationMetaDtoInferred',
    );
    expect(updateResponse?.properties?.data?.nullable).toBe(true);
    expect(updateResponse?.properties?.data?.example).toBeNull();

    const userSchema = document.components?.schemas?.UserInferred as Record<
      string,
      any
    >;

    expect(userSchema.properties.password).toBeUndefined();
    expect(userSchema.properties.id.format).toBe('uuid');
    expect(userSchema.properties.email.example).toBe('user@example.com');
  });
});

function createDocumentStub(): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
    },
    paths: {
      '/users': {
        get: {
          summary: 'List users',
        },
        post: {
          summary: 'Create user',
        },
      },
      '/users/{id}': {
        get: {
          summary: 'Get user by ID',
        },
        patch: {
          summary: 'Update user',
        },
        delete: {
          summary: 'Delete user',
        },
      },
    },
    components: {
      schemas: {},
    },
  };
}
