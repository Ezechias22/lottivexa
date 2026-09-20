import{BadRequestException,ForbiddenException,Injectable}from'@nestjs/common';import{prisma,Prisma,TicketStatus}from'@lottivexa/database';import{randomBytes,randomUUID}from'node:crypto';import type{Principal}from'../common/guards/jwt-auth.guard';import{isBettingOpen}from'../lottery/lottery-policy';import{chooseOdds,cancellationDeadline,deriveFreeMaryajSelections,isTicketCancellationAllowed,normalizeSelection,priceLines,validateHaitianBetType}from'./ticket-policy';import{presentTicketLines}from'./ticket-line-flags';
@Injectable()export class TicketsService{async create(u:Principal,dto:{drawId:string;idempotencyKey:string;deviceId?:string;lines:{betTypeId:string;selection:Array<number|string>;stake:string;resultPosition?:number}[];freeMaryaj?:{selection:Array<number|string>}[]}){
  const tenantId=this.tenant(u);
  const existing=await prisma.ticket.findUnique({where:{tenantId_idempotencyKey:{tenantId,idempotencyKey:dto.idempotencyKey}},include:{lines:{include:{betType:true}},events:true}});
  if(existing)return presentTicketLines(existing);
  const merchant=await prisma.merchantAccount.findFirst({where:{tenantId,userId:u.sub,status:'ACTIVE',branch:{status:'ACTIVE'}}});
  if(!merchant)throw new ForbiddenException('MERCHANT_ACCOUNT_REQUIRED');
  if(dto.deviceId){
    const device=await prisma.device.findFirst({where:{id:dto.deviceId,tenantId,branchId:merchant.branchId,merchantId:merchant.id,status:{in:['ONLINE','OFFLINE']}}});
    if(!device)throw new ForbiddenException('DEVICE_NOT_AUTHORIZED');
  }
  const draw=await prisma.draw.findFirst({where:{id:dto.drawId,tenantId},include:{game:true}});
  if(!draw||!isBettingOpen(draw.status,draw.closesAt,draw.game.cutoffSeconds))throw new BadRequestException('DRAW_CLOSED');
  let declaredAmount:Prisma.Decimal;
  try{declaredAmount=dto.lines.reduce((sum,line)=>sum.add(new Prisma.Decimal(line.stake)),new Prisma.Decimal(0))}catch{throw new BadRequestException('INVALID_AMOUNT')}
  if(dto.freeMaryaj?.length&&declaredAmount.lt(100))throw new BadRequestException('FREE_MARYAJ_MINIMUM_NOT_REACHED');
  if(dto.freeMaryaj?.length&&dto.freeMaryaj.length!==2)throw new BadRequestException('FREE_MARYAJ_REQUIRES_TWO_LINES');
  const maryaj= dto.freeMaryaj?.length||declaredAmount.gte(100) ? await prisma.betType.findFirst({where:{tenantId,code:'MARYAJ'}}) : null;
  if(dto.freeMaryaj?.length&&!maryaj)throw new BadRequestException('FREE_MARYAJ_NOT_CONFIGURED');
  const betIds=[...new Set([...dto.lines.map(line=>line.betTypeId),...(maryaj?[maryaj.id]:[])])];
  const configured=await prisma.gameBetType.findMany({where:{gameId:draw.gameId,betTypeId:{in:betIds},active:true},include:{betType:true}});
  if(configured.length!==betIds.length)throw new BadRequestException('INVALID_BET_TYPE');
  const odds=await prisma.oddsRule.findMany({where:{tenantId,gameId:draw.gameId,betTypeId:{in:betIds},active:true,startsAt:{lte:new Date()},OR:[{endsAt:null},{endsAt:{gt:new Date()}}]},orderBy:{startsAt:'desc'}});
  const paid=priceLines(dto.lines.map(line=>{
    const bet=configured.find(item=>item.betTypeId===line.betTypeId)!.betType;
    const position=bet.code==='BOLET'?(line.resultPosition??1):line.resultPosition;
    if(position!==undefined&&bet.code!=='BOLET'&&line.resultPosition!==undefined&&![1,2,3].includes(position))throw new BadRequestException('INVALID_RESULT_POSITION');
    const selection=normalizeSelection(bet.code,line.selection);
    const odd=chooseOdds(odds,line.betTypeId,position);
    if(!odd)throw new BadRequestException('ODDS_NOT_CONFIGURED');
    validateHaitianBetType(bet.code,selection);
    return{...line,selection,resultPosition:position,odds:odd.multiplier.toString(),selectionCount:bet.selectionCount,numberMin:bet.numberMin,numberMax:bet.numberMax,allowRepeats:bet.allowRepeats,isPromotional:false};
  })).map(line=>({...line,id:randomUUID()}));
  const amount=paid.reduce((sum,line)=>sum.add(line.stake),new Prisma.Decimal(0));
  let free:typeof paid=[];
  if(amount.gte(100)){
    if(!maryaj)throw new BadRequestException('FREE_MARYAJ_NOT_CONFIGURED');
    const maryajConfig=configured.find(item=>item.betTypeId===maryaj!.id)!.betType;
    const selections=dto.freeMaryaj?.map(item=>item.selection)??deriveFreeMaryajSelections(paid.map(line=>({
      code:configured.find(item=>item.betTypeId===line.betTypeId)!.betType.code,
      selection:line.selection,
    })));
    if(selections.length!==2)throw new BadRequestException('FREE_MARYAJ_NUMBERS_REQUIRED');
    free=priceLines(selections.map(selectionInput=>{
      const selection=normalizeSelection('MARYAJ',selectionInput);
      const odd=chooseOdds(odds,maryaj!.id);
      if(!odd)throw new BadRequestException('ODDS_NOT_CONFIGURED');
      validateHaitianBetType('MARYAJ',selection);
      return{betTypeId:maryaj!.id,selection,resultPosition:undefined,stake:'1',odds:odd.multiplier.toString(),selectionCount:maryajConfig.selectionCount,numberMin:maryajConfig.numberMin,numberMax:maryajConfig.numberMax,allowRepeats:maryajConfig.allowRepeats,isPromotional:true};
    })).map(line=>({...line,id:randomUUID()}));
  }
  const priced=[...paid,...free];
  const potentialWin=priced.reduce((sum,line)=>sum.add(line.potentialWin),new Prisma.Decimal(0));
  await this.checkLimits(tenantId,draw.id,draw.gameId,merchant.id,priced);
  const token=randomBytes(12).toString('hex').toUpperCase();
  const date=new Date();
  const day=String(date.getUTCFullYear()).slice(-2)+String(date.getUTCMonth()+1).padStart(2,'0')+String(date.getUTCDate()).padStart(2,'0');
  const suffix=(randomBytes(4).readUInt32BE(0)%60466176).toString(36).toUpperCase().padStart(5,'0');
  const ticketNumber=day+suffix;
  return prisma.$transaction(async tx=>{
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',tenantId+':'+dto.idempotencyKey);
    const concurrent=await tx.ticket.findUnique({where:{tenantId_idempotencyKey:{tenantId,idempotencyKey:dto.idempotencyKey}},include:{lines:{include:{betType:true}},events:true}});
    if(concurrent)return presentTicketLines(concurrent);
    const ticket=await tx.ticket.create({data:{
      tenantId,ticketNumber,idempotencyKey:dto.idempotencyKey,branchId:merchant.branchId,merchantId:merchant.id,deviceId:dto.deviceId,gameId:draw.gameId,drawId:draw.id,amount,potentialWin,barcode:token,qrCode:`LV1:${tenantId}:${token}`,
      lines:{create:priced.map(line=>({id:line.id,tenantId,betTypeId:line.betTypeId,selection:line.selection,selectionKey:line.selectionKey,stake:line.stake,odds:line.odds,potentialWin:line.potentialWin}))},
      events:{create:{tenantId,type:'CREATED',userId:u.sub,deviceId:dto.deviceId,metadata:free.length?{freeMaryajLineIds:free.map(line=>line.id)}:undefined}},
    }});
    const cash=await tx.ledgerAccount.upsert({where:{tenantId_code:{tenantId,code:'MERCHANT_CASH'}},update:{},create:{tenantId,code:'MERCHANT_CASH',name:'Merchant cash',type:'ASSET'}});
    const sales=await tx.ledgerAccount.upsert({where:{tenantId_code:{tenantId,code:'TICKET_SALES'}},update:{},create:{tenantId,code:'TICKET_SALES',name:'Ticket sales',type:'REVENUE'}});
    await tx.ledgerTransaction.create({data:{tenantId,type:'SALE',referenceType:'Ticket',referenceId:ticket.id,idempotencyKey:'sale:'+dto.idempotencyKey,entries:{create:[{tenantId,accountId:cash.id,debit:amount},{tenantId,accountId:sales.id,credit:amount}]}}});
    return presentTicketLines(await tx.ticket.findUniqueOrThrow({where:{id:ticket.id},include:{lines:{include:{betType:true}},events:true}}));
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
} async cancel(u:Principal,ref:string){const tenantId=this.tenant(u),now=new Date(),merchant=await prisma.merchantAccount.findFirst({where:{tenantId,userId:u.sub,status:'ACTIVE'}});return prisma.$transaction(async tx=>{const ticket=await tx.ticket.findFirst({where:{tenantId,OR:[{ticketNumber:ref},{barcode:ref},{qrCode:ref}],...(merchant?{merchantId:merchant.id}:{})},include:{draw:true,payout:true}});if(!ticket)throw new ForbiddenException('INVALID_TICKET');if(ticket.status!=='VALID'||ticket.payout)throw new BadRequestException(ticket.status==='CANCELLED'?'TICKET_ALREADY_CANCELLED':'INVALID_TICKET_STATUS');if(ticket.draw.status!=='OPEN'||now>=ticket.draw.closesAt)throw new BadRequestException('DRAW_CLOSED');const rule=await tx.lotteryRule.findFirst({where:{tenantId,key:'ticket_cancellation_seconds',active:true,effectiveFrom:{lte:now},OR:[{effectiveTo:null},{effectiveTo:{gt:now}}]},orderBy:{effectiveFrom:'desc'}}),configured=rule?.value&&typeof rule.value==='object'&&!Array.isArray(rule.value)?Number((rule.value as Record<string,unknown>).seconds):Number(process.env.TICKET_CANCELLATION_SECONDS??300),deadline=cancellationDeadline(ticket.createdAt,ticket.draw.closesAt,configured);if(!isTicketCancellationAllowed(now,deadline))throw new BadRequestException('CANCELLATION_WINDOW_CLOSED');const changed=await tx.ticket.updateMany({where:{id:ticket.id,tenantId,status:'VALID'},data:{status:'CANCELLED'}});if(changed.count!==1)throw new BadRequestException('TICKET_CONCURRENTLY_MODIFIED');const originals=await tx.ledgerTransaction.findMany({where:{tenantId,referenceId:ticket.id,status:'POSTED',type:{in:['SALE','COMMISSION']}},include:{entries:true}});for(const original of originals){await tx.ledgerTransaction.update({where:{id:original.id},data:{status:'REVERSED'}});await tx.ledgerTransaction.create({data:{tenantId,type:'ADJUSTMENT',referenceType:'TicketCancellation',referenceId:ticket.id,idempotencyKey:`cancel:${original.id}`,entries:{create:original.entries.map(e=>({tenantId,accountId:e.accountId,debit:e.credit,credit:e.debit}))}}})}await tx.ticketEvent.createMany({data:[{tenantId,ticketId:ticket.id,type:'CANCEL_REQUESTED',userId:u.sub},{tenantId,ticketId:ticket.id,type:'CANCELLED',userId:u.sub,metadata:{deadline:deadline.toISOString()}}]});await tx.auditLog.create({data:{tenantId,userId:u.sub,action:'CANCEL',entityType:'Ticket',entityId:ticket.id,oldValues:{status:'VALID'},newValues:{status:'CANCELLED'}}});return tx.ticket.findUniqueOrThrow({where:{id:ticket.id},include:{lines:{include:{betType:true}},events:true}})},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable})}
 async get(u:Principal,ref:string){const tenantId=this.tenant(u),merchant=await prisma.merchantAccount.findFirst({where:{tenantId,userId:u.sub,status:'ACTIVE'}});const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ref);return presentTicketLines(await prisma.ticket.findFirstOrThrow({where:{tenantId,...(merchant?{branchId:merchant.branchId}:{}),OR:[...(uuid?[{id:ref}]:[]),{ticketNumber:ref},{barcode:ref},{qrCode:ref}]},include:{lines:{include:{betType:true}},events:true,draw:{include:{game:true}},merchant:{include:{branch:true}},winning:true,payout:true}}))}
 async search(u:Principal,q:{status?:TicketStatus;drawId?:string}){const tenantId=this.tenant(u),merchant=await prisma.merchantAccount.findFirst({where:{tenantId,userId:u.sub,status:'ACTIVE'}});return prisma.ticket.findMany({where:{tenantId,...(merchant?{merchantId:merchant.id}:{}),...(q.status?{status:q.status}:{}),...(q.drawId?{drawId:q.drawId}:{})},orderBy:{createdAt:'desc'},take:100,include:{winning:true,events:true,lines:{select:{id:true,isWinner:true}}}}).then(rows=>rows.map(presentTicketLines))}
 private async checkLimits(tenantId:string,drawId:string,gameId:string,merchantId:string,lines:ReturnType<typeof priceLines>){const now=new Date();const limits=await prisma.bettingLimit.findMany({where:{tenantId,active:true,startsAt:{lte:now},OR:[{endsAt:null},{endsAt:{gt:now}}],AND:[{OR:[{scope:'TENANT'},{gameId},{drawId},{scope:'MERCHANT',scopeId:merchantId}]}]}});for(const line of lines)for(const limit of limits.filter(x=>!x.betTypeId||x.betTypeId===line.betTypeId).filter(x=>!x.numberKey||x.numberKey===line.selectionKey)){if(limit.minStake&&line.stake.lt(limit.minStake))throw new BadRequestException('BELOW_MINIMUM_STAKE');if(limit.maxStake&&line.stake.gt(limit.maxStake))throw new BadRequestException('LIMIT_REACHED')}}
 private tenant(u:Principal){if(!u.tenantId)throw new ForbiddenException('TENANT_ACCESS_REQUIRED');return u.tenantId}}
