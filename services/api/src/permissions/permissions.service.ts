import{Injectable}from'@nestjs/common';import{prisma}from'@lottivexa/database';@Injectable()export class PermissionsService{list(){return prisma.permission.findMany({orderBy:{code:'asc'}})}}
