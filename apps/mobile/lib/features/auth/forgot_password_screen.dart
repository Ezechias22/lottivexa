import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key, required this.api});
  final ApiClient api;
  @override State<ForgotPasswordScreen> createState() => _ForgotPasswordState();
}
class _ForgotPasswordState extends State<ForgotPasswordScreen> {
  final tenant = TextEditingController(), identifier = TextEditingController();
  bool busy = false; String? message;
  Future<void> send() async { setState(() { busy = true; message = null; }); try { await widget.api.dio.post('/api/v1/auth/forgot-password', data: {'tenant': tenant.text.trim(), 'identifier': identifier.text.trim()}); if (mounted) setState(() => message = 'Si kont lan egziste epi li gen email, n ap voye yon lyen sekirize.'); } catch (_) { if (mounted) setState(() => message = 'Demann nan pa pase. Eseye ankò pita.'); } finally { if (mounted) setState(() => busy = false); } }
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Forgot password')), body: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 420), child: ListView(padding: const EdgeInsets.all(24), shrinkWrap: true, children: [const Text('Password recovery', style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold)), const Text('Lyen an ekspire apre 30 minit epi li kapab sèvi yon sèl fwa.'), const SizedBox(height: 20), TextField(controller: tenant, decoration: const InputDecoration(labelText: 'Tenant', border: OutlineInputBorder())), const SizedBox(height: 12), TextField(controller: identifier, decoration: const InputDecoration(labelText: 'Username, email or phone', border: OutlineInputBorder())), const SizedBox(height: 18), FilledButton(onPressed: busy ? null : send, child: Text(busy ? 'Processing…' : 'Send secure reset link')), if (message != null) Padding(padding: const EdgeInsets.only(top: 16), child: Text(message!))]))));
}
