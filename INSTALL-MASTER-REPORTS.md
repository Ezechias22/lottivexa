# LOTTIVEXA — Master Reports Dashboard

Mizajou sa a ranplase JSON brit paj **Reports** la ak yon dashboard ki sèvi sèlman ak done reyèl API a:

- kliyan aktif;
- abonnman aktif;
- revni abonnman;
- kantite tikè ak volim vant;
- estati kliyan ak abonnman;
- distribisyon abonnman pa plan;
- afichaj responsive sou òdinatè ak mobil;
- tradiksyon kreyòl/franse.

Li korije tou tradiksyon tèks angle yo lè itilizatè a chwazi kreyòl oswa franse, epi li ranplase JSON paj **Health** la ak yon dashboard sèvis pwofesyonèl.

## Rekiperasyon modpas

- Master Admin kapab retabli modpas tanporè tenant owner la nan paj Clients.
- Tenant Admin kapab retabli modpas yon machann oswa yon lòt itilizatè.
- Reset la revoke ansyen sesyon yo epi fòse itilizatè a chanje modpas nan pwochen koneksyon.

API a, Master Admin ak Tenant Web dwe redeploye apre commit la.

`install-master-reports.ps1` modifye sèlman ti moso entegrasyon ki nesesè nan `page.tsx` ak diksyonè lang lan. Li pa ranplase tout paj Master Admin aktyèl la.
