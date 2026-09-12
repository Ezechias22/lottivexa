#!/usr/bin/env python3
import json,os,sys,urllib.request
action=sys.argv[1] if len(sys.argv)>1 else ''
if action not in ('present','cleanup'): raise SystemExit('usage: acme-dns-hook.py present|cleanup')
url=os.environ.get('ACME_DNS_ADAPTER_URL',''); key=os.environ.get('ACME_DNS_ADAPTER_KEY','')
domain=os.environ.get('CERTBOT_DOMAIN',''); validation=os.environ.get('CERTBOT_VALIDATION','')
if not url or not key or not domain or not validation: raise SystemExit('ACME DNS adapter environment is incomplete')
payload=json.dumps({'action':action,'domain':domain,'recordType':'TXT','name':'_acme-challenge.'+domain.removeprefix('*.'),'value':validation}).encode()
request=urllib.request.Request(url,data=payload,method='POST',headers={'content-type':'application/json','authorization':'Bearer '+key,'idempotency-key':action+':'+domain+':'+validation})
with urllib.request.urlopen(request,timeout=30) as response:
  if response.status<200 or response.status>=300: raise SystemExit('DNS adapter rejected challenge')
