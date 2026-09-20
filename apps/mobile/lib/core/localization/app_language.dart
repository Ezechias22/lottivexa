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
    'Dat kòmansman an dwe anvan dat fen an.':'La date de début doit précéder la date de fin.','Rapò a pa disponib':'Rapport indisponible','Telechaje rapò an PDF':'Télécharger le rapport en PDF','Rapò PDF la pa disponib':'Rapport PDF indisponible',
    'Soti':'Du','Rive':'Au','Afiche rapò':'Afficher le rapport','Vant':'Ventes','Peman gayan':'Paiements gagnants',
    'Komisyon':'Commissions','Lotri ak tiraj':'Loteries et tirages','Pa gen lavant pou dat sa yo.':'Aucune vente pour ces dates.',
    'Maten':'Matin','Swa':'Soir','tikè':'tickets','Plis':'Plus','Jodi a':'Aujourd’hui','7 jou':'7 jours','30 jou':'30 jours','Vant total':'Ventes totales','Vant nèt':'Ventes nettes','Vant pa jou':'Ventes par jour','Vant pa lotri':'Ventes par loterie','Pi gwo gany yo':'Plus gros gains','Pa gen gany nan peryòd sa a.':'Aucun gain sur cette période.','Pa gen tiraj ouvè kounye a.':'Aucun tirage ouvert pour le moment.','Pwochen tiraj yo':'Prochains tirages','Dènye tikè yo':'Tickets récents','Wè tout':'Tout voir','Vann Tikè':'Vendre un ticket','Verifye Tikè':'Vérifier un ticket','Gade Rezilta':'Voir les résultats',
    'Administrasyon mobil':'Administration mobile','Siveyans ak administrasyon tenant lan.':'Suivi et administration de l’espace professionnel.','Antre rezilta tiraj':'Saisir le résultat d’un tirage','Rezilta antre manyèlman':'Saisie manuelle des résultats','Chwazi tiraj ki fèmen an':'Sélectionnez un tirage clôturé','Nimewo gayan yo, nan lòd':'Numéros gagnants, dans l’ordre','Pibliye rezilta':'Publier le résultat','Rezilta ki deja pibliye':'Résultats déjà publiés','Pa gen tiraj fèmen k ap tann rezilta.':'Aucun tirage clôturé en attente de résultat.','Antre 1 rive 20 nimewo, chak gen 1 rive 5 chif.':'Saisissez de 1 à 20 numéros de 1 à 5 chiffres.','Konfime rezilta a':'Confirmer le résultat','Pibliye':'Publier','Anile':'Annuler','Rezilta a pibliye; tikè yo mete ajou.':'Résultat publié ; les tickets sont mis à jour.','Rezilta a pa t pibliye. Verifye dwa aksè ou ak tiraj la.':'Le résultat n’a pas été publié. Vérifiez vos droits et le tirage.',
    'Lajan tikè ak rapò':'Devise des tickets et rapports','Siy dola pou pri tikè ak rapò.':'Symbole dollar pour les prix et les rapports.','Anrejistre siy dola a':'Enregistrer le symbole dollar.','Lajan tikè a sove.':'Devise des tickets enregistrée.',
    'Senkronizasyon ak enprimant':'Synchronisation et imprimantes','Sou entènèt':'En ligne','San entènèt':'Hors ligne','Ap tann senkronizasyon':'En attente de synchronisation','Enpresyon an atant':'Impressions en attente','Aparèy POS sa a':'Cet appareil de caisse','Aparèy apwouve':'Appareil autorisé','Tcheke epi senkronize':'Vérifier et synchroniser','Ap tann apwobasyon administratè a':'En attente de validation par l’administrateur','Enprimant biwo a':'Imprimantes de la succursale','Pa gen lòt enprimant nan biwo sa a.':'Aucune autre imprimante dans cette succursale.','Sòti':'Se déconnecter','Mizajou otomatik chak 15 segonn':'Actualisation toutes les 15 secondes','Rezilta yo':'Résultats','Pa gen rezilta pibliye pou kounye a.':'Aucun résultat publié pour le moment.','Premye':'Premier','Dezyèm':'Deuxième','Lòt':'Autre','Midi':'Midi','Lannuit':'Nuit','Rezilta a poko gen nimewo.':'Le résultat ne comporte aucun numéro.','Retounen':'Retour','Rezilta yo pa disponib kounye a.':'Les résultats ne sont pas disponibles actuellement.','Pa gen tiraj ki fèmen ap tann rezilta.':'Aucun tirage clôturé n’attend de résultat.','Admin biznis la kapab pibliye tiraj yo nan Lotri ak tiraj.':'L’administrateur peut publier les tirages dans Loteries et tirages.','tiraj fèmen ap tann rezilta.':'tirages clôturés en attente de résultat.',
  };
  static Future<void>restore()async{final value=await _storage.read(key:_key);current.value=Locale(value=='fr'?'fr':'ht');}
  static Future<void>set(String code)async{if(code!='ht'&&code!='fr')return;current.value=Locale(code);await _storage.write(key:_key,value:code);}
  static String tr(String value)=>current.value.languageCode=='fr'?(_fr[value]??value):value;
  static String text(String value)=>tr(value);
}
