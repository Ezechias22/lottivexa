const portals = [
  {label:'Master Admin',href:'https://lottivexa-master-admin.onrender.com'},
  {label:'Administrasyon',href:'https://lottivexa-tenant-web.onrender.com'},
  {label:'Espas machann',href:'https://lottivexa-merchant-web.onrender.com'},
];

const features = [
  ['Vann rapid','Antre boul 2, 3, 4 oswa 5 chif, fikse pri yo epi valide tikè a san pèdi tan.'],
  ['Rezilta ak gayan','Pibliye rezilta, idantifye chak boul gayan, kalkile prim epi anpeche doub peman.'],
  ['Enprime tout kote','Sipò pou Bluetooth, USB, rezo ak enprimant tèmik ESC/POS sou aparèy konpatib.'],
  ['Travay offline','Kontinye operasyon otorize yo lè entènèt la fèb epi senkronize yo avèk idempotans.'],
  ['Finans ak komisyon','Swiv lavant, peman, komisyon, sesyon kès ak balans pa branch oswa machann.'],
  ['Sekirite milti-tenant','Done, itilizatè, aparèy, rapò ak paramèt chak antrepriz rete separe.'],
];
const steps = [
  ['01','Kreye espas ou','Chwazi plan ou epi mete enfòmasyon antrepriz la.'],
  ['02','Konfigire operasyon','Ajoute branch, machann, jwèt, limit, odd ak enprimant.'],
  ['03','Kòmanse vann','Vann, enprime, swiv rezilta ak kontwole finans an tan reyèl.'],
];
const plans = [
  {name:'Starter',tag:'Pou kòmanse',features:['1 branch','Jiska 3 machann','POS web ak mobil','Tikè ak QR code','Rapò esansyèl']},
  {name:'Business',tag:'Pi popilè',featured:true,features:['Plizyè branch','Plizyè machann ak aparèy','Offline ak senkronizasyon','Tout mòd enpresyon','Finans ak rapò avanse']},
  {name:'Enterprise',tag:'Sou mezi',features:['Limit adapte','Domen ak mak pèsonalize','Pèmisyon avanse','Sipò priyoritè','Entegrasyon API']},
];
function Mark(){return <span className="mark" aria-hidden="true"><span>LV</span></span>}
function Check(){return <span className="check" aria-hidden="true">✓</span>}

export default function Home(){return <>
  <header className="siteHeader">
    <a className="brand" href="#top" aria-label="LOTTIVEXA akèy"><Mark/><span>LOTTI<b>VEXA</b></span></a>
    <nav aria-label="Navigasyon prensipal"><a href="#platform">Platfòm</a><a href="#solutions">Solisyon</a><a href="#plans">Plan</a><a href="/results">Rezilta</a></nav>
    <div className="headerActions"><a className="textLink" href={portals[2].href}>Konekte</a><a className="button small" href="#contact">Mande aksè</a></div>
  </header>
  <main id="top">
    <section className="hero">
      <div className="heroGlow"/>
      <div className="heroCopy">
        <span className="eyebrow"><i/> Sistèm bolet pwofesyonèl</span>
        <h1>Tout operasyon lotri ou.<br/><em>Yon sèl platfòm.</em></h1>
        <p>LOTTIVEXA konekte lavant, tikè, rezilta, peman, finans ak ekip ou—sou web ak mobil, menm lè koneksyon an fèb.</p>
        <div className="heroActions"><a className="button" href="#contact">Kòmanse kounye a <span>→</span></a><a className="ghostButton" href="/results">Gade rezilta <span>↗</span></a></div>
        <div className="trustRow"><span><Check/> Done separe</span><span><Check/> Sekirite pa wòl</span><span><Check/> Sipò multi-aparèy</span></div>
      </div>
      <div className="dashboardMock" aria-label="Apèsi tablodbò LOTTIVEXA">
        <div className="mockTop"><div className="mockBrand"><Mark/><b>LOTTIVEXA</b></div><span className="liveDot">● Anliy</span></div>
        <div className="mockBody"><aside><b>Apèsi</b><span>Vant</span><span>Tikè</span><span>Rezilta</span><span>Finans</span><span>Rapò</span></aside><div className="mockContent"><div className="mockHeading"><div><small>Bon retou</small><strong>Tablodbò jodi a</strong></div><button>+ Nouvo tikè</button></div><div className="stats"><article><small>Lavant jodi a</small><b>HTG 148,250</b><span>↗ 12.4%</span></article><article><small>Tikè valab</small><b>1,284</b><span>↗ 8.1%</span></article><article><small>Peman gayan</small><b>HTG 31,700</b><span>Kontwole</span></article></div><div className="chartCard"><div><b>Aktivite lavant</b><small>7 dènye jou</small></div><div className="bars">{[45,64,52,78,68,88,73,94,82,100,91,112].map((h,i)=><i key={i} style={{height:h}}/>)}</div></div><div className="ticketRow"><span className="ticketIcon">✓</span><div><b>Tikè #LV-847291</b><small>NY Midday · 3 seleksyon</small></div><strong>HTG 450</strong></div></div></div>
      </div>
    </section>
    <section className="proof"><p>Fèt pou rezo lotri ki bezwen <b>vitès, kontwòl ak fyab</b></p><div><span>Multi-tenant</span><span>Web + Mobile</span><span>Offline-ready</span><span>ESC/POS</span><span>Rapò an tan reyèl</span></div></section>
    <section className="section" id="platform"><div className="sectionIntro"><span className="kicker">YON PLATFÒM KONPLÈ</span><h2>Tout sa ou bezwen pou opere san dezòd.</h2><p>Soti nan premye boul la rive nan dènye rapò finansye a, chak etap rete konekte, trasab epi kontwole.</p></div><div className="featureGrid">{features.map(([title,desc],i)=><article key={title}><span className="featureNo">0{i+1}</span><h3>{title}</h3><p>{desc}</p><a href="#contact">Aprann plis <span>→</span></a></article>)}</div></section>
    <section className="darkSection" id="solutions"><div className="darkCopy"><span className="kicker">OPERASYON SAN ENTERIPSYON</span><h2>Sou kontwa a.<br/>Nan biwo a.<br/><em>Tout kote.</em></h2><p>Chak wòl jwenn zouti li bezwen an san li pa wè oswa chanje sa li pa otorize pou li.</p><ul><li><Check/><span><b>Machann</b> vann, enprime ak verifye tikè rapid.</span></li><li><Check/><span><b>Sipèvizè</b> swiv branch, limit ak aktivite ekip.</span></li><li><Check/><span><b>Finans</b> kontwole kès, komisyon ak peman.</span></li><li><Check/><span><b>Administrasyon</b> jere plan, itilizatè, aparèy ak sekirite.</span></li></ul></div><div className="phoneScene"><div className="orbit one"/><div className="orbit two"/><div className="phone"><div className="phoneTop"><Mark/><span>09:41</span></div><p>Bonjou, Marie</p><h3>HTG 24,850</h3><small>Vant jodi a</small><div className="phoneButtons"><b>＋<small>Nouvo tikè</small></b><b>⌁<small>Eskane QR</small></b></div><div className="phoneList"><strong>Dènye aktivite</strong><span><i>✓</i><b>NY Evening<small>LV-284910</small></b><em>HTG 200</em></span><span><i>✓</i><b>Florida Midday<small>LV-284909</small></b><em>HTG 350</em></span></div></div><div className="floatCard"><span>✓</span><div><b>Senkronizasyon fini</b><small>Tout done yo ajou</small></div></div></div></section>
    <section className="section workflow"><div className="sectionIntro"><span className="kicker">SENP POU KÒMANSE</span><h2>Soti nan enskripsyon rive nan premye vant ou.</h2></div><div className="steps">{steps.map(([n,title,desc])=><article key={n}><b>{n}</b><div><h3>{title}</h3><p>{desc}</p></div></article>)}</div></section>
    <section className="section pricing" id="plans"><div className="sectionIntro"><span className="kicker">PLAN KI GRANDI AVÈK OU</span><h2>Chwazi kapasite operasyon ou bezwen an.</h2><p>Plan mansyèl oswa anyèl. Aktivasyon ak limit yo jere dirèkteman nan platfòm lan.</p></div><div className="planGrid">{plans.map(p=><article key={p.name} className={p.featured?'featured':''}>{p.featured&&<span className="popular">REKÒMANDE</span>}<small>{p.tag}</small><h3>{p.name}</h3><p>{p.name==='Starter'?'Pou yon ti pwen vant ki vle dijitalize operasyon li.':p.name==='Business'?'Pou rezo k ap grandi ki bezwen plis kontwòl ak otomatik.':'Pou gwo operasyon ki bezwen konfigirasyon ak sipò espesyal.'}</p><ul>{p.features.map(f=><li key={f}><Check/>{f}</li>)}</ul><a className={p.featured?'button':'ghostButton'} href="#contact">Chwazi plan sa a</a></article>)}</div></section>
    <section className="security"><div><span className="kicker">SEKIRITE PA KONSEPSYON</span><h2>Kontwòl ou ka fè konfyans.</h2></div><div className="securityGrid"><article><b>01</b><h3>Aksè pa wòl</h3><p>Pèmisyon presi pou administratè, direktè, sipèvizè, finans, jeran ak machann.</p></article><article><b>02</b><h3>Tras konplè</h3><p>Chak anilasyon, peman, chanjman ak aksyon sansib antre nan jounal odit la.</p></article><article><b>03</b><h3>Pwoteksyon done</h3><p>Izolasyon tenant, sesyon sekirize, kontwòl aparèy ak validasyon sou sèvè.</p></article></div></section>
    <section className="cta" id="contact"><div><span className="kicker">PRÈ POU MODÈNIZE OPERASYON OU?</span><h2>Fè chak tikè konte.</h2><p>Kòmanse ak yon espas LOTTIVEXA adapte ak branch, ekip ak règ biznis ou.</p></div><div className="ctaActions"><a className="button light" href="mailto:contact@lottivexa.com?subject=Demann%20aks%C3%A8%20LOTTIVEXA">Kontakte nou <span>→</span></a><a href="/results">Gade rezilta piblik</a></div></section>
  </main>
  <footer><div className="footerTop"><div><a className="brand inverse" href="#top"><Mark/><span>LOTTI<b>VEXA</b></span></a><p>Platfòm operasyon lotri pou ekip ki pran vitès, kontwòl ak sekirite oserye.</p></div><div><b>Platfòm</b><a href="#platform">Fonksyon</a><a href="#plans">Plan</a><a href="/results">Rezilta</a></div><div><b>Aksè</b>{portals.map(p=><a href={p.href} key={p.label}>{p.label}</a>)}</div><div><b>Legal</b><a href="mailto:contact@lottivexa.com">Kontak</a><span>Konfidansyalite</span><span>Kondisyon sèvis</span></div></div><div className="footerBottom"><span>© {new Date().getFullYear()} LOTTIVEXA. Tout dwa rezève.</span><span>Sistèm anliy <i/></span></div></footer>
  </>}
