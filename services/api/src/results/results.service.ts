import {ConflictException,ForbiddenException,Injectable,Logger,OnModuleInit} from '@nestjs/common';
import {prisma,Prisma} from '@lottivexa/database';
import type {Principal} from '../common/guards/jwt-auth.guard';
import {resultWinningKeys} from '../tickets/ticket-policy';
import {calculateLineWinningAmount} from './result-payout-policy';
import {feedDrawNumber,feedDrawTime,feedEventDedupeKey,feedWinningKeys,LotteryResultsFeedEvent,mapLotteryResultsFeedRestRow,parseFeedBindings,pick3Pick4WinningKeys} from './lottery-results-feed';
import {hasSameWinningKeys,isLotteryResultsFeedManagedResult,isOlderLotteryResultsFeedUpdate} from './provider-result-correction-policy';
import {evaluateTicketResults} from './results-policy';
import {checkedDrawVersion,hasCurrentResultCheck,needsWinnerRepair} from './results-reconciliation-policy';
import {presentTicketLines} from '../tickets/ticket-line-flags';
import {drawDateFilter} from '../lottery/draw-date-filter';

@Injectable()
export class ResultsService implements OnModuleInit{
  private lastProviderPoll=0;
  private lastPick3Pick4Reconciliation=0;
  private readonly logger=new Logger(ResultsService.name);

  onModuleInit(){void this.reconcilePublishedTicketResults().catch(error=>this.retryPublishedTicketReconciliation(error))}

  private retryPublishedTicketReconciliation(error:unknown){
    this.logger.error(`Automatic ticket result reconciliation failed: ${error instanceof Error?error.message:String(error)}; retrying in 60 seconds.`);
    const timer=setTimeout(()=>void this.reconcilePublishedTicketResults().catch(nextError=>this.retryPublishedTicketReconciliation(nextError)),60000);
    timer.unref();
  }

  async reconcilePublishedTicketResults(){
    let drawCursor:string|undefined,drawsProcessed=0,ticketsRechecked=0;
    for(;;){
      const draws=await prisma.draw.findMany({where:{status:'RESULT_PUBLISHED',publishedAt:{not:null},...(drawCursor?{id:{gt:drawCursor}}:{})},select:{id:true,tenantId:true,publishedAt:true},orderBy:{id:'asc'},take:100});
      if(!draws.length)break;
      for(const draw of draws){drawsProcessed++;ticketsRechecked+=await this.reconcileDrawTickets(draw)}
      drawCursor=draws[draws.length-1].id;
    }
    this.logger.log(`Automatic ticket result reconciliation complete: ${drawsProcessed} published draws, ${ticketsRechecked} tickets recalculated.`);
    return{drawsProcessed,ticketsRechecked};
  }

  private async reconcileDrawTickets(draw:{id:string;tenantId:string;publishedAt:Date|null}){
    let cursor:string|undefined,rechecked=0;
    for(;;){
      const tickets=await prisma.ticket.findMany({
        where:{tenantId:draw.tenantId,status:{in:['VALID','PENDING','WINNER','LOSER']},payout:{is:null},...(cursor?{id:{gt:cursor}}:{}),AND:[{OR:[{drawId:draw.id},{ticketDraws:{some:{drawId:draw.id}}}]},{OR:[{events:{none:{type:'RESULT_CHECKED',metadata:{path:['checkedDrawVersions'],array_contains:[checkedDrawVersion(draw.id,draw.publishedAt)]}}}},{status:'WINNER',winning:{is:null}},{status:'WINNER',winning:{is:{winningAmount:{lte:0}}}},{status:'WINNER',lines:{none:{isWinner:true}}}]}]},
        select:{id:true},
        orderBy:{id:'asc'},take:100,
      });
      if(!tickets.length)break;
      cursor=tickets[tickets.length-1].id;
      for(const ticket of tickets)if(await this.reconcileOneTicket(draw.tenantId,draw.id,ticket.id))rechecked++;
    }
    return rechecked;
  }

  private async reconcileOneTicket(tenantId:string,drawId:string,ticketId:string){
    for(let attempt=0;attempt<3;attempt++){
      try{
        return await prisma.$transaction(async tx=>{
          const ticket=await tx.ticket.findFirst({
            where:{id:ticketId,tenantId,status:{in:['VALID','PENDING','WINNER','LOSER']},payout:{is:null}},
            include:{
              lines:{include:{betType:{select:{code:true}}}},
              winning:true,
              merchant:{select:{userId:true}},
              draw:{select:{id:true,gameId:true,status:true,result:true,publishedAt:true}},
              ticketDraws:{include:{draw:{select:{id:true,gameId:true,status:true,result:true,publishedAt:true}}}},
              events:{where:{type:'RESULT_CHECKED'},select:{type:true,metadata:true}},
            },
          });
          if(!ticket)return false;
          const drawRows=[ticket.draw,...(ticket.ticketDraws??[]).map((item:any)=>item.draw)].filter(Boolean);
          const targetDraw=drawRows.find((item:any)=>item.id===drawId);
          if(!targetDraw||targetDraw.status!=='RESULT_PUBLISHED'||!targetDraw.publishedAt)return false;
          const checked=hasCurrentResultCheck(ticket.events,drawId,targetDraw.publishedAt);
          const hasWinningLine=ticket.lines.some((line:any)=>line.isWinner===true);
          const winningAmount=Number(ticket.winning?.winningAmount??0);
          if(checked&&!needsWinnerRepair(ticket.status,winningAmount,hasWinningLine))return false;
          await this.recalculateTicket(tx,ticket,null,drawId,false);
          return true;
        },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
      }catch(error){
        const code=error&&typeof error==='object'&&'code' in error?String((error as {code:unknown}).code):'';
        if(code!=='P2034'||attempt===2)throw error;
      }
    }
    return false;
  }

  async providerStatus(){
    let bindingCount=0,bindingsValid=true;
    try{bindingCount=parseFeedBindings(process.env.LOTTERY_RESULTS_FEED_BINDINGS).length}catch{bindingsValid=false}
    const where={provider:'lottery-results-feed'};
    const[pendingEventCount,failedEventCount,waitingForPick3Pick4Count]=await Promise.all([
      prisma.providerResultEvent.count({where:{...where,status:'PENDING'}}),
      prisma.providerResultEvent.count({where:{...where,status:'FAILED'}}),
      prisma.providerResultEvent.count({where:{...where,status:'APPLIED',error:'WAITING_FOR_PICK3_PICK4_PAIR'}}),
    ]);
    return{pollEnabled:process.env.LOTTERY_RESULTS_FEED_POLL_ENABLED==='true',tokenConfigured:Boolean(process.env.LOTTERY_RESULTS_FEED_TOKEN),bindingCount,bindingsValid,lastPollAt:this.lastProviderPoll?new Date(this.lastProviderPoll).toISOString():null,webhookConfigured:Boolean(process.env.LOTTERY_RESULTS_FEED_WEBHOOK_SECRET),pendingEventCount,failedEventCount,waitingForPick3Pick4Count};
  }

  async platformDraws(){
    return prisma.draw.findMany({where:{status:{in:['CLOSED','RESULT_PENDING']}},include:{game:{select:{id:true,name:true,code:true,catalogCode:true}}},orderBy:[{resultAt:'desc'},{drawNumber:'desc'}],take:1000});
  }

  async platformWinningTickets(page=1){
    const pageSize=50,safePage=Number.isInteger(page)&&page>0?Math.min(page,100000):1,where={status:{in:['WINNER','PAID'] as any}};
    const[rows,total]=await Promise.all([prisma.ticket.findMany({where,orderBy:{createdAt:'desc'},skip:(safePage-1)*pageSize,take:pageSize,include:{tenant:{select:{slug:true,legalName:true}},merchant:{select:{displayName:true,merchantNumber:true,branch:{select:{name:true}}}},draw:{include:{game:{select:{name:true,code:true,logoUrl:true}}}},ticketDraws:{include:{draw:{include:{game:{select:{name:true,code:true,logoUrl:true}}}}}},winning:true,payout:true,events:{select:{type:true,metadata:true,createdAt:true},orderBy:[{createdAt:'asc'},{id:'asc'}]},lines:{include:{betType:true}}}}),prisma.ticket.count({where})]);
    return{items:rows.map(presentTicketLines),total,page:safePage,pageSize};
  }

  async publishPlatform(u:Principal,drawId:string,result:{winningKeys:string[]}){
    const winningKeys=resultWinningKeys(result);
    const source=await prisma.draw.findUnique({where:{id:drawId},include:{game:{select:{id:true,code:true,catalogCode:true}}}});
    if(!source)throw new ConflictException('DRAW_NOT_FOUND');
    const games=await prisma.game.findMany({
      where:source.game.catalogCode?{catalogCode:source.game.catalogCode}:{id:source.game.id},
      select:{id:true},
    });
    const prefix=`${source.game.code}-`;
    const encoded=source.drawNumber.match(/(?:^|[-_])(\d{8}[-_]\d{4})$/)?.[1];
    const scheduleSuffix=source.drawNumber.startsWith(prefix)?source.drawNumber.slice(prefix.length):(encoded??source.drawNumber);
    const matchingDraws=await prisma.draw.findMany({
      where:{gameId:{in:games.map(game=>game.id)},drawNumber:{endsWith:scheduleSuffix},status:{in:['CLOSED','RESULT_PENDING','RESULT_PUBLISHED']}},
      select:{id:true,tenantId:true,status:true,result:true},
      orderBy:{tenantId:'asc'},
    });
    if(!matchingDraws.length)throw new ConflictException('DRAW_NOT_READY_FOR_RESULT');
    for(const draw of matchingDraws){
      if(draw.status!=='RESULT_PUBLISHED')continue;
      const publishedKeys=(draw.result as {winningKeys?:unknown}|null)?.winningKeys;
      if(!Array.isArray(publishedKeys)||publishedKeys.length!==winningKeys.length||publishedKeys.some((key,index)=>key!==winningKeys[index])){
        throw new ConflictException('DRAW_RESULT_ALREADY_PUBLISHED_DIFFERENTLY');
      }
    }
    let drawsProcessed=0,ticketsProcessed=0,winners=0;
    for(const draw of matchingDraws){
      if(draw.status==='RESULT_PUBLISHED')continue;
      const outcome=await this.publish({...u,tenantId:draw.tenantId,platform:true},draw.id,result);
      drawsProcessed++;
      ticketsProcessed+=outcome.ticketsProcessed;
      winners+=outcome.winners;
    }
    return{drawId,drawsProcessed:drawsProcessed||matchingDraws.length,ticketsProcessed,winners,alreadyPublished:drawsProcessed===0};
  }

  async editPlatform(u:Principal,drawId:string,result:{winningKeys:string[];source?:string;sourceUpdatedAt?:string}){
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

  async latestPublic(tenantSlug:string,date?:string){
    const tenant=await prisma.tenant.findFirst({where:{slug:tenantSlug,status:'ACTIVE'},select:{id:true,branding:{select:{businessName:true,logoUrl:true}}}});
    if(!tenant)return[];
    const dateRange=drawDateFilter(date,date);
    const draws=await prisma.draw.findMany({where:{tenantId:tenant.id,status:'RESULT_PUBLISHED',...(dateRange?{drawDate:dateRange}:{})},include:{game:{select:{name:true,logoUrl:true,catalogCode:true}}},orderBy:{publishedAt:'desc'},take:200});
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
        const applied=await this.applyLotteryResultsFeed(event.payload as LotteryResultsFeedEvent);
        if('waitingForPick3Pick4Pair' in applied&&applied.waitingForPick3Pick4Pair){
          await prisma.providerResultEvent.update({where:{id:event.id},data:{status:'APPLIED',processedAt:new Date(),error:'WAITING_FOR_PICK3_PICK4_PAIR'}});
          continue;
        }
        await prisma.providerResultEvent.update({where:{id:event.id},data:{status:'APPLIED',processedAt:new Date()}});
      }catch(error){
        const message=(error instanceof Error?error.message:String(error)).slice(0,2000);
        await prisma.providerResultEvent.update({where:{id:event.id},data:{status:'FAILED',error:message}});
        this.logger.error(`Lottery results feed event ${event.id} failed: ${message}`);
      }
    }
    await this.reconcileAppliedPick3Pick4Events();
  }

  private async reconcileAppliedPick3Pick4Events(){
    const bindings=parseFeedBindings(process.env.LOTTERY_RESULTS_FEED_BINDINGS);
    const pick3LotteryIds=new Set(bindings.filter(binding=>binding.prizeSource==='PICK3').map(binding=>binding.lotteryId));
    if(!pick3LotteryIds.size)return;
    const interval=Math.max(60_000,Number(process.env.LOTTERY_RESULTS_FEED_POLL_MS??900_000)||900_000);
    const now=Date.now();
    if(now-this.lastPick3Pick4Reconciliation<interval)return;
    const rows=await prisma.providerResultEvent.findMany({
      where:{provider:'lottery-results-feed',status:'APPLIED',createdAt:{gte:new Date(now-3*86400_000)}},
      select:{id:true,payload:true,error:true},orderBy:{createdAt:'desc'},take:1000,
    });
    this.lastPick3Pick4Reconciliation=now;
    let checked=0,updated=0,duplicates=0,failed=0;
    for(const row of rows){
      const event=row.payload as LotteryResultsFeedEvent;
      if(!pick3LotteryIds.has(event.lottery_id??-1)||!event.draw_date||!Array.isArray(event.numbers))continue;
      checked++;
      try{
        const outcome=await this.applyLotteryResultsFeed(event);
        if('waitingForPick3Pick4Pair' in outcome&&outcome.waitingForPick3Pick4Pair)continue;
        if(row.error==='WAITING_FOR_PICK3_PICK4_PAIR')await prisma.providerResultEvent.update({where:{id:row.id},data:{error:null}});
        updated+=outcome.applied;
        duplicates+=outcome.duplicates;
      }catch(error){
        failed++;
        this.logger.warn(`Pick 3/Pick 4 reconciliation failed for lottery ${event.lottery_id}, draw ${event.draw_date}: ${error instanceof Error?error.message:String(error)}`);
      }
    }
    if(checked)this.logger.log(`Pick 3/Pick 4 feed reconciliation checked ${checked} events, updated ${updated} draws, skipped ${duplicates} unchanged draws, failed ${failed}.`);
  }


  async pollLotteryResultsFeed(){
    if(process.env.LOTTERY_RESULTS_FEED_POLL_ENABLED!=='true')return;
    const token=process.env.LOTTERY_RESULTS_FEED_TOKEN;
    const bindings=parseFeedBindings(process.env.LOTTERY_RESULTS_FEED_BINDINGS);
    const interval=Number(process.env.LOTTERY_RESULTS_FEED_POLL_MS??420000);
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
    const bindings=parseFeedBindings(process.env.LOTTERY_RESULTS_FEED_BINDINGS);
    const binding=bindings.find(item=>item.lotteryId===event.lottery_id);
    if(!binding)throw new Error(`LOTTERY_RESULTS_FEED_UNMAPPED:${event.lottery_id}`);
    const time=feedDrawTime(binding,event.draw_type);
    if(!time)throw new Error(`LOTTERY_RESULTS_FEED_DRAW_TYPE_UNMAPPED:${binding.catalogCode}:${event.draw_type??'unknown'}`);
    let winningKeys:string[],sourceUpdatedAt=event.published_at;
    if(binding.prizeSource){
      const pick3Binding=bindings.find(item=>item.catalogCode===binding.catalogCode&&item.prizeSource==='PICK3');
      const pick4Binding=bindings.find(item=>item.catalogCode===binding.catalogCode&&item.prizeSource==='PICK4');
      if(!pick3Binding||!pick4Binding)throw new Error(`INVALID_LOTTERY_RESULTS_FEED_PRIZE_PAIR:${binding.catalogCode}`);
      const [pick3Event,pick4Event]=await Promise.all([
        this.latestLotteryResultsFeedEvent(pick3Binding,event,time),
        this.latestLotteryResultsFeedEvent(pick4Binding,event,time),
      ]);
      if(!pick3Event||!pick4Event)return{applied:0,duplicates:0,missing:0,waitingForPick3Pick4Pair:true};
      const combined=pick3Pick4WinningKeys(pick3Event.numbers??[],pick4Event.numbers??[]);
      if(!combined)throw new Error(`INVALID_PICK3_PICK4_FEED_RESULT:${binding.catalogCode}`);
      winningKeys=combined;
      const updatedTimes=[pick3Event.published_at,pick4Event.published_at].filter((value):value is string=>Boolean(value));
      sourceUpdatedAt=updatedTimes.sort((left,right)=>Date.parse(right)-Date.parse(left))[0];
    }else{
      winningKeys=feedWinningKeys(event.numbers??[]);
    }
    const games=await prisma.game.findMany({where:{catalogCode:binding.catalogCode,status:'ACTIVE',archivedAt:null},select:{id:true,code:true,tenantId:true}});
    let applied=0,duplicates=0,missing=0;
    const feedResult={winningKeys,source:'LOTTERY_RESULTS_FEED',sourceUpdatedAt};
    for(const game of games){
      const drawNumber=feedDrawNumber(game.code,event.draw_date!,time);
      const draw=await prisma.draw.findUnique({where:{tenantId_drawNumber:{tenantId:game.tenantId,drawNumber}},select:{id:true,status:true,result:true}});
      if(!draw){missing++;continue}
      if(draw.status==='RESULT_PUBLISHED'){
        if(!isLotteryResultsFeedManagedResult(draw.result)||hasSameWinningKeys(draw.result,winningKeys)||isOlderLotteryResultsFeedUpdate(draw.result,sourceUpdatedAt)){duplicates++;continue}
        const actor=await prisma.user.findFirst({where:{tenantId:game.tenantId,status:'ACTIVE',roles:{some:{role:{code:'TENANT_OWNER'}}}},select:{id:true,tokenVersion:true}});
        if(!actor){missing++;continue}
        await this.editPlatform({sub:actor.id,tenantId:game.tenantId,permissions:['settings.edit'],platform:false,tokenVersion:actor.tokenVersion},draw.id,feedResult);
        applied++;
        continue;
      }
      const actor=await prisma.user.findFirst({where:{tenantId:game.tenantId,status:'ACTIVE',roles:{some:{role:{code:'TENANT_OWNER'}}}},select:{id:true,tokenVersion:true}});
      if(!actor){missing++;continue}
      await this.publish({sub:actor.id,tenantId:game.tenantId,permissions:['settings.edit'],platform:false,tokenVersion:actor.tokenVersion},draw.id,feedResult);
      applied++;
    }
    return{applied,duplicates,missing};
  }

  private async latestLotteryResultsFeedEvent(binding:ReturnType<typeof parseFeedBindings>[number],reference:LotteryResultsFeedEvent,drawTime:string){
    const prefix=`lottery-results-feed:${binding.lotteryId}:${reference.draw_date}:`;
    const rows=await prisma.providerResultEvent.findMany({
      where:{provider:'lottery-results-feed',dedupeKey:{startsWith:prefix}},
      select:{payload:true,createdAt:true},orderBy:{createdAt:'desc'},take:100,
    });
    const matching=rows.map(row=>({payload:row.payload as LotteryResultsFeedEvent,createdAt:row.createdAt})).filter(row=>
      row.payload.lottery_id===binding.lotteryId&&row.payload.draw_date===reference.draw_date&&
      feedDrawTime(binding,row.payload.draw_type)===drawTime&&Array.isArray(row.payload.numbers),
    );
    matching.sort((left,right)=>{
      const time=(value:LotteryResultsFeedEvent)=>Date.parse(value.published_at??'')||0;
      return time(right.payload)-time(left.payload)||right.createdAt.valueOf()-left.createdAt.valueOf();
    });
    return matching[0]?.payload??(reference.lottery_id===binding.lotteryId?reference:undefined);
  }


  async publish(u:Principal,drawId:string,result:{winningKeys:string[];source?:string;sourceUpdatedAt?:string}){
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
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:10_000,timeout:60_000});
  }

  private ticketsForDraw(tx:Prisma.TransactionClient,tenantId:string,drawId:string){
    return tx.ticket.findMany({
      where:{tenantId,status:{in:['VALID','PENDING','WINNER','LOSER']},OR:[{drawId},{ticketDraws:{some:{drawId}}}]},
      include:{
        lines:{include:{betType:{select:{code:true}}}},
        merchant:{select:{userId:true}},
        draw:{select:{id:true,gameId:true,status:true,result:true,publishedAt:true}},
        ticketDraws:{include:{draw:{select:{id:true,gameId:true,status:true,result:true,publishedAt:true}}}},
      },
    });
  }

  private async recalculateTicket(tx:Prisma.TransactionClient,ticket:any,actorId:string|null,changedDrawId:string,notifyWinner:boolean){
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
    const positionLines=ticket.lines.filter((line:any)=>line.betType.code==='BOLET'||line.betType.code==='BOUL_PE');
    const gameIds=Array.from(new Set<string>(drawRows.map((draw:any)=>String(draw.gameId)).filter((id:string)=>id.length>0)));
    const positionOdds=positionLines.length&&gameIds.length?await tx.oddsRule.findMany({
      where:{tenantId:ticket.tenantId,gameId:{in:gameIds},betTypeId:{in:Array.from(new Set<string>(positionLines.map((line:any)=>String(line.betTypeId))))},active:true,startsAt:{lte:ticket.createdAt},OR:[{endsAt:null},{endsAt:{gt:ticket.createdAt}}]},
      select:{gameId:true,betTypeId:true,resultPosition:true,multiplier:true},
      orderBy:[{startsAt:'desc'},{resultPosition:'asc'}],
    }):[];
    let winningAmount=new Prisma.Decimal(0);
    const lineWinAmounts:{lineId:string;drawId:string;amount:string}[]=[];
    for(const line of ticket.lines){
      const outcome=lineResults.get(line.id)!;
      await tx.ticketLine.update({where:{id:line.id},data:{isWinner:outcome.isWinner}});
      const winningKeys=resultKeysByDraw.get(outcome.drawId);
      const draw=drawById.get(outcome.drawId);
      const linePositionOdds=positionOdds.filter((rule:any)=>rule.betTypeId===line.betTypeId&&rule.gameId===draw?.gameId);
      const lineAmount=outcome.winCount&&outcome.winCount>0&&winningKeys
        ?calculateLineWinningAmount({betTypeCode:line.betType.code,selectionKey:line.selectionKey,winningKeys,winCount:outcome.winCount,stake:line.stake,storedOdds:line.odds,potentialWin:line.potentialWin,positionOdds:linePositionOdds})
        :new Prisma.Decimal(0);
      lineWinAmounts.push({lineId:line.id,drawId:outcome.drawId,amount:lineAmount.toString()});
      if(lineAmount.isPositive())winningAmount=winningAmount.add(lineAmount);
    }
    const allLinesResolved=evaluation.lineResults.every(item=>item.isWinner!==null);
    const allDrawsResolved=evaluation.allDrawsResolved&&allLinesResolved&&evaluation.drawIds.every(id=>drawById.has(id));
    const lineWinCounts=evaluation.lineResults.map(item=>({lineId:item.lineId,drawId:item.drawId,winCount:item.winCount}));
    const checkedDrawVersions=[...resultKeysByDraw.keys()].map(id=>checkedDrawVersion(id,drawById.get(id)?.publishedAt??null));
    await tx.ticketEvent.create({data:{tenantId:ticket.tenantId,ticketId:ticket.id,type:'RESULT_CHECKED',userId:actorId,metadata:{drawId:changedDrawId,checkedDrawVersions,lineWinCounts,lineWinAmounts}}});

    if(!allDrawsResolved){
      await tx.ticket.update({where:{id:ticket.id},data:{status:'PENDING'}});
      await tx.winningTicket.deleteMany({where:{ticketId:ticket.id}});
      return 'PENDING' as const;
    }

    if(winningAmount.isPositive()){
      await tx.ticket.update({where:{id:ticket.id},data:{status:'WINNER'}});
      await tx.winningTicket.upsert({where:{ticketId:ticket.id},update:{winningAmount,detectedAt:new Date()},create:{tenantId:ticket.tenantId,ticketId:ticket.id,winningAmount}});
      await tx.ticketEvent.create({data:{tenantId:ticket.tenantId,ticketId:ticket.id,type:'MARKED_WINNER',userId:actorId,metadata:{winningAmount:winningAmount.toString(),lineWinCounts,lineWinAmounts}}});
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
