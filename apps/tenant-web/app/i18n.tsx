'use client';

import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';

export const messages = {
  ht: {
    'nav.dashboard': 'Tablo de bò', 'nav.tickets': 'Tikè', 'nav.lottery': 'Lotri ak tiraj',
    'nav.merchants': 'Machann', 'nav.branches': 'Biwo', 'nav.users': 'Itilizatè ak wòl',
    'nav.finance': 'Finans', 'nav.devices': 'Aparèy', 'nav.printers': 'Enprimant',
    'nav.reports': 'Rapò', 'nav.branding': 'Paramèt ak domèn', 'nav.audit': 'Jounal odit',
    'login.title': 'Administrasyon biznis', 'login.intro': 'Antre nan espas biznis ou. Se administratè a ki kreye kont machann yo.',
    'login.tenant': 'Espas biznis / sou-domèn', 'login.username': 'Non itilizatè / telefòn',
    'login.password': 'Modpas', 'login.submit': 'Konekte', 'login.forgot': 'Ou bliye modpas la?',
    'shell.title': 'ESPAS BIZNIS', 'shell.logout': 'Dekonekte', 'shell.reload': 'Rechaje',
    'report.from': 'Soti', 'report.to': 'Rive', 'report.show': 'Afiche rapò',
    'report.download': 'Telechaje PDF', 'report.sales': 'Vant', 'report.tickets': 'Tikè',
    'report.payouts': 'Peman gayan', 'report.commissions': 'Komisyon',
    'report.byDraw': 'Lotri ak tiraj (maten / swa)', 'report.byStatus': 'Pa estati',
    'report.date': 'Dat', 'report.lottery': 'Lotri', 'report.draw': 'Tiraj',
    'report.drawNumber': 'Nimewo tiraj', 'report.count': 'Kantite', 'report.amount': 'Montan',
    'report.status': 'Estati', 'report.morning': 'Maten', 'report.evening': 'Swa',
    'report.invalidDates': 'Dat kòmansman an dwe anvan dat fen an.',
    'table.actions': 'Aksyon', 'table.empty': 'Pa gen done.', 'wake.loading': 'Sèvè a ap reveye…',
    'result.title':'Antre rezilta manyèl','result.draw':'Tiraj','result.choose':'Chwazi yon tiraj ki fèmen','result.numbers':'Nimewo ki genyen (nan lòd)','result.publish':'Pibliye rezilta','result.wait':'Tanpri tann…','result.invalid':'Antre 1 a 20 nimewo ki gen 1 a 5 chif, separe ak vigil.','result.confirm':'Konfime rezilta pou','result.offline':'Asire tout tikè ki te vann san entènèt senkronize anvan ou pibliye. Piblikasyon an final.','result.success':'Rezilta pibliye; tikè yo mete ajou.','result.none':'Pa gen tiraj ki pare pou resevwa rezilta.','result.history':'Rezilta pibliye','result.lottery':'Lotri',
    'lottery.catalog':'Katalòg bolet Ayiti','lottery.catalogHelp':'Lotri, kalite jwèt, rapò ak orè yo. Ou ka modifye oswa fèmen chak lotri.','lottery.install':'Enstale / mete katalòg ajou','lottery.schedules':'Orè tiraj yo','lottery.enabled':'Aktif','lottery.disabled':'Fèmen','lottery.activate':'Aktive','lottery.close':'Fèmen','lottery.saveLogo':'Sove logo','lottery.noCatalog':'Enstale katalòg la pou kòmanse.','lottery.sourceVerified':'Sous verifye','lottery.sourceManual':'Antre manyèl','lottery.game':'Lotri','lottery.betType':'Kalite jwèt','lottery.odds':'Rapò gany','lottery.day':'Jou','lottery.closeTime':'Fèmti','lottery.resultTime':'Lè rezilta','lottery.makeBet':'Kreye kalite jwèt','lottery.chooseGame':'Chwazi lotri','lottery.betCode':'Kòd jwèt','lottery.count':'Kantite nimewo','lottery.minimum':'Pi piti nimewo','lottery.maximum':'Pi gwo nimewo','lottery.repeats':'Nimewo repete','lottery.yes':'Wi','lottery.no':'Non','lottery.activateOdds':'Aktive rapò gany','lottery.multiplier':'Miltiplikatè gany','lottery.startDate':'Dat kòmansman','lottery.createAttach':'Kreye epi konekte','lottery.createGame':'Kreye lotri','lottery.createDraw':'Kreye tiraj','lottery.games':'Lotri yo','lottery.draws':'Tiraj yo','lottery.description':'Deskripsyon','lottery.cutoffSeconds':'Segonn anvan fèmti','lottery.resultDigits':'Kantite chif rezilta','lottery.drawNumber':'Nimewo tiraj','lottery.drawDate':'Dat tiraj','lottery.opensAt':'Lè ouvèti','lottery.closesAt':'Lè fèmti','lottery.resultAt':'Lè rezilta',
  },
  fr: {
    'nav.dashboard': 'Tableau de bord', 'nav.tickets': 'Tickets', 'nav.lottery': 'Loteries et tirages',
    'nav.merchants': 'Vendeurs', 'nav.branches': 'Succursales', 'nav.users': 'Utilisateurs et rôles',
    'nav.finance': 'Finances', 'nav.devices': 'Appareils', 'nav.printers': 'Imprimantes',
    'nav.reports': 'Rapports', 'nav.branding': 'Paramètres et domaines', 'nav.audit': 'Journal d’audit',
    'login.title': 'Administration de l’entreprise', 'login.intro': 'Accédez à votre espace professionnel. Les comptes vendeurs sont créés par un administrateur.',
    'login.tenant': 'Espace professionnel / sous-domaine', 'login.username': 'Nom d’utilisateur / téléphone',
    'login.password': 'Mot de passe', 'login.submit': 'Connexion', 'login.forgot': 'Mot de passe oublié ?',
    'shell.title': 'ESPACE PROFESSIONNEL', 'shell.logout': 'Déconnexion', 'shell.reload': 'Actualiser',
    'report.from': 'Du', 'report.to': 'Au', 'report.show': 'Afficher le rapport',
    'report.download': 'Télécharger le PDF', 'report.sales': 'Ventes', 'report.tickets': 'Tickets',
    'report.payouts': 'Paiements des gagnants', 'report.commissions': 'Commissions',
    'report.byDraw': 'Loteries et tirages (matin / soir)', 'report.byStatus': 'Par statut',
    'report.date': 'Date', 'report.lottery': 'Loterie', 'report.draw': 'Tirage',
    'report.drawNumber': 'Numéro du tirage', 'report.count': 'Quantité', 'report.amount': 'Montant',
    'report.status': 'Statut', 'report.morning': 'Matin', 'report.evening': 'Soir',
    'report.invalidDates': 'La date de début doit précéder la date de fin.',
    'table.actions': 'Actions', 'table.empty': 'Aucune donnée.', 'wake.loading': 'Démarrage du serveur…',
    'result.title':'Saisir un résultat manuellement','result.draw':'Tirage','result.choose':'Sélectionnez un tirage clôturé','result.numbers':'Numéros gagnants (dans l’ordre)','result.publish':'Publier le résultat','result.wait':'Veuillez patienter…','result.invalid':'Saisissez de 1 à 20 numéros de 1 à 5 chiffres, séparés par des virgules.','result.confirm':'Confirmer le résultat pour','result.offline':'Vérifiez que tous les tickets vendus hors ligne sont synchronisés avant de publier. La publication est définitive.','result.success':'Résultat publié et tickets mis à jour.','result.none':'Aucun tirage prêt à recevoir un résultat.','result.history':'Résultats publiés','result.lottery':'Loterie',
    'lottery.catalog':'Catalogue des loteries haïtiennes','lottery.catalogHelp':'Loteries, types de jeux, rapports et horaires. Vous pouvez modifier ou fermer chaque loterie.','lottery.install':'Installer / actualiser le catalogue','lottery.schedules':'Horaires des tirages','lottery.enabled':'Actif','lottery.disabled':'Fermé','lottery.activate':'Activer','lottery.close':'Fermer','lottery.saveLogo':'Enregistrer le logo','lottery.noCatalog':'Installez le catalogue pour commencer.','lottery.sourceVerified':'Source vérifiée','lottery.sourceManual':'Saisie manuelle','lottery.game':'Loterie','lottery.betType':'Type de jeu','lottery.odds':'Cote de gain','lottery.day':'Jour','lottery.closeTime':'Clôture','lottery.resultTime':'Heure du résultat','lottery.makeBet':'Créer un type de jeu','lottery.chooseGame':'Sélectionner une loterie','lottery.betCode':'Code du jeu','lottery.count':'Nombre de numéros','lottery.minimum':'Numéro minimum','lottery.maximum':'Numéro maximum','lottery.repeats':'Répétitions autorisées','lottery.yes':'Oui','lottery.no':'Non','lottery.activateOdds':'Activer la cote de gain','lottery.multiplier':'Multiplicateur des gains','lottery.startDate':'Date de début','lottery.createAttach':'Créer et associer','lottery.createGame':'Créer une loterie','lottery.createDraw':'Créer un tirage','lottery.games':'Loteries','lottery.draws':'Tirages','lottery.description':'Description','lottery.cutoffSeconds':'Délai de clôture (secondes)','lottery.resultDigits':'Nombre de chiffres du résultat','lottery.drawNumber':'Numéro du tirage','lottery.drawDate':'Date du tirage','lottery.opensAt':'Heure d’ouverture','lottery.closesAt':'Heure de clôture','lottery.resultAt':'Heure du résultat',
  },
} as const;

export type Language = keyof typeof messages;
export type MessageKey = keyof typeof messages.ht;
const columnLabels:Record<string,{ht:string;fr:string}>={
  Name:{ht:'Non',fr:'Nom'},Code:{ht:'Kòd',fr:'Code'},Status:{ht:'Estati',fr:'Statut'},Actions:{ht:'Aksyon',fr:'Actions'},Time:{ht:'Lè',fr:'Heure'},Date:{ht:'Dat',fr:'Date'},Draw:{ht:'Tiraj',fr:'Tirage'},Game:{ht:'Lotri',fr:'Loterie'},Number:{ht:'Nimewo',fr:'Numéro'},Amount:{ht:'Montan',fr:'Montant'},Username:{ht:'Non itilizatè',fr:'Identifiant'},Branch:{ht:'Biwo',fr:'Succursale'},Merchant:{ht:'Machann',fr:'Vendeur'},Tickets:{ht:'Tikè',fr:'Tickets'},Sales:{ht:'Vant',fr:'Ventes'},Printer:{ht:'Enprimant',fr:'Imprimante'},Connection:{ht:'Koneksyon',fr:'Connexion'},Protocol:{ht:'Pwotokòl',fr:'Protocole'},Created:{ht:'Kreye',fr:'Créé'},Updated:{ht:'Mete ajou',fr:'Mis à jour'},Permissions:{ht:'Pèmisyon',fr:'Permissions'},Role:{ht:'Wòl',fr:'Rôle'},Login:{ht:'Koneksyon',fr:'Connexion'},'Password change':{ht:'Chanje modpas',fr:'Changement de mot de passe'},'Last seen':{ht:'Dènye prezans',fr:'Dernière activité'},'Active':{ht:'Aktif',fr:'Actif'},'Default':{ht:'Pa defo',fr:'Par défaut'},'Cutoff':{ht:'Lè limit',fr:'Clôture'},'Digits':{ht:'Chif',fr:'Chiffres'},'Open':{ht:'Ouvèti',fr:'Ouverture'},'Close':{ht:'Fèmti',fr:'Clôture'},'Draw number':{ht:'Nimewo tiraj',fr:'Numéro du tirage'},'Created at':{ht:'Dat kreyasyon',fr:'Date de création'},'Quantity':{ht:'Kantite',fr:'Quantité'},'Price':{ht:'Pri',fr:'Prix'},'Balance':{ht:'Balans',fr:'Solde'},'Email':{ht:'Imel',fr:'E-mail'},'Phone':{ht:'Telefòn',fr:'Téléphone'},'Entity':{ht:'Antite',fr:'Entité'},'Action':{ht:'Aksyon',fr:'Action'},'Device':{ht:'Aparèy',fr:'Appareil'},'Version':{ht:'Vèsyon',fr:'Version'}
};
export function localizedColumn(value:string,language:Language){return columnLabels[value]?.[language]??value}
type Translation = {language: Language; setLanguage: (language: Language) => void; t: (key: MessageKey) => string};
const Context = createContext<Translation | null>(null);

export function LanguageProvider({children}: {children: ReactNode}) {
  const [language, setLanguage] = useState<Language>('ht');
  useEffect(() => {
    try {if (localStorage.getItem('lottivexa-language') === 'fr') setLanguage('fr');} catch {/* Storage may be disabled. */}
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    try {localStorage.setItem('lottivexa-language', language);} catch {/* Storage may be disabled. */}
  }, [language]);
  return <Context.Provider value={{language, setLanguage, t: key => messages[language][key]}}>{children}</Context.Provider>;
}

export function useI18n() {
  const context = useContext(Context);
  if (!context) throw new Error('LanguageProvider is missing');
  return context;
}
