import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AppLanguage {
  static const _storage=FlutterSecureStorage(),_key='lottivexa_language';
  static final current=ValueNotifier<Locale>(const Locale('ht'));
  static const supported=[Locale('ht'),Locale('fr')];
  // Stable message IDs for newly migrated screens; no text matching or DOM mutations.
  static const _messages=<String,({String ht,String fr})>{
    'reports.title':(ht:'Rapò',fr:'Rapports'),
    'reports.start':(ht:'Soti',fr:'Du'),
    'reports.end':(ht:'Rive',fr:'Au'),
    'reports.show':(ht:'Afiche rapò',fr:'Afficher le rapport'),
    'reports.invalidDates':(ht:'Dat kòmansman an dwe anvan dat fen an.',fr:'La date de début doit précéder la date de fin.'),
    'reports.unavailable':(ht:'Rapò a pa disponib',fr:'Rapport indisponible'),
    'reports.sales':(ht:'Vant',fr:'Ventes'),
    'reports.tickets':(ht:'Tikè',fr:'Tickets'),
    'reports.payouts':(ht:'Peman gayan',fr:'Paiements des gagnants'),
    'reports.commission':(ht:'Komisyon',fr:'Commissions'),
    'reports.draws':(ht:'Lotri ak tiraj',fr:'Loteries et tirages'),
    'reports.empty':(ht:'Pa gen lavant pou dat sa yo.',fr:'Aucune vente pour ces dates.'),
    'reports.morning':(ht:'Maten',fr:'Matin'),
    'reports.evening':(ht:'Swa',fr:'Soir'),
    'reports.ticketCount':(ht:'tikè',fr:'tickets'),
  };
  static String text(String key){
    final message=_messages[key];
    if(message==null)throw ArgumentError.value(key,'key','Unknown translation key');
    return current.value.languageCode=='fr'?message.fr:message.ht;
  }
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
    'Dat kòmansman an dwe anvan dat fen an.':'La date de début doit précéder la date de fin.','Rapò a pa disponib':'Rapport indisponible',
    'Soti':'Du','Rive':'Au','Afiche rapò':'Afficher le rapport','Vant':'Ventes','Peman gayan':'Paiements gagnants',
    'Komisyon':'Commissions','Lotri ak tiraj':'Loteries et tirages','Pa gen lavant pou dat sa yo.':'Aucune vente pour ces dates.',
    'Maten':'Matin','Swa':'Soir','tikè':'tickets',
  };
  static Future<void>restore()async{final value=await _storage.read(key:_key);current.value=Locale(value=='fr'?'fr':'ht');}
  static Future<void>set(String code)async{if(code!='ht'&&code!='fr')return;current.value=Locale(code);await _storage.write(key:_key,value:code);}
  static String tr(String value)=>current.value.languageCode=='fr'?(_fr[value]??value):value;
}
