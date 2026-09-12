import {ConflictException,ForbiddenException,Injectable} from '@nestjs/common';
import {prisma,Prisma} from '@lottivexa/database';
import type {Principal} from '../common/guards/jwt-auth.guard';
import {isWinningSelection,resultWinningKeys} from '../tickets/ticket-policy';
import {feedDrawNumber,feedEventDedupeKey,feedWinningKeys,LotteryResultsFeedEvent,parseFeedBindings} from './lottery-results-feed';

@Injectable()
export class ResultsService{
  private lastProviderPoll=0;

  async latestPublic(tenantSlug:string){
    const tenant=await prisma.tenant.findFirst({where:{slug:tenantSlug,status:'ACTIVE'},select:{id:true,branding:{select:{businessName:true,logoUrl:true}}}});
    if(!tenant)return[];
    const draws=await prisma.draw.findMany({where:{tenantId:tenant.id,status:'RESULT_PUBLISHED'},include:{game:{select:{name:true,logoUrl:true,catalogCode:true}}},orderBy:{publishedAt:'desc'},take:50});
    return{tenant:tenant.branding,results:draws.map(draw=>({id:draw.id,drawNumber:draw.drawNumber,drawDate:draw.drawDate,game:draw.game,result:draw.result,publishedAt:draw.publishedAt}))};
  }

  async enqueueLotteryResultsFeed(event:LotteryResultsFeedEvent){
    if(event.event==='test')return{accepted:true,test:true};
    const dedupeKey=feedEventDedupeKey(event);
    const queued=await prisma.providerResultEvent.upsert({
      where:{dedupeKey},
      update:{},
      create:{provider:'lottery-results-feed',dedupeKey,payload:event as Prisma.InputJsonValue},
      select:{id:true,status:true,createdAt:true},
    });
    return{accepted:true,eventId:queued.id,status:queued.status,duplicate:queued.status!=='PENDING',createdAt:queued.createdAt};
  }

  async processProviderEvents(limit=10){
    const events=await prisma.providerResultEvent.findMany({where:{status:{in:['PENDING','FAILED']},attempts:{lt:8}},orderBy:{createdAt:'asc'},take:limit});
    for(const event of events){
      const claimed=await prisma.providerResultEvent.updateMany({where:{id:event.id,status:event.status},data:{status:'PROCESSING',attempts:{increment:1},error:null}});
      if(!claimed.count)continue;
      try{
        await this.applyLotteryResultsFeed(event.payload as LotteryResultsFeedEvent);
        await prisma.providerResultEvent.update({where:{id:event.id},data:{status:'APPLIED',processedAt:new Date()}});
      }catch(error){
        await prisma.providerResultEvent.update({where:{id:event.id},data:{status:'FAILED',error:(error instanceof Error?error.message:String(error)).slice(0,2000)}});
      }
    }
  }

  async pollLotteryResultsFeed(){
    if(process.env.LOTTERY_RESULTS_FEED_POLL_ENABLED!=='true')return;
    const token=process.env.LOTTERY_RESULTS_FEED_TOKEN;
    const bindings=parseFeedBindings(process.env.LOTTERY_RESULTS_FEED_BINDINGS);
    const interval=Number(process.env.LOTTERY_RESULTS_FEED_POLL_MS??900000);
    if(!token||!bindings.length||Date.now()-this.lastProviderPoll<interval)return;
    this.lastProviderPoll=Date.now();
    const base=(process.env.LOTTERY_RESULTS_FEED_BASE_URL??'https://www.lotteryresultsfeed.com/api').replace(/\/$/,'');
    const since=new Date(Date.now()-3*86400000).toISOString().slice(0,10);
    for(const lotteryId of new Set(bindings.map(binding=>binding.lotteryId))){
      const url=new URL(`${base}/lottery/results`);
      url.searchParams.set('id',String(lotteryId));url.searchParams.set('since',since);url.searchParams.set('limit','25');
      const response=await fetch(url,{headers:{accept:'application/json',authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});
      if(response.status===429)throw new Error(`LOTTERY_RESULTS_FEED_RATE_LIMIT:${response.headers.get('retry-after')??'unknown'}`);
      if(!response.ok)throw new Error(`LOTTERY_RESULTS_FEED_${response.status}`);
      const body=await response.json() as any;
      const rows=Array.isArray(body)?body:Array.isArray(body?.results)?body.results:Array.isArray(body?.data)?body.data:[];
      for(const row of rows){
        const event:LotteryResultsFeedEvent={version:'1.0',event:'lottery.result.published',lottery_id:lotteryId,lottery_name:row.lottery_name??row.lottery?.name,draw_date:row.draw_date??row.date,draw_type:row.draw_type??null,numbers:row.numbers??row.winning_numbers,published_at:row.published_at??row.updated_at??new Date().toISOString()};
        if(event.draw_date&&Array.isArray(event.numbers))await this.enqueueLotteryResultsFeed(event);
      }
    }
  }

  private async applyLotteryResultsFeed(event:LotteryResultsFeedEvent){
    const binding=parseFeedBindings(process.env.LOTTERY_RESULTS_FEED_BINDINGS).find(item=>item.lotteryId===event.lottery_id);
    if(!binding)throw new Error(`LOTTERY_RESULTS_FEED_UNMAPPED:${event.lottery_id}`);
    const drawType=event.draw_type?.trim().toLowerCase().replaceAll(' ','_')||'default';
    const time=binding.drawTimes[drawType]??binding.drawTimes.default;
    if(!time)throw new Error(`LOTTERY_RESULTS_FEED_DRAW_TYPE_UNMAPPED:${binding.catalogCode}:${drawType}`);
    const games=await prisma.game.findMany({where:{catalogCode:binding.catalogCode,status:'ACTIVE',archivedAt:null},select:{id:true,code:true,tenantId:true}});
    let applied=0,duplicates=0,missing=0;
    for(const game of games){
      const drawNumber=feedDrawNumber(game.code,event.draw_date!,time);
      const draw=await prisma.draw.findUnique({where:{tenantId_drawNumber:{tenantId:game.tenantId,drawNumber}},select:{id:true,status:true}});
      if(!draw){missing++;continue}
      if(draw.status==='RESULT_PUBLISHED'){duplicates++;continue}
      const actor=await prisma.user.findFirst({where:{tenantId:game.tenantId,status:'ACTIVE',roles:{some:{role:{code:'TENANT_OWNER'}}}},select:{id:true,tokenVersion:true}});
      if(!actor){missing++;continue}
      await this.publish({sub:actor.id,tenantId:game.tenantId,permissions:['settings.edit'],platform:false,tokenVersion:actor.tokenVersion},draw.id,{winningKeys:feedWinningKeys(event.numbers!)});
      applied++;
    }
    return{applied,duplicates,missing};
  }

  async publish(u:Principal,drawId:string,result:{winningKeys:string[]}){
    const tenantId=this.tenant(u);const keys=resultWinningKeys(result);
    return prisma.$transaction(async tx=>{
      const changed=await tx.draw.updateMany({where:{id:drawId,tenantId,status:{in:['CLOSED','RESULT_PENDING']}},data:{status:'RESULT_PUBLISHED',result,publishedAt:new Date()}});
      if(changed.count!==1)throw new ConflictException('DRAW_NOT_READY_FOR_RESULT');
      const tickets=await tx.ticket.findMany({where:{tenantId,drawId,status:'VALID'},include:{lines:{include:{betType:{select:{code:true}}}},merchant:{select:{userId:true}}}});
      let winners=0;
      for(const ticket of tickets){
        let win=new Prisma.Decimal(0);
        for(const line of ticket.lines){const isWinner=isWinningSelection(line.betType.code,line.selectionKey,keys);await tx.ticketLine.update({where:{id:line.id},data:{isWinner}});if(isWinner)win=win.add(line.potentialWin)}
        if(win.isPositive()){
          winners++;await tx.ticket.update({where:{id:ticket.id},data:{status:'WINNER'}});await tx.winningTicket.create({data:{tenantId,ticketId:ticket.id,winningAmount:win}});await tx.ticketEvent.create({data:{tenantId,ticketId:ticket.id,type:'MARKED_WINNER',userId:u.sub,metadata:{winningAmount:win.toString()}}});await tx.notification.create({data:{tenantId,userId:ticket.merchant.userId,type:'TICKET_WINNER',title:'Winning ticket',body:`Ticket ${ticket.ticketNumber} won ${win.toString()}`,data:{ticketId:ticket.id,ticketNumber:ticket.ticketNumber,amount:win.toString()},status:'SENT',sentAt:new Date()}});
        }else{await tx.ticket.update({where:{id:ticket.id},data:{status:'LOSER'}});await tx.ticketEvent.create({data:{tenantId,ticketId:ticket.id,type:'MARKED_LOSER',userId:u.sub}})}
      }
      await tx.auditLog.create({data:{tenantId,userId:u.sub,action:'UPDATE',entityType:'DrawResult',entityId:drawId,newValues:{winningKeys:result.winningKeys,ticketsProcessed:tickets.length,winners}}});
      return{drawId,ticketsProcessed:tickets.length,winners};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }

  private tenant(u:Principal){if(!u.tenantId)throw new ForbiddenException('TENANT_ACCESS_REQUIRED');return u.tenantId}
}
