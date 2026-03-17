import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ description: 'Current page', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total items', example: 100 })
  total: number;

  @ApiProperty({ description: 'Total pages', example: 10 })
  totalPages: number;

  @ApiProperty({ description: 'Has next page', example: true })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Has previous page', example: false })
  hasPrevPage: boolean;
}

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Indicates if the request was successful' })
  success: boolean;

  @ApiProperty({ description: 'Response message', required: false })
  message?: string;

  @ApiProperty({ description: 'Response data' })
  data?: T;

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
    required: false,
  })
  meta?: PaginationMetaDto;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp: string;
}
