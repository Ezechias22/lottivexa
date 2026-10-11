type StoredDrawResult={source?:unknown;winningKeys?:unknown};

export function isLotteryResultsFeedManagedResult(result:unknown){
  return Boolean(result&&typeof result==='object'&&(result as StoredDrawResult).source==='LOTTERY_RESULTS_FEED');
}

export function hasSameWinningKeys(result:unknown,winningKeys:string[]){
  if(!result||typeof result!=='object')return false;
  const stored=(result as StoredDrawResult).winningKeys;
  return Array.isArray(stored)&&stored.length===winningKeys.length&&stored.every((key,index)=>key===winningKeys[index]);
}

export function isOlderLotteryResultsFeedUpdate(result:unknown,updatedAt:string|undefined){
  if(!result||typeof result!=='object'||!updatedAt)return false;
  const storedUpdatedAt=(result as {sourceUpdatedAt?:unknown}).sourceUpdatedAt;
  if(typeof storedUpdatedAt!=='string')return false;
  const storedTime=Date.parse(storedUpdatedAt),incomingTime=Date.parse(updatedAt);
  return Number.isFinite(storedTime)&&Number.isFinite(incomingTime)&&incomingTime<storedTime;
}
