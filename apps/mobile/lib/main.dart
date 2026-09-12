import'package:flutter/material.dart';import'app/lottivexa_app.dart';import'core/mobile_runtime.dart';import'core/security/session_store.dart';
Future<void>main()async{WidgetsFlutterBinding.ensureInitialized();final session=SessionStore();await session.restore();final runtime=await MobileRuntime.create(session);runApp(LottivexaApp(runtime:runtime));}
