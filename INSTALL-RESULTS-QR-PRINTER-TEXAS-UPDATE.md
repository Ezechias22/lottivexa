# LOTTIVEXA — Results, QR, printer and Texas update

1. Stop `pnpm dev` with Ctrl+C.
2. Extract this ZIP over the LOTTIVEXA project.
3. Run API tests/build and Flutter analysis before building the APK.
4. Start Docker and `pnpm dev`.
5. In Tenant Console > Games & Draws, click **Enstale / mete katalòg ajou** once. This updates Texas and creates its four schedules without duplicating existing catalog data.
6. Pair a new Bluetooth printer in Android settings, return to LOTTIVEXA, allow Nearby devices/Bluetooth permission, search and connect.

Build the APK with the computer LAN API address:

```powershell
flutter build apk --debug --dart-define=API_URL=http://192.168.15.17:4100
```
