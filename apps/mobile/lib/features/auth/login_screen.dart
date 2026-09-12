import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/localization/app_language.dart';
import '../../core/network/api_client.dart';
import '../../core/security/session_store.dart';
import '../../core/update/app_update_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key,required this.api,required this.session});
  final ApiClient api;final SessionStore session;
  @override State<LoginScreen>createState()=>_LoginState();
}
class _LoginState extends State<LoginScreen>{
  final tenant=TextEditingController(),username=TextEditingController(),password=TextEditingController();
  bool busy=false;String?error;
  @override void initState(){super.initState();WidgetsBinding.instance.addPostFrameCallback((_)=>AppUpdateService.check(context));}
  @override void dispose(){tenant.dispose();username.dispose();password.dispose();super.dispose();}
  Future<void>login()async{
    if(tenant.text.trim().isEmpty||username.text.trim().isEmpty||password.text.isEmpty){setState(()=>error=AppLanguage.tr('Ranpli tout chan yo.'));return;}
    setState((){busy=true;error=null;});
    try{await widget.api.warmUp();final response=await widget.api.dio.post<Map<String,dynamic>>('/api/v1/auth/login',data:{'tenant':tenant.text.trim(),'username':username.text.trim(),'password':password.text});await widget.session.save(response.data!);}
    on DioException catch(exception){if(!mounted)return;setState(()=>error=exception.response?.statusCode==401?AppLanguage.tr('Tenant, username oswa modpas la pa kòrèk.'):AppLanguage.tr('Sèvè a pa reponn. Eseye ankò.'));}
    catch(_){if(mounted)setState(()=>error=AppLanguage.tr('Koneksyon an echwe. Eseye ankò.'));}
    finally{if(mounted)setState(()=>busy=false);}
  }
  @override Widget build(BuildContext context)=>Scaffold(body:SafeArea(child:Center(child:SingleChildScrollView(child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:420),child:Padding(padding:const EdgeInsets.all(24),child:ValueListenableBuilder<Locale>(valueListenable:AppLanguage.current,builder:(_,locale,__)=>Column(mainAxisAlignment:MainAxisAlignment.center,crossAxisAlignment:CrossAxisAlignment.stretch,children:[
    Align(alignment:Alignment.centerRight,child:SegmentedButton<String>(segments:const[ButtonSegment(value:'ht',label:Text('Kreyòl')),ButtonSegment(value:'fr',label:Text('Français'))],selected:{locale.languageCode},showSelectedIcon:false,onSelectionChanged:(value)=>AppLanguage.set(value.first))),
    Image.asset('assets/branding/lottivexa-logo.png',height:150,fit:BoxFit.contain),const SizedBox(height:20),Text(AppLanguage.tr('Konekte'),textAlign:TextAlign.center,style:Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight:FontWeight.bold)),const SizedBox(height:18),
    TextField(controller:tenant,textInputAction:TextInputAction.next,decoration:InputDecoration(labelText:AppLanguage.tr('Tenant'),prefixIcon:const Icon(Icons.business),border:const OutlineInputBorder())),const SizedBox(height:12),
    TextField(controller:username,textInputAction:TextInputAction.next,decoration:InputDecoration(labelText:AppLanguage.tr('Username / Telefòn'),prefixIcon:const Icon(Icons.person),border:const OutlineInputBorder())),const SizedBox(height:12),
    TextField(controller:password,obscureText:true,onSubmitted:(_)=>login(),decoration:InputDecoration(labelText:AppLanguage.tr('Modpas'),prefixIcon:const Icon(Icons.lock),border:const OutlineInputBorder())),
    if(error!=null)Padding(padding:const EdgeInsets.only(top:12),child:Text(error!,textAlign:TextAlign.center,style:TextStyle(color:Theme.of(context).colorScheme.error,fontWeight:FontWeight.w600))),if(busy)Padding(padding:const EdgeInsets.only(top:12),child:Text(AppLanguage.tr('Sèvè a ap reveye…'),textAlign:TextAlign.center)),const SizedBox(height:18),
    FilledButton(onPressed:busy?null:login,child:Padding(padding:const EdgeInsets.all(13),child:Text(busy?AppLanguage.tr('Tanpri tann…'):AppLanguage.tr('KONEKTE')))),TextButton(onPressed:busy?null:()=>context.push('/forgot-password'),child:Text(AppLanguage.tr('Mwen bliye modpas mwen')))
  ]))))))));
}
