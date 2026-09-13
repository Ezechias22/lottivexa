import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import '../../core/mobile_runtime.dart';
import '../../core/localization/app_language.dart';
import '../../core/printing/printer_transport.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key, required this.runtime});
  final MobileRuntime runtime;
  @override State<SettingsScreen> createState()=>_State();
}
class _State extends State<SettingsScreen>{
  List<Map<String,dynamic>>printers=[],nearby=[];
  String nearbyType='BLUETOOTH';String?message;bool busy=false;
  @override void initState(){super.initState();load();}
  Future<void>load()async{try{final response=await widget.runtime.api.dio.get<List<dynamic>>('/api/v1/printing/printers');if(mounted)setState((){printers=(response.data??[]).map((x)=>Map<String,dynamic>.from(x as Map)).toList();message=null;});}catch(error){if(mounted)setState(()=>message='Printers branch lan pa disponib: $error');}}
  Future<void>sync()async{setState(()=>busy=true);try{await widget.runtime.prepareDevice();await widget.runtime.recover();if(mounted)setState(()=>message=widget.runtime.deviceId==null?'Aparèy la anrejistre otomatikman; administratè a dwe apwouve l pou lavant offline. Pa efase done aplikasyon an.':'Sync fini. ${widget.runtime.pendingCount} ap tann, ${widget.runtime.store.rejectedCount} rejte; ${widget.runtime.printer.pendingCount} enpresyon ap tann.');}catch(error){if(mounted)setState(()=>message='Sync pa fèt: $error');}finally{if(mounted)setState(()=>busy=false);}}
  Future<void>scan(String type)async{setState((){busy=true;nearbyType=type;nearby=[];});try{final found=await widget.runtime.printer.discover(type);if(mounted)setState((){nearby=found;message=found.isEmpty?'Pa gen printer $type ki pare. Limen/pair printer la epi chèche ankò.':'${found.length} printer jwenn. Peze KONEKTE sou printer ou vle a.';});}catch(error){if(mounted)setState(()=>message='Android pa ka chèche printer la: $error');}finally{if(mounted)setState(()=>busy=false);}}
  Future<void>connect(Map<String,dynamic>item)async{setState(()=>busy=true);try{await widget.runtime.printer.connectLocal(nearbyType,item);if(mounted)setState(()=>message='${item['name']??'Printer'} konekte, teste epi chwazi kòm printer default.');}catch(error){if(mounted)setState(()=>message='Koneksyon/enpresyon tès la echwe: $error');}finally{if(mounted)setState(()=>busy=false);}}
  Future<void>test(Map<String,dynamic>printer)async{setState(()=>busy=true);try{await widget.runtime.printer.test(printer);widget.runtime.printer.setDefaultPrinter(printer['id'].toString());if(mounted)setState(()=>message='Test page enprime; ${printer['name']} se printer default la.');}catch(error){if(mounted)setState(()=>message='Printer pa enprime: $error');}finally{if(mounted)setState(()=>busy=false);}}
  @override Widget build(BuildContext context)=>ListView(padding:const EdgeInsets.all(20),children:[
    ValueListenableBuilder<Locale>(valueListenable:AppLanguage.current,builder:(_,locale,__)=>Card(child:ListTile(leading:const Icon(Icons.language),title:Text(AppLanguage.tr('Lang aplikasyon an')),trailing:DropdownButton<String>(value:locale.languageCode,items:const[DropdownMenuItem(value:'ht',child:Text('Kreyòl')),DropdownMenuItem(value:'fr',child:Text('Français'))],onChanged:(value){if(value!=null)AppLanguage.set(value);})))),
    const Text('Sync & Printer',style:TextStyle(fontSize:26,fontWeight:FontWeight.bold)),
    StreamBuilder<List<ConnectivityResult>>(stream:Connectivity().onConnectivityChanged,builder:(_,snapshot){final online=snapshot.data?.any((x)=>x!=ConnectivityResult.none)??true;return ListTile(leading:Icon(online?Icons.cloud_done:Icons.cloud_off),title:Text(online?'Online':'Offline'),subtitle:Text('${widget.runtime.pendingCount} sync • ${widget.runtime.printer.pendingCount} print pending'));}),
    ExpansionTile(title:const Text('Aparèy POS sa a'),children:[ListTile(title:Text(widget.runtime.deviceId==null?'Ap tann apwobasyon administratè a':'Aparèy apwouve'),subtitle:Text(widget.runtime.deviceStatus??'Lè entènèt disponib, aparèy la ap anrejistre otomatikman.')),FilledButton.icon(onPressed:busy?null:sync,icon:const Icon(Icons.sync),label:const Text('Tcheke epi senkronize'))]),
    if(widget.runtime.store.rejectedCount>0||widget.runtime.store.syncErrors.isNotEmpty)Card(child:Padding(padding:const EdgeInsets.all(12),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[const Text('Tikè ki pa senkronize: pa efase done app la.',style:TextStyle(fontWeight:FontWeight.bold)),for(final item in widget.runtime.store.syncErrors)Text('${item['status']}: ${item['error']}')]))),
    const Divider(),const Text('Konekte yon printer',style:TextStyle(fontSize:20,fontWeight:FontWeight.bold)),const Text('Ou pa bezwen antre ID printer la. Limen printer la, epi chèche li.'),const SizedBox(height:10),
    Wrap(spacing:8,runSpacing:8,children:[FilledButton.icon(onPressed:busy?null:()=>scan('BLUETOOTH'),icon:const Icon(Icons.bluetooth_searching),label:const Text('Chèche Bluetooth')),OutlinedButton.icon(onPressed:busy?null:()=>scan('USB'),icon:const Icon(Icons.usb),label:const Text('Chèche USB')),OutlinedButton.icon(onPressed:busy?null:()async{await widget.runtime.printer.useSystemPrinter();if(mounted)setState(()=>message='Enprime nòmal Android chwazi. Apre vant, telefòn lan ap montre lis printer Android yo.');},icon:const Icon(Icons.print),label:const Text('Enprime nòmal')),TextButton.icon(onPressed:()=>NativePrinterTransport('BLUETOOTH').openBluetoothSettings(),icon:const Icon(Icons.settings_bluetooth),label:const Text('Pair nouvo printer'))]),
    for(final item in nearby)Card(child:ListTile(leading:Icon(nearbyType=='BLUETOOTH'?Icons.bluetooth:Icons.usb),title:Text(item['name']?.toString()??'Printer'),subtitle:Text(item['bonded']==true?'Pare pou konekte':'Printer detekte'),trailing:FilledButton(onPressed:busy?null:()=>connect(item),child:const Text('KONEKTE')))),
    if(widget.runtime.printer.localPrinter!=null)Card(color:Colors.green.shade50,child:ListTile(leading:const Icon(Icons.check_circle,color:Colors.green),title:Text('${widget.runtime.printer.localPrinter!['name']}'),subtitle:const Text('Printer mobil default • tikè ap enprime apre vant'))),
    const Divider(),const Text('Printers branch lan',style:TextStyle(fontSize:18,fontWeight:FontWeight.bold)),
    if(printers.isEmpty)const ListTile(title:Text('Pa gen lòt printer configure pou branch sa a.')),
    for(final printer in printers)Card(child:ListTile(leading:const Icon(Icons.print),title:Text(printer['name']?.toString()??'Printer'),subtitle:Text('${printer['connectionType']} • ${printer['status']}'),trailing:widget.runtime.printer.defaultPrinterId==printer['id']?const Icon(Icons.check_circle,color:Colors.green):null,onTap:busy?null:()=>test(printer))),
    if(message!=null)Padding(padding:const EdgeInsets.all(12),child:Text(message!,style:const TextStyle(fontWeight:FontWeight.w600))),
    const Divider(),OutlinedButton.icon(onPressed:widget.runtime.session.clear,icon:const Icon(Icons.logout),label:const Text('Logout'))]);
}
