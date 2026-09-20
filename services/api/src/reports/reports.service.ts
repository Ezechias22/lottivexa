import{BadRequestException,ForbiddenException,Injectable}from'@nestjs/common';
import{prisma}from'@lottivexa/database';
import type{Principal}from'../common/guards/jwt-auth.guard';
import{reportRange}from'./report-policy';
import{buildSalesPdf}from'./pdf-report';
const zone='America/Port-au-Prince';
@Injectable()export class ReportsService{
 async sales(u:Principal,from?:string,to?:string){
  const tenantId=this.tenant(u),range=this.range(from,to),where={tenantId,createdAt:range};
  const[totals,statuses,branches,games,payouts,commissions]=await Promise.all([
   prisma.ticket.aggregate({where,_count:{_all:true},_sum:{amount:true,potentialWin:true,commission:true}}),
   prisma.ticket.groupBy({by:['status'],where,orderBy:{status:'asc'},_count:{_all:true},_sum:{amount:true}}),
   prisma.ticket.groupBy({by:['branchId'],where,orderBy:{branchId:'asc'},_count:{_all:true},_sum:{amount:true}}),
   prisma.ticket.groupBy({by:['gameId'],where,orderBy:{gameId:'asc'},_count:{_all:true},_sum:{amount:true}}),
   prisma.payout.aggregate({where:{tenantId,paidAt:range},_count:{_all:true},_sum:{amount:true}}),
   prisma.commissionTransaction.aggregate({where:{tenantId,createdAt:range},_sum:{commissionAmount:true}}),
  ]);
  const[branchInfo,gameInfo]=await Promise.all([
   prisma.branch.findMany({where:{tenantId,id:{in:branches.map(x=>x.branchId)}},select:{id:true,name:true,code:true}}),
   prisma.game.findMany({where:{tenantId,id:{in:games.map(x=>x.gameId)}},select:{id:true,name:true,code:true}}),
  ]);
  const branchById=new Map(branchInfo.map(x=>[x.id,x])),gameById=new Map(gameInfo.map(x=>[x.id,x]));
  return{period:{from:range.gte,to:range.lte},tickets:{count:totals._count._all,sales:totals._sum.amount?.toString()??'0',potentialWin:totals._sum.potentialWin?.toString()??'0',commission:totals._sum.commission?.toString()??'0'},payouts:{count:payouts._count._all,amount:payouts._sum.amount?.toString()??'0'},commission:commissions._sum.commissionAmount?.toString()??'0',byStatus:statuses.map(x=>({status:x.status,count:x._count._all,amount:x._sum.amount?.toString()??'0'})),byBranch:branches.map(x=>({branchId:x.branchId,branchName:branchById.get(x.branchId)?.name??x.branchId,branchCode:branchById.get(x.branchId)?.code??'',count:x._count._all,amount:x._sum.amount?.toString()??'0'})),byGame:games.map(x=>({gameId:x.gameId,gameName:gameById.get(x.gameId)?.name??x.gameId,gameCode:gameById.get(x.gameId)?.code??'',count:x._count._all,amount:x._sum.amount?.toString()??'0'}))}
 }
 async draws(u:Principal,from?:string,to?:string){
  const tenantId=this.tenant(u),range=this.range(from,to);
  const grouped=await prisma.ticket.groupBy({by:['drawId'],where:{tenantId,createdAt:range},orderBy:{drawId:'asc'},_count:{_all:true},_sum:{amount:true}});
  const draws=await prisma.draw.findMany({where:{tenantId,id:{in:grouped.map(x=>x.drawId)}},select:{id:true,drawNumber:true,drawDate:true,resultAt:true,opensAt:true,closesAt:true,game:{select:{name:true,code:true}}}});
  const byId=new Map(draws.map(draw=>[draw.id,draw]));
  return{period:{from:range.gte,to:range.lte},byDraw:grouped.map(item=>{
   const draw=byId.get(item.drawId),sessionTime=draw?.resultAt??draw?.closesAt??draw?.opensAt;
   const hour=sessionTime?Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone:zone}).format(sessionTime)):NaN;
   return{drawId:item.drawId,drawNumber:draw?.drawNumber??'',gameName:draw?.game.name??'',gameCode:draw?.game.code??'',drawDate:draw?.drawDate,drawTime:sessionTime,session:Number.isFinite(hour)?hour<12?'MORNING':'EVENING':'UNKNOWN',count:item._count._all,amount:item._sum.amount?.toString()??'0'};
  }).sort((a,b)=>(a.drawDate?.getTime()??0)-(b.drawDate?.getTime()??0)||a.gameName.localeCompare(b.gameName)||a.session.localeCompare(b.session))}
 }
 async pdf(u:Principal,from?:string,to?:string){const tenantId=this.tenant(u),[report,tenant]=await Promise.all([this.sales(u,from,to),prisma.tenant.findUniqueOrThrow({where:{id:tenantId},select:{legalName:true,branding:{select:{businessName:true}},settings:{select:{currency:true}}}})]);return buildSalesPdf(report,tenant.branding?.businessName??tenant.legalName,tenant.settings?.currency??'HTG')}
 private range(from?:string,to?:string){try{return reportRange(from,to)}catch{throw new BadRequestException('INVALID_DATE_RANGE')}}
 private tenant(u:Principal){if(!u.tenantId)throw new ForbiddenException('TENANT_ACCESS_REQUIRED');return u.tenantId}
}
