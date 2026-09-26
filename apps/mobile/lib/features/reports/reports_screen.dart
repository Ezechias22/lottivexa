import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/draw_label.dart';
import '../../core/localization/app_language.dart';
import '../../core/network/api_client.dart';

DateTime _haitiNow() => DateTime.now().toUtc().subtract(const Duration(hours: 4));

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key, required this.api});
  final ApiClient api;
  @override State<ReportsScreen> createState() => _ReportsState();
}
class _ReportsState extends State<ReportsScreen> {
  static const _shareChannel = MethodChannel('com.lottivexa/printer');
  late DateTime from, to;
  Map<String, dynamic>? summary;
  List<dynamic> draws = [];
  String? error;
  bool loading = false;
  bool exportingPdf = false;
  @override void initState() {
    super.initState();
    final now = _haitiNow(); to = DateTime(now.year, now.month, now.day);
    from = to.subtract(const Duration(days: 6)); load();
  }
  String _date(DateTime d) => d.year.toString().padLeft(4, '0') + '-' + d.month.toString().padLeft(2, '0') + '-' + d.day.toString().padLeft(2, '0');
  String _money(dynamic v, String _currency) => r'$' + (double.tryParse('$v') ?? 0).toStringAsFixed(2);
  Future<void> _period(int days) async {
    final now = _haitiNow(); final end = DateTime(now.year, now.month, now.day);
    setState(() { to = end; from = end.subtract(Duration(days: days - 1)); }); await load();
  }
  Future<void> pick(bool first) async {
    final selected = await showDatePicker(context: context, firstDate: DateTime(2020), lastDate: _haitiNow(), initialDate: first ? from : to);
    if (selected == null || !mounted) return;
    setState(() { if (first) { from = selected; } else { to = selected; } }); await load();
  }
  Future<void> load() async {
    if (from.isAfter(to)) { setState(() => error = AppLanguage.tr('Dat kòmansman an dwe anvan dat fen an.')); return; }
    setState(() { loading = true; error = null; });
    try {
      final query = <String, dynamic>{'from': _date(from), 'to': _date(to)};
      final values = await Future.wait([
        widget.api.dio.get<Map<String, dynamic>>('/api/v1/reports/sales', queryParameters: query),
        widget.api.dio.get<Map<String, dynamic>>('/api/v1/reports/draws', queryParameters: query),
      ]);
      if (mounted) setState(() { summary = values[0].data; draws = values[1].data?['byDraw'] as List<dynamic>? ?? []; });
    } catch (exception) {
      if (mounted) setState(() => error = AppLanguage.tr('Rapò a pa disponib') + ': $exception');
    } finally { if (mounted) setState(() => loading = false); }
  }
  Future<void> exportPdf() async {
    if (exportingPdf) return;
    setState(() => exportingPdf = true);
    try {
      final response = await widget.api.dio.get<List<int>>('/api/v1/reports/sales.pdf',
        queryParameters: {'from': _date(from), 'to': _date(to)},
        options: Options(responseType: ResponseType.bytes));
      final bytes = response.data;
      if (response.statusCode != 200 || bytes == null || bytes.length < 8 ||
          String.fromCharCodes(bytes.take(5)) != '%PDF-') {
        throw StateError('Sèvè a pa retounen yon PDF valid (verifye deploy API a ak pèmisyon reports.view).');
      }
      await _shareChannel.invokeMethod<void>('sharePdf', {
        'bytes': Uint8List.fromList(bytes),
        'filename': 'lottivexa-rapo-${_date(from)}-${_date(to)}.pdf',
      });
    } catch (exception) {
      if (mounted) setState(() => error = AppLanguage.tr('Rapò PDF la pa disponib') + ': $exception');
    } finally { if (mounted) setState(() => exportingPdf = false); }
  }
  @override Widget build(BuildContext context) {
    final report = summary ?? {};
    final tickets = report['tickets'] as Map<String, dynamic>? ?? {};
    final payouts = report['payouts'] as Map<String, dynamic>? ?? {};
    final currency = '${report['currency'] ?? 'USD'}';
    final net = (double.tryParse('${tickets['sales'] ?? 0}') ?? 0) - (double.tryParse('${payouts['amount'] ?? 0}') ?? 0);
    final byDay = report['byDay'] as List<dynamic>? ?? [], byGame = report['byGame'] as List<dynamic>? ?? [], wins = report['biggestWins'] as List<dynamic>? ?? [];
    final dailyMap = <String, Map<String, dynamic>>{};
    for (final raw in byDay) {
      if (raw is Map) {
        final row = Map<String, dynamic>.from(raw);
        dailyMap['${row['day']}'] = row;
      }
    }
    final visibleDays = (to.difference(from).inDays + 1).clamp(1, 14).toInt();
    final chartRows = <Map<String, dynamic>>[];
    for (var i = visibleDays - 1; i >= 0; i--) {
      final day = _date(to.subtract(Duration(days: i)));
      chartRows.add(dailyMap[day] ?? {'day': day, 'amount': '0', 'count': 0});
    }
    return Scaffold(
      appBar: AppBar(title: Text(AppLanguage.tr('Rapò')), actions: [IconButton(onPressed: loading ? null : load, icon: const Icon(Icons.refresh))]),
      body: RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(14), children: [
        Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(children: [
          Row(children: [
            Expanded(child: OutlinedButton.icon(onPressed: () => pick(true), icon: const Icon(Icons.calendar_today), label: Text(AppLanguage.tr('Soti') + ' ' + _date(from)))),
            const SizedBox(width: 8),
            Expanded(child: OutlinedButton.icon(onPressed: () => pick(false), icon: const Icon(Icons.calendar_today), label: Text(AppLanguage.tr('Rive') + ' ' + _date(to)))),
          ]),
          Wrap(spacing: 7, children: [
            TextButton(onPressed: () => _period(1), child: Text(AppLanguage.tr('Jodi a'))),
            TextButton(onPressed: () => _period(7), child: Text(AppLanguage.tr('7 jou'))),
            TextButton(onPressed: () => _period(30), child: Text(AppLanguage.tr('30 jou'))),
          ]),
          SizedBox(width: double.infinity, child: FilledButton.icon(onPressed: loading ? null : load, icon: const Icon(Icons.bar_chart), label: Text(AppLanguage.tr('Afiche rapò')))),
          const SizedBox(height: 8),
          SizedBox(width: double.infinity, child: OutlinedButton.icon(
            onPressed: exportingPdf ? null : exportPdf,
            icon: exportingPdf ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.picture_as_pdf_outlined),
            label: Text(AppLanguage.tr('Telechaje rapò an PDF')),
          )),
        ]))),
        if (loading) const LinearProgressIndicator(),
        if (error != null) Card(child: ListTile(leading: const Icon(Icons.error_outline), title: Text(error!))),
        if (summary != null) ...[
          GridView.count(crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), childAspectRatio: 1.65, mainAxisSpacing: 8, crossAxisSpacing: 8, children: [
            _metric(AppLanguage.tr('Vant total'), _money(tickets['sales'], currency), Icons.account_balance_wallet_outlined, const Color(0xffe9f7ef)),
            _metric(AppLanguage.tr('Tikè'), '${tickets['count'] ?? 0}', Icons.confirmation_number_outlined, const Color(0xffedf3ff)),
            _metric(AppLanguage.tr('Peman gayan'), _money(payouts['amount'], currency), Icons.emoji_events_outlined, const Color(0xfffff5e5)),
            _metric(AppLanguage.tr('Komisyon'), _money(report['commission'], currency), Icons.percent, const Color(0xfff2edff)),
          ]),
          Card(child: ListTile(title: Text(AppLanguage.tr('Vant nèt')), trailing: Text(_money(net, currency), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)))),
          Card(child: Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(AppLanguage.tr('Vant pa jou'), style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            if (byDay.isEmpty) Text(AppLanguage.tr('Pa gen lavant pou dat sa yo.')) else _chart(chartRows),
          ]))),
          Card(child: Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(AppLanguage.tr('Vant pa lotri'), style: Theme.of(context).textTheme.titleMedium),
            if (byGame.isEmpty) Text(AppLanguage.tr('Pa gen lavant pou dat sa yo.'))
            else for (final raw in byGame) Builder(builder: (_) {
              final row = Map<String, dynamic>.from(raw as Map);
              return ListTile(dense: true, leading: const Icon(Icons.circle, color: Color(0xff2451c7), size: 13),
                title: Text('${row['gameName'] ?? ''}'),
                subtitle: Text('${row['count'] ?? 0}' + ' ' + AppLanguage.tr('tikè')),
                trailing: Text(_money(row['amount'], currency), style: const TextStyle(fontWeight: FontWeight.bold)));
            }),
          ]))),
          Card(child: Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(AppLanguage.tr('Lotri ak tiraj'), style: Theme.of(context).textTheme.titleMedium),
            if (draws.isEmpty) Text(AppLanguage.tr('Pa gen lavant pou dat sa yo.'))
            else for (final raw in draws) Builder(builder: (_) {
              final row = Map<String, dynamic>.from(raw as Map);
              final draw = <String, dynamic>{'gameName': row['gameName'], 'drawNumber': row['drawNumber'], 'drawDate': row['drawDate'], 'resultAt': row['drawTime'], 'session': row['session']};
              return ListTile(dense: true, title: Text(merchantDrawLabel(draw, french: AppLanguage.current.value.languageCode == 'fr')),
                subtitle: Text('${row['count'] ?? 0}' + ' ' + AppLanguage.tr('tikè')),
                trailing: Text(_money(row['amount'], currency), style: const TextStyle(fontWeight: FontWeight.bold)));
            }),
          ]))),
          Card(child: Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(AppLanguage.tr('Pi gwo gany yo'), style: Theme.of(context).textTheme.titleMedium),
            if (wins.isEmpty) Text(AppLanguage.tr('Pa gen gany nan peryòd sa a.'))
            else for (final raw in wins) Builder(builder: (_) {
              final row = Map<String, dynamic>.from(raw as Map), lines = row['lines'] as List<dynamic>? ?? [];
              final detail = lines.map((rawLine) {
                final line = Map<String, dynamic>.from(rawLine as Map), count = line['winCount'] as num? ?? 0;
                final parts = '${line['selectionKey'] ?? ''}'.split('@');
                return '${line['betName'] ?? ''} ${parts.first.replaceAll('-', ' × ')}' + (parts.length > 1 ? ' · OP ${parts[1]}' : '') + (count > 1 ? ' · DEKABÈS ×$count' : '');
              }).join(' | ');
              return ListTile(dense: true, leading: const Icon(Icons.emoji_events, color: Colors.orange),
                title: Text('${row['ticketNumber'] ?? ''} · ${row['gameName'] ?? ''}'), subtitle: Text(detail),
                trailing: Text(_money(row['amount'], currency), style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.green)));
            }),
          ]))),
        ],
        const SizedBox(height: 28),
      ])),
    );
  }
  Widget _metric(String title, String value, IconData icon, Color color) => Card(color: color,
    child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
      Icon(icon, color: const Color(0xff2451c7)), const SizedBox(height: 4), Text(title, style: const TextStyle(fontSize: 12)),
      Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
    ])));
  Widget _chart(List<dynamic> values) {
    final rows = values.map((v) => Map<String, dynamic>.from(v as Map)).toList();
    final maximum = rows.fold<double>(1, (max, row) { final amount = double.tryParse('${row['amount'] ?? 0}') ?? 0; return amount > max ? amount : max; });
    return SizedBox(height: 210, child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      for (final row in rows.take(14))
        Expanded(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 2), child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
          Text(r'$' + (double.tryParse('${row['amount'] ?? 0}') ?? 0).toStringAsFixed(0), style: const TextStyle(fontSize: 9), maxLines: 1, overflow: TextOverflow.clip),
          const SizedBox(height: 4),
          Expanded(child: Align(alignment: Alignment.bottomCenter, child: FractionallySizedBox(heightFactor: ((double.tryParse('${row['amount'] ?? 0}') ?? 0) / maximum).clamp(.04, 1), widthFactor: .72, child: Container(decoration: BoxDecoration(color: const Color(0xff5796ef), borderRadius: BorderRadius.circular(4)))))),
          const SizedBox(height: 5),
          Text(_chartDay('${row['day'] ?? ''}'), style: const TextStyle(fontSize: 9)),
        ]))),
    ]));
  }
  String _chartDay(String value) {
    final date = DateTime.tryParse(value);
    return date == null ? value : '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}';
  }
}
