import 'reflect-metadata';
import helmet from 'helmet';
import {randomUUID} from 'node:crypto';
import {ValidationPipe} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {DocumentBuilder,SwaggerModule} from '@nestjs/swagger';
import {AppModule} from './app.module';
import {ApiExceptionFilter} from './common/filters/api-exception.filter';
import {RequestLoggingInterceptor} from './common/interceptors/request-logging.interceptor';
import {JsonSafeInterceptor} from './common/interceptors/json-safe.interceptor';

async function bootstrap(){
  for(const key of ['DATABASE_URL','JWT_ACCESS_SECRET'])if(!process.env[key])throw new Error(`Missing required environment variable: ${key}`);
  if(process.env.JWT_ACCESS_SECRET!.length<32)throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters');
  const app=await NestFactory.create(AppModule,{bufferLogs:true,rawBody:true});
  app.enableShutdownHooks();
  app.use(helmet({contentSecurityPolicy:false}));
  app.use((req:any,res:any,next:any)=>{req.id=req.headers['x-request-id']||randomUUID();res.setHeader('x-request-id',req.id);next()});
  app.enableCors({origin:(process.env.CORS_ORIGINS??'').split(',').filter(Boolean),credentials:true,methods:['GET','POST','PUT','PATCH','DELETE']});
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true,stopAtFirstError:false}));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor(),new JsonSafeInterceptor());
  const doc=SwaggerModule.createDocument(app,new DocumentBuilder().setTitle('Lottivexa API').setVersion('1.0').addBearerAuth().build());
  if(process.env.SWAGGER_ENABLED!=='false')SwaggerModule.setup('docs',app,doc);
  await app.listen(Number(process.env.PORT??4000),'0.0.0.0');
}
void bootstrap();
