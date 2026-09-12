import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/security/session_store.dart';

class AdminHubScreen extends StatelessWidget {
  const AdminHubScreen({super.key, required this.session});
  final SessionStore session;
  @override Widget build(BuildContext context) {
    final items = <({String permission, String path, String label, IconData icon})>[
      (permission: 'merchants.view', path: 'merchants', label: 'Merchants', icon: Icons.storefront), (permission: 'branches.view', path: 'branches', label: 'Branches', icon: Icons.account_tree),
      (permission: 'users.view', path: 'users', label: 'Users', icon: Icons.group), (permission: 'devices.view', path: 'devices', label: 'Devices', icon: Icons.devices),
      (permission: 'printers.view', path: 'printers', label: 'Printers', icon: Icons.print), (permission: 'finance.view', path: 'finance', label: 'Finance', icon: Icons.account_balance),
      (permission: 'reports.view', path: 'reports', label: 'Reports', icon: Icons.analytics), (permission: '', path: 'notifications', label: 'Alerts', icon: Icons.notifications),
    ].where((item) => item.permission.isEmpty || session.hasPermission(item.permission));
    return ListView(padding: const EdgeInsets.all(20), children: [const Text('Mobile Admin', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)), const Text('Siveyans ak administrasyon rapid pou tenant lan.'), const SizedBox(height: 16), ...items.map((item) => Card(child: ListTile(leading: Icon(item.icon), title: Text(item.label), trailing: const Icon(Icons.chevron_right), onTap: () => context.push(item.path == 'reports' || item.path == 'notifications' ? '/${item.path}' : '/admin/${item.path}'))))]);
  }
}
