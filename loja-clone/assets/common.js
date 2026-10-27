/* Componentes compartilhados — marca e dados fictícios. */
(function(){
const $=s=>document.querySelector(s);
const PAGE=document.body.dataset.page||'';

/* ---------- catálogo ---------- */
// Produtos de assets/catalogo.js (fotos e nomes da Pichau, uso local de estudo). Preços, estoque e descontos são inventados.
// Sem o catálogo, volta ao gerador fictício antigo (nomes "Exemplo" e fotos livres).
let seed=+(document.body.dataset.seed||7);
const rnd=()=>{seed=(seed*9301+49297)%233280;return seed/233280};
const pick=a=>a[Math.floor(rnd()*a.length)];
const brl=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}).replace(/ /,' ');
const NAMES=["Monitor Gamer Exemplo Vortex 27 Pol, IPS, QHD, 1ms, 180Hz, HDMI/DP","Placa de Video Exemplo Storm RX 8GB, GDDR6, 128-bit","Processador Exemplo Core X6, 6-Core, 12-Threads, 4.6GHz, Cache 32MB","SSD Exemplo Flash 1TB, M.2 2280, PCIe NVMe, Leitura 7000MB/s","Cadeira Gamer Exemplo Titan, Reclinavel, Preto e Vermelho","Teclado Mecanico Exemplo K90, RGB, Switch Vermelho, ABNT2","Mouse Gamer Exemplo Falcon, 16000DPI, 7 Botoes, Wireless","Gabinete Gamer Exemplo Nexus, Mid-Tower, Lateral de Vidro, 4 Fans","Fonte Exemplo Power 750W, 80 Plus Gold, Full Modular","Memoria Exemplo Fury 16GB (2x8GB), DDR5, 5600MHz","Headset Gamer Exemplo Echo, 7.1, Drivers 50mm, USB","Placa Mae Exemplo B650M, DDR5, Socket AM5, M-ATX","Kit Ventoinha Exemplo Breeze, ARGB, 3x120mm, Branco","Mesa Gamer Exemplo Arena, 140cm, RGB, Preto","Webcam Exemplo View, Full HD, USB, Preto","Suporte Articulado Exemplo Flex, 17 a 32 Pol, Preto","Microfone Exemplo Vox, USB, RGB, Preto","Water Cooler Exemplo Frost 240mm, ARGB, Preto"];
// Foto livre de cada nome acima (mesma ordem; créditos em creditos.html).
const SLUG=["monitor","gpu","cpu","ssd","cadeira","teclado","mouse","gabinete","fonte","memoria","headset","placa-mae","ventoinhas","mesa","webcam","suporte","microfone","water-cooler"];
const PHOTOS=new Set(["monitor","gpu","cpu","ssd","cadeira","teclado","mouse","gabinete","fonte","memoria","placa-mae","ventoinhas","mesa","suporte","microfone","water-cooler"]);
const photo=s=>PHOTOS.has(s)?`assets/img/produtos/${s}.webp`:null;
const OLDCATS={monitor:"Monitor",gpu:"Placa de vídeo",cpu:"Processador",ssd:"Armazenamento",cadeira:"Cadeira",teclado:"Teclado",mouse:"Mouse",gabinete:"Gabinete",fonte:"Fonte","memoria":"Memória",headset:"Áudio","placa-mae":"Placa-mãe",ventoinhas:"Ventoinhas",mesa:"Mesa",webcam:"Webcam",suporte:"Acessórios",microfone:"Microfone","water-cooler":"Cooler"};
const CATALOG=window.LX_CATALOGO||[];
// Faixa de preço PIX (R$) por categoria, para o preço inventado não destoar do produto.
const RANGE={Monitor:[650,3900],'Placa de vídeo':[1500,2600],Processador:[550,2300],Armazenamento:[230,520],Cadeira:[650,2200],Teclado:[140,900],
  Mouse:[90,420],Gabinete:[260,900],Fonte:[320,1900],'Memória':[110,260],'Áudio':[90,260],'Placa-mãe':[750,1600],Ventoinhas:[35,320],Mesa:[480,1900],
  Webcam:[120,320],'Acessórios':[70,600],Microfone:[160,420],Cooler:[260,520],Computador:[2200,9800],'Kit Upgrade':[1100,2600],Redes:[1400,2300],
  'Vestuário':[79,149],'Energético':[7,12],'Casa e Lazer':[60,420],'Video Games':[190,420],'Periféricos':[300,900],Ferramentas:[60,220]};
const BRANDS=CATALOG.length?[...new Set(CATALOG.map(c=>c.b))].sort((a,b)=>a.localeCompare(b,'pt-BR')):["Exemplo","Marca A","Marca B","Marca C","Marca D","Marca E"];
const CATS=CATALOG.length?Object.fromEntries(CATALOG.map(c=>[c.cat,c.cat])):OLDCATS;
// Ordem embaralhada (fixa pela semente da página): o catálogo inteiro aparece antes de qualquer item repetir.
const ORDER=CATALOG.map((_,i)=>i);for(let i=ORDER.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[ORDER[i],ORDER[j]]=[ORDER[j],ORDER[i]]}
let ci=0;
const prices=(pix,off)=>{const full=pix/0.85;return {pix,full,old:off?pix/(1-off/100):null,off,ni:full>130?12:Math.max(1,Math.floor(full/10))}};
let pcIdx=0;
/** PC pronto: vem de assets/pcs-data.js (builds validadas pelo configurador, com a foto dessa build). */
function pcProduct(d){
  return {...prices(d.pix/100,d.off),img:d.img,n:`PC Gamer Exemplo ${d.name}`,pc:true,specs:d.specs,montado:true,
    href:`monte-seu-pc.html?b=${Object.entries(d.build).map(([k,v])=>k+':'+v).join(',')}`,
    stock:'EM<small>ESTOQUE</small>',frete:true,cupom:false,brand:'Exemplo',cat:'Computador',sold:400-d.pix/2000,data:d};
}
function product(o={}){
  if(o.pc&&window.LX_PCS?.length) return pcProduct(window.LX_PCS[pcIdx++%window.LX_PCS.length]);
  let n,img,brand,cat,slug='',sku,ix=-1;
  if(CATALOG.length){ix=ORDER[ci++%ORDER.length];const c=CATALOG[ix];n=c.n;img=c.img;brand=c.b;cat=c.cat;sku=c.sku||'PCH-'+(10000+ix*37)}
  else{const ni0=Math.floor(rnd()*NAMES.length);brand=pick(BRANDS);slug=SLUG[ni0];cat=OLDCATS[slug];img=photo(slug);
    sku='EXP-'+(1000+Math.floor(rnd()*8999))+'-BK';n=NAMES[ni0].replace('Exemplo',brand)+', '+sku}
  const [lo,hi]=RANGE[cat]||[40,3500],pix=Math.floor(lo+rnd()*(hi-lo))+0.9;
  // O selo compara o "de" com o preço PIX exibido ("por"). Mínimo de 15%: abaixo disso o "de" ficaria menor que o preço no cartão.
  const off=pick([0,18,20,22,26,33,40,46,53,57,60]);
  const sold=Math.floor(rnd()*900);
  const qty=pick([2+Math.floor(rnd()*94),null]),cupom=rnd()<.4,frete=rnd()<.5;
  const p={...prices(pix,off),img,n,pc:false,specs:null,sku,brand,cat,slug,ix,sold,qty,stock:qty?`${qty}<small>UNID</small>`:'EM<small>ESTOQUE</small>',cupom,frete,montado:false};
  p.href=productUrl(p);
  return p;
}
/** Primeira foto do catálogo numa categoria (atalhos e cupons). */
const catPhoto=cat=>CATALOG.find(c=>c.cat===cat)?.img||null;
/** Página do produto: os dados vão no endereço (catálogo de exemplo, sem servidor), então o link pode ser compartilhado. */
function productUrl(p){const u=new URLSearchParams({n:p.n,pix:p.pix.toFixed(2),off:p.off,cat:p.cat,b:p.brand,sku:p.sku,slug:p.slug||''});
  if(p.img)u.set('img',p.img);if(p.qty)u.set('q',p.qty);if(p.frete)u.set('f','1');if(p.cupom)u.set('c','1');
  return 'produto.html?'+u}
/** Card de produto. O link do nome cobre o card inteiro (clique em qualquer lugar); o botão de comprar fica por cima dele. */
function card(p,variant=''){
  const b=`<div class="bdgs"><div class="bdg bdg-g" title="Estoque">${p.stock}</div></div>`;
  const t=[p.flash?'<span class="tag tag-f">Oferta relâmpago</span>':'',p.cupom?'<span class="tag tag-c">CUPOM: EXEMPLO10OFF</span>':'',
           p.frete?'<span class="tag">Frete Grátis: Sul e Sudeste</span>':'',
           p.montado?'<span class="tag tag-b">Montado e Certificado</span>':''].join('');
  const lst=variant==='lst',href=p.href||'#';
  // Bloco de preço no estilo das lojas de jogos: desconto grande ao lado do "de/por".
  const price=`<div class="pricebox">${p.off?`<span class="pct" aria-label="${p.off}% de desconto">-${p.off}%</span>`:''}
    <span class="prices">${p.old?`<s aria-label="Preço anterior ${brl(p.old)}">${brl(p.old)}</s>`:''}<b class="pprice">${brl(p.pix)}</b></span></div>`;
  return `<article class="pcard ${variant}">
  <div class="pimg ${p.img?(p.pc?'render':'photo'):'ph'}"${p.img?'':` title="Imagem do produto: ${p.n}"`}>${p.img?`<img src="${p.img}" alt="" width="300" height="300" loading="lazy" decoding="async">`:'<span>IMG produto 1:1</span>'}${b}${lst?`<div class="tags">${t}</div>`:''}</div>
  ${lst?'':`<div class="tags">${t}</div>`}
  <h3 class="pname"><a class="plink" href="${href}"${p.pc?' title="Ver e personalizar no Monte seu PC"':''}>${p.n}</a></h3>
  ${p.specs?`<div class="specs">${p.specs.map(s=>`<span>${s}</span>`).join('')}</div>`:''}
  ${price}
  <div class="ppix">no PIX${p.old?` · <strong>economize ${brl(p.old-p.pix)}</strong>`:' (15% de desconto)'}</div>
  <div class="pinst">ou ${brl(p.full)} em até ${p.ni}x de ${brl(p.full/p.ni)} sem juros</div>
  <button class="add" data-add="${encodeURIComponent(p.n)}" aria-label="Adicionar ao carrinho: ${p.n}">${I.cart}<span>Adicionar</span></button></article>`;
}
window.LX={product,card,brl,rnd,pick,toast,photo,catPhoto,BRANDS,productUrl,CATS,CATALOG};

/* ---------- ícones ---------- */
const I={
 head:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1"/><rect x="17" y="14" width="4" height="6" rx="1"/></svg>',
 search:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
 user:'<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 14a8 8 0 0 1-6-2.7c.9-2 3.3-3.3 6-3.3s5.1 1.3 6 3.3A8 8 0 0 1 12 20Z"/></svg>',
 heart:'<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-10-9.3C.3 8.3 2.4 4 6.4 4c2.2 0 3.7 1.2 5.6 3.3C13.9 5.2 15.4 4 17.6 4c4 0 6.1 4.3 4.4 7.7C19.5 16.4 12 21 12 21Z"/></svg>',
 cart:'<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM5.2 4H2V2h4.6l.9 2H21l-3.6 7.5a2 2 0 0 1-1.8 1.1H8.1L7 14.6V15h12v2H5v-3l1.4-2.6L5.2 4Z"/></svg>',
 burger:'<svg width="26" height="20" viewBox="0 0 26 20" fill="currentColor"><rect width="26" height="3" rx="1.5"/><rect y="8.5" width="26" height="3" rx="1.5"/><rect y="17" width="26" height="3" rx="1.5"/></svg>',
 chat:'<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2Z"/></svg>'
};
window.LX.I=I;

const NAV=[["monte-seu-pc.html","MONTE SEU PC","monte","monte-white.webp"],["promocao.html","PROMOÇÃO","promo"],["cupons.html","CUPONS","cupons"],["pcs-gamers.html","PCS GAMERS","gamer","gaming-white.webp"],["empresas.html","EMPRESAS","empresas","pichau-white.webp"]];
const navIco=f=>f?`<img src="assets/img/icones/${f}" alt="" width="20" height="20" class="nico">`:'';
// Ícone de cada departamento (mesma ordem), em assets/img/categorias.
const DEPS=["Hardware","Periféricos","Computadores","Kit Upgrade","Monitores","Cadeiras e Mesas Gamer e Escritório","Eletronicos","Notebooks e Portáteis","Mochilas","Vestuario","Video Games","Redes e Wireless","Casa Inteligente","Casa e Lazer","Energético","Openbox","Pets"];
const DEP_IMG=["hardware","perifericos","computadores","kit-upgrade","monitores","cadeiras-e-mesas-gamer-e-escritorio","eletronicos","notebooks-e-portateis","mochilas","vestuario","video-games","redes-e-wireless","casa-inteligente","casa-e-lazer","energetico","openbox","pets"].map(f=>`assets/img/categorias/${f}.png`);
// Departamento → promoção filtrada pelas categorias do catálogo (sem produto no catálogo de estudo: promoção inteira).
const DEP_CATS={Hardware:['Placa de vídeo','Processador','Armazenamento','Gabinete','Fonte','Memória','Placa-mãe','Ventoinhas','Cooler'],
  'Periféricos':['Teclado','Mouse','Áudio','Webcam','Microfone','Periféricos'],Computadores:['Computador'],'Kit Upgrade':['Kit Upgrade'],Monitores:['Monitor'],
  'Cadeiras e Mesas Gamer e Escritório':['Cadeira','Mesa'],Eletronicos:['Ferramentas','Acessórios'],'Video Games':['Video Games'],
  'Redes e Wireless':['Redes'],'Casa e Lazer':['Casa e Lazer'],'Energético':['Energético']};
const depHref=d=>d==='Notebooks e Portáteis'?'promocao.html?q=notebook':DEP_CATS[d]?'promocao.html?'+DEP_CATS[d].map(c=>'cat='+encodeURIComponent(c)).join('&'):'promocao.html';
window.LX.DEPS=DEPS;window.LX.DEP_IMG=DEP_IMG;window.LX.depHref=depHref;

/* ---------- evento (campanha) ---------- */
// Data fixa: a contagem é a mesma em todas as páginas e não reinicia ao recarregar.
const EVENT={name:'Black Halloween',end:new Date('2026-10-31T23:59:59-03:00'),upTo:60};
const eventOn=()=>Date.now()<EVENT.end;
/** "04d 09h 27m" (ou "09:27:12" no último dia). */
function left(ms){const s=Math.max(0,Math.floor(ms/1000)),d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),x=s%60,p=n=>String(n).padStart(2,'0');
 return d?`${d}d ${p(h)}h ${p(m)}m`:`${p(h)}:${p(m)}:${p(x)}`}
/** Atualiza as contagens. `data-cd-roll` (ms): oferta que se renova; ao acabar, começa o próximo ciclo. */
function tickCountdowns(){document.querySelectorAll('[data-cd]').forEach(t=>{let end=t.dataset.cdEnd?new Date(t.dataset.cdEnd):EVENT.end;
 const roll=+t.dataset.cdRoll;if(roll&&end<=Date.now()){end=new Date(end.getTime()+Math.ceil((Date.now()-end)/roll+1e-9)*roll);t.dataset.cdEnd=end.toISOString()}
 t.textContent=left(end-Date.now());t.dateTime=end.toISOString()})}
window.LX.EVENT=EVENT;window.LX.left=left;window.LX.tick=tickCountdowns;

/* ---------- header ---------- */
const hd=$('#site-header');
if(hd){
 hd.outerHTML=`<div class="wf-note">Redesign para estudo, uso local · preços e estoques fictícios · imagens da Pichau e dos fabricantes (<a href="creditos.html">origem</a>)</div>
 ${eventOn()&&PAGE!=='promo'?`<a class="evbar" href="promocao.html"><b>${EVENT.name}</b><span class="ev-sub"> · até ${EVENT.upTo}% OFF</span><span class="ev-cd">termina em <time data-cd></time></span><em>Ver ofertas ›</em></a>`:''}
 <header class="site">
  <div class="in topbar"><a href="#">${I.head}Atendimento ao cliente</a><button class="theme plain" role="switch" aria-checked="true"><span class="sw" aria-hidden="true"></span>Modo escuro</button></div>
  <div class="in hmain">
   <button class="deps-m plain deps-open" aria-haspopup="dialog" aria-controls="depmenu" aria-expanded="false" aria-label="Abrir menu">${I.burger}</button>
   <a href="index.html" class="logo"><img src="assets/img/logo/logo-pichau.webp" alt="Pichau, página inicial" width="412" height="97"></a>
   <form class="search" role="search" onsubmit="return false"><input type="search" aria-label="Buscar produtos" placeholder="O que você está procurando..."><button aria-label="Buscar">${I.search}</button></form>
   <div class="hacts">
    <a href="#" aria-label="Minha conta">${I.user}<span class="lbl" aria-hidden="true">Minha Conta</span></a>
    <a href="#" aria-label="Favoritos">${I.heart}<span class="lbl" aria-hidden="true">Favoritos</span></a>
    <a href="#" class="cart">${I.cart}<span><b>CARRINHO</b><small class="cartn">0 produtos</small></span></a>
   </div>
  </div>
  <div class="navbar"><div class="in">
   <button class="deps" aria-haspopup="dialog" aria-controls="depmenu" aria-expanded="false">${I.burger}DEPARTAMENTOS</button>
   <nav class="nav-links" aria-label="Principal">${NAV.map(([h,t,k,ic])=>`<a href="${h}" class="${k===PAGE?'on':''}"${k===PAGE?' aria-current="page"':''}>${navIco(ic)}${t}</a>`).join('')}</nav>
  </div></div>
 </header>
 <div class="hfix" id="hfix" inert><div class="in">
   <button class="dep-big deps-open" aria-haspopup="dialog" aria-controls="depmenu">${I.burger}<span><small>ACESSE TODOS OS</small><b>DEPARTAMENTOS</b></span><span style="margin-left:auto" aria-hidden="true">›</span></button>
   <form class="search" role="search" onsubmit="return false"><input type="search" aria-label="Buscar produtos" placeholder="O que você está procurando..."><button aria-label="Buscar">${I.search}</button></form>
   <a href="#" class="cart">${I.cart}<span><b>CARRINHO</b><small class="cartn">0 produtos</small></span> <span aria-hidden="true">▾</span></a>
 </div></div>
 <div class="depmenu" id="depmenu" role="dialog" aria-modal="true" aria-labelledby="depmenu-t" hidden>
  <button class="scrim" tabindex="-1" aria-label="Fechar menu"></button>
  <div class="panel">
   <div class="ph-h"><h2 id="depmenu-t">Menu</h2><button class="x plain" aria-label="Fechar menu">✕</button></div>
   <button class="theme plain dm-theme" role="switch" aria-checked="true"><span class="sw" aria-hidden="true"></span>Modo escuro</button>
   <h3>Atalhos</h3><nav aria-label="Atalhos">${NAV.map(([h,t,k])=>`<a href="${h}"${k===PAGE?' aria-current="page"':''}>${t}</a>`).join('')}</nav>
   <h3>Departamentos</h3><nav aria-label="Departamentos" class="dm-deps">${DEPS.map((d,i)=>`<a href="${depHref(d)}"><img src="${DEP_IMG[i]}" alt="" width="32" height="32" loading="lazy">${d}</a>`).join('')}</nav>
  </div>
 </div>`;
 tickCountdowns();setInterval(tickCountdowns,1000);
 // Header compacto: aparece quando o header principal sai da tela; escondido fica fora do Tab (inert).
 const hf=$('#hfix'),main=$('header.site');
 new IntersectionObserver(([e])=>{const on=!e.isIntersecting;hf.classList.toggle('on',on);hf.inert=!on}).observe(main);
 // Menu de departamentos: Esc e clique fora fecham, foco volta para quem abriu.
 const dm=$('#depmenu'),openers=[...document.querySelectorAll('.deps,.deps-open')];let from=null;
 const closeMenu=()=>{dm.hidden=true;openers.forEach(b=>b.setAttribute('aria-expanded','false'));from?.focus()};
 openers.forEach(b=>b.onclick=()=>{from=b;dm.hidden=false;b.setAttribute('aria-expanded','true');dm.querySelector('.x').focus()});
 dm.querySelectorAll('.scrim,.x').forEach(b=>b.onclick=closeMenu);
 dm.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();
  if(e.key==='Tab'){const f=[...dm.querySelectorAll('.panel a,.panel button')],a=f[0],z=f[f.length-1];
   if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}});
}

/* ---------- tema ---------- */
// O <head> de cada página já aplicou o tema salvo antes do CSS; aqui só o switch. Preferência local, sem dado pessoal.
const THEME_BG={dark:'#303030',light:'#f4f4f4'};
const theme=()=>document.documentElement.dataset.theme==='light'?'light':'dark';
function setTheme(t){document.documentElement.dataset.theme=t;try{localStorage.setItem('lx-theme',t)}catch(e){}
 document.querySelector('meta[name=theme-color]')?.setAttribute('content',THEME_BG[t]);
 document.querySelectorAll('.theme').forEach(b=>b.setAttribute('aria-checked',t==='dark'))}
document.querySelectorAll('.theme').forEach(b=>{b.setAttribute('aria-checked',theme()==='dark');b.onclick=()=>setTheme(theme()==='dark'?'light':'dark')});
document.querySelector('meta[name=theme-color]')?.setAttribute('content',THEME_BG[theme()]);

/* ---------- rodapé e assistente ----------
 * O common.js é carregado logo depois do header (assim o header já existe no primeiro desenho e a página
 * não "pula"); rodapé e chat ficam no fim do HTML, então são montados quando o documento termina de carregar. */
function initRest(){
/* ---------- footer ---------- */
const ft=$('#site-footer');
if(ft){
 const ph=(t,s='')=>`<div class="ph" title="${t}">${s?`<span>${s}</span>`:''}</div>`;
 ft.outerHTML=`<footer class="site"><div class="in fcols">
  <div><div class="fb"><h2>Atendimento loja virtual</h2>Segunda a sexta 8h às 12h e das 14h às 18h<br>(00) 0000-0000<br>contato@lojaexemplo.com.br</div>
   <div class="fb"><h2>Loja física</h2>em Cidade Exemplo<br>(00) 0000-0001<br>Segunda a sexta das 9h às 19h<br>Sábado das 9h às 13h</div>
   <h2>Redes sociais</h2><div class="social">${[1,2,3,4,5].map(i=>ph('Ícone rede social '+i)).join('')}</div></div>
  <div><h2>Departamentos</h2><ul>${DEPS.map(d=>`<li><a href="${depHref(d)}">${d}</a></li>`).join('')}</ul></div>
  <div><h2>Baixe os aplicativos</h2><div class="apps"><a href="#"><img src="assets/img/apps/applestore.svg" alt="Baixar na App Store" width="130" height="40" loading="lazy"></a><a href="#"><img src="assets/img/apps/playstore.svg" alt="Disponível no Google Play" width="130" height="40" loading="lazy"></a></div>
   <h2>Institucional</h2><ul><li><a href="#">Quem somos</a></li><li><a href="#">Localização</a></li><li><a href="#">Nossas lojas</a></li><li><a href="#">Blog</a></li><li><a href="#">Trabalhe conosco</a></li><li><a href="creditos.html">Origem das imagens</a></li></ul></div>
  <div><h2>Dúvidas</h2><ul><li><a href="#">Entrega</a></li><li><a href="#">Garantia</a></li><li><a href="#">Como comprar</a></li><li><a href="#">Formas de pagamento</a></li><li><a href="#">Trocas e devoluções</a></li><li><a href="#">Política de privacidade</a></li></ul>
   <h2 style="margin-top:18px">Formas de pagamento</h2><ul class="pays">${[['visa.png','Visa'],['mastercard.png','Mastercard'],['american.png','American Express'],['nubank.svg','Nubank'],['pix.png','PIX'],['boleto.png','Boleto']].map(([f,t])=>`<li><img src="assets/img/pagamento/${f}" alt="${t}" width="64" height="40" loading="lazy"></li>`).join('')}</ul>
   <h2 style="margin-top:18px">Segurança</h2><ul class="seals"><li><img src="assets/img/selos/site-blindado.svg" alt="Site Blindado" width="110" height="40" loading="lazy"></li><li><img src="assets/img/selos/google.png" alt="Loja avaliada no Google" width="40" height="40" loading="lazy"></li><li><img src="assets/img/selos/ebit.png" alt="Selo Ebit" width="30" height="40" loading="lazy"></li></ul></div>
 </div><div class="in fbottom">Loja Exemplo Comércio de Eletrônicos LTDA · CNPJ 00.000.000/0001-00 · Rua Exemplo, 123 – Cidade Exemplo/UF<br>Redesign de estudo, uso local: dados da empresa, preços e estoques são fictícios. Logo, fotos e banners pertencem à Pichau e aos fabricantes.</div></footer>`;
}

/* ---------- chat ---------- */
const ch=$('#site-chat');
if(ch){
 const q=ch.dataset.q||'Procurando algo?';
 ch.outerHTML=`<div class="chat" id="chat">
  <div class="chat-bub" title="Balão de boas-vindas do assistente"><button class="x plain" aria-label="Fechar mensagem do assistente">✕</button><b>${q}</b><span>Me diz o que você procura que eu trago as melhores opções.</span>
   <small>Ao conversar, suas mensagens são tratadas conforme a <a href="#">Política de privacidade</a>.</small></div>
  <div class="chat-row"><button class="chat-pill open-chat"><img class="mascote" src="assets/img/mascote/pru-olhar-centro.webp" alt="" width="52" height="52" loading="lazy"><span><b>Assistente</b><span class="ia">IA</span><small>Fale com o assistente</small></span></button>
  <button class="chat-btn open-chat" aria-label="Abrir chat com o assistente">${I.chat}</button></div></div>`;
 const c=$('#chat');
 // Fechou o balão: fica fechado nas outras páginas (só a escolha fica no navegador, nenhum dado pessoal).
 const KEY='lx-chat-fechado';
 // O balão não cobre as ofertas logo ao abrir: aparece depois de alguns segundos, e some ao rolar.
 let closed=false;try{closed=!!localStorage.getItem(KEY)}catch(e){}
 c.classList.add('mini','compact');
 if(!closed)setTimeout(()=>{if(scrollY<200)c.classList.remove('mini','compact')},8000);
 addEventListener('scroll',()=>{c.classList.toggle('compact',closed||scrollY>300);if(scrollY>300)c.classList.add('mini')},{passive:true});
 c.querySelector('.x').onclick=()=>{closed=true;c.classList.add('mini','compact');try{localStorage.setItem(KEY,'1')}catch(e){}};
 c.querySelectorAll('.open-chat').forEach(b=>b.onclick=()=>toast('Assistente de exemplo: o chat não funciona nesta réplica'));
}

}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initRest);else initRest();

/* ---------- carrinho / toast ---------- */
// Carrinho de exemplo: só a quantidade fica no navegador (nenhum dado pessoal).
let cart=0;try{cart=+localStorage.getItem('lx-carrinho')||0}catch(e){}
function toast(m){let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}
 t.textContent=m;t.classList.add('on');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('on'),2000)}
const showCart=()=>document.querySelectorAll('.cartn').forEach(e=>e.textContent=cart+(cart===1?' produto':' produtos'));
window.LX.addCart=(n=1)=>{cart+=n;try{localStorage.setItem('lx-carrinho',cart)}catch(e){}showCart()};
showCart();
// "Adicionar" de qualquer card (inclusive os criados depois, como na listagem).
document.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(!b)return;e.preventDefault();
 window.LX.addCart(1);b.classList.add('ok');b.querySelector('span').textContent='Adicionado';
 setTimeout(()=>{b.classList.remove('ok');b.querySelector('span').textContent='Adicionar'},1600);
 toast(`Adicionado ao carrinho: ${decodeURIComponent(b.dataset.add).split(',')[0]}`)});
})();
