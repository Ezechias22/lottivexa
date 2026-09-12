import 'dart:convert';
import 'package:uuid/uuid.dart';
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
  Future<void> printWithSystem(Map<String,dynamic>ticket)=>NativePrinterTransport.systemPrint(encoder.plain(ticket));
  Future<void> queueConfirmedTicket(Map<String, dynamic> ticket) async {
    final printerId=defaultPrinterId,ticketId=ticket['id']?.toString();
    if(printerId==null||ticketId==null)return;
    store.enqueuePrint(id:const Uuid().v7(),ticketId:ticketId,printerId:printerId,encryptedPayload:await cipher.encrypt(ticket));
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
