import assert from'node:assert/strict';
import{randomUUID}from'node:crypto';

const api=(process.env.E2E_API_URL??'http://localhost:4000/api/v1').replace(/\/$/,'');
const platformUsername=required('E2E_PLATFORM_USERNAME');
let platformPassword=required('E2E_PLATFORM_PASSWORD');
const run=(process.env.E2E_RUN_ID??Date.now().toString(36)).toLowerCase().replace(/[^a-z0-9]/g,'').slice(-12);
const tenant=`e2e-${run}`,owner=`owner-${run}`,merchant=`merchant-${run}`;
const ownerPassword=`Owner-${run}-A9!secure`,merchantTemporary=`Merchant-${run}-T8!`,merchantPassword=`Merchant-${run}-N7!secure`;
const log=message=>process.stdout.write(`✓ ${message}\n`);

function required(name){const value=process.env[name];if(!value)throw new Error(`${name} is required`);return value}
async function call(path,{token,method='GET',body,expect=[200,201]}={}){const response=await fetch(`${api}${path}`,{method,headers:{...(body===undefined?{}:{'content-type':'application/json'}),...(token?{authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});const text=await response.text();let data;try{data=text?JSON.parse(text):null}catch{data=text}if(!expect.includes(response.status)){throw new Error(`${method} ${path} returned ${response.status}: ${typeof data==='string'?data:JSON.stringify(data)}`)}return{status:response.status,data}}
async function post(path,body,token,expect){return(await call(path,{method:'POST',body,token,expect})).data}
async function login(slug,username,password){return post('/auth/login',{tenant:slug,username,password})}

async function main(){
 let platform=await login('platform',platformUsername,platformPassword);
 if(platform.forcePasswordChange){const rotated=required('E2E_PLATFORM_NEW_PASSWORD');await post('/users/me/change-password',{currentPassword:platformPassword,newPassword:rotated},platform.accessToken);platformPassword=rotated;platform=await login('platform',platformUsername,platformPassword);log('platform password rotated and session renewed')}
 const plan=await post('/plans',{code:`E2E_${run.toUpperCase()}`,name:`E2E lifecycle ${run}`,monthlyPrice:'25.00',yearlyPrice:'250.00',currency:'USD',maxMerchants:5,maxBranches:5,maxDevices:5},platform.accessToken);for(const feature of['finance','device_management','network_printing'])await call(`/plans/${plan.id}/features/${feature}`,{method:'PATCH',token:platform.accessToken,body:{enabled:true}});log('plan and enforced operational features created');
 const provision=await post('/tenants',{slug:tenant,legalName:`Lottivexa E2E ${run}`,ownerEmail:`${owner}@example.test`,ownerUsername:owner,temporaryPassword:ownerPassword,planId:plan.id,interval:'MONTHLY'},platform.accessToken);assert.ok(provision.tenantId);log('tenant, owner, domain, and subscription provisioned atomically');
 const ownerSession=await login(tenant,owner,ownerPassword),admin=ownerSession.accessToken;await call(`/plans/${plan.id}/features/finance`,{method:'PATCH',token:platform.accessToken,body:{enabled:false}});const deniedFinance=await call('/finance/accounts',{token:admin,expect:[403]});assert.equal(deniedFinance.status,403);await call(`/plans/${plan.id}/features/finance`,{method:'PATCH',token:platform.accessToken,body:{enabled:true}});log('backend plan-feature denial and re-enablement verified');
 const branch=await post('/branches',{code:`B${run.toUpperCase()}`,name:'E2E Main Branch',address:'Integration Test'},admin);log('branch created');
 const game=await post('/lottery/games',{code:`G${run.toUpperCase()}`,name:'E2E Bolet',cutoffSeconds:0,resultDigits:2},admin);
 const bet=await post('/lottery/bet-types',{code:`BT${run.toUpperCase()}`,name:'E2E two-number',selectionCount:2,numberMin:0,numberMax:99,allowRepeats:false},admin);
 await post(`/lottery/games/${game.id}/bet-types/${bet.id}`,{},admin);
 const now=Date.now(),draw=await post('/lottery/draws',{gameId:game.id,drawNumber:`D-${run}`,drawDate:new Date(now).toISOString(),opensAt:new Date(now-60_000).toISOString(),closesAt:new Date(now+3_600_000).toISOString(),resultAt:new Date(now+3_660_000).toISOString()},admin);
 await post('/lottery/odds',{gameId:game.id,betTypeId:bet.id,multiplier:'50.00',startsAt:new Date(now-60_000).toISOString()},admin);
 await post(`/lottery/draws/${draw.id}/transition`,{status:'OPEN'},admin);log('game, bet type, odds, and open draw configured');
 const merchantAccount=await post('/merchants',{displayName:'E2E Merchant',merchantNumber:`M-${run}`,username:merchant,temporaryPassword:merchantTemporary,branchId:branch.id},admin);
 const device=await post('/devices',{branchId:branch.id,merchantId:merchantAccount.id,name:'E2E POS',deviceType:'MOBILE_POS',platform:'ANDROID',appVersion:'1.0.0'},admin);
 await post(`/devices/${device.id}/approve`,{},admin);log('merchant and approved device created');
 const printer=await post('/printing/printers',{branchId:branch.id,name:'E2E LAN printer',connectionType:'NETWORK',protocol:'ESC_POS',configuration:{host:'127.0.0.1',port:9100},isDefault:true},admin);
 const templates=(await call('/printing/templates',{token:admin})).data,template=templates.find(x=>x.kind==='TICKET');assert.ok(template?.id);log('printer adapter and ticket template configured');
 let merchantSession=await login(tenant,merchant,merchantTemporary);assert.equal(merchantSession.forcePasswordChange,true);
 await post('/users/me/change-password',{currentPassword:merchantTemporary,newPassword:merchantPassword},merchantSession.accessToken);
 merchantSession=await login(tenant,merchant,merchantPassword);const pos=merchantSession.accessToken;assert.equal(merchantSession.forcePasswordChange,false);log('merchant forced-password flow completed');
 const cash=await post('/cash/session/open',{openingCash:'100.00'},pos);log('cash shift opened');
 const ticketKey=`ticket:${run}:${randomUUID()}`,ticketBody={drawId:draw.id,deviceId:device.id,idempotencyKey:ticketKey,lines:[{betTypeId:bet.id,selection:[12,34],stake:'10.00'}]};
 const[ticket,duplicateTicket]=await Promise.all([post('/tickets',ticketBody,pos),post('/tickets',ticketBody,pos)]);assert.equal(duplicateTicket.id,ticket.id);assert.equal(Number(ticket.amount),10);log('concurrent ticket submission persisted once and returned one ticket');
 const printKey=`print:${run}:${randomUUID()}`,printJob=await post('/printing/jobs',{ticketId:ticket.id,printerId:printer.id,templateId:template.id,idempotencyKey:printKey},pos),duplicatePrint=await post('/printing/jobs',{ticketId:ticket.id,printerId:printer.id,templateId:template.id,idempotencyKey:printKey},pos);assert.equal(duplicatePrint.id,printJob.id);
 const claimed=await post('/printing/jobs/claim',{workerId:`e2e-worker-${run}`,limit:1},admin);assert.equal(claimed[0]?.id,printJob.id);await post(`/printing/jobs/${printJob.id}/complete`,{workerId:`e2e-worker-${run}`},admin);log('print job queued, claimed, and completed');
 await post(`/lottery/draws/${draw.id}/transition`,{status:'CLOSED'},admin);
 await post(`/lottery/draws/${draw.id}/transition`,{status:'RESULT_PENDING'},admin);
 const result=await post(`/results/draws/${draw.id}/publish`,{winningKeys:['12-34']},admin);assert.equal(result.winners,1);
 const winner=(await call(`/tickets/${encodeURIComponent(ticket.ticketNumber)}`,{token:pos})).data;assert.equal(winner.status,'WINNER');log('result published and winning ticket detected');
 const payoutKey=`payout:${run}:${randomUUID()}`,secondPayoutKey=`payout-second:${run}:${randomUUID()}`;
 const competing=await Promise.all([call('/payouts',{method:'POST',token:pos,body:{ticketReference:ticket.ticketNumber,idempotencyKey:payoutKey},expect:[200,201,409]}),call('/payouts',{method:'POST',token:pos,body:{ticketReference:ticket.ticketNumber,idempotencyKey:secondPayoutKey},expect:[200,201,409]})]);
 const paidResponse=competing.find(x=>[200,201].includes(x.status)),blocked=competing.find(x=>x.status===409);assert.ok(paidResponse?.data?.id);assert.ok(blocked);const samePayout=await post('/payouts',{ticketReference:ticket.ticketNumber,idempotencyKey:paidResponse.data.idempotencyKey},pos);assert.equal(samePayout.id,paidResponse.data.id);log('concurrent payout race produced one ledger payout; retry is idempotent and competitor was blocked');
 const closed=await post(`/cash/session/${cash.id}/close`,{actualCash:'0.00'},pos);assert.equal(closed.sessionId,cash.id);
 const report=(await call('/reports/sales',{token:pos})).data;assert.ok(report.tickets.count>=1);assert.ok(report.payouts.count>=1);const pdf=(await call('/reports/sales.pdf',{token:admin})).data;assert.ok(String(pdf).startsWith('%PDF-1.4'));log('cash shift closed and JSON/PDF sales-payout reports reconciled');
 const paid=(await call(`/tickets/${encodeURIComponent(ticket.ticketNumber)}`,{token:pos})).data;assert.equal(paid.status,'PAID');
 process.stdout.write(`\nLOTTIVEXA lifecycle passed for tenant ${tenant}\n`);
}

main().catch(error=>{process.stderr.write(`\nLOTTIVEXA lifecycle failed: ${error.stack??error}\n`);process.exitCode=1});
