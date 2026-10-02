import {Body,Controller,Get,Param,Patch,Post} from '@nestjs/common';
import {IsDateString,IsOptional,IsString} from 'class-validator';
import {CurrentUser} from '../common/decorators/current-user.decorator';
import {RequirePermissions} from '../common/decorators/access.decorators';
import type {Principal} from '../common/guards/jwt-auth.guard';
import {LotteryService} from './lottery.service';

class BlockNumberDto{ @IsString() gameId!:string; @IsOptional() @IsString() betTypeId?:string; @IsString() numberKey!:string; @IsOptional() @IsDateString() startsAt?:string; @IsOptional() @IsDateString() endsAt?:string; }
class StatusDto{ @IsOptional() enabled?:boolean; }

@Controller('lottery')
export class BlockedNumbersController{
  constructor(private service:LotteryService){}
  @Get('limits') @RequirePermissions('settings.view') list(@CurrentUser()u:Principal){return this.service.limits(u)}
  @Post('blocked-numbers') @RequirePermissions('settings.edit') block(@CurrentUser()u:Principal,@Body()dto:BlockNumberDto){return this.service.blockNumber(u,dto)}
  @Patch('limits/:id') @RequirePermissions('settings.edit') status(@CurrentUser()u:Principal,@Param('id')id:string,@Body()dto:StatusDto){return this.service.setLimitStatus(u,id,dto.enabled!==false)}
}
