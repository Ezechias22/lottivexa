# LOTTIVEXA — koreksyon pasyèl, pa yon nouvo APK pou enstale kounye a

**Ijans done:** telefòn ki gen tikè offline ki poko senkronize a pa dwe dezenstale, pa dwe fè « efase done », pa dwe dekonekte nan APK aktyèl la, epi pa dwe resevwa yon APK ki gen nouvo siyati. Nan ansyen kòd la, dekoneksyon efase kle chifreman tikè offline yo; koreksyon sa a pwoteje kle a pou vèsyon ki vini apre yo, men li pa repare yon kle ki deja pèdi.

Sa ki chanje nan pake a: tenant-web gen yon `LanguageProvider` ak kle i18n `ht`/`fr` pou meni, koneksyon, rapò ak mesaj reveye sèvè a; ansyen `TreeWalker`/`MutationObserver` ki t ap modifye tèks DOM lan retire nan tenant-web. Ekran rapò mobil la itilize kle i18n tou. Lòt ekran mobil yo toujou sèvi ak ansyen tradiksyon limite, epi lòt apps web yo poko migre: **pa prezante tout sistèm nan kòm tradui nèt.** Widget Flutter natif yo rete an franse paske `flutter_localizations` pa sipòte `ht`. Dashboard tenant web ak tèt ekran mobil la sèvi ak non biznis tenant lan olye de mak platfòm nan; tèks dokiman enpresyon Android lan sèvi ak non biznis la; erè senkronizasyon rejte yo vizib san payload; rapò lavant ka filtre ant 2 dat nan fusò Ayiti epi detaye lavant pa lotri/tiraj ak sesyon maten/swa. Dat fen an enkli jiska 23:59:59.999 lè Ayiti. PDF la toujou yon rezime, li pa gen tout detaye pa tiraj; pa trete li kòm ekspòtasyon konplè.

**Sa ki poko pwouve / pa otomatikman rezoud:** rezilta pa ka monte otomatikman si Render pa gen token ofisyèl sous rezilta a, bindings ki matche ak katalòg lotri yo, ak polling/webhook ki aktive. Backend lan ajoute `GET /api/v1/results/provider/status` (ak pèmisyon `settings.view`) pou montre si opsyon sa yo aktif san revele token an. Pa mete yon nimewo tiraj ki pa verifye. « Enprime nòmal » ouvri dyalòg Android lan; app la poko ka garanti papye a sòti fizikman sou tout modèl enprimant. Teste sou telefòn/printer reyèl la. Estati `APPLIED` vle di sèvè a aksepte tikè a; `PRINT_FOLLOWUP_REQUIRED` mande re-enpresyon manyèl. Estati `REJECTED` mande revizyon, pa efase dosye a.

**Limit i18n aktyèl:** paj tenant yo ki pa koneksyon/rapò toujou gen tèks angle ki ekri dirèkteman nan konpozan yo. Master-admin, merchant-web ak public-site pa gen migrasyon i18n nan pake sa a. Pa deplwaye sa kòm "de lang konplè". Pwochen etap la se migre chak ekran ak kle, revize tradiksyon yo ak yon moun ki pale Kreyòl/Franse, epi ajoute tès ki rejte kle ki manke.

## Enstalasyon kòd san manyen telefòn nan

Pake sa a gen `ENSTALE-KOREKSYON-SAN-PÈDI-CHANJMAN.ps1`. Li verifye SHA-256 de fichye lokal ou te voye yo (enpresyon mobil ak paj tenant web) epi li refize nenpòt lòt chanjman lokal ki konfli **anvan li ranplase okenn fichye**. Li fè yon kopi sekirite fichye ki egziste yo nan `Downloads` epi li pa retire done mobil. Ekstrè ZIP la nan yon dosye tanporè deyò pwojè a, epi lanse script la soti nan dosye sa a. Pa sèvi ak `Expand-Archive -Force` nan rasin pwojè a.

ZIP sa a gen sèlman fichye sous yo korije. Li baze sou `LOTTIVEXA-source-ak-chanjman.zip` ou te voye a, ki te deja gen chanjman resi ki pa komite yo. Apre script enstalasyon an fini, kouri:

```powershell
Set-Location "$env:USERPROFILE\Documents\LOTTIVEXA"
pnpm --filter @lottivexa/api test
pnpm --filter @lottivexa/api build
pnpm --filter @lottivexa/tenant-web build
Set-Location apps/mobile
flutter analyze
```

Si tès yo pase, ou kapab revize epi pibliye chanjman **API ak tenant-web** yo. Pa enstale yon nouvo APK sou telefòn ki gen tikè offline yo. Lè w peze senkronize sou APK ki deja la a, pran foto mesaj erè a (san okenn token), konte tikè k ap tann yo, verifye ID aparèy la apwouve sou tenant lan, epi konpare tikè yo ak lis sèvè a. Si li di `REJECTED`, tanpri pa rekreye menm lavant la manyèlman: gade erè a ak backend lan pou evite doublon.

Pou teste egzanp rapò a sou web la, antre `2026-02-12` nan Soti ak `2026-05-07` nan Rive; kontwole lavant pa lotri/tiraj. Enstalasyon kòd sa a poukont li pa mete ansyen APK la ajou; etap Shorebird la toujou bloke jiskaske done offline yo an sekirite ak siyati Android lan verifye.
