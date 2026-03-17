import { ApiResponseDto, PaginationMetaDto } from './api-response.dto';

export class ResponseHelper {
  static success<T>(data: T, message?: string): ApiResponseDto<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string,
  ): ApiResponseDto<T[]> {
    const totalPages = Math.ceil(total / limit);

    const meta: PaginationMetaDto = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return {
      success: true,
      message,
      data,
      meta,
      timestamp: new Date().toISOString(),
    };
  }

  static error(message: string, data?: any): ApiResponseDto<any> {
    return {
      success: false,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
