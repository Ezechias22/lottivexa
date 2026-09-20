import 'package:flutter/material.dart';
import '../../core/localization/app_language.dart';
import '../../core/network/api_client.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key, required this.api});
  final ApiClient api;
  @override State<ReportsScreen> createState() => _ReportsState();
}

class _ReportsState extends State<ReportsScreen> {
  DateTime? from, to;
  Map<String,dynamic>? summary;
  List<dynamic> draws=[];
  String? error;
  bool loading=false;
  @override void initState(){super.initState();load();}
  String _date(DateTime date)=>'${date.year.toString().padLeft(4,'0')}-${date.month.toString().padLeft(2,'0')}-${date.day.toString().padLeft(2,'0')}';
  Future<void> pick(bool first)async{
    final selected=await showDatePicker(context:context,firstDate:DateTime(2020),lastDate:DateTime.now(),initialDate:(first?from:to)??DateTime.now());
    if(selected==null||!mounted)return;
    setState((){if(first){from=selected;}else{to=selected;}});
  }
  Future<void> load()async{
    if(from!=null&&to!=null&&from!.isAfter(to!)){setState(()=>error=AppLanguage.tr('Dat kòmansman an dwe anvan dat fen an.'));return;}
    setState((){loading=true;error=null;});
    try{
      final params=<String,dynamic>{if(from!=null)'from':_date(from!),if(to!=null)'to':_date(to!)};
      final results=await Future.wait([widget.api.dio.get<Map<String,dynamic>>('/api/v1/reports/sales',queryParameters:params),widget.api.dio.get<Map<String,dynamic>>('/api/v1/reports/draws',queryParameters:params)]);
      if(mounted)setState((){summary=results[0].data;draws=(results[1].data?['byDraw'] as List?)??[];});
    }catch(e){if(mounted)setState(()=>error='${AppLanguage.tr('Rapò a pa disponib')}: $e');}
    finally{if(mounted)setState(()=>loading=false);}
  }
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:Text(AppLanguage.tr('Rapò'))),body:RefreshIndicator(onRefresh:load,child:ListView(padding:const EdgeInsets.all(16),children:[
    Wrap(spacing:8,runSpacing:8,children:[OutlinedButton(onPressed:()=>pick(true),child:Text('${AppLanguage.tr('Soti')}: ${from==null?'—':_date(from!)}')),OutlinedButton(onPressed:()=>pick(false),child:Text('${AppLanguage.tr('Rive')}: ${to==null?'—':_date(to!)}')),FilledButton(onPressed:loading?null:load,child:Text(AppLanguage.tr('Afiche rapò')))]),
    if(loading)const LinearProgressIndicator(),if(error!=null)Text(error!,style:TextStyle(color:Theme.of(context).colorScheme.error)),
    if(summary!=null)...[for(final item in [('Vant',summary!['tickets']?['sales']),('Tikè',summary!['tickets']?['count']),('Peman gayan',summary!['payouts']?['amount']),('Komisyon',summary!['commission'])])Card(child:ListTile(title:Text(AppLanguage.tr(item.$1)),trailing:Text('${item.$2??0}')))],
    Text(AppLanguage.tr('Lotri ak tiraj'),style:Theme.of(context).textTheme.titleLarge),
    if(draws.isEmpty)Text(AppLanguage.tr('Pa gen lavant pou dat sa yo.')),
    for(final value in draws)Builder(builder:(context){final row=Map<String,dynamic>.from(value as Map);return Card(child:ListTile(title:Text('${row['gameName']} · ${row['drawNumber']}'),subtitle:Text('${row['session']=='MORNING'?AppLanguage.tr('Maten'):row['session']=='EVENING'?AppLanguage.tr('Swa'):''} · ${row['drawDate']?.toString().split('T').first??''} · ${row['count']} ${AppLanguage.tr('tikè')}'),trailing:Text('${row['amount']}')));})
  ])));
}
