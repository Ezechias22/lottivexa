import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/security/session_store.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key, required this.api, required this.session});
  final ApiClient api;
  final SessionStore session;
  @override State<AdminDashboardScreen> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboardScreen> {
  Map<String, dynamic>? report;
  int merchants = 0, branches = 0, devices = 0, alerts = 0;
  String? error;
  @override void initState() { super.initState(); load(); }
  Future<void> load() async {
    try {
      final calls = <Future>[];
      if (widget.session.hasPermission('reports.view')) calls.add(widget.api.dio.get('/api/v1/reports/sales'));
      if (widget.session.hasPermission('merchants.view')) calls.add(widget.api.dio.get('/api/v1/merchants'));
      if (widget.session.hasPermission('branches.view')) calls.add(widget.api.dio.get('/api/v1/branches'));
      if (widget.session.hasPermission('devices.view')) calls.add(widget.api.dio.get('/api/v1/devices'));
      calls.add(widget.api.dio.get('/api/v1/notifications', queryParameters: {'unread': 'true'}));
      final values = await Future.wait(calls);
      var i = 0;
      if (widget.session.hasPermission('reports.view')) report = Map<String, dynamic>.from(values[i++].data as Map);
      if (widget.session.hasPermission('merchants.view')) merchants = (values[i++].data as List).length;
      if (widget.session.hasPermission('branches.view')) branches = (values[i++].data as List).length;
      if (widget.session.hasPermission('devices.view')) devices = (values[i++].data as List).length;
      alerts = (values[i].data as List).length;
      if (mounted) setState(() => error = null);
    } catch (_) { if (mounted) setState(() => error = 'Dashboard admin lan pa kapab chaje kounye a.'); }
  }
  String metric(String group, String key) => report?[group]?[key]?.toString() ?? '0';
  @override Widget build(BuildContext context) => RefreshIndicator(onRefresh: load, child: ListView(padding: const EdgeInsets.all(20), children: [
    const Text('Tenant Dashboard', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
    const Text('Done operasyonèl aktyèl ki soti dirèkteman nan API tenant lan.'),
    if (error != null) Card(child: ListTile(leading: const Icon(Icons.warning_amber), title: Text(error!))),
    GridView.count(crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), childAspectRatio: 1.35, children: [
      _card('Sales', metric('tickets', 'sales'), Icons.payments), _card('Tickets', metric('tickets', 'count'), Icons.receipt_long), _card('Payouts', metric('payouts', 'amount'), Icons.price_check),
      if (widget.session.hasPermission('merchants.view')) _card('Merchants', '$merchants', Icons.storefront),
      if (widget.session.hasPermission('branches.view')) _card('Branches', '$branches', Icons.account_tree),
      if (widget.session.hasPermission('devices.view')) _card('Devices', '$devices', Icons.devices),
      _card('Alerts', '$alerts', Icons.notifications_active),
    ])
  ]));
  Widget _card(String title, String value, IconData icon) => Card(child: Padding(padding: const EdgeInsets.all(14), child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(icon), const SizedBox(height: 6), Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis), Text(title)])));
}
