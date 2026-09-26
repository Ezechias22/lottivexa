import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import '../core/mobile_runtime.dart';
import '../core/localization/app_language.dart';
import '../features/admin/admin_dashboard_screen.dart';
import '../features/admin/admin_hub_screen.dart';
import '../features/admin/admin_resource_screen.dart';
import '../features/admin/admin_results_screen.dart';
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
      GoRoute(path: '/login', builder: (_, __) => LoginScreen(api: api, session: session, runtime: runtime)),
      GoRoute(path: '/forgot-password', builder: (_, __) => ForgotPasswordScreen(api: api)),
      GoRoute(path: '/change-password', builder: (_, __) => ChangePasswordScreen(api: api, session: session)),
      ShellRoute(builder: (_, state, child) => AppShell(runtime: runtime, currentPath: state.uri.path, child: child), routes: [
        GoRoute(path: '/notifications', builder: (_, __) => NotificationsScreen(api: api)),
        GoRoute(path: '/reports', builder: (_, __) => ReportsScreen(api: api)),
        GoRoute(path: '/admin/:resource', builder: (_, state) => state.pathParameters['resource'] == 'results' ? AdminResultsScreen(api: api) : AdminResourceScreen(api: api, session: session, resource: state.pathParameters['resource']!)),
        GoRoute(path: '/', builder: (_, __) => session.isTenantAdmin ? AdminDashboardScreen(api: api, session: session) : DashboardScreen(api: api, store: runtime.store)),
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
  // Flutter does not provide MaterialLocalizations for Haitian Creole. Keep
  // Flutter's widget locale on French; AppLanguage.current still drives all
  // application copy in Haitian Creole or French via AppLanguage.tr.
  @override Widget build(BuildContext context) => ValueListenableBuilder<Locale>(valueListenable:AppLanguage.current,builder:(_,locale,__)=>MaterialApp.router(title:'Bolet',debugShowCheckedModeBanner:false,locale:const Locale('fr'),supportedLocales:const[Locale('fr')],localizationsDelegates:const[GlobalMaterialLocalizations.delegate,GlobalWidgetsLocalizations.delegate,GlobalCupertinoLocalizations.delegate],theme:ThemeData(colorScheme:ColorScheme.fromSeed(seedColor:const Color(0xff172554)),useMaterial3:true),routerConfig:router));
}

class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.runtime, required this.currentPath, required this.child});
  final MobileRuntime runtime;
  final String currentPath;
  final Widget child;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  Timer? _idleTimer;

  bool get _tenantSession => widget.runtime.session.authenticated && widget.runtime.session.isTenantAdmin;

  @override
  void initState() {
    super.initState();
    _resetIdleTimer();
  }

  @override
  void didUpdateWidget(covariant AppShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    _resetIdleTimer();
  }

  @override
  void dispose() {
    _idleTimer?.cancel();
    super.dispose();
  }

  void _resetIdleTimer() {
    _idleTimer?.cancel();
    if (_tenantSession) {
      _idleTimer = Timer(const Duration(minutes: 30), _expireTenantSession);
    }
  }

  Future<void> _expireTenantSession() async {
    if (!_tenantSession) return;
    await widget.runtime.session.clear();
    if (mounted) context.go('/login');
  }

  KeyEventResult _onKey(FocusNode node, KeyEvent event) {
    _resetIdleTimer();
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    final admin = widget.runtime.session.isTenantAdmin;
    final canSell = widget.runtime.session.hasPermission('tickets.create');
    final canReports = widget.runtime.session.hasPermission('reports.view');
    final paths = admin
        ? <String>['/', '/admin', if (canSell) '/new-ticket', '/tickets', '/results', if (canReports) '/reports', '/cash', '/settings']
        : <String>['/', if (canSell) '/new-ticket', '/tickets', '/results', if (canReports) '/reports', '/cash', '/settings'];
    final destinations = paths.map(_destination).toList();
    final selected = paths.indexOf(widget.currentPath);
    final businessName = widget.runtime.store.setting('receipt_business_name_${widget.runtime.session.tenantId}') ?? 'Bolet';
    final hideHeader = widget.currentPath == '/reports' || widget.currentPath == '/notifications' || widget.currentPath.startsWith('/admin/');
    return Listener(
      onPointerDown: (_) => _resetIdleTimer(),
      onPointerSignal: (_) => _resetIdleTimer(),
      child: Focus(
        onKeyEvent: _onKey,
        child: Scaffold(
          appBar: hideHeader ? null : AppBar(
            title: Text(businessName),
            actions: [
              if (widget.runtime.pendingCount > 0) Badge(label: Text('${widget.runtime.pendingCount}'), child: const Icon(Icons.sync_problem)),
              if (canReports) IconButton(onPressed: () => context.go('/reports'), icon: const Icon(Icons.analytics)),
              IconButton(onPressed: () => context.go('/notifications'), icon: const Icon(Icons.notifications)),
              IconButton(onPressed: () => context.go('/settings'), tooltip: AppLanguage.tr('Paramèt'), icon: const Icon(Icons.settings)),
            ],
          ),
          body: widget.child,
          bottomNavigationBar: NavigationBar(
            selectedIndex: selected < 0 ? 0 : selected,
            onDestinationSelected: (index) => context.go(paths[index]),
            destinations: destinations,
          ),
        ),
      ),
    );
  }

  NavigationDestination _destination(String path) => switch (path) {
    '/' => NavigationDestination(icon: const Icon(Icons.home_outlined), selectedIcon: const Icon(Icons.home), label: AppLanguage.tr('Akèy')),
    '/admin' => NavigationDestination(icon: const Icon(Icons.admin_panel_settings_outlined), selectedIcon: const Icon(Icons.admin_panel_settings), label: AppLanguage.tr('Admin')),
    '/new-ticket' => NavigationDestination(icon: const Icon(Icons.add_box_outlined), selectedIcon: const Icon(Icons.add_box), label: AppLanguage.tr('Vann')),
    '/tickets' => NavigationDestination(icon: const Icon(Icons.receipt_long_outlined), selectedIcon: const Icon(Icons.receipt_long), label: AppLanguage.tr('Tikè')),
    '/reports' => NavigationDestination(icon: const Icon(Icons.bar_chart_outlined), selectedIcon: const Icon(Icons.bar_chart), label: AppLanguage.tr('Rapò')),
    '/settings' => NavigationDestination(icon: const Icon(Icons.more_horiz), selectedIcon: const Icon(Icons.more_horiz), label: AppLanguage.tr('Plis')),
    '/results' => NavigationDestination(icon: const Icon(Icons.emoji_events_outlined), selectedIcon: const Icon(Icons.emoji_events), label: AppLanguage.tr('Rezilta')),
    '/cash' => NavigationDestination(icon: const Icon(Icons.point_of_sale_outlined), selectedIcon: const Icon(Icons.point_of_sale), label: AppLanguage.tr('Kès')),
    _ => NavigationDestination(icon: const Icon(Icons.apps_outlined), label: AppLanguage.tr('Plis')),
  };
}
