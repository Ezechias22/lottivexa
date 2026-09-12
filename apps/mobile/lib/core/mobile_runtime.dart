import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:cryptography/cryptography.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';

import 'network/api_client.dart';
import 'offline/offline_store.dart';
import 'offline/offline_ticket_repository.dart';
import 'offline/payload_cipher.dart';
import 'offline/sync_engine.dart';
import 'printing/mobile_print_service.dart';
import 'security/session_store.dart';

class MobileRuntime {
  MobileRuntime._(this.session, this.api, this.store, this.offlineTickets,
      this.printer, this._cipher, this._secure, this.deviceId);

  final SessionStore session;
  final ApiClient api;
  final OfflineStore store;
  final OfflineTicketRepository offlineTickets;
  final MobilePrintService printer;
  final PayloadCipher _cipher;
  final FlutterSecureStorage _secure;
  String? deviceId;
  StreamSubscription<List<ConnectivityResult>>? _connectivity;

  int get pendingCount => store.pendingCount;

  static Future<MobileRuntime> create(SessionStore session) async {
    const secure = FlutterSecureStorage();
    var encoded = await secure.read(key: 'offline_payload_key');
    if (encoded == null) {
      final random = Random.secure();
      final bytes = List<int>.generate(32, (_) => random.nextInt(256));
      encoded = base64Encode(bytes);
      await secure.write(key: 'offline_payload_key', value: encoded);
    }
    final directory = await getApplicationSupportDirectory();
    final store = OfflineStore('${directory.path}/lottivexa.db');
    final cipher = PayloadCipher(SecretKey(base64Decode(encoded)));
    final api = ApiClient(
      session,
      baseUrl: const String.fromEnvironment(
            'API_URL',
            defaultValue: 'https://lottivexa-api.onrender.com',
          ),
    );
    final printer = MobilePrintService(store: store, cipher: cipher, api: api);
    final runtime = MobileRuntime._(
      session,
      api,
      store,
      OfflineTicketRepository(store, cipher),
      printer,
      cipher,
      secure,
      await secure.read(key: 'device_id'),
    );
    runtime._connectivity = Connectivity().onConnectivityChanged.listen((state) {
      final online = state.any((value) => value != ConnectivityResult.none);
      if (online && session.authenticated) {
        unawaited(runtime.recover().onError((_, __) {}));
      }
    });
    return runtime;
  }

  Future<void> setDeviceId(String id) async {
    deviceId = id.trim();
    await _secure.write(key: 'device_id', value: deviceId);
  }

  Future<void> sync() async {
    final id = deviceId;
    if (id == null || id.isEmpty) throw StateError('DEVICE_ID_REQUIRED');
    await SyncEngine(
      store: store,
      cipher: _cipher,
      http: api.dio,
      deviceId: id,
      onTicketConfirmed: (ticket) => printer.queueConfirmedTicket(ticket),
    ).run();
  }

  Future<void> recover() async {
    if (pendingCount > 0) await sync();
    if (printer.pendingCount > 0) await printer.drain();
  }

  Future<void> dispose() async {
    await _connectivity?.cancel();
    store.close();
  }
}
