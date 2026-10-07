import {BadRequestException,Body,Controller,Get,Headers,Param,Patch,Post,Query,Req,UnauthorizedException} from '@nestjs/common';
import {IsArray,IsString} from 'class-validator';
import {CurrentUser} from '../common/decorators/current-user.decorator';
import {IS_PUBLIC,PlatformOnly,RequirePermissions} from '../common/decorators/access.decorators';
import type {Principal} from '../common/guards/jwt-auth.guard';
import {parseLotteryResultsFeedEvent,verifyLotteryResultsFeedSignature} from './lottery-results-feed';
import {ResultsService} from './results.service';

class ResultDto{@IsArray()@IsString({each:true})winningKeys!:string[]}

@Controller('results')
export class ResultsController{
  constructor(private service:ResultsService){}

  @Get('provider/status')@RequirePermissions('settings.view')
  providerStatus(){return this.service.providerStatus()}

  @PlatformOnly()@Get('master/draws')@RequirePermissions('settings.view')
  masterDraws(){return this.service.platformDraws()}

  @PlatformOnly()@Get('master/winning-tickets')@RequirePermissions('settings.view')
  masterWinningTickets(@Query('page')page?:string){return this.service.platformWinningTickets(Number(page??1))}

  @PlatformOnly()@Post('master/draws/:drawId/publish')@RequirePermissions('settings.edit')
  publishMaster(@CurrentUser()u:Principal,@Param('drawId')id:string,@Body()dto:ResultDto){return this.service.publishPlatform(u,id,dto)}

  @PlatformOnly()@Patch('master/draws/:drawId')@RequirePermissions('settings.edit')
  editMaster(@CurrentUser()u:Principal,@Param('drawId')id:string,@Body()dto:ResultDto){return this.service.editPlatform(u,id,dto)}

  @IS_PUBLIC()@Get('public/:tenantSlug')
  latest(@Param('tenantSlug')slug:string){return this.service.latestPublic(slug)}

  @IS_PUBLIC()@Post('provider/lottery-results-feed/webhook')
  async lotteryResultsFeedWebhook(@Req()request:any,@Headers('signature')signature?:string){
    const secret=process.env.LOTTERY_RESULTS_FEED_WEBHOOK_SECRET??'';
    const raw=request.rawBody as Buffer|undefined;
    if(!raw||!verifyLotteryResultsFeedSignature(raw,signature,secret))throw new UnauthorizedException('INVALID_PROVIDER_SIGNATURE');
    try{return await this.service.enqueueLotteryResultsFeed(parseLotteryResultsFeedEvent(raw))}
    catch(error){throw new BadRequestException(error instanceof Error?error.message:'INVALID_PROVIDER_PAYLOAD')}
  }

  @Post('draws/:drawId/publish')@RequirePermissions('settings.edit')
  publish(@CurrentUser()u:Principal,@Param('drawId')id:string,@Body()dto:ResultDto){return this.service.publish(u,id,dto)}
}
