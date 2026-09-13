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
  },
} as const;

export type Language = keyof typeof messages;
export type MessageKey = keyof typeof messages.ht;
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
