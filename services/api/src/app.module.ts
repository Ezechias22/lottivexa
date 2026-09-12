import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { SubscriptionGuard } from './common/guards/subscription.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { FeatureGuard } from './common/guards/feature.guard';
import { HealthController } from './health/health.controller';
import { MasterModule } from './master/master.module';
import { TenantsModule } from './tenants/tenants.module';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { BillingModule } from './billing/billing.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { BranchesModule } from './branches/branches.module';
import { MerchantsModule } from './merchants/merchants.module';
import { LotteryModule } from './lottery/lottery.module';
import { TicketsModule } from './tickets/tickets.module';
import { ResultsModule } from './results/results.module';
import { PayoutsModule } from './payouts/payouts.module';
import { FinanceModule } from './finance/finance.module';
import { CommissionsModule } from './commissions/commissions.module';
import { CashModule } from './cash/cash.module';
import { PrintingModule } from './printing/printing.module';
import { SyncModule } from './sync/sync.module';
import { DevicesModule } from './devices/devices.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DomainsModule } from './domains/domains.module';
import { SettingsModule } from './settings/settings.module';
import { JobsModule } from './jobs/jobs.module';

@Module({imports:[ConfigModule.forRoot({isGlobal:true}),AuthModule,MasterModule,TenantsModule,PlansModule,SubscriptionsModule,BillingModule,UsersModule,RolesModule,PermissionsModule,BranchesModule,MerchantsModule,LotteryModule,TicketsModule,ResultsModule,PayoutsModule,FinanceModule,CommissionsModule,CashModule,PrintingModule,SyncModule,DevicesModule,ReportsModule,AuditModule,NotificationsModule,DomainsModule,SettingsModule,JobsModule],controllers:[HealthController],providers:[
  {provide:APP_GUARD,useClass:JwtAuthGuard},
  {provide:APP_GUARD,useClass:SubscriptionGuard},
  {provide:APP_GUARD,useClass:FeatureGuard},
  {provide:APP_GUARD,useClass:PermissionsGuard},
]})
export class AppModule {}
