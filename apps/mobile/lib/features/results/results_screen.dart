import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/network/api_client.dart';

class ResultsScreen extends StatefulWidget {
  const ResultsScreen({super.key, required this.api});
  final ApiClient api;
  @override State<ResultsScreen> createState() => _ResultsState();
}

class _ResultsState extends State<ResultsScreen> {
  List<dynamic> rows=[],pending=[];String? error;Timer? timer;
  @override void initState(){super.initState();load();timer=Timer.periodic(const Duration(seconds:15),(_)=>load());}
  @override void dispose(){timer?.cancel();super.dispose();}
  Future<void>load()async{try{final response=await widget.api.dio.get<List<dynamic>>('/api/v1/lottery/draws'),all=response.data??[];if(mounted)setState((){rows=all.where((row)=>row['status']=='RESULT_PUBLISHED').toList();pending=all.where((row)=>row['status']=='CLOSED'||row['status']=='RESULT_PENDING').toList();error=null;});}catch(_){if(mounted)setState(()=>error='Rezilta yo pa disponib kounye a.');}}
  String drawLabel(Map<String,dynamic>row){final game='${row['game']?['name']??'Lotri'}',draw='${row['drawNumber']}',code='${row['game']?['code']??''}';if(code=='TX'){final suffix=draw.split('-').last;final period={'1000':'Morning','1227':'Day','1800':'Evening','2212':'Night'}[suffix]??'Tiraj';return 'Texas $period';}final date=DateTime.tryParse('${row['resultAt']}')?.toLocal();final period=date==null?'':date.hour<17?'Midi':'Aswè';return '$game $period';}
  List<String> keys(Map<String,dynamic>row)=>(row['result']?['winningKeys']as List<dynamic>? ??const[]).map((x)=>'$x'.split('@').first).toList();
  @override Widget build(BuildContext context)=>RefreshIndicator(onRefresh:load,child:ListView(padding:const EdgeInsets.all(16),children:[
    Row(children:[IconButton(onPressed:()=>context.go('/'),tooltip:'Retounen',icon:const Icon(Icons.arrow_back)),const Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Rezilta yo',style:TextStyle(fontSize:28,fontWeight:FontWeight.w900)),Text('Mizajou otomatik chak 15 segonn')])),IconButton.filledTonal(onPressed:load,icon:const Icon(Icons.refresh))]),
    if(error!=null)Card(color:Theme.of(context).colorScheme.errorContainer,child:Padding(padding:const EdgeInsets.all(14),child:Text(error!))),
    ...rows.map((raw){final row=Map<String,dynamic>.from(raw as Map),numbers=keys(row),logo='${row['game']?['logoUrl']??''}',published=DateTime.tryParse('${row['publishedAt']}')?.toLocal();return Card(margin:const EdgeInsets.only(top:12),clipBehavior:Clip.antiAlias,child:Padding(padding:const EdgeInsets.all(16),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Row(children:[CircleAvatar(radius:27,backgroundColor:Colors.white,backgroundImage:logo.isEmpty?null:NetworkImage(logo),child:logo.isEmpty?Text('${row['game']?['code']??'L'}',style:const TextStyle(fontWeight:FontWeight.bold)):null),const SizedBox(width:12),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(drawLabel(row),style:const TextStyle(fontSize:20,fontWeight:FontWeight.w800)),Text(published==null?'':'${published.day.toString().padLeft(2,'0')}/${published.month.toString().padLeft(2,'0')}/${published.year}  ${published.hour.toString().padLeft(2,'0')}:${published.minute.toString().padLeft(2,'0')}')]))]),const Divider(height:24),if(numbers.isEmpty)const Text('Rezilta a poko gen nimewo.')else Wrap(spacing:10,runSpacing:10,children:numbers.asMap().entries.map((entry)=>Column(children:[Text(entry.key==0?'1ye':entry.key==1?'2yèm':'${entry.key+1}yèm'),Container(margin:const EdgeInsets.only(top:4),width:58,height:58,alignment:Alignment.center,decoration:BoxDecoration(color:Theme.of(context).colorScheme.primary,shape:BoxShape.circle),child:Text(entry.value,style:TextStyle(color:Theme.of(context).colorScheme.onPrimary,fontSize:21,fontWeight:FontWeight.w900)))] )).toList())])));}),
    if(rows.isEmpty&&error==null)Card(child:Padding(padding:const EdgeInsets.all(24),child:Column(children:[const Icon(Icons.hourglass_top,size:42),const SizedBox(height:10),const Text('Pa gen rezilta pibliye pou kounye a.',style:TextStyle(fontWeight:FontWeight.bold)),Text(pending.isEmpty?'Pa gen tiraj ki fèmen ap tann rezilta.':'${pending.length} tiraj fèmen ap tann rezilta. Admin tenant lan kapab pibliye yo nan Games & Draws.')]))),
  ]));
}
