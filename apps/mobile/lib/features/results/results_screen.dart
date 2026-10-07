import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/draw_label.dart';
import '../../core/network/api_client.dart';
import '../../core/localization/app_language.dart';

class ResultsScreen extends StatefulWidget {
  const ResultsScreen({super.key, required this.api});
  final ApiClient api;
  @override State<ResultsScreen> createState() => _ResultsState();
}

class _ResultsState extends State<ResultsScreen> {
  List<dynamic> rows = [], pending = [];
  String? error;
  Timer? timer;

  @override void initState() { super.initState(); load(); timer = Timer.periodic(const Duration(seconds: 15), (_) => load()); }
  @override void dispose() { timer?.cancel(); super.dispose(); }

  Future<void> load() async {
    try {
      final response = await widget.api.dio.get<List<dynamic>>('/api/v1/lottery/draws'), all = response.data ?? [];
      if (mounted) setState(() { rows = all.where((row) => row['status'] == 'RESULT_PUBLISHED').toList(); pending = all.where((row) => row['status'] == 'CLOSED' || row['status'] == 'RESULT_PENDING').toList(); error = null; });
    } catch (_) { if (mounted) setState(() => error = AppLanguage.tr('Rezilta yo pa disponib kounye a.')); }
  }

  String drawLabel(Map<String, dynamic> row) => merchantDrawLabel(row, french: AppLanguage.current.value.languageCode == 'fr');
  List<String> keys(Map<String, dynamic> row) => (row['result']?['winningKeys'] as List<dynamic>? ?? const []).map((value) => '$value'.split('@').first).toList();

  @override Widget build(BuildContext context) {
    final groups = <String, List<Map<String, dynamic>>>{};
    for (final value in rows) {
      final row = Map<String, dynamic>.from(value as Map), game = row['game'] is Map ? Map<String, dynamic>.from(row['game'] as Map) : <String, dynamic>{};
      final key = '${game['id'] ?? game['code'] ?? game['name'] ?? row['id']}';
      (groups[key] ??= []).add(row);
    }
    return RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.fromLTRB(12, 12, 12, 20), children: [
      Row(children: [IconButton(onPressed: () => context.go('/'), tooltip: AppLanguage.tr('Retounen'), icon: const Icon(Icons.arrow_back)), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(AppLanguage.tr('Rezilta yo'), style: const TextStyle(fontSize: 25, fontWeight: FontWeight.w900)), Text(AppLanguage.tr('Mizajou otomatik chak 15 segonn'), style: const TextStyle(fontSize: 11))])), IconButton.filledTonal(onPressed: load, icon: const Icon(Icons.refresh))]),
      if (error != null) Card(color: Theme.of(context).colorScheme.errorContainer, child: Padding(padding: const EdgeInsets.all(14), child: Text(error!))),
      ...groups.values.map((draws) {
        final game = draws.first['game'] is Map ? Map<String, dynamic>.from(draws.first['game'] as Map) : <String, dynamic>{}, logo = '${game['logoUrl'] ?? ''}';
        return Card(margin: const EdgeInsets.only(top: 10), clipBehavior: Clip.antiAlias, child: Padding(padding: const EdgeInsets.all(10), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(width: 54, child: Column(children: [
            ClipRRect(borderRadius: BorderRadius.circular(11), child: Container(width: 46, height: 46, color: Colors.white, alignment: Alignment.center, child: logo.isEmpty ? Text('${game['code'] ?? 'L'}', style: const TextStyle(fontWeight: FontWeight.w900)) : Image.network(logo, width: 44, height: 44, fit: BoxFit.contain, errorBuilder: (_, __, ___) => Text('${game['code'] ?? 'L'}', style: const TextStyle(fontWeight: FontWeight.w900))))),
            const SizedBox(height: 4), Text('${game['name'] ?? '—'}', maxLines: 2, textAlign: TextAlign.center, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800)),
          ])),
          const SizedBox(width: 8),
          Expanded(child: Column(children: draws.map((row) {
            final label = drawLabel(row).split(' · ').skip(1).join(' · '), numbers = keys(row);
            return Container(margin: const EdgeInsets.only(bottom: 6), padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 7), decoration: BoxDecoration(color: const Color(0xfff1f5fa), borderRadius: BorderRadius.circular(10)), child: Row(children: [
              Expanded(flex: 3, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label.isEmpty ? '${row['drawNumber'] ?? ''}' : label, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800)), Text('${row['drawNumber'] ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 8, color: Color(0xff8190a3)))])),
              Expanded(flex: 5, child: SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: numbers.isEmpty ? [const Text('—')] : numbers.asMap().entries.map((entry) {
                const colors = [Color(0xff245dcc), Color(0xfff09a19), Color(0xff11a7c7)];
                return Container(width: 40, height: 34, margin: const EdgeInsets.only(left: 4), alignment: Alignment.center, decoration: BoxDecoration(color: colors[entry.key % colors.length], borderRadius: BorderRadius.circular(9)), child: Text(entry.value, style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900)));
              }).toList()))),
            ]));
          }).toList())),
        ])));
      }),
      if (rows.isEmpty && error == null) Card(child: Padding(padding: const EdgeInsets.all(22), child: Column(children: [const Icon(Icons.hourglass_top, size: 38), const SizedBox(height: 8), Text(AppLanguage.tr('Pa gen rezilta pibliye pou kounye a.'), style: const TextStyle(fontWeight: FontWeight.bold)), Text(pending.isEmpty ? AppLanguage.tr('Pa gen tiraj ki fèmen ap tann rezilta.') : '${pending.length} ${AppLanguage.tr('tiraj fèmen ap tann rezilta.')} ${AppLanguage.tr('Admin biznis la kapab pibliye tiraj yo nan Lotri ak tiraj.')}')]))),
    ]));
  }
}
