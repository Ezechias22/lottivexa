import { PrismaClient } from '@prisma/client'; import * as argon2 from 'argon2';
const db=new PrismaClient();
const permissions=['tenants.view','tenants.create','tenants.edit','tenants.suspend','tenants.activate','plans.view','plans.create','plans.edit','plans.delete','subscriptions.view','subscriptions.create','subscriptions.extend','subscriptions.change','subscriptions.suspend','subscriptions.activate','payments.view','payments.create','payments.refund','users.view','users.create','users.edit','users.disable','merchants.view','merchants.create','merchants.edit','merchants.disable','branches.view','branches.create','branches.edit','tickets.view','tickets.create','tickets.cancel','tickets.reprint','tickets.validate','tickets.pay','sales.view','sales.create','sales.reverse','finance.view','finance.deposit','finance.withdraw','finance.adjust','finance.close','reports.view','reports.export','devices.view','devices.register','devices.disable','printers.view','printers.create','printers.configure','settings.view','settings.edit','audit.view'];
async function main(){
 for(const code of permissions) await db.permission.upsert({where:{code},update:{},create:{code}});
 const role=(await db.role.findFirst({where:{tenantId:null,code:'SUPER_ADMIN'}}))??await db.role.create({data:{code:'SUPER_ADMIN',name:'Super Admin',isSystem:true}});
 const all=await db.permission.findMany(); await db.rolePermission.createMany({data:all.map(p=>({roleId:role.id,permissionId:p.id})),skipDuplicates:true});
 const password=process.env.SEED_ADMIN_PASSWORD; if(!password) throw new Error('SEED_ADMIN_PASSWORD is required');
 const username=process.env.SEED_ADMIN_USERNAME??'root'; const user=(await db.user.findFirst({where:{tenantId:null,username}}))??await db.user.create({data:{username,email:process.env.SEED_ADMIN_EMAIL??'admin@localhost',passwordHash:await argon2.hash(password),status:'ACTIVE',forcePasswordChange:true}});
 await db.userRole.upsert({where:{userId_roleId:{userId:user.id,roleId:role.id}},update:{},create:{userId:user.id,roleId:role.id}});
}
main().finally(()=>db.$disconnect());
