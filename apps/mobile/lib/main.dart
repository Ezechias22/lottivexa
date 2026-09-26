import 'package:flutter/material.dart';
import 'app/lottivexa_app.dart';
import 'core/mobile_runtime.dart';
import 'core/security/session_store.dart';
import 'core/localization/app_language.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const _BootstrapApp());
}

class _BootstrapApp extends StatefulWidget {
  const _BootstrapApp();

  @override
  State<_BootstrapApp> createState() => _BootstrapState();
}

class _BootstrapState extends State<_BootstrapApp> {
  late Future<MobileRuntime> _future;

  @override
  void initState() {
    super.initState();
    _future = _start();
  }

  Future<MobileRuntime> _start() async {
    await AppLanguage.restore();
    final session = SessionStore();
    await session.restore();
    return MobileRuntime.create(session);
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<MobileRuntime>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return MaterialApp(
              debugShowCheckedModeBanner: false,
              home: Scaffold(
                body: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: Colors.red),
                        const SizedBox(height: 12),
                        const Text('Lottivexa pa t kapab demare.'),
                        const SizedBox(height: 8),
                        Text('${snapshot.error}', textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        FilledButton(onPressed: () => setState(() => _future = _start()), child: const Text('Eseye ankò')),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }
          if (!snapshot.hasData) {
            return const MaterialApp(
              debugShowCheckedModeBanner: false,
              home: Scaffold(body: Center(child: CircularProgressIndicator())),
            );
          }
          return LottivexaApp(runtime: snapshot.data!);
        },
      );
}
