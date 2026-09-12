import assert from'node:assert/strict';
const base=(process.env.E2E_PUBLIC_URL??'').replace(/\/$/,'');
if(!base)throw new Error('E2E_PUBLIC_URL is required, for example https://api.staging.example.com');
if(!base.startsWith('https://'))throw new Error('E2E_PUBLIC_URL must use HTTPS');
async function get(path){const response=await fetch(`${base}${path}`);const text=await response.text();let data;try{data=JSON.parse(text)}catch{data=text}return{response,data}}
async function waitReady(){const deadline=Date.now()+Number(process.env.E2E_READY_TIMEOUT_MS??120000);let last='not attempted';while(Date.now()<deadline){try{const{response,data}=await get('/api/v1/ready');last=`${response.status} ${JSON.stringify(data)}`;if(response.ok&&data?.status==='ready'&&data.checks?.database&&data.checks?.redis)return}catch(error){last=String(error)}await new Promise(resolve=>setTimeout(resolve,2000))}throw new Error(`readiness timeout: ${last}`)}
await waitReady();
const health=await get('/api/v1/health');assert.equal(health.response.status,200);assert.equal(health.data.status,'ok');
const hsts=health.response.headers.get('strict-transport-security')??'';assert.match(hsts,/max-age=/i);
assert.equal((health.response.headers.get('x-content-type-options')??'').toLowerCase(),'nosniff');
const anonymous=await get('/api/v1/settings');assert.equal(anonymous.response.status,401);
const attempts=await Promise.all(Array.from({length:8},()=>fetch(`${base}/api/v1/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant:'rate-limit-probe',username:'invalid',password:'invalid-password'})})));
assert.ok(attempts.some(response=>response.status===429),'login rate limit did not return HTTP 429');
process.stdout.write('✓ HTTPS headers, health, readiness, anonymous denial, and login rate limiting passed\n');
