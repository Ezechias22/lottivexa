import {createHash} from 'node:crypto';

export const passwordResetHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export const passwordResetExpiry=(now=new Date())=>new Date(now.valueOf()+30*60_000);
export const passwordResetUsable=(record:{expiresAt:Date;usedAt:Date|null},now=new Date())=>record.usedAt===null&&record.expiresAt>now;
