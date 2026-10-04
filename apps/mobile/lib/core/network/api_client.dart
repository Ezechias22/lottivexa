import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../security/session_store.dart';

class ApiClient {
  ApiClient(this.session, {String baseUrl = const String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://lottivexa-api.onrender.com',
  )}) : dio = Dio(BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 75),
          receiveTimeout: const Duration(seconds: 75),
        )) {
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        final token = session.accessToken;
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401 &&
            session.refreshToken != null &&
            error.requestOptions.extra['retried'] != true) {
          final renewed = await _refreshSession();
          if (renewed) {
            error.requestOptions.headers['Authorization'] =
                'Bearer ${session.accessToken}';
            error.requestOptions.extra['retried'] = true;
            return handler.resolve(await dio.fetch(error.requestOptions));
          }
        }
        handler.next(error);
      },
    ));
  }

  final SessionStore session;
  final Dio dio;
  Future<bool>? _refreshInFlight;

  Future<bool> _refreshSession() async {
    final active = _refreshInFlight;
    if (active != null) return active;

    final pending = _performRefresh();
    _refreshInFlight = pending;
    try {
      return await pending;
    } finally {
      if (identical(_refreshInFlight, pending)) _refreshInFlight = null;
    }
  }

  Future<bool> _performRefresh() async {
    final refreshToken = session.refreshToken;
    if (refreshToken == null) return false;
    try {
      final response = await Dio(BaseOptions(baseUrl: dio.options.baseUrl))
          .post<Map<String, dynamic>>(
        '/api/v1/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      await session.save({
        'accessToken': response.data!['accessToken'],
        'refreshToken': response.data!['refreshToken'],
      });
      return true;
    } on DioException catch (error) {
      final status = error.response?.statusCode;
      if (status == 401) await session.clear();
      // Preserve the stored session for network errors and temporary API outages.
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<void> warmUp() async {
    for (var attempt = 0; attempt < 3; attempt++) {
      try {
        await dio.get('/api/v1/health', options: Options(
          extra: {'skipRefresh': true},
          receiveTimeout: const Duration(seconds: 75),
        ));
        return;
      } catch (_) {
        if (attempt == 2) rethrow;
        await Future<void>.delayed(const Duration(seconds: 4));
      }
    }
  }

  String get baseUrl => dio.options.baseUrl;

  Future<void> setBaseUrl(String value) async {
    final normalized = value.trim().replaceFirst(RegExp(r'/+$'), '');
    dio.options.baseUrl = normalized;
    await const FlutterSecureStorage().write(key: 'api_base_url', value: normalized);
  }
}
