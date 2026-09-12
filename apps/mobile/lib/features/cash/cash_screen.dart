import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';

class CashScreen extends StatefulWidget {
  const CashScreen({super.key, required this.api});
  final ApiClient api;
  @override
  State<CashScreen> createState() => _State();
}

class _State extends State<CashScreen> {
  Map<String, dynamic>? session;
  final amount = TextEditingController();
  String? message;
  bool busy = false;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final response = await widget.api.dio
          .get<Map<String, dynamic>?>('/api/v1/cash/session/current');
      if (mounted) {
        setState(() {
          session = response.data;
          message = null;
        });
      }
    } catch (_) {
      if (mounted) setState(() => message = 'Pa kapab chaje cash session la.');
    }
  }

  Future<void> open() => action('/api/v1/cash/session/open',
      {'openingCash': amount.text});
  Future<void> close() => action('/api/v1/cash/session/${session!['id']}/close',
      {'actualCash': amount.text});

  Future<void> action(String path, Map<String, dynamic> body) async {
    setState(() => busy = true);
    try {
      await widget.api.dio.post(path, data: body);
      amount.clear();
      await load();
    } catch (_) {
      if (mounted) {
        setState(() =>
            message = 'Operasyon cash la refize. Verifye montan ak permission.');
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
        onRefresh: load,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text('Cash Session',
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold)),
            Card(
              child: ListTile(
                title: Text(session == null
                    ? 'No open shift'
                    : 'Shift ${session!['status']}'),
                subtitle: session == null
                    ? null
                    : Text('Opening cash: ${session!['openingCash']}'),
              ),
            ),
            TextField(
              controller: amount,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText:
                    session == null ? 'Opening cash' : 'Actual closing cash',
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 14),
            FilledButton(
              onPressed: busy ? null : (session == null ? open : close),
              child: Text(session == null ? 'Open shift' : 'Close shift'),
            ),
            if (message != null)
              Padding(
                  padding: const EdgeInsets.all(12), child: Text(message!)),
          ],
        ),
      );
}
