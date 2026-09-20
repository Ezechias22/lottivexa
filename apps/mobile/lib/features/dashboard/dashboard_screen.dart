import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/localization/app_language.dart';
import '../../core/network/api_client.dart';
import '../../core/offline/offline_store.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, required this.api, required this.store});
  final ApiClient api;
  final OfflineStore store;
  @override State<DashboardScreen> createState() => _State();
}

class _State extends State<DashboardScreen> {
  Map<String, dynamic>? data;
  List<dynamic> draws = [];
  String? error;
  bool loading = false;

  @override void initState() { super.initState(); load(); }

  Future<void> load() async {
    setState(() => loading = true);
    try {
      final dashboardFuture = widget.api.dio.get<Map<String, dynamic>>('/api/v1/merchants/me/dashboard');
      final drawsFuture = widget.api.dio.get<List<dynamic>>('/api/v1/lottery/draws');
      final dashboardResponse = await dashboardFuture;
      final drawsResponse = await drawsFuture;
      final open = (drawsResponse.data ?? <dynamic>[])
          .where((dynamic row) => row is Map && row['status'] == 'OPEN')
          .take(4)
          .toList();
      if (mounted) setState(() {
        data = dashboardResponse.data ?? <String, dynamic>{};
        draws = open;
        error = null;
      });
    } catch (_) {
      if (mounted) setState(() => error = 'Mòd offline: done sou sèvè a poko disponib.');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  String _money(dynamic value, [String _currency = 'USD']) => r'$' + (double.tryParse('$value') ?? 0).toStringAsFixed(2);
  String _status(dynamic status) => const {
    'VALID': 'Valab', 'WINNER': 'Gayan', 'PAID': 'Peye',
    'LOSER': 'Pèdan', 'CANCELLED': 'Anile', 'PENDING': 'An atant',
  }['$status'] ?? '$status';

  String _drawLabel(Map<String, dynamic> draw, {required bool french}) {
    final game = draw['game'] is Map
        ? '${draw['game']['name'] ?? ''}'
        : '${draw['gameName'] ?? ''}';
    final sessionText = <Object?>[
      draw['session'], draw['sessionType'], draw['name'], draw['drawNumber'],
    ].whereType<Object>().join(' ').toUpperCase();
    final session = RegExp(r'\b(MORNING|MATIN|MATEN)\b').hasMatch(sessionText)
        ? (french ? 'Matin' : 'Maten')
        : RegExp(r'\b(MID|MIDI|MIDDAY|NOON|DAY|JOUR)\b').hasMatch(sessionText)
            ? 'Midi'
            : RegExp(r'\b(EVENING|SOIR|SWA|EVE)\b').hasMatch(sessionText)
                ? (french ? 'Soir' : 'Swa')
                : null;
    final source = draw['resultAt'] ?? draw['drawTime'] ?? draw['closesAt'] ?? draw['opensAt'];
    final parsed = source == null ? null : DateTime.tryParse('$source');
    final local = parsed?.toUtc().subtract(const Duration(hours: 4));
    final resolvedSession = session ?? (local == null
        ? (french ? 'Séance à confirmer' : 'Sesyon pou verifye')
        : local.hour < 12
            ? (french ? 'Matin' : 'Maten')
            : local.hour < 16
                ? 'Midi'
                : local.hour < 21
                    ? (french ? 'Soir' : 'Swa')
                    : (french ? 'Nuit' : 'Lannuit'));
    final labelParts = <String>[
      if (game.trim().isNotEmpty) game,
      '${french ? 'Normal' : 'Nòmal'} · $resolvedSession',
    ];
    if (local != null) {
      final day = local.day.toString().padLeft(2, '0');
      final month = local.month.toString().padLeft(2, '0');
      final time = local.hour.toString().padLeft(2, '0') + ':' + local.minute.toString().padLeft(2, '0');
      labelParts.add('$day/$month/${local.year} $time');
    }
    return labelParts.join(' · ');
  }

  @override Widget build(BuildContext context) {
    final d = data ?? {};
    final date = DateTime.tryParse('${d['businessDate'] ?? ''}T12:00:00');
    final dateLabel = date == null ? '' : date.day.toString().padLeft(2, '0') + '/' + date.month.toString().padLeft(2, '0') + '/' + date.year.toString();
    final recent = d['recent'] as List<dynamic>? ?? [];
    if (data == null && loading && error == null) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(16), children: [
      Card(color: const Color(0xffedf3ff), child: ListTile(
        leading: const CircleAvatar(backgroundColor: Color(0xfffff2cc), child: Icon(Icons.wb_sunny_outlined, color: Colors.orange)),
        title: Text('Bonjou ${d['merchant']?['displayName'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: Text('Dènye aktivite jodi a · $dateLabel'),
        trailing: IconButton(onPressed: load, icon: const Icon(Icons.refresh)),
      )),
      if (error != null) Card(child: ListTile(leading: const Icon(Icons.cloud_off), title: Text(error!))),
      if (widget.store.pendingCount > 0) Card(child: ListTile(
        leading: const Icon(Icons.pending_actions),
        title: Text(AppLanguage.tr('Tikè an atant')),
        subtitle: Text(AppLanguage.tr('Yo dwe pase validasyon sèvè a.')),
        trailing: Text('${widget.store.pendingCount}'),
      )),
      const SizedBox(height: 8),
      GridView.count(crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), childAspectRatio: 1.55, mainAxisSpacing: 10, crossAxisSpacing: 10, children: [
        _metric('Vant jodi a', _money(d['sales'], '${d['currency'] ?? 'USD'}'), Icons.account_balance_wallet_outlined, const Color(0xffe9f7ef)),
        _metric('Total tikè', '${d['ticketCount'] ?? 0}', Icons.confirmation_number_outlined, const Color(0xffedf3ff)),
        _metric('Peman gayan', _money(d['payouts'], '${d['currency'] ?? 'USD'}'), Icons.emoji_events_outlined, const Color(0xfffff5e5)),
        _metric('Komisyon', _money(d['commission'], '${d['currency'] ?? 'USD'}'), Icons.percent, const Color(0xfff2edff)),
      ]),
      const SizedBox(height: 14),
      SizedBox(width: double.infinity, child: FilledButton.icon(
        onPressed: () => context.go('/new-ticket'),
        icon: const Icon(Icons.add),
        label: Text(AppLanguage.tr('Vann Tikè')),
      )),
      const SizedBox(height: 8),
      Row(children: [
        Expanded(child: OutlinedButton.icon(onPressed: () => context.go('/tickets'), icon: const Icon(Icons.search), label: Text(AppLanguage.tr('Verifye Tikè')))),
        const SizedBox(width: 9),
        Expanded(child: OutlinedButton.icon(onPressed: () => context.go('/results'), icon: const Icon(Icons.bar_chart), label: Text(AppLanguage.tr('Gade Rezilta')))),
      ]),
      Card(child: Column(children: [
        ListTile(title: Text(AppLanguage.tr('Dènye tikè yo'), style: const TextStyle(fontWeight: FontWeight.bold)), trailing: TextButton(onPressed: () => context.go('/tickets'), child: Text(AppLanguage.tr('Wè tout')))),
        if (recent.isEmpty) ListTile(title: Text(AppLanguage.tr('Pa gen tikè.')))
        else for (final raw in recent.take(5)) Builder(builder: (context) {
          final row = Map<String, dynamic>.from(raw as Map);
          return ListTile(
            dense: true, leading: const Icon(Icons.receipt_long_outlined),
            title: Text('${row['ticketNumber'] ?? ''}'),
            subtitle: Text('${_status(row['status'])} · ${row['createdAt'] ?? ''}'),
            trailing: Text(_money(row['amount'], '${d['currency'] ?? 'USD'}'), style: const TextStyle(fontWeight: FontWeight.bold)),
            onTap: () => context.go('/tickets'),
          );
        }),
      ])),
      Card(child: Column(children: [
        ListTile(title: Text(AppLanguage.tr('Pwochen tiraj yo'), style: const TextStyle(fontWeight: FontWeight.bold)), trailing: TextButton(onPressed: () => context.go('/new-ticket'), child: Text(AppLanguage.tr('Vann')))),
        if (draws.isEmpty) ListTile(title: Text(AppLanguage.tr('Pa gen tiraj ouvè kounye a.')))
        else for (final raw in draws) Builder(builder: (context) {
          final row = Map<String, dynamic>.from(raw as Map);
          return ListTile(
            dense: true, leading: const Icon(Icons.flag_outlined, color: Color(0xff2451c7)),
            title: Text(_drawLabel(row, french: AppLanguage.current.value.languageCode == 'fr')),
            subtitle: Text('${row['game']?['name'] ?? ''}'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.go('/new-ticket'),
          );
        }),
      ])),
      const SizedBox(height: 24),
    ]));
  }

  Widget _metric(String title, String value, IconData icon, Color color) => Card(
    color: color,
    child: Padding(padding: const EdgeInsets.all(14), child: Column(
      crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, color: const Color(0xff2451c7)), const SizedBox(height: 6),
        Text(title, style: const TextStyle(fontSize: 13)),
        Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
      ],
    )),
  );
}
