import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiResponseDto, PaginationMetaDto } from '../helpers/response-helper';

interface ApiDocOptions {
  summary: string;
  description?: string;
  response?: Type<any>;
  isPaginated?: boolean;
  params?: Array<{ name: string; description?: string; example?: any }>;
  query?: Array<{
    name: string;
    description?: string;
    required?: boolean;
    example?: any;
  }>;
}

export function ApiDoc(options: ApiDocOptions) {
  const decorators = [
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
  ];

  if (options.params) {
    options.params.forEach((param) => {
      decorators.push(
        ApiParam({
          name: param.name,
          description: param.description,
          example: param.example,
        }),
      );
    });
  }

  if (options.query) {
    options.query.forEach((query) => {
      decorators.push(
        ApiQuery({
          name: query.name,
          description: query.description,
          required: query.required ?? false,
          example: query.example,
        }),
      );
    });
  }

  if (options.response) {
    if (options.isPaginated) {
      decorators.push(
        ApiExtraModels(ApiResponseDto, PaginationMetaDto, options.response),
        ApiResponse({
          status: 200,
          description: 'Success',
          schema: {
            allOf: [
              {
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: options.summary },
                  data: {
                    type: 'array',
                    items: { $ref: getSchemaPath(options.response) },
                  },
                  meta: { $ref: getSchemaPath(PaginationMetaDto) },
                  timestamp: {
                    type: 'string',
                    example: new Date().toISOString(),
                  },
                },
              },
            ],
          },
        }),
      );
    } else {
      decorators.push(
        ApiExtraModels(ApiResponseDto, options.response),
        ApiResponse({
          status: 200,
          description: 'Success',
          schema: {
            allOf: [
              {
                properties: {
                  success: { type: 'boolean', example: true },
                  message: {
                    type: 'string',
                    example: options.summary,
                    nullable: true,
                  },
                  data: { $ref: getSchemaPath(options.response) },
                  timestamp: {
                    type: 'string',
                    example: new Date().toISOString(),
                  },
                },
              },
            ],
          },
        }),
      );
    }
  } else {
    decorators.push(
      ApiResponse({
        status: 200,
        description: 'Success',
        schema: {
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', nullable: true },
            data: { type: 'object', nullable: true },
            timestamp: { type: 'string', example: new Date().toISOString() },
          },
        },
      }),
    );
  }

  return applyDecorators(...decorators);
}
