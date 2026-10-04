import{BadRequestException,ForbiddenException,Injectable}from'@nestjs/common';import{prisma,Prisma,TicketStatus}from'@lottivexa/database';import{randomBytes,randomUUID}from'node:crypto';import type{Principal}from'../common/guards/jwt-auth.guard';import{isBettingOpen}from'../lottery/lottery-policy';import{blockedNumberMatches,chooseOdds,isNumberBlocked,cancellationDeadline,isTicketCancellationAllowed,isTenantCancellationEligible,normalizeSelection,priceLines,validateHaitianBetType}from'./ticket-policy';import{presentTicketLines}from'./ticket-line-flags';import{resolveFreeMaryajPolicy,randomFreeMaryajSelections}from'./free-maryaj-policy';import{currencyForOffice}from'../branches/office-currency-policy';import{officeCountryFromSettings}from'../branches/office-location-policy';import{postTicketCommission}from'../commissions/commission-processor.service';
@Injectable()export class TicketsService{async create(u:Principal,dto:{drawId:string;idempotencyKey:string;deviceId?:string;lines:{betTypeId:string;selection:Array<number|string>;stake:string;resultPosition?:number}[];freeMaryaj?:{selection:Array<number|string>}[]}){
  const tenantId=this.tenant(u);
  const existing=await prisma.ticket.findUnique({where:{tenantId_idempotencyKey:{tenantId,idempotencyKey:dto.idempotencyKey}},include:{lines:{include:{betType:true}},events:{select:{type:true,metadata:true,createdAt:true},orderBy:[{createdAt:'asc'},{id:'asc'}]}}});
  if(existing)return presentTicketLines(existing);
  const merchant=await prisma.merchantAccount.findFirst({where:{tenantId,userId:u.sub,status:'ACTIVE',branch:{status:'ACTIVE'}},include:{branch:true}});
  if(!merchant)throw new ForbiddenException('MERCHANT_ACCOUNT_REQUIRED');
  const tenant=await prisma.tenant.findUniqueOrThrow({where:{id:tenantId},select:{jurisdictionCode:true}});
  const officeCountry=officeCountryFromSettings(merchant.branch.settings,tenant.jurisdictionCode);
  const currencyCode=currencyForOffice(merchant.branch.settings,tenant.jurisdictionCode);
  if(dto.deviceId){
    const device=await prisma.device.findFirst({where:{id:dto.deviceId,tenantId,branchId:merchant.branchId,merchantId:merchant.id,status:{in:['ONLINE','OFFLINE']}}});
    if(!device)throw new ForbiddenException('DEVICE_NOT_AUTHORIZED');
  }
  const draw=await prisma.draw.findFirst({where:{id:dto.drawId,tenantId},include:{game:true}});
  if(!draw||!isBettingOpen(draw.status,draw.closesAt,draw.game.cutoffSeconds))throw new BadRequestException('DRAW_CLOSED');
  let declaredAmount:Prisma.Decimal;
  try{declaredAmount=dto.lines.reduce((sum,line)=>sum.add(new Prisma.Decimal(line.stake)),new Prisma.Decimal(0))}catch{throw new BadRequestException('INVALID_AMOUNT')}
  const now=new Date();
  const freeRule=await prisma.lotteryRule.findFirst({where:{tenantId,jurisdictionCode:officeCountry,key:'free_maryaj_policy',active:true,effectiveFrom:{lte:now},OR:[{effectiveTo:null},{effectiveTo:{gt:now}}]},orderBy:{effectiveFrom:'desc'}});
  const freePolicy=resolveFreeMaryajPolicy(officeCountry,freeRule?.value);
  const earnsFreeMaryaj=declaredAmount.gte(freePolicy.minimumAmount);
  const maryaj=earnsFreeMaryaj?await prisma.betType.findFirst({where:{tenantId,code:'MARYAJ'}}):null;
  const betIds=[...new Set([...dto.lines.map(line=>line.betTypeId),...(maryaj?[maryaj.id]:[])])];
  const configured=await prisma.gameBetType.findMany({where:{gameId:draw.gameId,betTypeId:{in:betIds},active:true},include:{betType:true}});
  if(configured.length!==betIds.length)throw new BadRequestException('INVALID_BET_TYPE');
  const odds=await prisma.oddsRule.findMany({where:{tenantId,gameId:draw.gameId,betTypeId:{in:betIds},active:true,startsAt:{lte:new Date()},OR:[{endsAt:null},{endsAt:{gt:new Date()}}]},orderBy:{startsAt:'desc'}});
  const paid=priceLines(dto.lines.map(line=>{
    const bet=configured.find(item=>item.betTypeId===line.betTypeId)!.betType;
    const position=line.resultPosition;
    if(position!==undefined&&(!/^LOTO[345]$/.test(bet.code)||![1,2,3].includes(position)))throw new BadRequestException('INVALID_RESULT_POSITION');
    const selection=normalizeSelection(bet.code,line.selection);
    const odd=chooseOdds(odds,line.betTypeId,position);
    if(!odd)throw new BadRequestException('ODDS_NOT_CONFIGURED');
    validateHaitianBetType(bet.code,selection);
    return{...line,selection,resultPosition:position,betTypeCode:bet.code,odds:odd.multiplier.toString(),selectionCount:bet.selectionCount,numberMin:bet.numberMin,numberMax:bet.numberMax,allowRepeats:bet.allowRepeats,isPromotional:false};
  })).map(line=>({...line,id:randomUUID()}));
  const amount=paid.reduce((sum,line)=>sum.add(line.stake),new Prisma.Decimal(0));
  let free:typeof paid=[];
  if(earnsFreeMaryaj){
    if(!maryaj)throw new BadRequestException('FREE_MARYAJ_NOT_CONFIGURED');
    const maryajConfig=configured.find(item=>item.betTypeId===maryaj!.id)!.betType;
    const blockedRules=await prisma.bettingLimit.findMany({where:{tenantId,scope:'NUMBER',active:true,startsAt:{lte:now},OR:[{endsAt:null},{endsAt:{gt:now}}]},select:{numberKey:true,gameId:true,drawId:true,betTypeId:true}});
    const blockedKeys=blockedRules.filter(rule=>(!rule.gameId||rule.gameId===draw.gameId)&&(!rule.drawId||rule.drawId===draw.id)&&(!rule.betTypeId||rule.betTypeId===maryaj.id)).map(rule=>rule.numberKey).filter((key):key is string=>Boolean(key));
    let selections:string[][];
    try{selections=randomFreeMaryajSelections(freePolicy.freeTicketCount,undefined,blockedKeys)}catch{throw new BadRequestException('FREE_MARYAJ_NUMBERS_BLOCKED')}
    free=priceLines(selections.map(selectionInput=>{
      const selection=normalizeSelection('MARYAJ',selectionInput);
      const odd=chooseOdds(odds,maryaj!.id);
      if(!odd)throw new BadRequestException('ODDS_NOT_CONFIGURED');
      validateHaitianBetType('MARYAJ',selection);
      return{betTypeId:maryaj!.id,selection,resultPosition:undefined,betTypeCode:'MARYAJ',stake:'1',odds:freePolicy.payoutAmount??odd.multiplier.toString(),selectionCount:maryajConfig.selectionCount,numberMin:maryajConfig.numberMin,numberMax:maryajConfig.numberMax,allowRepeats:maryajConfig.allowRepeats,isPromotional:true};
    })).map(line=>({...line,id:randomUUID()}));
  }
  const priced=[...paid,...free];
  const potentialWin=priced.reduce((sum,line)=>sum.add(line.potentialWin),new Prisma.Decimal(0));
  await this.checkLimits(tenantId,draw.id,draw.gameId,merchant.id,merchant.branchId,priced);
  const token=randomBytes(12).toString('hex').toUpperCase();
  const date=new Date();
  const day=String(date.getUTCFullYear()).slice(-2)+String(date.getUTCMonth()+1).padStart(2,'0')+String(date.getUTCDate()).padStart(2,'0');
  const suffix=(randomBytes(4).readUInt32BE(0)%60466176).toString(36).toUpperCase().padStart(5,'0');
  const ticketNumber=day+suffix;
  return prisma.$transaction(async tx=>{
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',tenantId+':'+dto.idempotencyKey);
    const concurrent=await tx.ticket.findUnique({where:{tenantId_idempotencyKey:{tenantId,idempotencyKey:dto.idempotencyKey}},include:{lines:{include:{betType:true}},events:{select:{type:true,metadata:true,createdAt:true},orderBy:[{createdAt:'asc'},{id:'asc'}]}}});
    if(concurrent)return presentTicketLines(concurrent);
    const ticket=await tx.ticket.create({data:{
      tenantId,ticketNumber,idempotencyKey:dto.idempotencyKey,branchId:merchant.branchId,merchantId:merchant.id,deviceId:dto.deviceId,gameId:draw.gameId,drawId:draw.id,amount,currencyCode,potentialWin,barcode:token,qrCode:`LV1:${tenantId}:${token}`,
      lines:{create:priced.map(line=>({id:line.id,tenantId,betTypeId:line.betTypeId,selection:line.selection,selectionKey:line.selectionKey,stake:line.stake,odds:line.odds,potentialWin:line.potentialWin}))},
      events:{create:{tenantId,type:'CREATED',userId:u.sub,deviceId:dto.deviceId,metadata:free.length?{freeMaryajLineIds:free.map(line=>line.id)}:undefined}},
    }});
    const cash=await tx.ledgerAccount.upsert({where:{tenantId_code:{tenantId,code:'MERCHANT_CASH'}},update:{},create:{tenantId,code:'MERCHANT_CASH',name:'Merchant cash',type:'ASSET'}});
    const sales=await tx.ledgerAccount.upsert({where:{tenantId_code:{tenantId,code:'TICKET_SALES'}},update:{},create:{tenantId,code:'TICKET_SALES',name:'Ticket sales',type:'REVENUE'}});
    await tx.ledgerTransaction.create({data:{tenantId,type:'SALE',referenceType:'Ticket',referenceId:ticket.id,idempotencyKey:'sale:'+dto.idempotencyKey,entries:{create:[{tenantId,accountId:cash.id,debit:amount},{tenantId,accountId:sales.id,credit:amount}]}}});
    await postTicketCommission(tx,ticket,u.sub);
    return presentTicketLines(await tx.ticket.findUniqueOrThrow({where:{id:ticket.id},include:{lines:{include:{betType:true}},events:{select:{type:true,metadata:true,createdAt:true},orderBy:[{createdAt:'asc'},{id:'asc'}]}}}));
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
} async cancel(u:Principal,ref:string,input?:{reason?:string}){
  const tenantId=this.tenant(u),now=new Date(),reason=String(input?.reason??'').trim();
  const merchant=await prisma.merchantAccount.findFirst({where:{tenantId,userId:u.sub,status:'ACTIVE'}});
  const tenantOverride=!merchant;
  if(tenantOverride){
    const tenantOwner=await prisma.user.findFirst({where:{id:u.sub,tenantId,status:'ACTIVE',deletedAt:null,roles:{some:{role:{code:'TENANT_OWNER'}}}},select:{id:true}});
    if(!tenantOwner)throw new ForbiddenException('TENANT_OWNER_REQUIRED');
    if(reason.length<5)throw new BadRequestException('CANCELLATION_REASON_REQUIRED');
  }
  return prisma.$transaction(async tx=>{
    const ticket=await tx.ticket.findFirst({
      where:{tenantId,OR:[{ticketNumber:ref},{barcode:ref},{qrCode:ref}],...(merchant?{merchantId:merchant.id}:{})},
      include:{draw:true,payout:true,winning:true},
    });
    if(!ticket)throw new ForbiddenException('INVALID_TICKET');
    if(tenantOverride
      ? !isTenantCancellationEligible(ticket.status,Boolean(ticket.payout),Boolean(ticket.winning))
      : ticket.status!=='VALID'||Boolean(ticket.payout)||Boolean(ticket.winning)){
      throw new BadRequestException(ticket.status==='CANCELLED'?'TICKET_ALREADY_CANCELLED':'INVALID_TICKET_STATUS');
    }
    let deadline:Date|undefined;
    if(merchant){
      if(ticket.draw.status!=='OPEN'||now>=ticket.draw.closesAt)throw new BadRequestException('DRAW_CLOSED');
      const rule=await tx.lotteryRule.findFirst({where:{tenantId,key:'ticket_cancellation_seconds',active:true,effectiveFrom:{lte:now},OR:[{effectiveTo:null},{effectiveTo:{gt:now}}]},orderBy:{effectiveFrom:'desc'}});
      const configured=rule?.value&&typeof rule.value==='object'&&!Array.isArray(rule.value)
        ?Number((rule.value as Record<string,unknown>).seconds)
        :Number(process.env.TICKET_CANCELLATION_SECONDS??300);
      deadline=cancellationDeadline(ticket.createdAt,ticket.draw.closesAt,configured);
      if(!isTicketCancellationAllowed(now,deadline))throw new BadRequestException('CANCELLATION_WINDOW_CLOSED');
    }
    const changed=await tx.ticket.updateMany({where:{id:ticket.id,tenantId,status:'VALID'},data:{status:'CANCELLED'}});
    if(changed.count!==1)throw new BadRequestException('TICKET_CONCURRENTLY_MODIFIED');
    const originals=await tx.ledgerTransaction.findMany({where:{tenantId,referenceId:ticket.id,status:'POSTED',type:{in:['SALE','COMMISSION']}},include:{entries:true}});
    for(const original of originals){
      await tx.ledgerTransaction.update({where:{id:original.id},data:{status:'REVERSED'}});
      await tx.ledgerTransaction.create({data:{tenantId,type:'ADJUSTMENT',referenceType:'TicketCancellation',referenceId:ticket.id,idempotencyKey:`cancel:${original.id}`,entries:{create:original.entries.map(entry=>({tenantId,accountId:entry.accountId,debit:entry.credit,credit:entry.debit}))}}});
    }
    const metadata={
      ...(deadline?{deadline:deadline.toISOString()}:{}),
      ...(reason?{reason}:{}),
      tenantOverride,
    };
    await tx.ticketEvent.createMany({data:[
      {tenantId,ticketId:ticket.id,type:'CANCEL_REQUESTED',userId:u.sub,metadata},
      {tenantId,ticketId:ticket.id,type:'CANCELLED',userId:u.sub,metadata},
    ]});
    await tx.auditLog.create({data:{tenantId,userId:u.sub,action:'CANCEL',entityType:'Ticket',entityId:ticket.id,oldValues:{status:'VALID'},newValues:{status:'CANCELLED',...(reason?{reason}:{}),tenantOverride}}});
    return presentTicketLines(await tx.ticket.findUniqueOrThrow({where:{id:ticket.id},include:{lines:{include:{betType:true}},events:{select:{type:true,metadata:true,createdAt:true},orderBy:[{createdAt:'asc'},{id:'asc'}]}}}));
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
} async get(u:Principal,ref:string){const tenantId=this.tenant(u),merchant=await prisma.merchantAccount.findFirst({where:{tenantId,userId:u.sub,status:'ACTIVE'}});const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ref);return presentTicketLines(await prisma.ticket.findFirstOrThrow({where:{tenantId,...(merchant?{branchId:merchant.branchId}:{}),OR:[...(uuid?[{id:ref}]:[]),{ticketNumber:ref},{barcode:ref},{qrCode:ref}]},include:{lines:{include:{betType:true}},events:{select:{type:true,metadata:true,createdAt:true},orderBy:[{createdAt:'asc'},{id:'asc'}]},draw:{include:{game:true}},ticketDraws:{include:{draw:{include:{game:true}}}},merchant:{include:{branch:true}},winning:true,payout:true}}))}
 async search(u:Principal,q:{status?:TicketStatus;drawId?:string}){const tenantId=this.tenant(u),merchant=await prisma.merchantAccount.findFirst({where:{tenantId,userId:u.sub,status:'ACTIVE'}});return prisma.ticket.findMany({where:{tenantId,...(merchant?{merchantId:merchant.id}:{}),...(q.status?{status:q.status}:{}),...(q.drawId?{OR:[{drawId:q.drawId},{ticketDraws:{some:{drawId:q.drawId}}}]}:{})},orderBy:{createdAt:'desc'},take:100,include:{winning:true,payout:true,draw:{include:{game:true}},events:{select:{type:true,metadata:true,createdAt:true},orderBy:[{createdAt:'asc'},{id:'asc'}]},ticketDraws:{include:{draw:{include:{game:true}}}},lines:{select:{id:true,isWinner:true}}}}).then(rows=>rows.map(presentTicketLines))}
 private async checkLimits(tenantId:string,drawId:string,gameId:string,merchantId:string,branchId:string,lines:ReturnType<typeof priceLines>){
  const now=new Date();
  const limits=await prisma.bettingLimit.findMany({where:{tenantId,active:true,startsAt:{lte:now},OR:[{endsAt:null},{endsAt:{gt:now}}],scope:{in:['TENANT','BRANCH','MERCHANT','GAME','DRAW','BET_TYPE','NUMBER']}},include:{betType:{select:{code:true}}}});
  const applies=(limit:any,line:any)=>limit.scope==='TENANT'
    ||(limit.scope==='BRANCH'&&limit.scopeId===branchId)
    ||(limit.scope==='MERCHANT'&&limit.scopeId===merchantId)
    ||(limit.scope==='GAME'&&(limit.gameId===gameId||limit.scopeId===gameId))
    ||(limit.scope==='DRAW'&&(limit.drawId===drawId||limit.scopeId===drawId))
    ||(limit.scope==='BET_TYPE'&&(limit.betTypeId===line.betTypeId||limit.scopeId===line.betTypeId))
    ||(limit.scope==='NUMBER'&&(!limit.gameId||limit.gameId===gameId)&&(!limit.drawId||limit.drawId===drawId));
  for(const line of lines){
    const code=(line as any).betTypeCode??(line as any).code;
    const matching=limits.filter(x=>applies(x,line)).filter(x=>!x.betTypeId||x.betTypeId===line.betTypeId).filter(x=>blockedNumberMatches(x.numberKey,line.selectionKey,code));
    if(isNumberBlocked(matching,{gameId,drawId},{betTypeId:line.betTypeId,selectionKey:line.selectionKey,betTypeCode:code}))throw new BadRequestException('NUMBER_BLOCKED');
    for(const limit of matching){
      if(limit.scope==='NUMBER'&&limit.numberKey&&limit.maxStake?.eq(0))continue;
      if(limit.minStake&&line.stake.lt(limit.minStake))throw new BadRequestException('BELOW_MINIMUM_STAKE');
      if(limit.maxStake&&line.stake.gt(limit.maxStake))throw new BadRequestException('LIMIT_REACHED');
    }
  }
 }
 private tenant(u:Principal){if(!u.tenantId)throw new ForbiddenException('TENANT_ACCESS_REQUIRED');return u.tenantId}}
