import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../localization/app_language.dart';

class AppUpdateService {
  static const manifestUrl='https://lottivexa-public-site.onrender.com/app-version.json';
  static bool _checked=false;
  static Future<void>check(BuildContext context)async{
    if(_checked)return;_checked=true;
    try{final info=await PackageInfo.fromPlatform();final response=await Dio(BaseOptions(connectTimeout:const Duration(seconds:12),receiveTimeout:const Duration(seconds:20))).get<Map<String,dynamic>>(manifestUrl,options:Options(headers:{'cache-control':'no-cache'}));final data=response.data,latest=data?['version']?.toString(),url=data?['url']?.toString();if(latest==null||url==null||!_newer(latest,info.version)||!context.mounted)return;await showDialog<void>(context:context,barrierDismissible:data?['required']!=true,builder:(dialogContext)=>AlertDialog(title:Text(AppLanguage.tr('Nouvo mizajou disponib')),content:Text(AppLanguage.tr('Yon nouvo vèsyon LOTTIVEXA disponib. Mete app la ajou pou jwenn koreksyon ak amelyorasyon yo.')),actions:[if(data?['required']!=true)TextButton(onPressed:()=>Navigator.pop(dialogContext),child:Text(AppLanguage.tr('Pita'))),FilledButton(onPressed:()async{final uri=Uri.parse(url);if(await canLaunchUrl(uri))await launchUrl(uri,mode:LaunchMode.externalApplication);},child:Text(AppLanguage.tr('METE AJOU')))]));}catch(_){/* Yon echèk update pa dwe bloke login. */}
  }
  static bool _newer(String latest,String current){final a=latest.split('.').map((x)=>int.tryParse(x)??0).toList(),b=current.split('.').map((x)=>int.tryParse(x)??0).toList();for(var i=0;i<3;i++){final left=i<a.length?a[i]:0,right=i<b.length?b[i]:0;if(left!=right)return left>right;}return false;}
}
