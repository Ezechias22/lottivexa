import{Injectable,OnModuleDestroy,OnModuleInit}from'@nestjs/common';
import{prisma}from'@lottivexa/database';
import{hostname}from'node:os';
import{randomUUID}from'node:crypto';
import{deliveryTarget,localDateParts,retryDelay,zonedTimeToUtc}from'./jobs-policy';
import{ResultsService}from'../results/results.service';
import{sendWithResend}from'../notifications/resend-email';

@Injectable()
export class JobsService implements OnModuleInit,OnModuleDestroy{
  constructor(private readonly results:ResultsService){}
  private timer?:NodeJS.Timeout;
  private readonly owner=`${hostname()}:${process.pid}:${randomUUID()}`;
  onModuleInit(){if(process.env.JOBS_ENABLED==='false')return;this.timer=setInterval(()=>void this.tick(),Number(process.env.JOBS_INTERVAL_MS??15000));this.timer.unref();void this.tick()}
  onModuleDestroy(){if(this.timer)clearInterval(this.timer)}
  private async lease(name:string,seconds:number){const now=new Date(),until=new Date(now.valueOf()+seconds*1000);const changed=await prisma.schedulerLease.updateMany({where:{name,lockedUntil:{lt:now}},data:{owner:this.owner,lockedUntil:until}});if(changed.count)return true;try{await prisma.schedulerLease.create({data:{name,owner:this.owner,lockedUntil:until}});return true}catch{return false}}
  private async tick(){if(!await this.lease('platform-maintenance',30))return;try{await this.draws();await this.providerResults();await this.subscriptions();await this.devices();await this.notifications()}catch(error){console.error(JSON.stringify({level:'error',event:'background-job-failed',error:error instanceof Error?error.message:String(error)}))}}
  private async draws(){const now=new Date();await this.generateDraws(now);await prisma.draw.updateMany({where:{status:'SCHEDULED',opensAt:{lte:now},closesAt:{gt:now}},data:{status:'OPEN'}});await prisma.draw.updateMany({where:{status:'OPEN',closesAt:{lte:now}},data:{status:'CLOSED'}})}
  private async generateDraws(now:Date){const schedules=await prisma.gameSchedule.findMany({where:{active:true,game:{status:'ACTIVE',archivedAt:null}},include:{game:{select:{id:true,tenantId:true,code:true}}}});for(const schedule of schedules){for(let offset=0;offset<2;offset++){const target=new Date(now.getTime()+offset*86400000),local=localDateParts(target,schedule.timezone);if(local.weekday!==schedule.weekday)continue;const drawNumber=`${schedule.game.code}-${local.date.replaceAll('-','')}-${schedule.resultAt.replace(':','')}`;const existing=await prisma.draw.findUnique({where:{tenantId_drawNumber:{tenantId:schedule.game.tenantId,drawNumber}},select:{id:true}});if(existing)continue;const owner=await prisma.user.findFirst({where:{tenantId:schedule.game.tenantId,status:'ACTIVE',roles:{some:{role:{code:'TENANT_OWNER'}}}},select:{id:true}});if(!owner)continue;await prisma.draw.create({data:{tenantId:schedule.game.tenantId,gameId:schedule.game.id,drawNumber,drawDate:new Date(`${local.date}T00:00:00Z`),opensAt:zonedTimeToUtc(local.date,schedule.opensAt,schedule.timezone),closesAt:zonedTimeToUtc(local.date,schedule.closesAt,schedule.timezone),resultAt:zonedTimeToUtc(local.date,schedule.resultAt,schedule.timezone),createdById:owner.id}})}}}
  private async providerResults(){await this.results.pollLotteryResultsFeed();await this.results.processProviderEvents()}
  private async subscriptions(){
    const now=new Date(),graceDays=Number(process.env.SUBSCRIPTION_GRACE_DAYS??3);
    const expired=await prisma.subscription.findMany({where:{status:{in:['ACTIVE','TRIAL']},currentPeriodEndsAt:{lte:now}},select:{id:true,tenantId:true,currentPeriodEndsAt:true,graceEndsAt:true}});
    for(const sub of expired){const grace=sub.graceEndsAt??new Date(now.valueOf()+graceDays*86400000),dedupeKey=`subscription-grace:${sub.id}:${sub.currentPeriodEndsAt.toISOString()}`;await prisma.$transaction([prisma.subscription.update({where:{id:sub.id},data:{status:'PAST_DUE',graceEndsAt:grace}}),prisma.subscriptionEvent.create({data:{tenantId:sub.tenantId,subscriptionId:sub.id,type:'GRACE_PERIOD_STARTED',metadata:{graceEndsAt:grace.toISOString()}}}),prisma.notification.upsert({where:{dedupeKey},update:{},create:{tenantId:sub.tenantId,type:'SUBSCRIPTION_EXPIRED',title:'Subscription payment required',body:`Access grace period ends ${grace.toISOString()}`,dedupeKey,status:'SENT',sentAt:now}})])}
    const suspend=await prisma.subscription.findMany({where:{status:'PAST_DUE',graceEndsAt:{lte:now}},select:{id:true,tenantId:true}});
    for(const sub of suspend){await prisma.$transaction([prisma.subscription.update({where:{id:sub.id},data:{status:'SUSPENDED'}}),prisma.tenant.update({where:{id:sub.tenantId},data:{status:'SUSPENDED'}}),prisma.subscriptionEvent.create({data:{tenantId:sub.tenantId,subscriptionId:sub.id,type:'AUTO_SUSPENDED'}})])}
  }
  private devices(){return prisma.device.updateMany({where:{status:'ONLINE',lastSeenAt:{lt:new Date(Date.now()-5*60000)}},data:{status:'OFFLINE'}})}
  private async notifications(){
    const jobs=await prisma.notification.findMany({where:{status:{in:['PENDING','FAILED']},nextAttemptAt:{lte:new Date()},attempts:{lt:8}},take:25,orderBy:{createdAt:'asc'},include:{user:{select:{email:true,phone:true,pushSubscriptions:{where:{active:true},select:{token:true}}}}}});
    for(const job of jobs){
      if(job.channel==='IN_APP'){await prisma.notification.update({where:{id:job.id},data:{status:'SENT',sentAt:new Date()}});continue}
      const url=process.env[`${job.channel}_ADAPTER_URL`],key=process.env[`${job.channel}_ADAPTER_KEY`];
      try{const to=deliveryTarget(job.channel,job.user,job.user?.pushSubscriptions.map(x=>x.token)??[]);if(!to.length)throw new Error(`${job.channel}_RECIPIENT_NOT_CONFIGURED`);if(job.channel==='EMAIL'&&process.env.RESEND_API_KEY)await sendWithResend({id:job.id,to,title:job.title,body:job.body});else{if(!url)throw new Error(`${job.channel}_ADAPTER_NOT_CONFIGURED`);const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json','idempotency-key':job.id,...(key?{authorization:`Bearer ${key}`}:{})},body:JSON.stringify({id:job.id,channel:job.channel,to,title:job.title,body:job.body,data:job.data}),signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error(`PROVIDER_${response.status}`)}await prisma.notification.update({where:{id:job.id},data:{status:'SENT',sentAt:new Date(),error:null,attempts:{increment:1}}})}
      catch(error){const attempts=job.attempts+1;await prisma.notification.update({where:{id:job.id},data:{status:'FAILED',failedAt:new Date(),error:String(error).slice(0,1000),attempts,nextAttemptAt:new Date(Date.now()+retryDelay(attempts)*1000)}})}
    }
  }
}
