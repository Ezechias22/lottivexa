import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/offline/offline_store.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key,required this.api,required this.store});
  final ApiClient api;
  final OfflineStore store;
  @override State<DashboardScreen> createState()=>_State();
}

class _State extends State<DashboardScreen> {
  Map<String,dynamic>? data;
  String? error;
  @override void initState(){super.initState();load();}

  Future<void> load() async {
    try {
      final tickets=await widget.api.dio.get<List<dynamic>>('/api/v1/tickets');
      final cash=await widget.api.dio.get<Map<String,dynamic>?>('/api/v1/cash/session/current');
      if(mounted)setState((){data={'tickets':tickets.data?.length??0,'shift':cash.data?['status']??'CLOSED'};error=null;});
    } catch (_) {
      if(mounted)setState(()=>error='Mòd offline: done ki sou sèvè a pa disponib. Tikè ki an atant yo pa konfime.');
    }
  }

  @override Widget build(BuildContext context) {
    if(data==null&&error==null)return const Center(child:CircularProgressIndicator());
    return RefreshIndicator(onRefresh:load,child:ListView(padding:const EdgeInsets.all(20),children:[
      const Text('Tablo de bò',style:TextStyle(fontSize:28,fontWeight:FontWeight.bold)),
      if(error!=null)Card(child:ListTile(leading:const Icon(Icons.cloud_off),title:Text(error!))),
      Card(child:ListTile(leading:const Icon(Icons.pending_actions),title:const Text('Tikè an atant'),subtitle:const Text('Yo dwe pase validasyon sèvè a.'),trailing:Text('${widget.store.pendingCount}'))),
      if(data!=null)GridView.count(crossAxisCount:2,shrinkWrap:true,physics:const NeverScrollableScrollPhysics(),children:[
        _card('Dènye tikè konfime','${data!['tickets']}',Icons.receipt),
        _card('Sesyon kès','${data!['shift']}',Icons.point_of_sale),
      ]),
    ]));
  }

  Widget _card(String title,String value,IconData icon)=>Card(child:Padding(padding:const EdgeInsets.all(16),child:Column(mainAxisAlignment:MainAxisAlignment.center,children:[Icon(icon),Text(value,style:const TextStyle(fontSize:24,fontWeight:FontWeight.bold)),Text(title)])));
}
