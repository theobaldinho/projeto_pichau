/* Página de listagem (Promoção / PCs Gamers): filtros, busca, ordenação e paginação de verdade sobre os produtos de exemplo. */
(function(){
const {product,card,brl,BRANDS}=LX,root=document.getElementById('listing'),cfg=root.dataset;
const pc=cfg.pc==='1',PER=36;
const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

// Produtos: PCs prontos (builds validadas pelo configurador) ou o catálogo de exemplo da promoção.
const items=pc?(window.LX_PCS||[]).map(()=>product({pc:true})):Array.from({length:LX.CATALOG.length||+cfg.total},()=>product());
items.forEach((p,i)=>p.rank=i);

// Grupos de filtro: cada opção é [rótulo, teste]. Dentro do grupo vale "ou"; entre grupos, "e".
const off=(a,b)=>p=>p.off>a&&p.off<=b;
const GROUPS=pc?[
  {key:'cpu',title:'Processador',opts:[['AMD',p=>p.data.cpuBrand==='AMD'],['Intel',p=>p.data.cpuBrand==='Intel']]},
  {key:'plat',title:'Plataforma',opts:['AM4','AM5','LGA1700'].map(s=>[s,p=>p.data.socket===s])},
  {key:'gpu',title:'Memória da placa de vídeo',opts:[8,12,16,24].map(g=>[`${g}GB`,p=>p.data.vramGb===g])},
  {key:'ram',title:'Memória RAM',opts:[16,32,64].map(g=>[`${g}GB`,p=>p.data.ramGb===g]),closed:true},
]:[
  {key:'cat',title:'Categoria',opts:[...new Set(items.map(p=>p.cat))].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(c=>[c,p=>p.cat===c]),scroll:true},
  {key:'brand',title:'Fabricante',opts:BRANDS.map(b=>[b,p=>p.brand===b]),scroll:true,search:true},
  {key:'off',title:'Desconto',opts:[['Até 20%',off(0,20)],['20% a 40%',off(20,40)],['Acima de 40%',p=>p.off>40]],closed:true},
];
const SORTS={rel:['Relevância',(a,b)=>a.rank-b.rank],menor:['Menor preço',(a,b)=>a.pix-b.pix],maior:['Maior preço',(a,b)=>b.pix-a.pix],
  vendidos:['Mais vendidos',(a,b)=>b.sold-a.sold],desconto:['Maior desconto',(a,b)=>b.off-a.off]};
const DEF_SORT=cfg.sort||'rel';
const st={q:'',min:null,max:null,frete:false,cupom:false,sel:Object.fromEntries(GROUPS.map(g=>[g.key,new Set()])),sort:DEF_SORT,page:1};
// Filtros vindos da URL (atalhos da home: ?cat=Mouse, ?max=300, ?off=40, ?sort=desconto, ?q=ssd).
const url=new URLSearchParams(location.search);
if(url.get('q'))st.q=norm(url.get('q'));
for(const k of ['min','max'])if(url.get(k)&&!isNaN(+url.get(k)))st[k]=+url.get(k);
if(url.get('sort')&&SORTS[url.get('sort')])st.sort=url.get('sort');
if(url.get('frete'))st.frete=true;
if(url.get('cupom'))st.cupom=true;
if(url.get('page'))st.page=Math.max(1,+url.get('page')||1);
for(const g of GROUPS){const v=url.getAll(g.key);for(const l of v)if(g.opts.some(([o])=>o===l))st.sel[g.key].add(l)}
if(url.get('off')&&st.sel.off){const o=+url.get('off');if(o>=40)st.sel.off.add('Acima de 40%');else if(o>=20){st.sel.off.add('20% a 40%');st.sel.off.add('Acima de 40%')}}
/** Guarda os filtros na URL (dá para compartilhar ou voltar a uma busca). */
function saveUrl(){const u=new URLSearchParams();
  if(st.q)u.set('q',$('#fq').value.trim());if(st.min!=null)u.set('min',st.min);if(st.max!=null)u.set('max',st.max);
  if(st.frete)u.set('frete','1');if(st.cupom)u.set('cupom','1');
  for(const g of GROUPS)for(const l of st.sel[g.key])u.append(g.key,l);
  if(st.sort!==DEF_SORT)u.set('sort',st.sort);if(st.page>1)u.set('page',st.page);
  history.replaceState(null,'',location.pathname+(u.toString()?'?'+u:''))}

const passes=(p,skip)=>{
  if(st.q&&!norm(p.n).includes(st.q))return false;
  if(st.min!=null&&p.pix<st.min)return false;
  if(st.max!=null&&p.pix>st.max)return false;
  if(st.frete&&!p.frete)return false;
  if(st.cupom&&!p.cupom)return false;
  return GROUPS.every(g=>g.key===skip||!st.sel[g.key].size||g.opts.some(([l,t])=>st.sel[g.key].has(l)&&t(p)));
};
const activeCount=()=>GROUPS.reduce((n,g)=>n+st.sel[g.key].size,0)+(st.q?1:0)+(st.min!=null?1:0)+(st.max!=null?1:0)+(st.frete?1:0)+(st.cupom?1:0);
// Atalhos de um toque no topo da lista (os mais usados em promoção): faixa de preço, desconto alto, frete e cupom.
const CHIPS=cfg.chips?[
  ['Até R$ 100',()=>st.max===100,()=>{st.max=st.max===100?null:100;st.min=null}],
  ['Até R$ 300',()=>st.max===300,()=>{st.max=st.max===300?null:300;st.min=null}],
  ['Até R$ 1.000',()=>st.max===1000,()=>{st.max=st.max===1000?null:1000;st.min=null}],
  ['40% OFF ou mais',()=>st.sel.off?.has('Acima de 40%')&&st.sel.off.size===1,()=>{const on=st.sel.off.has('Acima de 40%')&&st.sel.off.size===1;st.sel.off.clear();if(!on)st.sel.off.add('Acima de 40%')}],
  ['Frete grátis',()=>st.frete,()=>{st.frete=!st.frete}],
  ['Com cupom',()=>st.cupom,()=>{st.cupom=!st.cupom}],
]:[];

/* ---------- barra lateral ---------- */
let fid=0;
const box=(t,inner,open=true)=>{const id='fb'+(++fid);
 return `<div class="fbox"><h3><button aria-expanded="${open}" aria-controls="${id}">${t}<span aria-hidden="true">${open?'⌃':'⌄'}</span></button></h3><div id="${id}"${open?'':' hidden'}>${inner}</div></div>`};
const searchI='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e90313" stroke-width="2.6" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
const maxPrice=Math.ceil(Math.max(...items.map(p=>p.pix),0));
let side=`<div class="fbox fhead"><h2 class="flt">FILTROS</h2><button class="fx plain" aria-label="Fechar filtros">✕</button></div>
 <div class="fbox" style="margin-top:-28px;border-radius:0 0 4px 4px"><div class="fsearch"><input type="search" id="fq" aria-label="Buscar nos resultados" placeholder="Buscar nos resultados"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></div></div>
 ${box('Preço',`<div class="vals"><label>Vlr. Mínimo<input id="pmin" inputmode="decimal" placeholder="R$ 0"></label><label>Vlr. Máximo<input id="pmax" inputmode="decimal" placeholder="${brl(maxPrice)}"></label></div><p class="fhint">Enter ou sair do campo aplica.</p>`)}`;
for(const g of GROUPS){
  const list=g.opts.map(([l])=>`<label class="chk"><input type="checkbox" data-g="${g.key}" value="${l}"><span>${l}</span><em data-c="${g.key}|${l}"></em></label>`).join('');
  side+=box(g.title,`${g.search?`<div class="fsearch" style="margin-bottom:10px">${searchI}<input type="search" data-filter-list="${g.key}" aria-label="Buscar ${g.title.toLowerCase()}" placeholder="Buscar"></div>`:''}<div class="${g.scroll?'scroll':''}" data-list="${g.key}">${list}</div>`,!g.closed);
}
side+='<button class="fclose">Ver resultados</button>';

const listI='<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="5" width="18" height="2.5"/><rect x="3" y="11" width="18" height="2.5"/><rect x="3" y="17" width="18" height="2.5"/></svg>';
const gridI='<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="5" height="5"/><rect x="10" y="3" width="5" height="5"/><rect x="17" y="3" width="5" height="5"/><rect x="3" y="10" width="5" height="5"/><rect x="10" y="10" width="5" height="5"/><rect x="17" y="10" width="5" height="5"/><rect x="3" y="17" width="5" height="5"/><rect x="10" y="17" width="5" height="5"/><rect x="17" y="17" width="5" height="5"/></svg>';
const filterI='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M3 5h18M6 12h12M10 19h4"/></svg>';
root.innerHTML=`<aside class="side" id="filtros" aria-label="Filtros">${side}</aside><div>
 ${CHIPS.length?`<div class="qchips" role="group" aria-label="Atalhos de filtro">${CHIPS.map(([l],i)=>`<button data-chip="${i}" aria-pressed="false">${l}</button>`).join('')}</div>`:''}
 <div class="ltop"><span class="cnt" role="status"></span>
  <div class="r"><button class="clearf" hidden>Limpar filtros</button><button class="fbtn" aria-controls="filtros" aria-expanded="false">${filterI}<span>Filtrar</span></button>
  <label class="sel">Ordenar Por:<select id="sort">${Object.entries(SORTS).map(([k,[l]])=>`<option value="${k}">${l}</option>`).join('')}</select></label>
  ${pc?'':`<div class="vt" role="group" aria-label="Visualização"><button data-v="list" aria-pressed="false" aria-label="Ver em lista">${listI}</button><button class="on" data-v="grid" aria-pressed="true" aria-label="Ver em grade">${gridI}</button></div>`}</div></div>
 <h2 class="sr-only">Produtos</h2>
 <div class="lgrid" id="lgrid"></div>
 <nav class="pag" aria-label="Paginação"></nav></div>`;

const $=s=>root.querySelector(s),grid=$('#lgrid'),pag=$('.pag'),cnt=$('.cnt'),aside=$('.side'),fbtn=$('.fbtn'),clearf=$('.clearf');

/* ---------- desenho ---------- */
function render(scroll){
  const list=items.filter(p=>passes(p)).sort(SORTS[st.sort][1]);
  const pages=Math.max(1,Math.ceil(list.length/PER));
  st.page=Math.min(st.page,pages);
  const a=(st.page-1)*PER,slice=list.slice(a,a+PER);
  cnt.textContent=list.length?`Exibindo ${a+1}-${a+slice.length} de ${list.length.toLocaleString('pt-BR')} ${list.length===1?'resultado':'resultados'}`:'Nenhum resultado';
  grid.innerHTML=slice.length?slice.map(p=>card(p,'lst')).join('')
    :`<div class="empty"><p><b>Nenhum produto com esses filtros.</b></p><p>Tente tirar algum filtro ou mudar a faixa de preço.</p><button class="clearf2">Limpar filtros</button></div>`;
  // Paginação: primeira, vizinhas da atual e última.
  const nums=[...new Set([1,st.page-2,st.page-1,st.page,st.page+1,st.page+2,pages])].filter(n=>n>=1&&n<=pages).sort((x,y)=>x-y);
  let html=`<button data-p="${st.page-1}" aria-label="Página anterior"${st.page===1?' disabled':''}>‹</button>`,prev=0;
  for(const n of nums){if(n-prev>1)html+='<span aria-hidden="true">…</span>';html+=`<button data-p="${n}"${n===st.page?' class="on" aria-current="page"':''} aria-label="Página ${n}">${n}</button>`;prev=n}
  pag.innerHTML=pages>1?html+`<button data-p="${st.page+1}" aria-label="Próxima página"${st.page===pages?' disabled':''}>›</button>`:'';
  // Contagens de cada opção considerando os outros filtros (sem contar o próprio grupo).
  for(const g of GROUPS)for(const [l,t] of g.opts){
    const n=items.filter(p=>passes(p,g.key)&&t(p)).length,el=root.querySelector(`[data-c="${g.key}|${CSS.escape(l)}"]`);
    if(el){el.textContent=`(${n})`;el.closest('.chk').classList.toggle('zero',!n)}
  }
  root.querySelectorAll('[data-chip]').forEach(b=>b.setAttribute('aria-pressed',CHIPS[+b.dataset.chip][1]()));
  // Campos e caixas refletem o estado (inclusive quando veio da URL ou de um atalho).
  root.querySelectorAll('.side input[type=checkbox]').forEach(i=>i.checked=st.sel[i.dataset.g]?.has(i.value)??false);
  if(document.activeElement!==$('#pmin'))$('#pmin').value=st.min==null?'':brl(st.min);
  if(document.activeElement!==$('#pmax'))$('#pmax').value=st.max==null?'':brl(st.max);
  $('#sort').value=st.sort;
  saveUrl();
  const act=activeCount();
  clearf.hidden=!act;clearf.textContent=`Limpar filtros (${act})`;
  fbtn.querySelector('span').textContent=act?`Filtrar (${act})`:'Filtrar';
  aside.querySelector('.fclose').textContent=`Ver ${list.length.toLocaleString('pt-BR')} ${list.length===1?'resultado':'resultados'}`;
  if(scroll)grid.scrollIntoView({block:'start',behavior:reduce?'auto':'smooth'});
}
const update=()=>{st.page=1;render(false)};

/* ---------- eventos ---------- */
root.querySelectorAll('.side h3 button').forEach(b=>b.onclick=()=>{const open=b.getAttribute('aria-expanded')!=='true';
 b.setAttribute('aria-expanded',open);document.getElementById(b.getAttribute('aria-controls')).hidden=!open;b.querySelector('span').textContent=open?'⌃':'⌄'});
aside.addEventListener('change',e=>{const i=e.target;if(i.dataset.g){i.checked?st.sel[i.dataset.g].add(i.value):st.sel[i.dataset.g].delete(i.value);update()}});
let qt=0;$('#fq').addEventListener('input',e=>{clearTimeout(qt);qt=setTimeout(()=>{st.q=norm(e.target.value.trim());update()},150)});
// Preço: "R$ 1.234,56", "1234" ou vazio.
const money=v=>{const n=parseFloat(v.replace(/[^\d,]/g,'').replace(',','.'));return Number.isFinite(n)?n:null};
for(const [id,key] of [['#pmin','min'],['#pmax','max']]){
  const inp=$(id),apply=()=>{st[key]=money(inp.value);inp.value=st[key]==null?'':brl(st[key]);update()};
  inp.addEventListener('change',apply);inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();apply()}});
}
root.querySelectorAll('[data-filter-list]').forEach(inp=>inp.addEventListener('input',()=>{const q=norm(inp.value);
 root.querySelectorAll(`[data-list="${inp.dataset.filterList}"] .chk`).forEach(l=>l.hidden=!norm(l.textContent).includes(q))}));
$('#sort').onchange=e=>{st.sort=e.target.value;update()};
pag.onclick=e=>{const b=e.target.closest('button[data-p]');if(!b||b.disabled)return;st.page=+b.dataset.p;render(true)};
const clearAll=()=>{st.q='';st.min=st.max=null;st.frete=st.cupom=false;GROUPS.forEach(g=>st.sel[g.key].clear());
 root.querySelectorAll('.side input').forEach(i=>i.type==='checkbox'?i.checked=false:i.value='');root.querySelectorAll('.side .chk').forEach(l=>l.hidden=false);update()};
clearf.onclick=clearAll;grid.addEventListener('click',e=>{if(e.target.closest('.clearf2'))clearAll()});
root.querySelectorAll('.vt button').forEach(b=>b.onclick=()=>{root.querySelectorAll('.vt button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});grid.classList.toggle('as-list',b.dataset.v==='list')});

// Celular: os filtros abrem como gaveta (X, Esc ou "Ver resultados" fecham; o Tab fica dentro dela).
let scrim=null;
const isOpen=()=>aside.classList.contains('open');
const closeF=()=>{if(!isOpen())return;aside.classList.remove('open');scrim?.remove();scrim=null;fbtn.setAttribute('aria-expanded','false');fbtn.focus()};
fbtn.onclick=()=>{aside.classList.add('open');fbtn.setAttribute('aria-expanded','true');
 scrim=document.createElement('button');scrim.className='fscrim';scrim.tabIndex=-1;scrim.setAttribute('aria-label','Fechar filtros');scrim.onclick=closeF;
 aside.before(scrim);aside.querySelector('.fx').focus()};
aside.querySelector('.fclose').onclick=closeF;aside.querySelector('.fx').onclick=closeF;
document.addEventListener('keydown',e=>{
  if(!isOpen())return;
  if(e.key==='Escape'){e.preventDefault();closeF();return}
  if(e.key==='Tab'){const f=[...aside.querySelectorAll('button,input,select')].filter(x=>!x.closest('[hidden]')&&x.offsetParent!==null),a=f[0],z=f[f.length-1];
    if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}
});

root.querySelector('.qchips')?.addEventListener('click',e=>{const b=e.target.closest('[data-chip]');if(!b)return;CHIPS[+b.dataset.chip][2]();update()});
if(st.q)$('#fq').value=url.get('q');
render(false);
})();
