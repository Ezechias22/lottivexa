import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import '../core/mobile_runtime.dart';
import '../core/localization/app_language.dart';
import '../features/admin/admin_dashboard_screen.dart';
import '../features/admin/admin_hub_screen.dart';
import '../features/admin/admin_resource_screen.dart';
import '../features/auth/change_password_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/forgot_password_screen.dart';
import '../features/cash/cash_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/reports/reports_screen.dart';
import '../features/results/results_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/tickets/new_ticket_screen.dart';
import '../features/tickets/ticket_search_screen.dart';

class LottivexaApp extends StatelessWidget {
  LottivexaApp({super.key, required this.runtime}) {
    final session = runtime.session, api = runtime.api;
    router = GoRouter(refreshListenable: session, redirect: (context, state) {
      if (!session.authenticated && !['/login', '/forgot-password'].contains(state.matchedLocation)) return '/login';
      if (session.authenticated && session.forcePasswordChange && state.matchedLocation != '/change-password') return '/change-password';
      if (session.authenticated && !session.forcePasswordChange && state.matchedLocation == '/login') return '/';
      if (state.matchedLocation.startsWith('/admin') && !session.isTenantAdmin) return '/';
      return null;
    }, routes: [
      GoRoute(path: '/login', builder: (_, __) => LoginScreen(api: api, session: session)),
      GoRoute(path: '/forgot-password', builder: (_, __) => ForgotPasswordScreen(api: api)),
      GoRoute(path: '/change-password', builder: (_, __) => ChangePasswordScreen(api: api, session: session)),
      GoRoute(path: '/notifications', builder: (_, __) => NotificationsScreen(api: api)),
      GoRoute(path: '/reports', builder: (_, __) => ReportsScreen(api: api)),
      GoRoute(path: '/admin/:resource', builder: (_, state) => AdminResourceScreen(api: api, session: session, resource: state.pathParameters['resource']!)),
      ShellRoute(builder: (_, state, child) => AppShell(runtime: runtime, currentPath: state.uri.path, child: child), routes: [
        GoRoute(path: '/', builder: (_, __) => session.isTenantAdmin ? AdminDashboardScreen(api: api, session: session) : DashboardScreen(api: api)),
        GoRoute(path: '/admin', builder: (_, __) => AdminHubScreen(session: session)),
        GoRoute(path: '/new-ticket', builder: (_, state) => NewTicketScreen(runtime: runtime, replayTicket: state.extra as Map<String, dynamic>?)),
        GoRoute(path: '/tickets', builder: (_, __) => TicketSearchScreen(runtime: runtime)),
        GoRoute(path: '/results', builder: (_, __) => ResultsScreen(api: api)),
        GoRoute(path: '/cash', builder: (_, __) => CashScreen(api: api)),
        GoRoute(path: '/settings', builder: (_, __) => SettingsScreen(runtime: runtime)),
      ])
    ]);
  }
  final MobileRuntime runtime;
  late final GoRouter router;
  @override Widget build(BuildContext context) => ValueListenableBuilder<Locale>(valueListenable:AppLanguage.current,builder:(_,locale,__)=>MaterialApp.router(title:'Bolet',debugShowCheckedModeBanner:false,locale:const Locale('fr'),supportedLocales:const[Locale('fr')],localizationsDelegates:const[GlobalMaterialLocalizations.delegate,GlobalWidgetsLocalizations.delegate,GlobalCupertinoLocalizations.delegate],theme:ThemeData(colorScheme:ColorScheme.fromSeed(seedColor:const Color(0xff172554)),useMaterial3:true),routerConfig:router));
}

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.runtime, required this.currentPath, required this.child});
  final MobileRuntime runtime; final String currentPath; final Widget child;
  @override Widget build(BuildContext context) {
    final admin = runtime.session.isTenantAdmin;
    final canSell = runtime.session.hasPermission('tickets.create');
    final paths = admin ? ['/', '/admin', if (canSell) '/new-ticket', '/tickets', '/results'] : ['/', '/new-ticket', '/tickets', '/results', '/cash'];
    final destinations = admin
      ? [NavigationDestination(icon:const Icon(Icons.dashboard_outlined),selectedIcon:const Icon(Icons.dashboard),label:AppLanguage.tr('Akèy')),NavigationDestination(icon:const Icon(Icons.admin_panel_settings_outlined),selectedIcon:const Icon(Icons.admin_panel_settings),label:AppLanguage.tr('Admin')),if(canSell)NavigationDestination(icon:const Icon(Icons.add_box_outlined),selectedIcon:const Icon(Icons.add_box),label:AppLanguage.tr('Vann')),NavigationDestination(icon:const Icon(Icons.receipt_long_outlined),selectedIcon:const Icon(Icons.receipt_long),label:AppLanguage.tr('Tikè')),NavigationDestination(icon:const Icon(Icons.emoji_events_outlined),selectedIcon:const Icon(Icons.emoji_events),label:AppLanguage.tr('Rezilta'))]
      : [NavigationDestination(icon:const Icon(Icons.dashboard_outlined),selectedIcon:const Icon(Icons.dashboard),label:AppLanguage.tr('Akèy')),NavigationDestination(icon:const Icon(Icons.add_box_outlined),selectedIcon:const Icon(Icons.add_box),label:AppLanguage.tr('Vann')),NavigationDestination(icon:const Icon(Icons.receipt_long_outlined),selectedIcon:const Icon(Icons.receipt_long),label:AppLanguage.tr('Tikè')),NavigationDestination(icon:const Icon(Icons.emoji_events_outlined),selectedIcon:const Icon(Icons.emoji_events),label:AppLanguage.tr('Rezilta')),NavigationDestination(icon:const Icon(Icons.point_of_sale_outlined),selectedIcon:const Icon(Icons.point_of_sale),label:AppLanguage.tr('Kès'))];
    final selected=paths.indexOf(currentPath);
    return Scaffold(appBar: AppBar(title: FutureBuilder<String>(future:runtime.printer.businessName(),builder:(_,snapshot)=>Text(snapshot.data??runtime.store.setting('receipt_business_name_${runtime.session.tenantId}')??'Bolet')), actions: [if (runtime.pendingCount > 0) Badge(label: Text('${runtime.pendingCount}'), child: const Icon(Icons.sync_problem)), if (runtime.session.hasPermission('reports.view')) IconButton(onPressed: () => context.push('/reports'), icon: const Icon(Icons.analytics)), IconButton(onPressed: () => context.push('/notifications'), icon: const Icon(Icons.notifications)),IconButton(onPressed:()=>context.go('/settings'),tooltip:AppLanguage.tr('Paramèt'),icon:const Icon(Icons.settings))]), body: child, bottomNavigationBar: NavigationBar(selectedIndex:selected<0?0:selected,onDestinationSelected: (i) => context.go(paths[i]), destinations: destinations));
  }
}
