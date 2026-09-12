import {BadRequestException,Body,Controller,Get,Headers,Param,Post,Req,UnauthorizedException} from '@nestjs/common';
import {IsArray,IsString} from 'class-validator';
import {CurrentUser} from '../common/decorators/current-user.decorator';
import {IS_PUBLIC,RequirePermissions} from '../common/decorators/access.decorators';
import type {Principal} from '../common/guards/jwt-auth.guard';
import {parseLotteryResultsFeedEvent,verifyLotteryResultsFeedSignature} from './lottery-results-feed';
import {ResultsService} from './results.service';

class ResultDto{@IsArray()@IsString({each:true})winningKeys!:string[]}

@Controller('results')
export class ResultsController{
  constructor(private service:ResultsService){}

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
