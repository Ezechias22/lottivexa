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
    'Konekte':'Connexion','Tenant':'Client','Username / Telefòn':'Nom d’utilisateur / Téléphone','Modpas':'Mot de passe','KONEKTE':'SE CONNECTER',
    'Mwen bliye modpas mwen':'Mot de passe oublié','Ranpli tout chan yo.':'Remplissez tous les champs.','Tenant, username oswa modpas la pa kòrèk.':'Client, nom d’utilisateur ou mot de passe incorrect.',
    'Sèvè a pa reponn. Eseye ankò.':'Le serveur ne répond pas. Réessayez.','Koneksyon an echwe. Eseye ankò.':'Échec de connexion. Réessayez.','Tanpri tann…':'Veuillez patienter…',
    'Nouvo mizajou disponib':'Nouvelle mise à jour disponible','Yon nouvo vèsyon LOTTIVEXA disponib. Mete app la ajou pou jwenn koreksyon ak amelyorasyon yo.':'Une nouvelle version de LOTTIVEXA est disponible. Installez-la pour obtenir les correctifs et améliorations.','Pita':'Plus tard','METE AJOU':'METTRE À JOUR',
    'Chwazi lang ou':'Choisissez votre langue','Ou kapab chanje lang lan nenpòt lè.':'Vous pourrez modifier la langue à tout moment.',
  };
  static Future<void>restore()async{final value=await _storage.read(key:_key);current.value=Locale(value=='fr'?'fr':'ht');}
  static Future<void>set(String code)async{if(code!='ht'&&code!='fr')return;current.value=Locale(code);await _storage.write(key:_key,value:code);}
  static String tr(String value)=>current.value.languageCode=='fr'?(_fr[value]??value):value;
}
