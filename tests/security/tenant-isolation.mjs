const required=['SECURITY_API_URL','TENANT_A_SLUG','TENANT_A_USERNAME','TENANT_A_PASSWORD','TENANT_B_SLUG','TENANT_B_USERNAME','TENANT_B_PASSWORD','TENANT_A_TICKET'];
for(const key of required)if(!process.env[key])throw new Error(`${key} is required`);
const api=process.env.SECURITY_API_URL.replace(/\/$/,'');
async function request(path,{token,method='GET',body}={}){const response=await fetch(`${api}/api/v1${path}`,{method,headers:{...(token?{authorization:`Bearer ${token}`}:{...{}}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});let payload;try{payload=await response.json()}catch{payload=null}return{status:response.status,payload}}
async function login(slug,username,password){const response=await request('/auth/login',{method:'POST',body:{tenant:slug,username,password}});if(response.status!==201&&response.status!==200)throw new Error(`login failed for ${slug}: ${response.status}`);return response.payload.accessToken}
const tokenA=await login(process.env.TENANT_A_SLUG,process.env.TENANT_A_USERNAME,process.env.TENANT_A_PASSWORD);
const tokenB=await login(process.env.TENANT_B_SLUG,process.env.TENANT_B_USERNAME,process.env.TENANT_B_PASSWORD);
const own=await request(`/tickets/${encodeURIComponent(process.env.TENANT_A_TICKET)}`,{token:tokenA});
if(own.status!==200)throw new Error(`tenant A cannot read its fixture ticket: ${own.status}`);
const cross=await request(`/tickets/${encodeURIComponent(process.env.TENANT_A_TICKET)}`,{token:tokenB});
if(![403,404].includes(cross.status))throw new Error(`TENANT ISOLATION FAILURE: tenant B received ${cross.status}`);
const anonymous=await request('/settings');
if(anonymous.status!==401)throw new Error(`anonymous settings access returned ${anonymous.status}`);
const forged=await request('/settings',{token:`${tokenA.slice(0,-2)}xx`});
if(forged.status!==401)throw new Error(`forged token returned ${forged.status}`);
console.log(JSON.stringify({tenantIsolation:'PASS',anonymousAccess:'PASS',forgedToken:'PASS'}));
