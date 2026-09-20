import 'package:flutter/material.dart';
import '../../core/localization/app_language.dart';
import '../../core/network/api_client.dart';

class AdminResultsScreen extends StatefulWidget {
  const AdminResultsScreen({super.key, required this.api});
  final ApiClient api;

  @override
  State<AdminResultsScreen> createState() => _AdminResultsState();
}

class _AdminResultsState extends State<AdminResultsScreen> {
  List<Map<String, dynamic>> draws = [];
  String? selectedId;
  String? notice;
  bool loading = false;
  bool publishing = false;
  final numbers = TextEditingController();

  List<Map<String, dynamic>> get eligible => draws
      .where((draw) => draw['status'] == 'CLOSED' || draw['status'] == 'RESULT_PENDING')
      .toList();

  List<Map<String, dynamic>> get published =>
      draws.where((draw) => draw['status'] == 'RESULT_PUBLISHED').toList();

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    numbers.dispose();
    super.dispose();
  }

  Future<void> load() async {
    setState(() => loading = true);
    try {
      final response = await widget.api.dio.get<List<dynamic>>('/api/v1/lottery/draws');
      if (!mounted) return;
      setState(() {
        draws = (response.data ?? const [])
            .map((row) => Map<String, dynamic>.from(row as Map))
            .toList();
        if (!eligible.any((draw) => draw['id'] == selectedId)) {
          selectedId = null;
        }
        notice = null;
      });
    } catch (_) {
      if (mounted) setState(() => notice = AppLanguage.tr('Rezilta yo pa disponib kounye a.'));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  String label(Map<String, dynamic> draw) {
    final french = AppLanguage.current.value.languageCode == 'fr';
    final game = draw['game'] is Map
        ? '${draw['game']['name'] ?? ''}'
        : '${draw['gameName'] ?? ''}';
    final hint = '${draw['session'] ?? draw['sessionType'] ?? ''} ${draw['drawNumber'] ?? ''}'.toUpperCase();
    final source = draw['resultAt'] ?? draw['closesAt'] ?? draw['opensAt'] ?? draw['drawDate'];
    final parsed = source == null ? null : DateTime.tryParse('$source');
    final local = parsed?.toUtc().subtract(const Duration(hours: 4));
    final session = RegExp(r'\b(MORNING|MATIN|MATEN)\b').hasMatch(hint)
        ? (french ? 'Matin' : 'Maten')
        : RegExp(r'\b(MID|MIDI|MIDDAY|NOON|DAY)\b').hasMatch(hint)
            ? 'Midi'
            : RegExp(r'\b(EVENING|SOIR|SWA|EVE)\b').hasMatch(hint)
                ? (french ? 'Soir' : 'Swa')
                : local == null
                    ? (french ? 'Séance à confirmer' : 'Sesyon pou verifye')
                    : local.hour < 12
                        ? (french ? 'Matin' : 'Maten')
                        : local.hour < 16
                            ? 'Midi'
                            : local.hour < 21
                                ? (french ? 'Soir' : 'Swa')
                                : (french ? 'Nuit' : 'Lannuit');
    final parts = <String>[if (game.isNotEmpty) game, '${french ? 'Normal' : 'Nòmal'} · $session'];
    if (local != null) {
      parts.add('${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year}');
    }
    return parts.join(' · ');
  }

  Future<void> publish() async {
    final matchingDraws = eligible.where((item) => item['id'] == selectedId);
    if (matchingDraws.isEmpty) return;
    final draw = matchingDraws.first;
    final winningKeys = numbers.text
        .split(RegExp(r'[\s,;]+'))
        .map((value) => value.trim())
        .where((value) => value.isNotEmpty)
        .toList();
    if (winningKeys.isEmpty ||
        winningKeys.length > 20 ||
        winningKeys.any((value) => !RegExp(r'^\d{1,5}$').hasMatch(value))) {
      setState(() => notice = AppLanguage.tr('Antre 1 rive 20 nimewo, chak gen 1 rive 5 chif.'));
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(AppLanguage.tr('Konfime rezilta a')),
        content: Text('${label(draw)}\n${winningKeys.join(', ')}'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(AppLanguage.tr('Anile'))),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(AppLanguage.tr('Pibliye'))),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() { publishing = true; notice = null; });
    try {
      await widget.api.dio.post(
        '/api/v1/results/draws/${Uri.encodeComponent('$selectedId')}/publish',
        data: {'winningKeys': winningKeys},
      );
      numbers.clear();
      setState(() => notice = AppLanguage.tr('Rezilta a pibliye; tikè yo mete ajou.'));
      await load();
    } catch (_) {
      setState(() => notice = AppLanguage.tr('Rezilta a pa t pibliye. Verifye dwa aksè ou ak tiraj la.'));
    } finally {
      if (mounted) setState(() => publishing = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: Text(AppLanguage.tr('Antre rezilta tiraj')),
          actions: [IconButton(onPressed: loading ? null : load, icon: const Icon(Icons.refresh))],
        ),
        body: RefreshIndicator(
          onRefresh: load,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (loading) const LinearProgressIndicator(),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(AppLanguage.tr('Rezilta antre manyèlman'), style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: selectedId,
                        decoration: InputDecoration(labelText: AppLanguage.tr('Chwazi tiraj ki fèmen an')),
                        items: eligible.map((draw) => DropdownMenuItem(value: '${draw['id']}', child: Text(label(draw), overflow: TextOverflow.ellipsis))).toList(),
                        onChanged: publishing ? null : (value) => setState(() => selectedId = value),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: numbers,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(labelText: AppLanguage.tr('Nimewo gayan yo, nan lòd'), hintText: '12, 34, 56'),
                      ),
                      const SizedBox(height: 12),
                      FilledButton.icon(
                        onPressed: publishing || selectedId == null ? null : publish,
                        icon: const Icon(Icons.publish),
                        label: Text(publishing ? AppLanguage.tr('Tanpri tann…') : AppLanguage.tr('Pibliye rezilta')),
                      ),
                      if (notice != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(notice!)),
                    ],
                  ),
                ),
              ),
              Text(AppLanguage.tr('Rezilta ki deja pibliye'), style: Theme.of(context).textTheme.titleLarge),
              if (eligible.isEmpty) Card(child: ListTile(title: Text(AppLanguage.tr('Pa gen tiraj fèmen k ap tann rezilta.')))),
              for (final draw in published)
                Card(
                  child: ListTile(
                    title: Text(label(draw)),
                    subtitle: Text(((draw['result']?['winningKeys'] as List<dynamic>?) ?? const []).join(' · ')),
                    leading: const Icon(Icons.check_circle_outline),
                  ),
                ),
            ],
          ),
        ),
      );
}
