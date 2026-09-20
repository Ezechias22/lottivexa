import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/access.decorators';
import type { Principal } from '../common/guards/jwt-auth.guard';
import { TicketsService } from './tickets.service';

class LineDto {
  @IsString() betTypeId!: string;
  @IsArray() selection!: Array<number | string>;
  @IsString() stake!: string;
  @IsOptional() @IsInt() @Min(1) @Max(3) resultPosition?: number;
}

class FreeMaryajDto {
  @IsArray() @ArrayMinSize(2) @ArrayMaxSize(2) selection!: Array<number | string>;
}

class TicketDto {
  @IsString() drawId!: string;
  @IsString() idempotencyKey!: string;
  @IsOptional() @IsString() deviceId?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => LineDto) lines!: LineDto[];
  @IsOptional() @IsArray() @ArrayMinSize(2) @ArrayMaxSize(2) @ValidateNested({ each: true }) @Type(() => FreeMaryajDto) freeMaryaj?: FreeMaryajDto[];
}

@Controller('tickets')
export class TicketsController {
  constructor(private service: TicketsService) {}

  @Post() @RequirePermissions('tickets.create')
  create(@CurrentUser() user: Principal, @Body() dto: TicketDto) { return this.service.create(user, dto); }

  @Post(':reference/cancel') @RequirePermissions('tickets.cancel')
  cancel(@CurrentUser() user: Principal, @Param('reference') reference: string) { return this.service.cancel(user, reference); }

  @Get(':reference') @RequirePermissions('tickets.view')
  get(@CurrentUser() user: Principal, @Param('reference') reference: string) { return this.service.get(user, reference); }

  @Get() @RequirePermissions('tickets.view')
  search(@CurrentUser() user: Principal, @Query('status') status?: any, @Query('drawId') drawId?: string) { return this.service.search(user, { status, drawId }); }
}
