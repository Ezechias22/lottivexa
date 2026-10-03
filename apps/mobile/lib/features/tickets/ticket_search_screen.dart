import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:uuid/uuid.dart';

import '../../core/draw_label.dart';
import '../../core/mobile_runtime.dart';

double ticketWinningAmount(Map<String, dynamic> value) {
  final stored = double.tryParse('${value['winning']?['winningAmount']}') ?? 0;
  if (stored > 0) return stored;
  final lines = value['lines'] as List<dynamic>? ?? [];
  return lines.fold<double>(0, (sum, raw) {
    final line = raw as Map<String, dynamic>;
    if (line['isWinner'] != true) return sum;
    final count = int.tryParse('${line['winCount'] ?? 1}') ?? 1;
    final potential = double.tryParse('${line['potentialWin'] ?? 0}') ?? 0;
    return count > 0 ? sum + potential * count : sum;
  });
}

class TicketSearchScreen extends StatefulWidget {
  const TicketSearchScreen({super.key, required this.runtime});
  final MobileRuntime runtime;
  @override State<TicketSearchScreen> createState() => _TicketState();
}

class _TicketState extends State<TicketSearchScreen> {
  final reference = TextEditingController();
  List<dynamic> rows = [];
  Map<String, dynamic>? ticket;
  String? message;
  bool busy = false;

  @override void initState() { super.initState(); load(); }
  @override void dispose() { reference.dispose(); super.dispose(); }

  Future<void> load() async {
    setState(() => busy = true);
    try {
      final response = await widget.runtime.api.dio.get<List<dynamic>>('/api/v1/tickets');
      if (mounted) setState(() { rows = response.data ?? []; message = null; });
    } catch (_) { if (mounted) setState(() => message = 'Lis tikè yo pa disponib.'); }
    finally { if (mounted) setState(() => busy = false); }
  }

  Future<void> search([String? value]) async {
    final ref = value ?? reference.text.trim();
    if (ref.isEmpty) return;
    setState(() => busy = true);
    try {
      final response = await widget.runtime.api.dio.get<Map<String, dynamic>>('/api/v1/tickets/${Uri.encodeComponent(ref)}');
      if (mounted) setState(() { ticket = response.data; reference.text = ref; message = null; });
    } catch (_) { if (mounted) setState(() { ticket = null; message = 'Tikè a pa jwenn oswa ou pa gen aksè.'; }); }
    finally { if (mounted) setState(() => busy = false); }
  }

  Future<void> scan() async {
    final value = await Navigator.of(context).push<String>(MaterialPageRoute(builder: (_) => const TicketQrScanner()));
    if (value != null && value.isNotEmpty) await search(value);
  }

  Future<void> pay() async {
    if (ticket == null) return;
    try {
      await widget.runtime.api.dio.post('/api/v1/payouts', data: {'ticketReference': ticket!['ticketNumber'], 'idempotencyKey': const Uuid().v7()});
      await search('${ticket!['ticketNumber']}');
      if (mounted) setState(() => message = 'Peman gayan an anrejistre; tikè a make PEYE.');
    } on DioException catch (e) { if (mounted) setState(() => message = 'Peman refize: ${e.response?.data}.'); }
  }

  String statusLabel(dynamic value) => const {'PENDING':'ANNATANT','VALID':'VALID','WINNER':'GENYEN','LOSER':'PÈDI','CANCELLED':'ANILE','VOID':'ANILE NÈT','PAID':'PEYE','EXPIRED':'EKSPIRE'}['$value'] ?? '$value';
  String _money(dynamic value) => r'$' + (double.tryParse('$value') ?? 0).toStringAsFixed(2);
  String _displayTicketStatus(Map<String, dynamic> value) {
    final raw = '${value['status'] ?? 'VALID'}';
    if (value['payout'] != null || raw == 'PAID') return 'PAID';
    if (['CANCELLED', 'VOID', 'EXPIRED'].contains(raw)) return raw;
    final linkedDraws = value['ticketDraws'] as List<dynamic>? ?? [];
    final draws = linkedDraws.map((item) => item is Map ? item['draw'] : null).whereType<Map>().toList();
    final drawRows = draws.isNotEmpty
        ? draws
        : value['draws'] is List && (value['draws'] as List).isNotEmpty
            ? (value['draws'] as List).whereType<Map>().toList()
            : value['draw'] is Map ? [value['draw'] as Map] : <Map>[];
    final allResolved = drawRows.isNotEmpty && drawRows.every((draw) {
      final result = draw['result'];
      final keys = result is Map ? result['winningKeys'] : null;
      return draw['status'] == 'RESULT_PUBLISHED' || (keys is List && keys.isNotEmpty);
    });
    if (drawRows.isNotEmpty && !allResolved) return 'PENDING';
    final lines = value['lines'] as List<dynamic>? ?? [];
    if (allResolved && lines.isNotEmpty && lines.every((line) => line['isWinner'] is bool)) {
      return lines.any((line) => line['isWinner'] == true) ? 'WINNER' : 'LOSER';
    }
    if (lines.any((line) => line['isWinner'] == true) || (double.tryParse('${value['winning']?['winningAmount']}') ?? 0) > 0) return 'WINNER';
    if (raw == 'WINNER' || raw == 'LOSER') return raw;
    return 'PENDING';
  }
  bool _needsWinningReview(Map<String, dynamic> value) {
    if (_displayTicketStatus(value) != 'WINNER') return false;
    final lines = value['lines'] as List<dynamic>? ?? [];
    final stored = double.tryParse('${value['winning']?['winningAmount']}') ?? 0;
    return stored <= 0 || ticketWinningAmount(value) <= 0 || !lines.any((line) => line['isWinner'] == true);
  }
  Color statusColor(BuildContext context, dynamic value) => switch ('$value') {
    'WINNER' => Colors.green.shade700,
    'PAID' => Colors.blue.shade700,
    'LOSER' || 'CANCELLED' || 'VOID' || 'EXPIRED' => Colors.red.shade700,
    _ => Theme.of(context).colorScheme.primary,
  };

  @override Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: () async { await load(); if (ticket != null) await search('${ticket!['ticketNumber']}'); },
    child: ListView(padding: const EdgeInsets.all(16), children: [
      const Text('Tikè yo', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
      const SizedBox(height: 12),
      TextField(controller: reference, onSubmitted: search, decoration: InputDecoration(labelText: 'Nimewo tikè / barcode / QR', border: const OutlineInputBorder(), prefixIcon: IconButton(tooltip: 'Eskane QR', onPressed: busy ? null : scan, icon: const Icon(Icons.qr_code_scanner)), suffixIcon: IconButton(onPressed: busy ? null : search, icon: const Icon(Icons.search)))),
      if (message != null) Padding(padding: const EdgeInsets.all(12), child: Text(message!)),
      if (ticket != null) TicketDetails(ticket: {...ticket!, '_displayStatus': _displayTicketStatus(ticket!)}, statusLabel: statusLabel, statusColor: statusColor, onReplay: () => context.go('/new-ticket', extra: ticket), onPrint: () => widget.runtime.printer.queueConfirmedTicket(ticket!), onPay: _displayTicketStatus(ticket!) == 'WINNER' && ticket!['payout'] == null && (double.tryParse('${ticket!['winning']?['winningAmount']}') ?? 0) > 0 && (ticket!['lines'] as List<dynamic>? ?? []).any((line) => line['isWinner'] == true) ? pay : null),
      const Padding(padding: EdgeInsets.only(top: 18, bottom: 8), child: Text('Dènye tikè yo', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold))),
      ...rows.map((row) { final ticketRow = Map<String, dynamic>.from(row as Map); final displayStatus = _displayTicketStatus(ticketRow); final label = '${statusLabel(displayStatus)}${_needsWinningReview(ticketRow) ? ' · MONTAN POKO KONFIME' : ''}'; return Card(child: ListTile(leading: Icon(Icons.confirmation_number, color: statusColor(context, displayStatus)), title: Text('${row['ticketNumber']}'), subtitle: Text('$label · ${row['createdAt']}'), trailing: Text(_money(row['amount']), style: const TextStyle(fontWeight: FontWeight.bold)), onTap: () => search('${row['ticketNumber']}'))); }),
      if (rows.isEmpty && !busy) const Padding(padding: EdgeInsets.all(24), child: Text('Pa gen tikè.')),
    ]),
  );
}

class TicketDetails extends StatelessWidget {
  const TicketDetails({super.key, required this.ticket, required this.statusLabel, required this.statusColor, required this.onReplay, required this.onPrint, this.onPay});
  final Map<String, dynamic> ticket;
  final String Function(dynamic) statusLabel;
  final Color Function(BuildContext, dynamic) statusColor;
  final VoidCallback onReplay;
  final VoidCallback onPrint;
  final VoidCallback? onPay;

  String _money(dynamic value) => r'$' + (double.tryParse('$value') ?? 0).toStringAsFixed(2);

  @override Widget build(BuildContext context) {
    final lines = ticket['lines'] as List<dynamic>? ?? [];
    final winning = ticket['winning'] as Map<String, dynamic>?;
    final status = ticket['payout'] != null ? 'PAID' : ticket['_displayStatus'] ?? ticket['status'];
    final needsWinningReview = status == 'WINNER' && ((double.tryParse('${winning?['winningAmount']}') ?? 0) <= 0 || !lines.any((line) => line['isWinner'] == true));
    return Card(margin: const EdgeInsets.only(top: 16), clipBehavior: Clip.antiAlias, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Container(color: statusColor(context, status), padding: const EdgeInsets.all(16), child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Expanded(child: Text('${ticket['ticketNumber']}', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900))), Chip(label: Text(statusLabel(status)))])),
      Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${ticket['draw']?['game']?['name'] ?? ticket['game']?['name'] ?? ''}', style: Theme.of(context).textTheme.titleLarge),
        Text('Tiraj: ${merchantDrawLabel(Map<String, dynamic>.from(ticket['draw'] as Map? ?? const {}))}'),
        Text('Machann: ${ticket['merchant']?['displayName'] ?? ''} · ${ticket['merchant']?['branch']?['name'] ?? ''}'),
        Text('Dat: ${ticket['createdAt'] ?? ''}'),
        const Divider(height: 28),
        for (final raw in lines) _winningLine(raw as Map<String, dynamic>),
        const Divider(height: 28),
        _total('Total jwe', _money(ticket['amount'])),
        if (status == 'WINNER' || status == 'PAID') _total('TOTAL GENYEN', _money(ticketWinningAmount(ticket)), winner: true),
        if (needsWinningReview) Padding(padding: const EdgeInsets.symmetric(vertical: 8), child: Text('GENYEN · Montan gany la poko kalkile. Peman an rete bloke jiskaske sistèm nan konfime montan an.', textAlign: TextAlign.center, style: TextStyle(color: Colors.orange.shade900, fontWeight: FontWeight.bold))),
        if ('${ticket['qrCode'] ?? ''}'.isNotEmpty) Center(child: Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: QrImageView(data: '${ticket['qrCode']}', size: 170))),
        const Text('Kenbe tikè orijinal la. Peman fèt nan sistèm nan epi yon tikè ki deja peye pa kapab peye ankò.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12)),
        const SizedBox(height: 12),
        Wrap(spacing: 8, runSpacing: 8, children: [FilledButton.tonalIcon(onPressed: onReplay, icon: const Icon(Icons.copy), label: const Text('Kopye / Rejwe')), OutlinedButton.icon(onPressed: onPrint, icon: const Icon(Icons.print), label: const Text('Enprime ankò')), FilledButton.icon(onPressed: onPay, icon: const Icon(Icons.payments), label: const Text('Peye gayan'))]),
      ])),
    ]));
  }

  Widget _winningLine(Map<String, dynamic> line) {
    final won = line['isWinner'] == true;
    final decided = line['isWinner'] != null;
    final key = '${line['selectionKey'] ?? ''}'.split('@');
    final selection = key.first.replaceAll('-', ' × ');
    final winCount = int.tryParse('${line['winCount'] ?? 0}') ?? 0;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: won ? Colors.green.shade50 : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: won ? Colors.green : Colors.grey.shade300),
      ),
      child: Row(children: [
        Icon(won ? Icons.emoji_events : Icons.circle_outlined, color: won ? Colors.green : Colors.grey),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.center, children: [
          Text('${line['draw']?['game']?['name'] ?? ''}${line['draw']?['game']?['name'] == null ? '' : ' · '}${line['betType']?['name'] ?? 'Jwèt'}', style: const TextStyle(fontWeight: FontWeight.bold)),
          Text(selection, style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900, fontFamily: 'monospace')),
          if (key.length > 1) Padding(padding: const EdgeInsets.symmetric(vertical: 3), child: Text('OP ${key[1]}', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xff2451c7)))),
          if (winCount > 0) Text('GEN × $winCount · ${_money((double.tryParse('${line['potentialWin']}') ?? 0) * winCount)}', style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.green)),
          if (line['isPromotional'] == true) const Text('GRATIS', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.green)),
          Text('Pri: ${_money(line['stake'])} · Kòt: ${line['odds']}'),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(won ? 'GENYEN' : decided ? 'PÈDI' : 'ANNATANT', style: TextStyle(fontWeight: FontWeight.w900, color: won ? Colors.green : null)),
        ]),
      ]),
    );
  }

  Widget _total(String label, String value, {bool winner = false}) => Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(label, style: TextStyle(fontWeight: winner ? FontWeight.w900 : FontWeight.w600)), Text(value, style: TextStyle(fontSize: winner ? 22 : 16, color: winner ? Colors.green.shade800 : null, fontWeight: FontWeight.w900))]));
}

class TicketQrScanner extends StatefulWidget {
  const TicketQrScanner({super.key});
  @override State<TicketQrScanner> createState() => _TicketQrScannerState();
}

class _TicketQrScannerState extends State<TicketQrScanner> {
  bool returned = false;
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Eskane QR tikè a')), body: Stack(fit: StackFit.expand, children: [
    MobileScanner(onDetect: (capture) { final value = capture.barcodes.isEmpty ? null : capture.barcodes.first.rawValue; if (!returned && value != null && value.isNotEmpty) { returned = true; Navigator.pop(context, value); } }),
    Center(child: Container(width: 260, height: 260, decoration: BoxDecoration(border: Border.all(color: Colors.amber, width: 4), borderRadius: BorderRadius.circular(20)))),
    const Positioned(left: 20, right: 20, bottom: 35, child: Card(child: Padding(padding: EdgeInsets.all(12), child: Text('Mete QR tikè a byen klè nan kare a.', textAlign: TextAlign.center)))),
  ]));
}
