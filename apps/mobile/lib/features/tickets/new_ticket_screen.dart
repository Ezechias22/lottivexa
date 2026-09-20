import 'dart:async';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../core/mobile_runtime.dart';

class PosLine {
  PosLine({required this.number, required this.betTypeId, required this.betName, this.position, required this.stake});
  final String number, betTypeId, betName;
  final int? position;
  String stake;
}

class NewTicketScreen extends StatefulWidget {
  const NewTicketScreen({super.key, required this.runtime, this.replayTicket});
  final MobileRuntime runtime;
  final Map<String, dynamic>? replayTicket;
  @override State<NewTicketScreen> createState() => _NewTicketState();
}

class _NewTicketState extends State<NewTicketScreen> {
  final number = TextEditingController(), lineStake = TextEditingController(), allStake = TextEditingController(), maryajNumber = TextEditingController(), maryajStake = TextEditingController(), maryajAutoStake = TextEditingController(), lotoStake = TextEditingController();
  List<dynamic> games = [], draws = [];
  final List<PosLine> lines = [];
  String? drawId, message;
  bool busy = false;
  final Set<int> selectedPositions = {1};
  bool usingOfflineCatalog = false;
  Timer? configurationTimer;

  @override void initState() { super.initState(); load(); configurationTimer = Timer.periodic(const Duration(seconds: 60), (_) => load(silent: true)); }
  @override void dispose() { configurationTimer?.cancel(); number.dispose(); lineStake.dispose(); allStake.dispose(); maryajNumber.dispose(); maryajStake.dispose(); maryajAutoStake.dispose(); lotoStake.dispose(); super.dispose(); }

  Future<void> load({bool silent = false}) async {
    if (!silent) setState(() => busy = true);
    try {
      final values = await Future.wait([widget.runtime.api.dio.get<List<dynamic>>('/api/v1/lottery/games'), widget.runtime.api.dio.get<List<dynamic>>('/api/v1/lottery/draws')]);
      games = values[0].data ?? [];
      draws = (values[1].data ?? []).where((row) => row['status'] == 'OPEN').toList();
      final tenantId = widget.runtime.session.tenantId;
      if (tenantId != null && tenantId.isNotEmpty) {
        widget.runtime.store.setSetting('lottery_catalog_$tenantId', jsonEncode({
          'savedAt': DateTime.now().toUtc().toIso8601String(),
          'games': games,
          'draws': draws,
        }));
      }
      usingOfflineCatalog = false;
      message = null;
      drawId ??= draws.isEmpty ? null : '${draws.first['id']}';
      _restoreReplay();
    } on DioException catch (error) {
      // A server rejection (401/403/etc.) is not an offline signal.
      if (error.response != null) {
        games = [];draws = [];drawId = null;usingOfflineCatalog = false;
        message = 'Sèvè a refize aksè a done POS yo: ${error.response?.statusCode}.';
      } else {
        _restoreOfflineCatalog();
      }
    }
    finally { if (mounted && !silent) setState(() => busy = false); }
  }

  void _restoreOfflineCatalog() {
    final tenantId = widget.runtime.session.tenantId;
    final raw = tenantId == null ? null : widget.runtime.store.setting('lottery_catalog_$tenantId');
    if (raw == null || widget.runtime.deviceId == null || widget.runtime.deviceId!.isEmpty ||
        !widget.runtime.session.hasPermission('tickets.create') || widget.runtime.session.forcePasswordChange) {
      games = [];draws = [];drawId = null;usingOfflineCatalog = false;
      message = 'Done offline yo pa disponib. Konekte sou entènèt, ouvri paj vant lan epi verifye aparèy la anvan ou koupe entènèt.';
      return;
    }
    try {
      final saved = jsonDecode(raw) as Map<String,dynamic>;
      final fetchedAt = DateTime.parse(saved['savedAt'] as String).toUtc();
      final now = DateTime.now().toUtc();
      if (fetchedAt.isAfter(now.add(const Duration(minutes:5))) || now.difference(fetchedAt) > const Duration(hours:6)) throw const FormatException('STALE_CATALOG');
      games = saved['games'] as List<dynamic>;
      draws = (saved['draws'] as List<dynamic>).where((row) {
        if (row is! Map || row['status'] != 'OPEN') return false;
        final closes = DateTime.tryParse('${row['closesAt']}')?.toUtc();
        final cutoff = (row['game'] is Map ? row['game']['cutoffSeconds'] : null);
        final seconds = cutoff is num ? cutoff.toInt() : int.tryParse('$cutoff');
        // Missing cutoff or closing time means we cannot safely accept the bet.
        return closes != null && seconds != null && now.isBefore(closes.subtract(Duration(seconds:seconds)));
      }).toList();
      usingOfflineCatalog = true;
      if (draws.isEmpty) drawId = null;
      else if (!draws.any((row) => '${row['id']}' == drawId)) drawId = '${draws.first['id']}';
      message = 'Mòd offline: tikè yo ap rete AN ATANT. Sèvè a ka refize yo lè koneksyon an retounen.';
      _restoreReplay();
    } catch (_) {
      games = [];draws = [];drawId = null;usingOfflineCatalog = false;
      message = 'Done lotri lokal yo ekspire oswa yo pa valab. Rekonekte sou entènèt pou mete yo ajou.';
    }
  }

  dynamic get selectedDraw => draws.where((row) => '${row['id']}' == drawId).firstOrNull;
  dynamic get selectedGame => games.where((row) => '${row['id']}' == '${selectedDraw?['gameId']}').firstOrNull;
  List<dynamic> get betTypes => (selectedGame?['betTypes'] as List<dynamic>? ?? []).where((row) => row['active'] != false).map((row) => row['betType']).toList();

  void _restoreReplay() {
    final ticket = widget.replayTicket;
    if (ticket == null || lines.isNotEmpty) return;
    for (final raw in ticket['lines'] as List<dynamic>? ?? []) {
      final parts = '${raw['selectionKey']}'.split('@');
      lines.add(PosLine(number: parts.first, betTypeId: '${raw['betTypeId']}', betName: '${raw['betType']?['name'] ?? 'Jwèt'}', position: parts.length == 2 ? int.tryParse(parts.last) ?? 1 : 1, stake: '${raw['stake']}'));
    }
    message = 'Tikè a kopye. Chwazi tiraj la epi verifye pri yo.';
  }

  dynamic _betForDigits(int digits) {
    final code = switch (digits) { 2 => 'BOLET', 3 => 'LOTO3', 4 => 'LOTO4', 5 => 'LOTO5', _ => '' };
    return betTypes.where((bet) => bet['code'] == code).firstOrNull;
  }

  dynamic _betForCode(String code) => betTypes.where((bet) => bet['code'] == code).firstOrNull;

  List<String> get _boletNumbers {
    final boletId = '${_betForCode('BOLET')?['id'] ?? ''}';
    if (boletId.isEmpty) return [];
    return lines.where((line) => line.betTypeId == boletId && RegExp(r'^\d{2}$').hasMatch(line.number)).map((line) => line.number).toSet().toList();
  }
  String drawLabel(dynamic row){final game='${row['game']?['name']??'Lotri'}',draw='${row['drawNumber']}',code='${row['game']?['code']??''}';if(code=='TX'){final period={'1000':'Morning','1227':'Day','1800':'Evening','2212':'Night'}[draw.split('-').last]??'Tiraj';return 'Texas $period';}final closes=DateTime.tryParse('${row['closesAt']}')?.toLocal();return '$game ${closes!=null&&closes.hour<17?'Midi':'Aswè'}';}

  void addMaryaj() {
    final values=_boletNumbers;
    final bet = _betForCode('MARYAJ'), stake = maryajAutoStake.text.trim().replaceAll(',', '.');
    if (bet == null) { setState(() => message = 'Maryaj pa aktive pou tiraj sa a.'); return; }
    if (values.length < 2) { setState(() => message = 'Ajoute omwen 2 liy Bolet de chif; Boul Pè pa konte kòm Bolet.'); return; }
    if ((double.tryParse(stake) ?? 0) <= 0) { setState(() => message = 'Antre pri Maryaj otomatik la.'); return; }
    setState(() {
      for (var first = 0; first < values.length; first++) for (var second = first + 1; second < values.length; second++) lines.add(PosLine(number: '${values[first]}-${values[second]}', betTypeId: '${bet['id']}', betName: '${bet['name']}', stake: stake));
      message = '${values.length} boul Bolet yo sèvi pou jenere Maryaj.';
    });
  }

  void addNormalMaryaj() {
    final parts = maryajNumber.text.trim().split(RegExp(r'\s*[xX×-]\s*'));
    final bet = _betForCode('MARYAJ');
    final stake = maryajStake.text.trim().replaceAll(',', '.');
    if (bet == null || parts.length != 2 || parts.any((part) => !RegExp(r'^\d{2}$').hasMatch(part)) || (double.tryParse(stake) ?? 0) <= 0) {
      setState(() => message = 'Antre Maryaj 15x25 ak yon pri valab; verifye Maryaj aktive pou tiraj la.');
      return;
    }
    setState(() { lines.add(PosLine(number: '${parts[0]}-${parts[1]}', betTypeId: '${bet['id']}', betName: '${bet['name']}', stake: stake)); maryajNumber.clear(); maryajStake.clear(); message = null; });
  }

  void addBoulPe() {
    final bet = _betForCode('BOUL_PE'), stake = allStake.text.trim().replaceAll(',', '.');
    if (bet == null) { setState(() => message = 'Boul Pè pa aktive pou tiraj sa a.'); return; }
    setState(() { for (final value in const ['00','11','22','33','44','55','66','77','88','99']) { lines.add(PosLine(number:value,betTypeId:'${bet['id']}',betName:'${bet['name']}',stake:stake.isEmpty?'0':stake)); } message = null; });
  }

  Future<Set<int>?> chooseLotoOptions() => showDialog<Set<int>>(context: context, builder: (context) => SimpleDialog(title: const Text('Chwazi opsyon Loto'), children: [SimpleDialogOption(onPressed:()=>Navigator.pop(context,{1}),child:const Text('1ye boul')),SimpleDialogOption(onPressed:()=>Navigator.pop(context,{2}),child:const Text('2yèm boul')),SimpleDialogOption(onPressed:()=>Navigator.pop(context,{3}),child:const Text('3yèm boul')),SimpleDialogOption(onPressed:()=>Navigator.pop(context,{1,2,3}),child:const Text('Tout opsyon (1ye, 2yèm, 3yèm)'))]));

  Future<void> addAutoLoto4() async {
    final bet = _betForCode('LOTO4'), stake = lotoStake.text.trim().replaceAll(',', '.'), values=_boletNumbers;
    if (bet == null) { setState(() => message = 'Loto 4 pa aktive pou tiraj sa a.'); return; }
    if (values.length<2) { setState(() => message = 'Ajoute omwen 2 liy Bolet de chif; Boul Pè pa konte kòm Bolet.'); return; }
    if ((double.tryParse(stake) ?? 0) <= 0) { setState(() => message = 'Antre pri Loto otomatik la.'); return; }
    final selected = Set<int>.of(selectedPositions);
    setState(() { for(var i=0;i<values.length;i++)for(var j=i+1;j<values.length;j++){for(final value in ['${values[i]}${values[j]}','${values[j]}${values[i]}'])for(final position in selected)lines.add(PosLine(number:value,betTypeId:'${bet['id']}',betName:'${bet['name']}',position:position,stake:stake));}message='Loto otomatik fèt ak menm boul Bolet yo ak opsyon ou chwazi a.'; });
  }

  Future<void> addNumber() async {
    final value = number.text.replaceAll(RegExp(r'\D'), ''), bet = _betForDigits(number.text.replaceAll(RegExp(r'\D'), '').length);
    if (bet == null) { setState(() => message = value.length < 2 || value.length > 5 ? 'Antre 2, 3, 4 oswa 5 chif.' : 'Jwèt sa a pa aktive pou tiraj la.'); return; }
    final stake = lineStake.text.trim().isEmpty ? '0' : lineStake.text.trim().replaceAll(',', '.');
    final selected=Set<int>.of(selectedPositions);
    setState(() { if(selected.isEmpty){lines.add(PosLine(number:value,betTypeId:'${bet['id']}',betName:'${bet['name']}',stake:stake));}else{for(final position in selected)lines.add(PosLine(number:value,betTypeId:'${bet['id']}',betName:'${bet['name']}',position:position,stake:stake));}number.clear();lineStake.clear();message=null; });
  }

  void applyStake() {
    final value = allStake.text.replaceAll(',', '.');
    if (double.tryParse(value) == null) return;
    setState(() { for (final line in lines) line.stake = value; });
  }

  Future<void> sell() async {
    if (drawId == null || lines.isEmpty || lines.any((line) => (double.tryParse(line.stake) ?? 0) <= 0)) { setState(() => message = 'Chwazi tiraj, ajoute boul epi mete yon pri ki pi gran pase 0.'); return; }
    if (usingOfflineCatalog) {
      final draw = selectedDraw;
      final closes = DateTime.tryParse('${draw?['closesAt']}')?.toUtc();
      final cutoff = draw?['game']?['cutoffSeconds'];
      final seconds = cutoff is num ? cutoff.toInt() : int.tryParse('$cutoff');
      if (closes == null || seconds == null || !DateTime.now().toUtc().isBefore(closes.subtract(Duration(seconds:seconds)))) {
        setState(() => message = 'Tiraj sa a fèmen oswa lè limit li rive. Rekonekte sou entènèt.');return;
      }
    }
    final mutationId = const Uuid().v7();
    setState(() => busy = true);
    final payload = lines.map((line) => {'betTypeId': line.betTypeId, 'selection': line.number.split('-').map(int.parse).toList(), 'stake': line.stake, if (line.position!=null) 'resultPosition': line.position}).toList();
    try {
      final response = await widget.runtime.api.dio.post<Map<String, dynamic>>('/api/v1/tickets', data: {'drawId': drawId, 'idempotencyKey': mutationId, if (widget.runtime.deviceId?.isNotEmpty == true) 'deviceId': widget.runtime.deviceId, 'lines': payload});
      final ticket=<String,dynamic>{...response.data!,'gameName':selectedDraw?['game']?['name'],'drawName':selectedDraw==null?'':drawLabel(selectedDraw)};
      String? printWarning;
      try { await widget.runtime.printer.queueConfirmedTicket(ticket); }
      catch (_) { printWarning = 'Tikè a vann, men fich la pa enprime. Verifye non biznis la epi itilize Re-enprime; pa vann li ankò.'; }
      if (mounted) {setState(() { lines.clear(); message = printWarning ?? 'Tikè ${ticket['ticketNumber']} kreye avèk siksè.'; });await showDialog<void>(context:context,builder:(context)=>AlertDialog(title:Text('Tikè ${ticket['ticketNumber']}'),content:Column(mainAxisSize:MainAxisSize.min,children:[Chip(label:Text('${ticket['status']??'VALID'}')),if('${ticket['qrCode']??''}'.isNotEmpty)QrImageView(data:'${ticket['qrCode']}',size:190),Text('Total: ${ticket['amount']}'),if(printWarning!=null)Text(printWarning)]),actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('FÈMEN')),FilledButton.icon(onPressed:()async{try{await widget.runtime.printer.queueConfirmedTicket(ticket);}catch(_){if(context.mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Enpresyon pa disponib. Tikè a deja vann; pa vann li ankò.')));}},icon:const Icon(Icons.print),label:const Text('ENPRIME'))]));}
    } on DioException catch (error) {
      if (error.response == null && !usingOfflineCatalog) _restoreOfflineCatalog();
      if (error.response == null && widget.runtime.deviceId?.isNotEmpty == true && widget.runtime.session.tenantId != null && widget.runtime.session.hasPermission('tickets.create') && usingOfflineCatalog) {
        final id = await widget.runtime.offlineTickets.queueTicket(drawId: drawId!, lines: payload, idempotencyKey: mutationId);
        if (mounted) setState(() { lines.clear(); message = 'Tikè $id sove AN ATANT. Pa peye gayan sou li; sèvè a dwe valide l. Pa rekreye lavant sa a.'; });
      } else if (mounted && error.response == null) {
        setState(() => message = 'Koneksyon koupe. Pa rekreye vant sa a; verifye lis tikè a sou sèvè a lè entènèt retounen. Vant offline mande yon katalòg ajou ak yon aparèy otorize.');
      }
      else if (mounted) setState(() => message = 'Server refize tikè a: ${error.response?.data}.');
    } finally { if (mounted) setState(() => busy = false); }
  }

  double get total => lines.fold(0, (sum, line) => sum + (double.tryParse(line.stake) ?? 0));

  @override Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: [
    const Text('Vann bolet', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
    const Text('Antre boul la; sistèm nan detekte Bolet 2, Loto 3, Loto 4 oswa Loto 5 otomatikman.'), const SizedBox(height: 16),
    DropdownButtonFormField<String>(value: drawId, decoration: const InputDecoration(labelText: 'Tiraj ki ouvè', border: OutlineInputBorder()), items: draws.map<DropdownMenuItem<String>>((row) => DropdownMenuItem(value: '${row['id']}', child: Text(drawLabel(row)))).toList(), onChanged: (value) => setState(() { drawId = value; lines.clear(); })),
    const SizedBox(height: 14),
    Row(crossAxisAlignment:CrossAxisAlignment.start,children:[Expanded(flex:2,child:TextField(controller:number,autofocus:true,keyboardType:TextInputType.number,maxLength:5,decoration:const InputDecoration(labelText:'Boul',hintText:'12, 123, 1234 oswa 12345',border:OutlineInputBorder()))),const SizedBox(width:8),Expanded(child:TextField(controller:lineStake,keyboardType:const TextInputType.numberWithOptions(decimal:true),onSubmitted:(_)=>addNumber(),decoration:const InputDecoration(labelText:'Pri',hintText:'25',border:OutlineInputBorder()))),const SizedBox(width:8),Padding(padding:const EdgeInsets.only(top:4),child:FilledButton(onPressed:addNumber,child:const Text('AJOUTE')))]),
    const Text('Chwazi pozisyon Bolet oswa Loto yo; chwa sa yo ap rete la pou pwochen boul yo.'),
    Wrap(spacing:8,children:[for(final position in const [1,2,3])FilterChip(label:Text('Opsyon $position'),selected:selectedPositions.contains(position),onSelected:(selected)=>setState((){if(selected)selectedPositions.add(position);else if(selectedPositions.length>1)selectedPositions.remove(position);}))]),
    const SizedBox(height:12),
    Card(child:Padding(padding:const EdgeInsets.all(12),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[const Text('Maryaj nòmal',style:TextStyle(fontSize:18,fontWeight:FontWeight.bold)),const SizedBox(height:8),TextField(controller:maryajNumber,decoration:const InputDecoration(labelText:'De boul',hintText:'15x25',border:OutlineInputBorder())),const SizedBox(height:8),TextField(controller:maryajStake,keyboardType:const TextInputType.numberWithOptions(decimal:true),decoration:const InputDecoration(labelText:'Pri Maryaj \$',border:OutlineInputBorder())),const SizedBox(height:8),FilledButton.tonal(onPressed:addNormalMaryaj,child:const Text('AJOUTE MARYAJ'))]))),
    const SizedBox(height:14),
    Row(children:[Expanded(child:TextField(controller:allStake,keyboardType:const TextInputType.numberWithOptions(decimal:true),decoration:const InputDecoration(labelText:'Chanje pri tout liy yo',border:OutlineInputBorder()))),const SizedBox(width:8),FilledButton.tonal(onPressed:applyStake,child:const Text('APLIKE TOUT'))]),
    const SizedBox(height: 12),
    Card(child:Padding(padding:const EdgeInsets.all(12),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[Text('Otomatik ak ${_boletNumbers.length} boul Bolet de chif sou fich la',style:const TextStyle(fontWeight:FontWeight.bold,fontSize:18)),const SizedBox(height:8),TextField(controller:maryajAutoStake,keyboardType:const TextInputType.numberWithOptions(decimal:true),decoration:const InputDecoration(labelText:'Pri Maryaj otomatik \$',border:OutlineInputBorder())),const SizedBox(height:8),TextField(controller:lotoStake,keyboardType:const TextInputType.numberWithOptions(decimal:true),decoration:const InputDecoration(labelText:'Pri Loto otomatik \$',border:OutlineInputBorder())),const SizedBox(height:8),Wrap(spacing:8,runSpacing:8,children:[FilledButton.tonal(onPressed:addMaryaj,child:const Text('MARYAJ OTOMATIK')),FilledButton.tonal(onPressed:addAutoLoto4,child:const Text('LOTO OTOMATIK')),FilledButton.tonal(onPressed:addBoulPe,child:const Text('BOUL PÈ 00–99'))]),const Text('Maryaj ak Loto otomatik itilize sèlman boul Bolet 2 chif ki deja sou fich la. Pri chak liy ka chanje apre.')]))),
    const SizedBox(height: 16),
    ...lines.asMap().entries.map((entry){final index=entry.key,line=entry.value;return Card(child:Padding(padding:const EdgeInsets.all(10),child:Row(children:[SizedBox(width:88,child:Text(line.number,style:const TextStyle(fontSize:22,fontWeight:FontWeight.w900))),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('${line.betName}${line.position==null?'':' · Opsyon ${line.position}'}'),TextFormField(key:ValueKey('${line.number}-${line.position}-${line.stake}'),initialValue:line.stake,keyboardType:const TextInputType.numberWithOptions(decimal:true),decoration:const InputDecoration(labelText:'Pri liy sa a',isDense:true),onChanged:(value){line.stake=value;setState((){});})])),IconButton(onPressed:()=>setState(()=>lines.removeAt(index)),icon:const Icon(Icons.delete,color:Colors.red))])));}),
    if (message != null) Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Text(message!, style: const TextStyle(fontWeight: FontWeight.w600))),
    Row(mainAxisAlignment:MainAxisAlignment.spaceBetween,children:[Text('Total: \$ ${total.toStringAsFixed(2)}',style:const TextStyle(fontSize:21,fontWeight:FontWeight.w900)),FilledButton.icon(onPressed:busy?null:sell,icon:const Icon(Icons.print),label:Text(busy?'Validation…':widget.runtime.printer.defaultPrinterId==null?'VANN':'VANN & ENPRIME'))]),
  ]);
}
