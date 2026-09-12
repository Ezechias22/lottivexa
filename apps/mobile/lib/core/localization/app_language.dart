import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AppLanguage {
  static const _storage=FlutterSecureStorage(),_key='lottivexa_language';
  static final current=ValueNotifier<Locale>(const Locale('ht'));
  static const supported=[Locale('ht'),Locale('fr')];
  static const _fr=<String,String>{
    'Akèy':'Accueil','Admin':'Administration','Vann':'Vendre','Tikè':'Tickets','Rezilta':'Résultats','Kès':'Caisse',
    'Paramèt':'Paramètres','Rapò':'Rapports','Notifikasyon':'Notifications','Dekonekte':'Déconnexion',
    'Kreyòl':'Créole','Français':'Français','Lang':'Langue','Lang aplikasyon an':'Langue de l’application',
    'Sèvè a ap reveye…':'Démarrage du serveur…','Eseye ankò':'Réessayer','Anliy':'En ligne','Offline':'Hors ligne',
    'Sove epi senkronize':'Enregistrer et synchroniser','Konekte yon printer':'Connecter une imprimante',
    'Chèche Bluetooth':'Rechercher Bluetooth','Chèche USB':'Rechercher USB','Enprime nòmal':'Impression système',
  };
  static Future<void>restore()async{final value=await _storage.read(key:_key);current.value=Locale(value=='fr'?'fr':'ht');}
  static Future<void>set(String code)async{if(code!='ht'&&code!='fr')return;current.value=Locale(code);await _storage.write(key:_key,value:code);}
  static String tr(String value)=>current.value.languageCode=='fr'?(_fr[value]??value):value;
}
