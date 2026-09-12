import{isIP}from'node:net';
export function normalizeDomain(value:string){const domain=value.trim().toLowerCase().replace(/\.$/,'');if(domain.length>253||domain==='localhost'||isIP(domain)||!domain.includes('.')||!domain.split('.').every(x=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))throw new Error('INVALID_DOMAIN');return domain}
export function verificationName(domain:string){return`_lottivexa.${domain}`}
