import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsEmail,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  NotInResult,
  NotWritable,
  QueryEqual,
} from 'nicot';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @ApiProperty({
    description: 'User identifier',
    format: 'uuid',
  })
  @IsUUID()
  @NotWritable()
  @QueryEqual()
  @Column('uuid', {
    primary: true,
    default: () => 'gen_random_uuid()',
  })
  id: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  @IsEmail()
  @MaxLength(255)
  @QueryEqual()
  @Column('varchar', {
    length: 255,
    unique: true,
  })
  email: string;

  @ApiProperty({
    description: 'User password hash',
    writeOnly: true,
  })
  @IsString()
  @MaxLength(255)
  @NotInResult()
  @Column('varchar', {
    length: 255,
  })
  password: string;

  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
  })
  @IsString()
  @MaxLength(255)
  @QueryEqual()
  @Column('varchar', {
    length: 255,
  })
  name: string;

  @ApiProperty({
    description: 'Creation timestamp',
    type: Date,
  })
  @IsDate()
  @NotWritable()
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    type: Date,
  })
  @IsDate()
  @NotWritable()
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
  })
  updatedAt: Date;

  constructor(partial: Partial<User> = {}) {
    Object.assign(this, partial);
  }
}
