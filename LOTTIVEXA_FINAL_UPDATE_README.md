# LOTTIVEXA POS consolidated update

This update replaces the technical ticket form with a Haitian selling desk on web and mobile.

Included behavior:

- Automatic 2/3/4/5-digit classification: BOLET, LOTO3, LOTO4 and LOTO5.
- First, second, third and all-position ticket lines.
- Apply-one-price-to-all with individual line price overrides.
- Automatic Maryaj combinations.
- Secure automatic Loto 4; Loto 3 and Loto 5 remain manual.
- Automatic Boul Pe: 00, 11, 22, 33, 44, 55, 66, 77, 88 and 99.
- Mobile ticket history/search/replay/payout and live results.
- Tenant admins with tickets.create permission can access the mobile selling desk.
- Server-driven games/draws refresh every 60 seconds; results refresh every 15 seconds.

After extraction, run from the repository root:

```powershell
pnpm test
pnpm build
```

Then run from `apps/mobile`:

```powershell
flutter pub get
flutter analyze
flutter build apk --debug --dart-define=API_URL=http://192.168.15.17:4100
```
