import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../localization/app_language.dart';
import '../network/api_client.dart';
import '../offline/offline_store.dart';
import '../offline/payload_cipher.dart';
import 'escpos_encoder.dart';
import 'printer_transport.dart';

class MobilePrintService {
  MobilePrintService({required this.store, required this.cipher, required this.api});
  final OfflineStore store;
  final PayloadCipher cipher;
  final ApiClient api;
  final encoder = EscPosEncoder();
  bool running = false;
  int get pendingCount => store.pendingPrintCount;
  String? get defaultPrinterId => store.setting('default_printer_id');
  Map<String, dynamic>? get localPrinter {
    final raw = store.setting('local_printer');
    return raw == null ? null : Map<String, dynamic>.from(jsonDecode(raw) as Map);
  }
  void setDefaultPrinter(String id) => store.setSetting('default_printer_id', id);
  Future<List<Map<String, dynamic>>> discover(String type) => NativePrinterTransport(type).discover();
  Future<void> connectLocal(String type, Map<String, dynamic> device) async {
    final printer = <String, dynamic>{'id':'LOCAL','name':device['name']?.toString()??'Printer mobil','connectionType':type,'configuration':device};
    await test(printer);
    store.setSetting('local_printer', jsonEncode(printer));
    setDefaultPrinter('LOCAL');
  }
  Future<void> useSystemPrinter() async { const printer=<String,dynamic>{'id':'SYSTEM','name':'Enprime nòmal Android','connectionType':'SYSTEM','configuration':<String,dynamic>{}};store.setSetting('local_printer',jsonEncode(printer));setDefaultPrinter('LOCAL'); }
  Future<void> printWithSystem(Map<String,dynamic>ticket)async{
    final value=(ticket['qrCode']??ticket['ticketNumber']??ticket['id'])?.toString();
    String? qrImageBase64;
    if(value!=null&&value.isNotEmpty){
      final painter=QrPainter(data:value,version:QrVersions.auto,gapless:true);
      final image=await painter.toImageData(320,format:ui.ImageByteFormat.png);
      if(image!=null)qrImageBase64=base64Encode(image.buffer.asUint8List(image.offsetInBytes,image.lengthInBytes));
    }
    await NativePrinterTransport.systemPrint(encoder.plain(ticket),ticket['businessName']?.toString()??'Bolet',qrImageBase64:qrImageBase64,logoDataUri:ticket['logoDataUri']?.toString());
  }
  Future<Map<String,dynamic>> withReceiptBranding(Map<String,dynamic> ticket) async {
    final token = api.session.accessToken;
    if (token == null) throw StateError('RECEIPT_LOGIN_REQUIRED');
    final claims = jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(token.split('.')[1])))) as Map<String,dynamic>;
    final tenantId = claims['tenantId']?.toString();
    if (tenantId == null || tenantId.isEmpty) throw StateError('RECEIPT_TENANT_REQUIRED');
    var fullTicket = Map<String, dynamic>.from(ticket);
    fullTicket['language'] = AppLanguage.current.value.languageCode;
    final reference = ticket['ticketNumber']?.toString();
    if (reference != null && reference.isNotEmpty) {
      try {
        final response = await api.dio.get<Map<String, dynamic>>('/api/v1/tickets/${Uri.encodeComponent(reference)}');
        fullTicket = {...fullTicket, ...?response.data};
      } catch (_) { /* Keep the confirmed sale payload if its detail request is unavailable. */ }
    }
    try {
      final response = await api.dio.get<Map<String, dynamic>>('/api/v1/merchants/me/dashboard');
      fullTicket['currency'] = response.data?['currency'] ?? fullTicket['currency'] ?? 'USD';
      fullTicket['businessName'] = response.data?['businessName'] ?? fullTicket['businessName'];
    } catch (_) { fullTicket['currency'] ??= 'USD'; }
    final settingKey = 'receipt_business_name_$tenantId';
    final logoSettingKey = 'receipt_logo_$tenantId';
    var cachedLogo = store.setting(logoSettingKey);
    try {
      final response = await api.dio.get<Map<String,dynamic>>('/api/v1/printing/receipt-branding');
      final name = response.data?['businessName']?.toString().trim();
      if (name != null && name.isNotEmpty) store.setSetting(settingKey, name);
      cachedLogo = response.data?['logoUrl']?.toString().trim() ?? '';
      store.setSetting(logoSettingKey, cachedLogo!);
    } catch (_) { /* Offline: use the last verified business name for this tenant. */ }
    final name = store.setting(settingKey);
    if (name == null || name.trim().isEmpty) throw StateError('RECEIPT_BUSINESS_NAME_REQUIRED');
    final logoUrl = (cachedLogo?.isNotEmpty == true ? cachedLogo : fullTicket['logoUrl']?.toString())?.trim();
    final logo = logoUrl == null || logoUrl.isEmpty ? null : await _prepareLogo(logoUrl);
    return {
      ...fullTicket,
      'businessName': name,
      if (logoUrl != null && logoUrl.isNotEmpty) 'logoUrl': logoUrl else 'logoUrl': null,
      if (logo != null) 'logoDataUri': logo.$1,
      if (logo != null) 'logoRaster': base64Encode(logo.$2),
    };
  }

  Future<(String, Uint8List)?> _prepareLogo(String source) async {
    try {
      final Uint8List bytes;
      if (source.startsWith('data:image/')) {
        final comma = source.indexOf(',');
        if (comma < 0) return null;
        bytes = base64Decode(source.substring(comma + 1));
      } else if (source.startsWith('https://')) {
        final response = await api.dio.get<List<int>>(source, options: Options(responseType: ResponseType.bytes));
        bytes = Uint8List.fromList(response.data ?? const <int>[]);
      } else {
        return null;
      }
      if (bytes.isEmpty) return null;
      final codec = await ui.instantiateImageCodec(bytes);
      try {
        final frame = await codec.getNextFrame();
        final original = frame.image;
        try {
          final scale = [1.0, 384 / original.width, 128 / original.height].reduce((a, b) => a < b ? a : b);
          final width = (original.width * scale).round().clamp(1, 384).toInt();
          final height = (original.height * scale).round().clamp(1, 128).toInt();
          final recorder = ui.PictureRecorder();
          final canvas = ui.Canvas(recorder);
          canvas.drawImageRect(original, ui.Rect.fromLTWH(0, 0, original.width.toDouble(), original.height.toDouble()), ui.Rect.fromLTWH(0, 0, width.toDouble(), height.toDouble()), ui.Paint()..filterQuality = ui.FilterQuality.medium);
          final resized = await recorder.endRecording().toImage(width, height);
          try {
            final png = await resized.toByteData(format: ui.ImageByteFormat.png);
            final rgba = await resized.toByteData(format: ui.ImageByteFormat.rawRgba);
            if (png == null || rgba == null) return null;
            final rowBytes = (width + 7) ~/ 8;
            final raster = BytesBuilder(copy: false)..add([0x1d, 0x76, 0x30, 0x00, rowBytes & 0xff, (rowBytes >> 8) & 0xff, height & 0xff, (height >> 8) & 0xff]);
            final raw = rgba.buffer.asUint8List(rgba.offsetInBytes, rgba.lengthInBytes);
            for (var y = 0; y < height; y++) {
              for (var xByte = 0; xByte < rowBytes; xByte++) {
                var value = 0;
                for (var bit = 0; bit < 8; bit++) {
                  final x = xByte * 8 + bit;
                  if (x >= width) continue;
                  final offset = (y * width + x) * 4;
                  final alpha = raw[offset + 3];
                  final luminance = (raw[offset] * 299 + raw[offset + 1] * 587 + raw[offset + 2] * 114) ~/ 1000;
                  if (alpha >= 128 && luminance < 170) value |= 0x80 >> bit;
                }
                raster.addByte(value);
              }
            }
            final pngBytes = png.buffer.asUint8List(png.offsetInBytes, png.lengthInBytes);
            return ('data:image/png;base64,${base64Encode(pngBytes)}', raster.takeBytes());
          } finally {
            resized.dispose();
          }
        } finally {
          original.dispose();
        }
      } finally {
        codec.dispose();
      }
    } catch (_) {
      return null;
    }
  }
  Future<void> queueConfirmedTicket(Map<String, dynamic> ticket) async {
    final printerId=defaultPrinterId,ticketId=ticket['id']?.toString();
    final payload = await withReceiptBranding(ticket);
    if(printerId==null||ticketId==null){await printWithSystem(payload);return;}
    store.enqueuePrint(id:const Uuid().v7(),ticketId:ticketId,printerId:printerId,encryptedPayload:await cipher.encrypt(payload));
    await drain();
  }
  Future<void> drain() async {
    if(running)return;running=true;
    try{for(final row in store.readyPrints()){try{
      final Map<String,dynamic> printer;
      if(row['printer_id']=='LOCAL'&&localPrinter!=null){printer=localPrinter!;}else{final response=await api.dio.get<Map<String,dynamic>>('/api/v1/printing/printers/${row['printer_id']}');printer=response.data!;}
      final payload=await cipher.decrypt(row['encrypted_payload']as String);
      if(printer['connectionType']=='SYSTEM'){await printWithSystem(payload);}else{await _transport(printer['connectionType']?.toString()).write(Map<String,dynamic>.from((printer['configuration']as Map?)??const{}),encoder.ticket(payload));}
      store.printCompleted(row['id']as String);
    }catch(error){final attempts=(row['attempts']as int)+1;if(attempts>=10){store.printRejected(row['id']as String,error.toString());}else{store.printRetry(row['id']as String,attempts,error.toString());}}}}
    finally{running=false;}
  }
  Future<void> test(Map<String,dynamic> printer)=>_transport(printer['connectionType']?.toString()).write(Map<String,dynamic>.from((printer['configuration']as Map?)??const{}),encoder.testPage(printer['name']?.toString()??'Printer'));
  PrinterTransport _transport(String?type)=>type=='NETWORK'?LanPrinterTransport():NativePrinterTransport(type??'UNKNOWN');
}
