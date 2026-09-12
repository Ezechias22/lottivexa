type RequestLike={headers:Record<string,string|string[]|undefined>;ip?:string;socket:{remoteAddress?:string};path:string};
type ResponseLike={setHeader(name:string,value:string):void;status(code:number):{json(body:unknown):unknown}};
type NextFunction=()=>void;

type Bucket={count:number;resetAt:number};
const buckets=new Map<string,Bucket>();
const AUTH_PATHS=new Set(['/api/v1/auth/login','/api/v1/auth/refresh','/api/v1/auth/forgot-password','/api/v1/auth/reset-password']);

function clientIp(request:RequestLike){
  const forwarded=request.headers['x-forwarded-for'];
  return (Array.isArray(forwarded)?forwarded[0]:forwarded?.split(',')[0])?.trim()||request.ip||request.socket.remoteAddress||'unknown';
}

export function securityMiddleware(request:RequestLike,response:ResponseLike,next:NextFunction){
  response.setHeader('Cache-Control','no-store');
  response.setHeader('Pragma','no-cache');
  response.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
  if(!AUTH_PATHS.has(request.path))return next();
  const now=Date.now(),windowMs=15*60_000,limit=request.path.endsWith('/login')?12:8;
  const key=`${clientIp(request)}:${request.path}`,current=buckets.get(key);
  const bucket=!current||current.resetAt<=now?{count:0,resetAt:now+windowMs}:current;
  bucket.count++;buckets.set(key,bucket);
  response.setHeader('RateLimit-Limit',String(limit));
  response.setHeader('RateLimit-Remaining',String(Math.max(0,limit-bucket.count)));
  response.setHeader('RateLimit-Reset',String(Math.ceil(bucket.resetAt/1000)));
  if(bucket.count>limit)return response.status(429).json({statusCode:429,message:'TOO_MANY_REQUESTS',retryAfterSeconds:Math.ceil((bucket.resetAt-now)/1000)});
  if(buckets.size>10_000)for(const [storedKey,value] of buckets)if(value.resetAt<=now)buckets.delete(storedKey);
  next();
}
