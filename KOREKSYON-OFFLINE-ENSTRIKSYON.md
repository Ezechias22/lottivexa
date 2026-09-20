# LOTTIVEXA — koreksyon offline pou teste, pa deplwaye san validasyon

Pake sa a se yon overlay **apre** commit lokal `9544cac`. Li chanje sèlman Flutter (4 fichye) ak validasyon API senkronizasyon (2 fichye). Li pa gen `.env`, modpas, APK ni baz done.

## Sa li fè

- Apre koneksyon otorize sou entènèt, ouvri ekran Vann pandan entènèt la la pou sove dènye katalòg lotri/tiraj tenant lan sou telefòn nan.
- Katalòg offline ekspire apre 6 èdtan; tiraj ki rive nan cutoff oswa ki manke dat/cutoff pa ka sèvi pou fè demann offline. Se sèlman itilizatè ki gen pèmisyon `tickets.create` ak yon aparèy otorize ki ka mete yon demann an atant.
- Lè yon demann pèdi repons rezo a, app la itilize **menm** `idempotencyKey` pou rekòmanse; sa evite yon dezyèm tikè si sèvè a te deja resevwa premye a. Yon demann offline se **AN ATANT**, pa yon tikè valide/peyab. Backend lan ka rejte l lè senkronizasyon an fèt, pa egzanp si tiraj la deja fèmen.
- Backend `/sync/batch` aksepte epi konsève `resultPosition` (1, 2, 3) ki deja itilize pou jwèt Loto.
- Dashboard machann lan montre kantite ki an atant menm si API a pa disponib.

## Limit kritik

- **Premye koneksyon an bezwen entènèt.** Si w te dekonekte oswa app la pa gen sesyon otorize ki konsève sou telefòn nan, mòd offline pa bay aksè. Nou pa sove modpas pou kontoune otantifikasyon.
- Sistèm nan pa ka verifye an tan reyèl revokasyon kont/abonnman, limit finansye oswa nouvo rezilta pandan offline. Sèvè a valide tout demann lè yo retounen; pa pwomèt yon gayan yon peman sou yon tikè ki an atant.
- Pa chanje tenant/kont sou telefòn ki gen tikè an atant. Ansyen tikè offline a pa gen yon tag pwopriyetè pou yon lòt kont ta ka senkronize li san danje.
- Pake sa a pa repare done yon APK si kle chifreman li deja pèdi. Pa efase done ni dezenstale ansyen APK a. Pou mete app la ajou, siyati pakè Android lan dwe **menm** ak APK ki enstale a; verifye sa avan nenpòt enstalasyon.
- `flutter analyze`/build ak tès API pa te posib nan anviwònman kote pake a te fèt. Tès sou aparèy fizik ak yon kont/tiraj TÈS, san vant reyèl, obligatwa anvan deplwaman pwodiksyon.

## Tès minimòm sou PC (san push ni nouvo APK)

```powershell
pnpm --filter @lottivexa/api test
pnpm --filter @lottivexa/api build
Set-Location apps/mobile
flutter analyze
Set-Location ../..
git diff --check
```

Konsève tikè ki deja an atant sou ansyen APK a. Pa eseye rekreye menm vant lan pou teste koreksyon an.
