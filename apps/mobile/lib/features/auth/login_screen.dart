import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/network/api_client.dart';
import '../../core/security/session_store.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key,required this.api,required this.session});
  final ApiClient api;final SessionStore session;
  @override State<LoginScreen>createState()=>_LoginState();
}

class _LoginState extends State<LoginScreen>{
  final tenant=TextEditingController(),username=TextEditingController(),password=TextEditingController();
  late final TextEditingController server;
  bool busy=false;String?error;
  @override void initState(){super.initState();server=TextEditingController(text:widget.api.baseUrl);}
  @override void dispose(){server.dispose();tenant.dispose();username.dispose();password.dispose();super.dispose();}
  Future<void>login()async{
    if(tenant.text.trim().isEmpty||username.text.trim().isEmpty||password.text.isEmpty){setState(()=>error='Ranpli Tenant, Username ak Password.');return;}
    final uri=Uri.tryParse(server.text.trim());
    if(uri==null||!uri.hasScheme||!uri.hasAuthority){setState(()=>error='Mete yon adrès sèvè valab, egzanp http://192.168.15.17:4100');return;}
    setState((){busy=true;error=null;});
    try{await widget.api.setBaseUrl(server.text);await widget.api.warmUp();final response=await widget.api.dio.post<Map<String,dynamic>>('/api/v1/auth/login',data:{'tenant':tenant.text.trim(),'username':username.text.trim(),'password':password.text});await widget.session.save(response.data!);}
    on DioException catch(exception){if(!mounted)return;final status=exception.response?.statusCode;setState(()=>error=status==401?'Tenant, username oswa modpas la pa kòrèk.':'API pa reponn sou ${widget.api.baseUrl}. ${exception.message??exception.type.name}');}
    catch(exception){if(mounted)setState(()=>error='Login echwe: $exception');}
    finally{if(mounted)setState(()=>busy=false);}
  }
  @override Widget build(BuildContext context)=>Scaffold(body:SafeArea(child:Center(child:SingleChildScrollView(child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:420),child:Padding(padding:const EdgeInsets.all(24),child:Column(mainAxisAlignment:MainAxisAlignment.center,crossAxisAlignment:CrossAxisAlignment.stretch,children:[Image.asset('assets/branding/lottivexa-logo.png',height:150,fit:BoxFit.contain),const SizedBox(height:20),TextField(controller:server,keyboardType:TextInputType.url,textInputAction:TextInputAction.next,decoration:const InputDecoration(labelText:'Adrès sèvè',hintText:'http://192.168.15.17:4100',helperText:'Pa mete /api/v1 nan fen an',border:OutlineInputBorder())),const SizedBox(height:12),TextField(controller:tenant,textInputAction:TextInputAction.next,decoration:const InputDecoration(labelText:'Tenant',border:OutlineInputBorder())),const SizedBox(height:12),TextField(controller:username,textInputAction:TextInputAction.next,decoration:const InputDecoration(labelText:'Username / Phone',border:OutlineInputBorder())),const SizedBox(height:12),TextField(controller:password,obscureText:true,onSubmitted:(_)=>login(),decoration:const InputDecoration(labelText:'Password',border:OutlineInputBorder())),if(error!=null)Padding(padding:const EdgeInsets.only(top:12),child:Text(error!,style:TextStyle(color:Theme.of(context).colorScheme.error,fontWeight:FontWeight.w600))),const SizedBox(height:18),FilledButton(onPressed:busy?null:login,child:Text(busy?'Ap konekte...':'KONEKTE')),TextButton(onPressed:busy?null:()=>context.push('/forgot-password'),child:const Text('Mwen bliye modpas mwen'))])))))));
}
