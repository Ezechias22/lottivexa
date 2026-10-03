import {ConflictException,ForbiddenException,Injectable} from '@nestjs/common';
import {prisma,Prisma} from '@lottivexa/database';
import type {Principal} from '../common/guards/jwt-auth.guard';
import {resultWinningKeys} from '../tickets/ticket-policy';
import {feedDrawNumber,feedEventDedupeKey,feedWinningKeys,LotteryResultsFeedEvent,mapLotteryResultsFeedRestRow,parseFeedBindings} from './lottery-results-feed';
import {evaluateTicketResults} from './results-policy';

@Injectable()
export class ResultsService{
  private lastProviderPoll=0;

  providerStatus(){let bindingCount=0,bindingsValid=true;try{bindingCount=parseFeedBindings(process.env.LOTTERY_RESULTS_FEED_BINDINGS).length}catch{bindingsValid=false}return{pollEnabled:process.env.LOTTERY_RESULTS_FEED_POLL_ENABLED==='true',tokenConfigured:Boolean(process.env.LOTTERY_RESULTS_FEED_TOKEN),bindingCount,bindingsValid,lastPollAt:this.lastProviderPoll?new Date(this.lastProviderPoll).toISOString():null,webhookConfigured:Boolean(process.env.LOTTERY_RESULTS_FEED_WEBHOOK_SECRET)}}

  async platformDraws(){
    return prisma.draw.findMany({where:{status:{in:['CLOSED','RESULT_PENDING','RESULT_PUBLISHED']}},include:{game:{select:{name:true,code:true,logoUrl:true}},tenant:{select:{id:true,slug:true,legalName:true}}},orderBy:{drawDate:'desc'},take:200});
  }

  async publishPlatform(u:Principal,drawId:string,result:{winningKeys:string[]}){
    const draw=await prisma.draw.findUnique({where:{id:drawId},select:{tenantId:true}});
    if(!draw)throw new ConflictException('DRAW_NOT_FOUND');
    return this.publish({...u,tenantId:draw.tenantId,platform:true},drawId,result);
  }

  async editPlatform(u:Principal,drawId:string,result:{winningKeys:string[]}){
    resultWinningKeys(result);
    return prisma.$transaction(async tx=>{
      const draw=await tx.draw.findUnique({where:{id:drawId},select:{id:true,tenantId:true,status:true}});
      if(!draw)throw new ConflictException('DRAW_NOT_FOUND');
      if(draw.status!=='RESULT_PUBLISHED')throw new ConflictException('DRAW_RESULT_NOT_PUBLISHED');
      const paid=await tx.payout.count({where:{ticket:{OR:[{drawId},{ticketDraws:{some:{drawId}}}]}}});
      if(paid)throw new ConflictException('RESULT_LOCKED_AFTER_PAYOUT');
      await tx.draw.update({where:{id:drawId},data:{result,publishedAt:new Date()}});
      const tickets=await this.ticketsForDraw(tx,draw.tenantId,drawId);
      let winners=0;
      for(const ticket of tickets){
        if(await this.recalculateTicket(tx,ticket,u.sub,drawId,false)==='WINNER')winners++;
      }
      await tx.auditLog.create({data:{tenantId:draw.tenantId,userId:u.sub,action:'UPDATE',entityType:'DrawResult',entityId:drawId,newValues:{winningKeys:result.winningKeys,ticketsProcessed:tickets.length,winners,edited:true}}});
      return{drawId,ticketsProcessed:tickets.length,winners,edited:true};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }

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
        const event=mapLotteryResultsFeedRestRow(row,lotteryId);
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
    const tenantId=this.tenant(u);resultWinningKeys(result);
    return prisma.$transaction(async tx=>{
      const changed=await tx.draw.updateMany({where:{id:drawId,tenantId,status:{in:['CLOSED','RESULT_PENDING']}},data:{status:'RESULT_PUBLISHED',result,publishedAt:new Date()}});
      if(changed.count!==1)throw new ConflictException('DRAW_NOT_READY_FOR_RESULT');
      const tickets=await this.ticketsForDraw(tx,tenantId,drawId);
      let winners=0;
      for(const ticket of tickets){
        const status=await this.recalculateTicket(tx,ticket,u.sub,drawId,true);
        if(status==='WINNER')winners++;
      }
      await tx.auditLog.create({data:{tenantId,userId:u.sub,action:'UPDATE',entityType:'DrawResult',entityId:drawId,newValues:{winningKeys:result.winningKeys,ticketsProcessed:tickets.length,winners}}});
      return{drawId,ticketsProcessed:tickets.length,winners};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }

  private ticketsForDraw(tx:Prisma.TransactionClient,tenantId:string,drawId:string){
    return tx.ticket.findMany({
      where:{tenantId,status:{in:['VALID','PENDING','WINNER','LOSER']},OR:[{drawId},{ticketDraws:{some:{drawId}}}]},
      include:{
        lines:{include:{betType:{select:{code:true}}}},
        merchant:{select:{userId:true}},
        draw:{select:{id:true,status:true,result:true}},
        ticketDraws:{include:{draw:{select:{id:true,status:true,result:true}}}},
      },
    });
  }

  private async recalculateTicket(tx:Prisma.TransactionClient,ticket:any,actorId:string,changedDrawId:string,notifyWinner:boolean){
    const drawRows=[ticket.draw,...(ticket.ticketDraws??[]).map((item:any)=>item.draw)].filter(Boolean);
    const drawById=new Map<string,any>(drawRows.map((draw:any)=>[draw.id,draw]));
    const ticketDrawIds=ticket.ticketDraws?.length?ticket.ticketDraws.map((item:any)=>item.drawId):[ticket.drawId];
    const resultKeysByDraw=new Map<string,string[]>();
    for(const draw of drawRows){
      if(draw.status!=='RESULT_PUBLISHED')continue;
      try{resultKeysByDraw.set(draw.id,resultWinningKeys(draw.result))}catch{}
    }
    const evaluation=evaluateTicketResults(ticket.drawId,ticketDrawIds,ticket.lines,resultKeysByDraw);
    const lineResults=new Map(evaluation.lineResults.map(item=>[item.lineId,item]));
    let winningAmount=new Prisma.Decimal(0);
    for(const line of ticket.lines){
      const outcome=lineResults.get(line.id)!;
      await tx.ticketLine.update({where:{id:line.id},data:{isWinner:outcome.isWinner}});
      if(outcome.winCount&&outcome.winCount>0)winningAmount=winningAmount.add(line.potentialWin.mul(outcome.winCount));
    }
    const allLinesResolved=evaluation.lineResults.every(item=>item.isWinner!==null);
    const allDrawsResolved=evaluation.allDrawsResolved&&allLinesResolved&&evaluation.drawIds.every(id=>drawById.has(id));
    const lineWinCounts=evaluation.lineResults.map(item=>({lineId:item.lineId,drawId:item.drawId,winCount:item.winCount}));
    await tx.ticketEvent.create({data:{tenantId:ticket.tenantId,ticketId:ticket.id,type:'RESULT_CHECKED',userId:actorId,metadata:{drawId:changedDrawId,lineWinCounts}}});

    if(!allDrawsResolved){
      await tx.ticket.update({where:{id:ticket.id},data:{status:'PENDING'}});
      await tx.winningTicket.deleteMany({where:{ticketId:ticket.id}});
      return 'PENDING' as const;
    }

    if(winningAmount.isPositive()){
      await tx.ticket.update({where:{id:ticket.id},data:{status:'WINNER'}});
      await tx.winningTicket.upsert({where:{ticketId:ticket.id},update:{winningAmount,detectedAt:new Date()},create:{tenantId:ticket.tenantId,ticketId:ticket.id,winningAmount}});
      await tx.ticketEvent.create({data:{tenantId:ticket.tenantId,ticketId:ticket.id,type:'MARKED_WINNER',userId:actorId,metadata:{winningAmount:winningAmount.toString(),lineWinCounts}}});
      if(notifyWinner&&ticket.status!=='WINNER')await tx.notification.create({data:{tenantId:ticket.tenantId,userId:ticket.merchant.userId,type:'TICKET_WINNER',title:'Winning ticket',body:`Ticket ${ticket.ticketNumber} won ${winningAmount.toString()}`,data:{ticketId:ticket.id,ticketNumber:ticket.ticketNumber,amount:winningAmount.toString()},status:'SENT',sentAt:new Date()}});
      return 'WINNER' as const;
    }

    await tx.ticket.update({where:{id:ticket.id},data:{status:'LOSER'}});
    await tx.winningTicket.deleteMany({where:{ticketId:ticket.id}});
    await tx.ticketEvent.create({data:{tenantId:ticket.tenantId,ticketId:ticket.id,type:'MARKED_LOSER',userId:actorId,metadata:{lineWinCounts}}});
    return 'LOSER' as const;
  }

  private tenant(u:Principal){if(!u.tenantId)throw new ForbiddenException('TENANT_ACCESS_REQUIRED');return u.tenantId}
}
