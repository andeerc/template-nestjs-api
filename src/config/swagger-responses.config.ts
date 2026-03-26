import { HttpStatus } from '@nestjs/common';
import type { ApiResponseOptions } from '@nestjs/swagger';

export type CommonApiResponseKey =
  | 'badRequest'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'internalServerError';

export type CommonApiResponseOption =
  | CommonApiResponseKey
  | {
      type: CommonApiResponseKey;
      description?: string;
    };

const COMMON_API_RESPONSES: Record<CommonApiResponseKey, ApiResponseOptions> = {
  badRequest: {
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  },
  unauthorized: {
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  },
  forbidden: {
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden',
  },
  notFound: {
    status: HttpStatus.NOT_FOUND,
    description: 'Resource not found',
  },
  conflict: {
    status: HttpStatus.CONFLICT,
    description: 'Resource conflict',
  },
  internalServerError: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
  },
};

export function resolveCommonApiResponses(
  responses: CommonApiResponseOption[] = [],
): ApiResponseOptions[] {
  return responses.map((response) => {
    if (typeof response === 'string') {
      return COMMON_API_RESPONSES[response];
    }

    const baseResponse = COMMON_API_RESPONSES[response.type];

    return {
      ...baseResponse,
      description: response.description ?? baseResponse.description,
    };
  });
}
