import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../security/session_store.dart';

class ApiClient {
  ApiClient(this.session,{String baseUrl=const String.fromEnvironment('API_URL',defaultValue:'http://10.0.2.2:4000')}):dio=Dio(BaseOptions(baseUrl:baseUrl,connectTimeout:const Duration(seconds:15),receiveTimeout:const Duration(seconds:20))){
    dio.interceptors.add(InterceptorsWrapper(onRequest:(options,handler){final token=session.accessToken;if(token!=null)options.headers['Authorization']='Bearer $token';handler.next(options);},onError:(error,handler)async{if(error.response?.statusCode==401&&session.refreshToken!=null&&error.requestOptions.extra['retried']!=true){try{final response=await Dio(BaseOptions(baseUrl:dio.options.baseUrl)).post<Map<String,dynamic>>('/api/v1/auth/refresh',data:{'refreshToken':session.refreshToken});await session.save({'accessToken':response.data!['accessToken'],'refreshToken':response.data!['refreshToken']});error.requestOptions.headers['Authorization']='Bearer ${session.accessToken}';error.requestOptions.extra['retried']=true;return handler.resolve(await dio.fetch(error.requestOptions));}catch(_){await session.clear();}}handler.next(error);}));
  }
  final SessionStore session;
  final Dio dio;
  String get baseUrl=>dio.options.baseUrl;
  Future<void>setBaseUrl(String value)async{
    final normalized=value.trim().replaceFirst(RegExp(r'/+$'),'');
    dio.options.baseUrl=normalized;
    await const FlutterSecureStorage().write(key:'api_base_url',value:normalized);
  }
}
