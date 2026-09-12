'use client';
import{useEffect,useState}from'react';

const htFr:Record<string,string>={
'Platfòm':'Plateforme','Solisyon':'Solutions','Plan':'Forfaits','Rezilta':'Résultats','Konekte':'Connexion','Mande aksè':'Demander un accès',
'Sistèm bolet pwofesyonèl':'Système de loterie professionnel','Tout operasyon lotri ou.':'Toutes vos opérations de loterie.','Yon sèl platfòm.':'Une seule plateforme.',
'Kòmanse kounye a':'Commencer maintenant','Gade rezilta':'Voir les résultats','Done separe':'Données isolées','Sekirite pa wòl':'Sécurité par rôle','Sipò multi-aparèy':'Compatible multi-appareils',
'YON PLATFÒM KONPLÈ':'UNE PLATEFORME COMPLÈTE','Tout sa ou bezwen pou opere san dezòd.':'Tout ce dont vous avez besoin pour opérer efficacement.',
'Vann rapid':'Vente rapide','Rezilta ak gayan':'Résultats et gagnants','Enprime tout kote':'Imprimez partout','Travay offline':'Travail hors ligne','Finans ak komisyon':'Finances et commissions','Sekirite milti-tenant':'Sécurité multi-tenant','Aprann plis':'En savoir plus',
'OPERASYON SAN ENTERIPSYON':'OPÉRATIONS SANS INTERRUPTION','Sou kontwa a.':'Au comptoir.','Nan biwo a.':'Au bureau.','Tout kote.':'Partout.',
'Machann':'Vendeur','Sipèvizè':'Superviseur','Finans':'Finances','Administrasyon':'Administration','Nouvo tikè':'Nouveau ticket','Eskane QR':'Scanner le QR','Dènye aktivite':'Activité récente','Senkronizasyon fini':'Synchronisation terminée','Tout done yo ajou':'Toutes les données sont à jour',
'SENP POU KÒMANSE':'SIMPLE POUR COMMENCER','Soti nan enskripsyon rive nan premye vant ou.':'De l’inscription à votre première vente.','Kreye espas ou':'Créez votre espace','Konfigire operasyon':'Configurez vos opérations','Kòmanse vann':'Commencez à vendre',
'PLAN KI GRANDI AVÈK OU':'DES FORFAITS QUI ÉVOLUENT AVEC VOUS','Chwazi kapasite operasyon ou bezwen an.':'Choisissez la capacité dont votre activité a besoin.','Pou kòmanse':'Pour commencer','Pi popilè':'Le plus populaire','Sou mezi':'Sur mesure','REKÒMANDE':'RECOMMANDÉ','Chwazi plan sa a':'Choisir ce forfait',
'SEKIRITE PA KONSEPSYON':'SÉCURITÉ DÈS LA CONCEPTION','Kontwòl ou ka fè konfyans.':'Un contrôle digne de confiance.','Aksè pa wòl':'Accès par rôle','Tras konplè':'Traçabilité complète','Pwoteksyon done':'Protection des données',
'PRÈ POU MODÈNIZE OPERASYON OU?':'PRÊT À MODERNISER VOS OPÉRATIONS ?','Fè chak tikè konte.':'Faites compter chaque ticket.','Kontakte nou':'Nous contacter','Gade rezilta piblik':'Voir les résultats publics','Tout dwa rezève.':'Tous droits réservés.','Sistèm anliy':'Système en ligne',
'Akèy':'Accueil','Vant':'Ventes','Tikè':'Tickets','Rapò':'Rapports','Aparèy':'Appareils','Itilizatè':'Utilisateurs','Branch':'Succursales','Paramèt':'Paramètres','Dekonekte':'Déconnexion','Logout':'Déconnexion','Settings':'Paramètres',
'Username':'Nom d’utilisateur','Password':'Mot de passe','Forgot password?':'Mot de passe oublié ?','Secure login':'Connexion sécurisée','Dashboard':'Tableau de bord','Health':'État du système','Billing':'Facturation','Subscriptions':'Abonnements','Tenants':'Clients',
'Afiche rezilta':'Afficher les résultats','Rezilta lotri':'Résultats de loterie','Pa gen rezilta pibliye.':'Aucun résultat publié.','AN TAN REYÈL':'EN TEMPS RÉEL'
};
const frHt=Object.fromEntries(Object.entries(htFr).map(([a,b])=>[b,a]));
function translate(root:ParentNode,language:'ht'|'fr'){
 const dictionary=language==='fr'?htFr:frHt;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes:Text[]=[];while(walker.nextNode())nodes.push(walker.currentNode as Text);
 for(const node of nodes){if(node.parentElement?.closest('[data-language-switcher]'))continue;const raw=node.nodeValue??'',trimmed=raw.trim(),translated=dictionary[trimmed];if(translated)node.nodeValue=raw.replace(trimmed,translated)}
 root.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('[placeholder]').forEach(input=>{const value=input.placeholder,translated=dictionary[value];if(translated)input.placeholder=translated});
}
export function LanguageSwitcher(){
 const[language,setLanguage]=useState<'ht'|'fr'>('ht');
 const[waking,setWaking]=useState(false);
 useEffect(()=>{let cancelled=false;const raw=process.env.NEXT_PUBLIC_API_URL??'http://localhost:4000',base=raw.replace(/\/$/,'').endsWith('/api/v1')?raw.replace(/\/$/,''):raw.replace(/\/$/,'')+'/api/v1';async function warm(attempt=0){try{const response=await fetch(base+'/health',{cache:'no-store'});if(!response.ok)throw new Error('NOT_READY');if(!cancelled)setWaking(false)}catch{if(!cancelled){setWaking(true);if(attempt<6)setTimeout(()=>void warm(attempt+1),10_000)}}}void warm();return()=>{cancelled=true}},[]);
 useEffect(()=>{const saved=localStorage.getItem('lottivexa-language');const initial=saved==='fr'?'fr':'ht';setLanguage(initial);document.documentElement.lang=initial;translate(document.body,initial)},[]);
 useEffect(()=>{document.documentElement.lang=language;localStorage.setItem('lottivexa-language',language);translate(document.body,language);const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===Node.ELEMENT_NODE||node.nodeType===Node.TEXT_NODE)translate(node.nodeType===Node.TEXT_NODE?(node.parentNode??document.body) as ParentNode:node as ParentNode,language)});observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect()},[language]);
 return <>{waking&&<div data-language-switcher className="serverWake" role="status"><span className="wakeSpinner"/> {language==='fr'?'Serveur en cours de démarrage…':'Sèvè a ap reveye…'}</div>}<div data-language-switcher className="languageSwitcher" role="group" aria-label="Langue / Lang"><button className={language==='ht'?'active':''} onClick={()=>setLanguage('ht')}>Kreyòl</button><button className={language==='fr'?'active':''} onClick={()=>setLanguage('fr')}>Français</button></div></>
}
