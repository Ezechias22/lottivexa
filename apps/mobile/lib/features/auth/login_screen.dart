import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/localization/app_language.dart';
import '../../core/network/api_client.dart';
import '../../core/mobile_runtime.dart';
import '../../core/security/session_store.dart';
import '../../core/update/app_update_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key,required this.api,required this.session,required this.runtime});
  final ApiClient api;final SessionStore session;final MobileRuntime runtime;
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
    try{await widget.api.warmUp();final response=await widget.api.dio.post<Map<String,dynamic>>('/api/v1/auth/login',data:{'tenant':tenant.text.trim(),'username':username.text.trim(),'password':password.text});await widget.session.save(response.data!);try{await widget.runtime.prepareDevice();await widget.runtime.recover();}catch(_){/* Login remains valid while device approval or network is pending. */}}
    on DioException catch(exception){if(!mounted)return;setState(()=>error=exception.response?.statusCode==401?AppLanguage.tr('Tenant, username oswa modpas la pa kòrèk.'):AppLanguage.tr('Sèvè a pa reponn. Eseye ankò.'));}
    catch(_){if(mounted)setState(()=>error=AppLanguage.tr('Koneksyon an echwe. Eseye ankò.'));}
    finally{if(mounted)setState(()=>busy=false);}
  }
  Future<void>chooseLanguage()async{await showModalBottomSheet<void>(context:context,showDragHandle:true,builder:(sheetContext)=>SafeArea(child:Padding(padding:const EdgeInsets.fromLTRB(20,0,20,24),child:ValueListenableBuilder<Locale>(valueListenable:AppLanguage.current,builder:(_,locale,__)=>Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.stretch,children:[Text(AppLanguage.tr('Chwazi lang ou'),style:Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight:FontWeight.bold)),const SizedBox(height:6),Text(AppLanguage.tr('Ou kapab chanje lang lan nenpòt lè.'),style:Theme.of(context).textTheme.bodyMedium),const SizedBox(height:18),_LanguageOption(flag:'🇭🇹',title:'Kreyòl ayisyen',subtitle:'Lang kreyòl',selected:locale.languageCode=='ht',onTap:()async{await AppLanguage.set('ht');if(sheetContext.mounted)Navigator.pop(sheetContext);}),const SizedBox(height:10),_LanguageOption(flag:'🇫🇷',title:'Français',subtitle:'Langue française',selected:locale.languageCode=='fr',onTap:()async{await AppLanguage.set('fr');if(sheetContext.mounted)Navigator.pop(sheetContext);})])))));}
  @override Widget build(BuildContext context)=>Scaffold(body:SafeArea(child:Center(child:SingleChildScrollView(child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:420),child:Padding(padding:const EdgeInsets.all(24),child:ValueListenableBuilder<Locale>(valueListenable:AppLanguage.current,builder:(_,locale,__)=>Column(mainAxisAlignment:MainAxisAlignment.center,crossAxisAlignment:CrossAxisAlignment.stretch,children:[
    Align(alignment:Alignment.centerRight,child:OutlinedButton.icon(onPressed:chooseLanguage,icon:const Icon(Icons.language,size:19),label:Text(locale.languageCode=='fr'?'Français':'Kreyòl'),style:OutlinedButton.styleFrom(padding:const EdgeInsets.symmetric(horizontal:14,vertical:10),shape:const StadiumBorder()))),
    Image.asset('assets/branding/lottivexa-logo.png',height:150,fit:BoxFit.contain),const SizedBox(height:20),Text(AppLanguage.tr('Konekte'),textAlign:TextAlign.center,style:Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight:FontWeight.bold)),const SizedBox(height:18),
    TextField(controller:tenant,textInputAction:TextInputAction.next,decoration:InputDecoration(labelText:AppLanguage.tr('Tenant'),prefixIcon:const Icon(Icons.business),border:const OutlineInputBorder())),const SizedBox(height:12),
    TextField(controller:username,textInputAction:TextInputAction.next,decoration:InputDecoration(labelText:AppLanguage.tr('Username / Telefòn'),prefixIcon:const Icon(Icons.person),border:const OutlineInputBorder())),const SizedBox(height:12),
    TextField(controller:password,obscureText:true,onSubmitted:(_)=>login(),decoration:InputDecoration(labelText:AppLanguage.tr('Modpas'),prefixIcon:const Icon(Icons.lock),border:const OutlineInputBorder())),
    if(error!=null)Padding(padding:const EdgeInsets.only(top:12),child:Text(error!,textAlign:TextAlign.center,style:TextStyle(color:Theme.of(context).colorScheme.error,fontWeight:FontWeight.w600))),if(busy)Padding(padding:const EdgeInsets.only(top:12),child:Text(AppLanguage.tr('Sèvè a ap reveye…'),textAlign:TextAlign.center)),const SizedBox(height:18),
    FilledButton(onPressed:busy?null:login,child:Padding(padding:const EdgeInsets.all(13),child:Text(busy?AppLanguage.tr('Tanpri tann…'):AppLanguage.tr('KONEKTE')))),TextButton(onPressed:busy?null:()=>context.push('/forgot-password'),child:Text(AppLanguage.tr('Mwen bliye modpas mwen')))
  ]))))))));
}

class _LanguageOption extends StatelessWidget{
  const _LanguageOption({required this.flag,required this.title,required this.subtitle,required this.selected,required this.onTap});
  final String flag,title,subtitle;final bool selected;final VoidCallback onTap;
  @override Widget build(BuildContext context)=>Material(color:selected?Theme.of(context).colorScheme.primaryContainer:Theme.of(context).colorScheme.surfaceContainerLow,borderRadius:BorderRadius.circular(16),child:InkWell(onTap:onTap,borderRadius:BorderRadius.circular(16),child:Padding(padding:const EdgeInsets.all(16),child:Row(children:[Text(flag,style:const TextStyle(fontSize:28)),const SizedBox(width:14),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(title,style:const TextStyle(fontSize:16,fontWeight:FontWeight.w700)),Text(subtitle,style:Theme.of(context).textTheme.bodySmall)])),if(selected)Icon(Icons.check_circle,color:Theme.of(context).colorScheme.primary)]))));
}
