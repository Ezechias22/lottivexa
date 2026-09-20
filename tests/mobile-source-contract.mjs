import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../apps/mobile/lib/', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const [app, session, dashboard, hub, resource, sell, tickets, results, encoder, nativePrinter] = await Promise.all([
  read('app/lottivexa_app.dart'), read('core/security/session_store.dart'),
  read('features/admin/admin_dashboard_screen.dart'), read('features/admin/admin_hub_screen.dart'),
  read('features/admin/admin_resource_screen.dart'), read('features/tickets/new_ticket_screen.dart'),
  read('features/tickets/ticket_search_screen.dart'), read('features/results/results_screen.dart'),
  read('core/printing/escpos_encoder.dart'), readFile(new URL('../apps/mobile/android/app/src/main/kotlin/com/lottivexa/mobile/MainActivity.kt', import.meta.url), 'utf8'),
]);

assert.match(session, /isTenantAdmin/);
assert.match(app, /session\.isTenantAdmin \? AdminDashboardScreen/);
assert.match(app, /state\.matchedLocation\.startsWith\('\/admin'\)/);
for (const endpoint of ['/api/v1/reports/sales', '/api/v1/merchants', '/api/v1/branches', '/api/v1/devices', '/api/v1/notifications']) assert.ok(dashboard.includes(endpoint));
for (const permission of ['merchants.view', 'branches.view', 'users.view', 'devices.view', 'printers.view', 'finance.view', 'reports.view']) assert.ok(hub.includes(permission));
for (const endpoint of ['/api/v1/merchants', '/api/v1/branches', '/api/v1/users', '/api/v1/devices', '/api/v1/printing/printers', '/api/v1/finance/trial-balance']) assert.ok(resource.includes(endpoint));
assert.match(resource, /devices\/\$id\/\$action/);
assert.match(resource, /widget\.api\.dio\.patch\('\/api\/v1\/devices\/\$\{row\['id'\]\}'/);
assert.match(resource, /value:'unblock'/);
assert.match(resource, /widget\.api\.dio\.patch\('\/api\/v1\/merchants\/\$\{row\['id'\]\}'/);
assert.match(resource, /widget\.api\.dio\.patch\('\/api\/v1\/users\/\$\{row\['id'\]\}'/);
for (const value of ["2 => 'BOLET'", "3 => 'LOTO3'", "4 => 'LOTO4'", "5 => 'LOTO5'", 'Tout opsyon', 'resultPosition', 'addMaryaj', 'addAutoLoto4', 'addBoulPe', "_betForCode('BOUL_PE')", 'Nòmal · $session']) assert.ok(sell.includes(value));
assert.match(sell, /sourceIds\.contains\(line\.betTypeId\)/);
assert.doesNotMatch(sell, /Boul Pè pa konte kòm Bolet|Chwazi pozisyon Bolet oswa Loto yo|Chanje pri tout liy yo|Maryaj nòmal/);
for (const value of ['/api/v1/tickets', 'Kopye / Rejwe']) assert.ok(tickets.includes(value));
assert.ok(results.includes('/api/v1/lottery/draws'));
assert.match(app, /hasPermission\('tickets\.create'\)/);
assert.match(encoder, /selectionKey/);
assert.match(encoder, /RECEIPT_BUSINESS_NAME_REQUIRED/);
assert.doesNotMatch(encoder, /LV1:/);
assert.match(nativePrinter, /setMediaSize\(receiptMedia\)/);
assert.match(nativePrinter, /@page\{size:58mm \$\{pageHeightCss\}mm/);
assert.match(nativePrinter, /pageHeightMils/);
assert.doesNotMatch(nativePrinter, /500mm/);
assert.doesNotMatch(app + dashboard + hub + resource + sell + tickets + results, /fake|mock data|TODO/i);
console.log('Mobile Admin source contract: passed');
