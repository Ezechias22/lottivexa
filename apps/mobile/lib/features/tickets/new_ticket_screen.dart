import 'dart:async';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../core/mobile_runtime.dart';
import '../../core/draw_label.dart';

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
  final number = TextEditingController(), lineStake = TextEditingController(), allStake = TextEditingController(), maryajAutoStake = TextEditingController(), lotoStake = TextEditingController();
  List<dynamic> games = [], draws = [];
  final List<PosLine> lines = [];
  String? drawId, message;
  String currency = 'USD';
  String get currencyMark => r'$';
  bool busy = false;
  final Set<int> selectedPositions = {1};
  bool usingOfflineCatalog = false;
  Timer? configurationTimer;

  @override void initState() { super.initState(); load(); configurationTimer = Timer.periodic(const Duration(seconds: 60), (_) => load(silent: true)); }
  @override void dispose() { configurationTimer?.cancel(); number.dispose(); lineStake.dispose(); allStake.dispose(); maryajAutoStake.dispose(); lotoStake.dispose(); super.dispose(); }

  Future<void> load({bool silent = false}) async {
    if (!silent) setState(() => busy = true);
    try {
      final values = await Future.wait([widget.runtime.api.dio.get<List<dynamic>>('/api/v1/lottery/games'), widget.runtime.api.dio.get<List<dynamic>>('/api/v1/lottery/draws')]);
      games = values[0].data ?? [];
      draws = (values[1].data ?? []).where((row) => row['status'] == 'OPEN').toList();
      try {
        final dashboard = await widget.runtime.api.dio.get<Map<String, dynamic>>('/api/v1/merchants/me/dashboard');
        currency = '${dashboard.data?['currency'] ?? 'USD'}';
      } catch (_) { currency = 'USD'; }
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
    final boulPeId = '${_betForCode('BOUL_PE')?['id'] ?? ''}';
    final sourceIds = {boletId, boulPeId}..remove('');
    if (sourceIds.isEmpty) return [];
    final values = lines.where((line) => sourceIds.contains(line.betTypeId) && RegExp(r'^\d{2}$').hasMatch(line.number)).map((line) => line.number.padLeft(2, '0')).toSet().toList();
    values.sort((left, right) => int.parse(left).compareTo(int.parse(right)));
    return values;
  }
  String drawLabel(dynamic row) {
    if (row is! Map) return 'Lotri · Sesyon pou verifye';
    return merchantDrawLabel(Map<String, dynamic>.from(row));
  }

  Future<String?> _askAutomaticStake({required TextEditingController controller, required String title, required String help, List<String>? previewNumbers}) {
    return showDialog<String>(context: context, builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, refreshDialog) {
      final stake = controller.text.trim().replaceAll(',', '.');
      final valid = (double.tryParse(stake) ?? 0) > 0;
      final values = previewNumbers ?? _boletNumbers;
      return AlertDialog(scrollable: true, title: Text(title), content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [Text(help), const SizedBox(height: 12), if (values.isNotEmpty) Wrap(spacing: 6, children: values.map((value) => Chip(label: Text(value))).toList()), const SizedBox(height: 8), TextField(controller: controller, autofocus: true, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Pri pou chak liy', border: OutlineInputBorder()), onChanged: (_) => refreshDialog(() {}))]), actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('ANILE')), FilledButton(onPressed: valid ? () => Navigator.pop(dialogContext, stake) : null, child: const Text('KONTINYE'))]);
    }));
  }

  Future<void> addMaryaj() async {
    final values = _boletNumbers, bet = _betForCode('MARYAJ');
    if (bet == null) { setState(() => message = 'Maryaj pa aktive pou tiraj sa a.'); return; }
    if (values.length < 2) { setState(() => message = 'Ajoute omwen 2 boul Bolet oswa Boul Pè 2 chif; tout nimewo sa yo konte.'); return; }
    final stake = await _askAutomaticStake(controller: maryajAutoStake, title: 'Maryaj otomatik', help: 'Boul Bolet ak Boul Pè ki sou fich la ap sèvi pou kreye Maryaj. Mete pri pou chak pè.');
    if (stake == null || !mounted) return;
    setState(() { for (var first = 0; first < values.length; first++) for (var second = first + 1; second < values.length; second++) lines.add(PosLine(number: '${values[first]}-${values[second]}', betTypeId: '${bet['id']}', betName: '${bet['name']}', stake: stake)); message = '${values.length} nimewo Bolet ak Boul Pè yo sèvi pou jenere Maryaj.'; });
  }

  Future<void> addBoulPe() async {
    final bet = _betForCode('BOUL_PE');
    if (bet == null) { setState(() => message = 'Boul Pè pa aktive pou tiraj sa a.'); return; }
    final values = const ['00','11','22','33','44','55','66','77','88','99'];
    final stake = await _askAutomaticStake(controller: allStake, title: 'Boul Pè otomatik', help: 'Chwazi pri pou chak boul pè. Nimewo yo ap rete de chif sou fich la.', previewNumbers: values);
    if (stake == null || !mounted) return;
    setState(() { for (final value in values) { lines.add(PosLine(number:value,betTypeId:'${bet['id']}',betName:'${bet['name']}',stake:stake)); } message = null; });
  }

  Future<Map<String,dynamic>?> chooseLotoOptions() {
    final chosen = Set<int>.of(selectedPositions);
    return showDialog<Map<String,dynamic>>(context: context, builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, refreshDialog) {
      final stake = lotoStake.text.trim().replaceAll(',', '.');
      final valid = chosen.isNotEmpty && (double.tryParse(stake) ?? 0) > 0;
      return AlertDialog(scrollable: true, title: const Text('LOTO 4 OTOMATIK'), content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Boul Bolet ak Boul Pè sou fich la: ${_boletNumbers.join(', ')}'), const SizedBox(height: 10), const Text('Chwazi pozisyon rezilta yo:'), Wrap(spacing: 4, children: [for (final position in const [1,2,3]) FilterChip(label: Text('Opsyon $position'), selected: chosen.contains(position), onSelected: (value) => refreshDialog(() { if (value) chosen.add(position); else if (chosen.length > 1) chosen.remove(position); })), ActionChip(label: const Text('Tout opsyon'), onPressed: () => refreshDialog(() => chosen.addAll([1,2,3])))]), const SizedBox(height: 10), TextField(controller: lotoStake, autofocus: true, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Pri pou chak liy', border: OutlineInputBorder()), onChanged: (_) => refreshDialog(() {}))]), actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('ANILE')), FilledButton(onPressed: valid ? () => Navigator.pop(dialogContext, {'positions': Set<int>.of(chosen), 'stake': stake}) : null, child: const Text('KONTINYE'))]);
    }));
  }

  Future<void> addAutoLoto4() async {
    final bet = _betForCode('LOTO4'), values = _boletNumbers;
    if (bet == null) { setState(() => message = 'Loto 4 pa aktive pou tiraj sa a.'); return; }
    if (values.length < 2) { setState(() => message = 'Ajoute omwen 2 boul Bolet oswa Boul Pè 2 chif; tout nimewo sa yo konte.'); return; }
    final options = await chooseLotoOptions();
    if (options == null || !mounted) return;
    final selected = options['positions'] as Set<int>, stake = options['stake'] as String;
    setState(() { selectedPositions..clear()..addAll(selected); for (var i = 0; i < values.length; i++) for (var j = i + 1; j < values.length; j++) { for (final value in ['${values[i]}${values[j]}','${values[j]}${values[i]}']) for (final position in selected) lines.add(PosLine(number:value,betTypeId:'${bet['id']}',betName:'${bet['name']}',position:position,stake:stake)); } message = 'Loto otomatik fèt ak nimewo Bolet ak Boul Pè yo ak opsyon ou chwazi a.'; });
  }

  Future<void> addManualMaryaj() async {
    final bet = _betForCode('MARYAJ');
    if (bet == null) { setState(() => message = 'Maryaj pa aktive pou tiraj sa a.'); return; }
    final first = TextEditingController(), second = TextEditingController(), stake = TextEditingController();
    final result = await showDialog<List<String>>(context: context, builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, refreshDialog) {
      final a = first.text.trim(), b = second.text.trim(), price = double.tryParse(stake.text.replaceAll(',', '.')) ?? 0;
      final valid = RegExp(r'^\d{2}$').hasMatch(a) && RegExp(r'^\d{2}$').hasMatch(b) && a != b && price > 0;
      return AlertDialog(scrollable: true, title: const Text('MARYAJ PEYE MANYÈL'), content: Column(mainAxisSize: MainAxisSize.min, children: [
        const Text('Antre de nimewo Maryaj la ak pri pou tikè a.'),
        TextField(controller: first, autofocus: true, maxLength: 2, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Premye nimewo'), onChanged: (_) => refreshDialog(() {})),
        TextField(controller: second, maxLength: 2, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Dezyèm nimewo'), onChanged: (_) => refreshDialog(() {})),
        TextField(controller: stake, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Pri Maryaj'), onChanged: (_) => refreshDialog(() {})),
      ]), actions: [
        TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('ANILE')),
        FilledButton(onPressed: valid ? () => Navigator.pop(dialogContext, [a, b, price.toString()]) : null, child: const Text('AJOUTE')),
      ]);
    }));
    first.dispose(); second.dispose(); stake.dispose();
    if (result == null || !mounted) return;
    setState(() { lines.add(PosLine(number: result[0] + '-' + result[1], betTypeId: '${bet['id']}', betName: '${bet['name']}', stake: result[2])); message = 'Maryaj peye a ajoute sou tikè a.'; });
  }

  List<List<String>> _freeMaryajSuggestions() {
    final values = <String>[..._boletNumbers];
    for (final line in lines) {
      final code = betTypes.where((bet) => '${bet['id']}' == line.betTypeId).firstOrNull?['code'];
      if (code == 'MARYAJ') {
        final pair = line.number.split('-');
        if (pair.length == 2 && pair.every((value) => RegExp(r'^\d{2}$').hasMatch(value))) values.addAll(pair);
      } else if (code == 'LOTO3' || code == 'LOTO4' || code == 'LOTO5') {
        final digits = line.number.replaceAll(RegExp(r'\D'), '');
        values.addAll(RegExp(r'\d{2}').allMatches(digits).map((match) => match.group(0)!));
        if (digits.length.isOdd && digits.length >= 3) values.add(digits.substring(digits.length - 2));
      }
    }
    final unique = values.toSet().toList();
    if (unique.length < 2) return [];
    final firstPair = [unique[0], unique[1]];
    final secondPair = unique.length > 2 ? [unique[0], unique[2]] : firstPair;
    return [firstPair, secondPair];
  }

  Future<List<List<String>>?> _askFreeMaryaj() {
    final fields = List.generate(4, (_) => TextEditingController());
    return showDialog<List<List<String>>>(context: context, builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, refreshDialog) {
      final values = fields.map((field) => field.text.trim()).toList();
      final valid = values.every((value) => RegExp(r'^\d{2}$').hasMatch(value)) && values[0] != values[1] && values[2] != values[3];
      return AlertDialog(scrollable: true, title: const Text('2 MARYAJ GRATIS'), content: Column(mainAxisSize: MainAxisSize.min, children: [
        const Text('Vant sa a rive 100 goud. Chwazi nimewo pou de liy Maryaj gratis yo.'),
        for (var i = 0; i < fields.length; i++) TextField(controller: fields[i], maxLength: 2, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: i.isEven ? 'Nimewo Maryaj 1' : 'Nimewo Maryaj 2'), onChanged: (_) => refreshDialog(() {})),
      ]), actions: [
        TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('ANILE')),
        FilledButton(onPressed: valid ? () => Navigator.pop(dialogContext, [[values[0], values[1]], [values[2], values[3]]]) : null, child: const Text('KONTINYE')),
      ]);
    })).whenComplete(() { for (final field in fields) { field.dispose(); } });
  }

  Future<void> addNumber() async {
    final value = number.text.replaceAll(RegExp(r'\D'), ''), bet = _betForDigits(number.text.replaceAll(RegExp(r'\D'), '').length);
    if (bet == null) { setState(() => message = value.length < 2 || value.length > 5 ? 'Antre 2, 3, 4 oswa 5 chif.' : 'Jwèt sa a pa aktive pou tiraj la.'); return; }
    final stake = lineStake.text.trim().isEmpty ? '0' : lineStake.text.trim().replaceAll(',', '.');
    setState(() { lines.add(PosLine(number:value,betTypeId:'${bet['id']}',betName:'${bet['name']}',position:value.length==2?1:null,stake:stake));number.clear();lineStake.clear();message=null; });
  }

  Future<void> sell() async {
    if (drawId == null || lines.isEmpty || lines.any((line) => (double.tryParse(line.stake) ?? 0) <= 0)) { setState(() => message = 'Chwazi tiraj, ajoute boul epi mete yon pri ki pi gran pase 0.'); return; }
    var freeMaryaj = <List<String>>[];
    if (total >= 100) {
      if (_betForCode('MARYAJ') == null) { setState(() => message = 'Maryaj pa aktive pou tiraj sa a; pa ka mete de Maryaj gratis yo.'); return; }
      freeMaryaj = _freeMaryajSuggestions();
      if (freeMaryaj.length != 2) {
        final chosen = await _askFreeMaryaj();
        if (chosen == null || !mounted) return;
        freeMaryaj = chosen;
      }
      if (usingOfflineCatalog) { setState(() => message = 'Pou de Maryaj gratis yo rete sou tikè a, konekte ak sèvè a anvan vant sa a.'); return; }
    }
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
    final payload = lines.map((line) => {'betTypeId': line.betTypeId, 'selection': line.number.split('-').toList(), 'stake': line.stake, if (line.position!=null) 'resultPosition': line.position}).toList();
    try {
      final response = await widget.runtime.api.dio.post<Map<String, dynamic>>('/api/v1/tickets', data: {'drawId': drawId, 'idempotencyKey': mutationId, if (widget.runtime.deviceId?.isNotEmpty == true) 'deviceId': widget.runtime.deviceId, 'lines': payload, if (freeMaryaj.isNotEmpty) 'freeMaryaj': freeMaryaj.map((selection) => {'selection': selection}).toList()});
      final ticket=<String,dynamic>{...response.data!,'gameName':selectedDraw?['game']?['name'],'drawName':selectedDraw==null?'':drawLabel(selectedDraw)};
      String? printWarning;
      try { await widget.runtime.printer.queueConfirmedTicket(ticket); }
      catch (_) { printWarning = 'Tikè a vann, men fich la pa enprime. Verifye non biznis la epi itilize Re-enprime; pa vann li ankò.'; }
      if (mounted) {setState(() { lines.clear(); message = printWarning ?? 'Tikè ${ticket['ticketNumber']} kreye avèk siksè.'; });await showDialog<void>(context:context,builder:(context)=>AlertDialog(title:Text('Tikè ${ticket['ticketNumber']}'),content:Column(mainAxisSize:MainAxisSize.min,children:[Chip(label:Text('${ticket['status']??'VALID'}')),if('${ticket['qrCode']??''}'.isNotEmpty)QrImageView(data:'${ticket['qrCode']}',size:190),Text('Total: ' + r'$' + '${ticket['amount']}'),if(printWarning!=null)Text(printWarning)]),actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('FÈMEN')),FilledButton.icon(onPressed:()async{try{await widget.runtime.printer.queueConfirmedTicket(ticket);}catch(_){if(context.mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Enpresyon pa disponib. Tikè a deja vann; pa vann li ankò.')));}},icon:const Icon(Icons.print),label:const Text('ENPRIME'))]));}
    } on DioException catch (error) {
      if (error.response == null && !usingOfflineCatalog) _restoreOfflineCatalog();
      if (error.response == null && freeMaryaj.isEmpty && widget.runtime.deviceId?.isNotEmpty == true && widget.runtime.session.tenantId != null && widget.runtime.session.hasPermission('tickets.create') && usingOfflineCatalog) {
        final id = await widget.runtime.offlineTickets.queueTicket(drawId: drawId!, lines: payload, idempotencyKey: mutationId);
        if (mounted) setState(() { lines.clear(); message = 'Tikè $id sove AN ATANT. Pa peye gayan sou li; sèvè a dwe valide l. Pa rekreye lavant sa a.'; });
      } else if (mounted && error.response == null) {
        setState(() => message = freeMaryaj.isNotEmpty ? 'Koneksyon koupe. Tikè a pa t vann; rekonekte pou Maryaj gratis yo antre sou tikè a.' : 'Koneksyon koupe. Pa rekreye vant sa a; verifye lis tikè a sou sèvè a lè entènèt retounen. Vant offline mande yon katalòg ajou ak yon aparèy otorize.');
      }
      else if (mounted) setState(() => message = 'Server refize tikè a: ${error.response?.data}.');
    } finally { if (mounted) setState(() => busy = false); }
  }

  double get total => lines.fold(0, (sum, line) => sum + (double.tryParse(line.stake) ?? 0));

  @override Widget build(BuildContext context) => Scaffold(
    body: ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 20), children: [
    const Text('Vann bolet', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
    const Text('Antre boul la; sistèm nan detekte Bolet 2, Loto 3, Loto 4 oswa Loto 5 otomatikman.'), const SizedBox(height: 16),
    DropdownButtonFormField<String>(isExpanded: true, value: drawId, decoration: const InputDecoration(labelText: 'Tiraj ki ouvè', border: OutlineInputBorder()), items: draws.map<DropdownMenuItem<String>>((row) => DropdownMenuItem(value: '${row['id']}', child: Text(drawLabel(row), maxLines: 1, overflow: TextOverflow.ellipsis))).toList(), onChanged: (value) => setState(() { drawId = value; lines.clear(); })),
    const SizedBox(height: 14),
    LayoutBuilder(builder: (context, constraints) {
      final numberField = TextField(controller:number,autofocus:true,keyboardType:TextInputType.number,maxLength:5,decoration:const InputDecoration(labelText:'Boul',hintText:'12, 123, 1234 oswa 12345',border:OutlineInputBorder()));
      final priceField = TextField(controller:lineStake,keyboardType:const TextInputType.numberWithOptions(decimal:true),onSubmitted:(_)=>addNumber(),decoration:const InputDecoration(labelText:'Pri',hintText:'25',border:OutlineInputBorder()));
      final addButton = FilledButton(onPressed:addNumber,child:const Text('AJOUTE'));
      if (constraints.maxWidth < 430) return Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[numberField,priceField,addButton]);
      return Row(crossAxisAlignment:CrossAxisAlignment.start,children:[Expanded(flex:2,child:numberField),const SizedBox(width:8),Expanded(child:priceField),const SizedBox(width:8),Padding(padding:const EdgeInsets.only(top:4),child:addButton)]);
    }),
    Card(child:Padding(padding:const EdgeInsets.all(12),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[Text('Zouti otomatik · ${_boletNumbers.length} boul Bolet ak Boul Pè sou fich la',style:const TextStyle(fontWeight:FontWeight.bold,fontSize:18)),const SizedBox(height:8),Wrap(spacing:8,runSpacing:8,children:[FilledButton.tonal(onPressed:addManualMaryaj,child:const Text('MARYAJ PEYE MANYÈL')),FilledButton.tonal(onPressed:addMaryaj,child:const Text('MARYAJ OTOMATIK')),FilledButton.tonal(onPressed:addAutoLoto4,child:const Text('LOTO OTOMATIK')),FilledButton.tonal(onPressed:addBoulPe,child:const Text('BOUL PÈ 00–99'))]),const Text('Pri ak opsyon Loto yo ap parèt nan ti fenèt yo. Ou ka ajiste pri chak liy apre sa.')]))),
    const SizedBox(height: 16),
    ...lines.asMap().entries.map((entry){final index=entry.key,line=entry.value;return Card(child:Padding(padding:const EdgeInsets.all(10),child:Row(children:[SizedBox(width:88,child:Text(line.number,style:const TextStyle(fontSize:22,fontWeight:FontWeight.w900))),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('${line.betName}${line.position==null?'':' · Opsyon ${line.position}'}'),TextFormField(key:ValueKey('${line.number}-${line.position}-${line.stake}'),initialValue:line.stake,keyboardType:const TextInputType.numberWithOptions(decimal:true),decoration:const InputDecoration(labelText:'Pri liy sa a',isDense:true),onChanged:(value){line.stake=value;setState((){});})])),IconButton(onPressed:()=>setState(()=>lines.removeAt(index)),icon:const Icon(Icons.delete,color:Colors.red))])));}),
    if (message != null) Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Text(message!, style: const TextStyle(fontWeight: FontWeight.w600))),
    ]),
    bottomNavigationBar: SafeArea(top: false, child: Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(top: BorderSide(color: Theme.of(context).dividerColor)),
        boxShadow: const [BoxShadow(color: Color(0x16000000), blurRadius: 12, offset: Offset(0, -3))],
      ),
      child: Row(children: [
        Expanded(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('TOTAL', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
          Text('$currencyMark${total.toStringAsFixed(2)}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
        ])),
        const SizedBox(width: 12),
        FilledButton.icon(onPressed: busy ? null : sell, icon: const Icon(Icons.print), label: Text(busy ? 'Validasyon…' : 'VANN & ENPRIME')),
      ]),
    )),
  );
}
