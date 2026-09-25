/*
  ALCOBAÇA STORE — FRONTEND
  ---------------------------------
  Produtos: edita o array PRODUCTS.
  Backend: Supabase Auth + PostgreSQL + RLS + Realtime.
*/

const CONFIG = {
  STORE_NAME: 'Alcobaça Store',
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY',
  CURRENCY: 'EUR',
  LOCALE: 'pt-PT',
  OWNER_EMAIL: 'miguelbento257@gmail.com'
};

const PRODUCTS = [
  {
    id: 'exemplo-produto',
    name: 'Produto Exemplo',
    shortName: 'Produto Exemplo',
    description: 'Artigo de demonstração da Alcobaça Store. Substitui este conteúdo pelos detalhes reais do produto.',
    longDescription: 'Este produto é apenas um exemplo para estruturares a loja. Aqui podes escrever uma descrição completa, explicar as características, materiais, utilização, conteúdo da embalagem e qualquer informação relevante para o cliente.',
    price: 29.90,
    category: 'Destaques',
    brand: 'Alcobaça Store',
    badge: 'NOVO',
    rating: 4.8,
    reviews: 12,
    shipping: 'Envio em Portugal',
    availability: 'Disponível',
    stock: 'Em stock',
    image: 'images/exemplo.png',
    gallery: ['images/exemplo.png'],
    specs: [
      ['Categoria', 'Destaques'],
      ['Disponibilidade', 'Em stock'],
      ['Entrega', 'Portugal continental'],
      ['Negociação', 'Disponível']
    ]
  }
  // COPIA o objeto acima e cola aqui para adicionar outro produto.
];

const CATEGORIES = [
  ['Tecnologia', '▣'], ['Casa', '⌂'], ['Acessórios', '◉'], ['Fitness', '△'], ['Gaming', '◈'], ['Outros', '＋']
];

const state = {
  supabase: null,
  session: null,
  profile: null,
  currentProduct: null,
  currentTicket: null,
  authEmail: '',
  authMode: 'email',
  favoriteIds: JSON.parse(localStorage.getItem('alcobaca_favorites') || '[]'),
  cookieChoice: localStorage.getItem('alcobaca_cookie_choice') || ''
};

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

function esc(v='') { return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function money(v){return new Intl.NumberFormat(CONFIG.LOCALE,{style:'currency',currency:CONFIG.CURRENCY}).format(Number(v)||0)}
function dateTime(v){if(!v)return ''; return new Intl.DateTimeFormat(CONFIG.LOCALE,{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v));}
function initials(v){return String(v||'A').trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('')||'A'}
function isConfigured(){return CONFIG.SUPABASE_URL.startsWith('https://')&&!CONFIG.SUPABASE_URL.includes('YOUR-PROJECT')&&CONFIG.SUPABASE_ANON_KEY&&!CONFIG.SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')}
function isStaff(){return ['staff','owner'].includes(state.profile?.role)}
function toast(msg,type=''){const wrap=$('#toastWrap'); if(!wrap)return; const el=document.createElement('div'); el.className=`toast ${type}`; el.textContent=msg; wrap.appendChild(el); setTimeout(()=>el.remove(),4200)}
function openModal(id){const e=$(`#${id}`); if(e)e.classList.remove('hidden')}
function closeModal(id){const e=$(`#${id}`); if(e)e.classList.add('hidden')}
function saveFavorites(){localStorage.setItem('alcobaca_favorites',JSON.stringify(state.favoriteIds))}
function toggleFavorite(id){const i=state.favoriteIds.indexOf(id); if(i>=0){state.favoriteIds.splice(i,1);toast('Removido dos favoritos')}else{state.favoriteIds.push(id);toast('Adicionado aos favoritos','success')} saveFavorites(); renderFavoriteButtons();}
function renderFavoriteButtons(){ $$('.favorite-btn[data-product-id]').forEach(b=>b.classList.toggle('active',state.favoriteIds.includes(b.dataset.productId))); }
function productById(id){return PRODUCTS.find(p=>p.id===id)}
function currentPage(){return location.pathname.split('/').pop()||'index.html'}
function go(url){location.href=url}
function protectPage(required='login'){
  if(required==='staff'&&!isStaff()){toast('Acesso reservado à equipa.','error'); go('index.html'); return false}
  if(required==='login'&&!state.session){toast('Inicia sessão para continuar.','error'); openAuth(); return false}
  return true
}

function headerAccount(){
  const name = state.profile?.display_name || state.session?.user?.user_metadata?.full_name || state.session?.user?.user_metadata?.name || state.session?.user?.email?.split('@')[0] || 'Conta';
  $$('[data-account-name]').forEach(e=>e.textContent=state.session?name:'Entrar / Registar');
  $$('[data-account-state]').forEach(e=>e.textContent=state.session?(isStaff()?'Gestão':'Minha conta'):'Conta');
  $$('[data-account-avatar]').forEach(e=>e.textContent=state.session?initials(name):'A');
  $$('[data-staff-link]').forEach(e=>e.classList.toggle('hidden',!isStaff()));
  $$('[data-tickets-link]').forEach(e=>e.classList.toggle('hidden',!state.session));
}

async function initSupabase(){
  if(!window.supabase||!isConfigured()) return;
  state.supabase=window.supabase.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_ANON_KEY);
  const {data:{session}}=await state.supabase.auth.getSession();
  state.session=session;
  await loadProfile();
  state.supabase.auth.onAuthStateChange(async (_event,session)=>{ state.session=session; await loadProfile(); headerAccount(); onRouteAuth(); });
  headerAccount(); onRouteAuth();
}

async function loadProfile(){
  state.profile=null; if(!state.session||!state.supabase)return;
  const {data,error}=await state.supabase.from('profiles').select('*').eq('id',state.session.user.id).single();
  if(!error)state.profile=data;
}

function onRouteAuth(){
  const page=currentPage();
  if(page==='conta.html')renderAccountPage();
  if(page==='pedidos.html')loadTicketsPage();
  if(page==='gestao.html')loadStaffPage();
  if(page==='index.html' || page==='')setupHome();
}

async function signInGoogle(){
  if(!state.supabase){toast('Configura primeiro o Supabase no script.js.','error');return}
  const {error}=await state.supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});
  if(error)toast(error.message,'error');
}

async function sendOtp(email){
  if(!state.supabase){toast('Supabase ainda não está configurado.','error');return}
  const clean=email.trim().toLowerCase(); if(!clean)return;
  $('#otpEmailLabel') && ($('#otpEmailLabel').textContent=clean);
  state.authEmail=clean;
  const {error}=await state.supabase.auth.signInWithOtp({email:clean,options:{shouldCreateUser:true,emailRedirectTo:location.href}});
  if(error){toast(error.message,'error');return}
  $('#authStepEmail')?.classList.add('hidden');$('#authStepOtp')?.classList.remove('hidden');
  toast('Código enviado para o teu email.','success');
  setTimeout(()=>$('#otp1')?.focus(),80);
}

async function verifyOtp(){
  if(!state.supabase||!state.authEmail)return;
  const token=$$('.otp-input').map(i=>i.value).join('');
  if(token.length!==6){toast('Introduz os 6 dígitos do código.','error');return}
  const {error}=await state.supabase.auth.verifyOtp({email:state.authEmail,token,type:'email'});
  if(error){toast(error.message,'error');return}
  closeModal('authModal'); toast('Sessão iniciada.','success');
}

async function logout(){if(state.supabase)await state.supabase.auth.signOut(); else toast('Supabase não configurado.','error');}

function openAuth(){openModal('authModal'); $('#authStepEmail')?.classList.remove('hidden'); $('#authStepOtp')?.classList.add('hidden'); $('#authEmail')?.focus()}

function authUI(){
  $('#loginBtn')?.addEventListener('click',openAuth);$('#heroLoginBtn')?.addEventListener('click',openAuth);$('#modalClose')?.addEventListener('click',()=>closeModal('authModal'));$('#googleBtn')?.addEventListener('click',signInGoogle);
  $('#emailForm')?.addEventListener('submit',e=>{e.preventDefault();sendOtp($('#authEmail').value)});
  $('#otpForm')?.addEventListener('submit',e=>{e.preventDefault();verifyOtp()});
  $$('.otp-input').forEach((el,i)=>{el.addEventListener('input',()=>{el.value=el.value.replace(/\D/g,'').slice(0,1);if(el.value&&i<5)$(`.otp-input:nth-child(${i+2})`)?.focus()})});
  $('#backToEmail')?.addEventListener('click',()=>{$('#authStepOtp')?.classList.add('hidden');$('#authStepEmail')?.classList.remove('hidden')});
}

function setupGlobal(){
  authUI();
  $('#globalSearch')?.addEventListener('submit',e=>{e.preventDefault();const q=$('#globalSearchInput').value.trim();go(q?`produtos.html?q=${encodeURIComponent(q)}`:'produtos.html')});
  $('#logoutBtn')?.addEventListener('click',logout);
  $('#profileAccountBtn')?.addEventListener('click',()=>state.session?go('conta.html'):openAuth());
  $('#closeCookie')?.addEventListener('click',()=>saveCookie('essential'));
  $('#acceptCookie')?.addEventListener('click',()=>saveCookie('all'));
  if(!state.cookieChoice)$('#cookieBanner')?.classList.remove('hidden');
  else $('#cookieBanner')?.classList.add('hidden');
}
function saveCookie(value){state.cookieChoice=value;localStorage.setItem('alcobaca_cookie_choice',value);$('#cookieBanner')?.classList.add('hidden')}

function renderCategories(){
  $$('.category-grid').forEach(grid=>grid.innerHTML=CATEGORIES.map(([n,i])=>`<a class="category-card" href="produtos.html?cat=${encodeURIComponent(n)}"><div class="cat-icon">${i}</div><strong>${esc(n)}</strong><span>Ver seleção</span></a>`).join(''));
}

function card(p){return `<article class="product-card reveal"><a href="produto.html?id=${encodeURIComponent(p.id)}" class="product-media"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.opacity='.12'"><span class="badge">${esc(p.badge||'SELEÇÃO')}</span></a><div class="product-body"><div class="product-cat">${esc(p.category||'Produto')}</div><a class="product-name" href="produto.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a><p class="product-desc">${esc(p.description)}</p><div class="rating">★ ${Number(p.rating||0).toFixed(1)} · ${Number(p.reviews||0)} opiniões</div><div class="price-row"><div><div class="price">${money(p.price)}</div><small>Preço de referência</small></div><button class="product-open" data-product-id="${esc(p.id)}">Ver produto</button></div></div></article>`}

function renderProductGrid(root,items){if(!root)return;root.innerHTML=items.map(card).join('');$$('.product-open',root).forEach(b=>b.addEventListener('click',()=>go(`produto.html?id=${encodeURIComponent(b.dataset.productId)}`)))}
function setupHome(){
  renderCategories();
  const featured=PRODUCTS[0];
  if(featured){$('#heroProductName')&&( $('#heroProductName').textContent=featured.name);$('#heroProductPrice')&&( $('#heroProductPrice').textContent=money(featured.price));$('#heroProductImage')&&( $('#heroProductImage').src=featured.image);$('#heroProductLink')&&( $('#heroProductLink').href=`produto.html?id=${featured.id}`)}
  const featuredRoot=$('#featuredGrid');if(featuredRoot)renderProductGrid(featuredRoot,PRODUCTS.slice(0,4));
  const allRoot=$('#homeGrid');if(allRoot)renderProductGrid(allRoot,PRODUCTS.slice(0,8));
}

function setupCatalog(){
  const params=new URLSearchParams(location.search);const q=(params.get('q')||'').toLowerCase();const cat=params.get('cat')||'';const search=$('#catalogSearch'); if(search)search.value=params.get('q')||'';
  let items=PRODUCTS.filter(p=>{const text=`${p.name} ${p.description} ${p.category} ${p.brand}`.toLowerCase();return (!q||text.includes(q))&&(!cat||p.category===cat||p.category?.toLowerCase()===cat.toLowerCase())});
  const sort=$('#catalogSort');function render(){let list=[...items];if(sort?.value==='price-asc')list.sort((a,b)=>a.price-b.price);if(sort?.value==='price-desc')list.sort((a,b)=>b.price-a.price);if(sort?.value==='rating')list.sort((a,b)=>(b.rating||0)-(a.rating||0));$('#catalogCount')&&($('#catalogCount').textContent=`${list.length} ${list.length===1?'produto':'produtos'}`);renderProductGrid($('#catalogGrid'),list)}
  $('#catalogSearchForm')?.addEventListener('submit',e=>{e.preventDefault();const s=search.value.trim();go(s?`produtos.html?q=${encodeURIComponent(s)}`:'produtos.html')});sort?.addEventListener('change',render);render();
}

function setupProduct(){
  const id=new URLSearchParams(location.search).get('id')||PRODUCTS[0]?.id;const p=productById(id);if(!p){go('produtos.html');return}state.currentProduct=p;document.title=`${p.name} | ${CONFIG.STORE_NAME}`;
  $('#productBreadcrumbName')&&( $('#productBreadcrumbName').textContent=p.name);$('#productTitle')&&( $('#productTitle').textContent=p.name);$('#productDescription')&&( $('#productDescription').textContent=p.longDescription||p.description);$('#productPrice')&&( $('#productPrice').textContent=money(p.price));$('#productCategory')&&( $('#productCategory').textContent=p.category);$('#productBrand')&&( $('#productBrand').textContent=p.brand||CONFIG.STORE_NAME);$('#productRating')&&( $('#productRating').textContent=`★ ${Number(p.rating||0).toFixed(1)} · ${Number(p.reviews||0)} opiniões`);$('#productImage')&&( $('#productImage').src=p.gallery?.[0]||p.image);$('#productStock')&&( $('#productStock').textContent=p.stock||p.availability||'Disponível');
  const specs=$('#productSpecs');if(specs)specs.innerHTML=(p.specs||[]).map(([a,b])=>`<div class="spec-row"><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join('');
  const thumbs=$('#productThumbs');if(thumbs)thumbs.innerHTML=(p.gallery?.length?p.gallery:[p.image]).map((src,i)=>`<button class="thumb ${i===0?'active':''}" data-src="${esc(src)}"><img src="${esc(src)}" alt=""></button>`).join('');$$('.thumb',thumbs||document).forEach(b=>b.addEventListener('click',()=>{$$('.thumb',thumbs).forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#productImage').src=b.dataset.src}));
  $('#negotiateBtn')?.addEventListener('click',()=>createTicket(p));$('#favoriteBtn')?.addEventListener('click',()=>toggleFavorite(p.id));renderFavoriteButtons();
}

async function createTicket(product){
  if(!state.session){openAuth();toast('Entra na tua conta para iniciar uma negociação.','error');return}
  if(!state.supabase){toast('Supabase ainda não está configurado.','error');return}
  const subject=`Negociação — ${product.name}`;
  const {data,error}=await state.supabase.from('tickets').insert({user_id:state.session.user.id,product_id:product.id,subject,status:'open'}).select().single();
  if(error){toast(error.message,'error');return}
  await state.supabase.from('ticket_messages').insert({ticket_id:data.id,user_id:state.session.user.id,body:`Olá! Gostaria de discutir o preço do produto “${product.name}”.`});
  go(`pedidos.html?ticket=${encodeURIComponent(data.id)}`);
}

async function loadTicketsPage(){
  if(!protectPage('login'))return;
  if(!state.supabase)return;
  const {data,error}=await state.supabase.from('tickets').select('*').eq('user_id',state.session.user.id).order('created_at',{ascending:false});
  if(error){toast(error.message,'error');return}
  state.userTickets=data||[];renderTicketSidebar(state.userTickets);const wanted=new URLSearchParams(location.search).get('ticket');await openTicket(wanted||state.userTickets[0]?.id);
}
function renderTicketSidebar(tickets){const root=$('#ticketList');if(!root)return;root.innerHTML=tickets.length?tickets.map(t=>`<button class="ticket-row" data-ticket-id="${t.id}"><strong>${esc(t.subject||'Pedido')}</strong><span>${esc(t.status)} · ${dateTime(t.created_at)}</span></button>`).join(''):`<div style="padding:18px;font-size:12px;color:#777">Ainda não tens pedidos.</div>`;$$('.ticket-row',root).forEach(b=>b.addEventListener('click',()=>openTicket(b.dataset.ticketId)))}
async function openTicket(id){if(!id||!state.supabase)return;const t=(state.userTickets||[]).find(x=>x.id===id);if(!t)return;state.currentTicket=t;$$('.ticket-row').forEach(b=>b.classList.toggle('active',b.dataset.ticketId===id));$('#chatSubject')&&( $('#chatSubject').textContent=t.subject);const {data,error}=await state.supabase.from('ticket_messages').select('*').eq('ticket_id',id).order('created_at',{ascending:true});if(error){toast(error.message,'error');return}renderMessages(data||[],state.session.user.id)}
function renderMessages(messages,myId){const root=$('#chatMessages');if(!root)return;root.innerHTML=messages.map(m=>`<div class="message ${m.user_id===myId?'mine':''}">${esc(m.body)}<small>${dateTime(m.created_at)}</small></div>`).join('');root.scrollTop=root.scrollHeight}
async function sendTicketMessage(){const input=$('#chatInput');const body=input?.value.trim();if(!body||!state.currentTicket||!state.supabase)return;const {error}=await state.supabase.from('ticket_messages').insert({ticket_id:state.currentTicket.id,user_id:state.session.user.id,body});if(error){toast(error.message,'error');return}input.value='';await openTicket(state.currentTicket.id)}

async function renderAccountPage(){
  if(!protectPage('login'))return;
  const name=state.profile?.display_name||state.session.user.user_metadata?.full_name||state.session.user.email?.split('@')[0]||'Utilizador';
  $('#profileName')&&( $('#profileName').textContent=name);$('#profileEmail')&&( $('#profileEmail').textContent=state.session.user.email||'');$('#profileAvatar')&&( $('#profileAvatar').textContent=initials(name));
  if(state.supabase){const {data}=await state.supabase.from('tickets').select('*').eq('user_id',state.session.user.id).order('created_at',{ascending:false}).limit(6);const root=$('#accountTickets');if(root)root.innerHTML=(data||[]).map(t=>`<a class="ticket-item" href="pedidos.html?ticket=${t.id}"><div><h3>${esc(t.subject||'Pedido')}</h3><p>${dateTime(t.created_at)}</p></div><span class="status ${t.status==='open'?'open':'closed'}">${esc(t.status)}</span></a>`).join('')||'<p style="font-size:12px;color:#777">Ainda não tens pedidos.</p>'}
}

async function loadStaffPage(){
  if(!protectPage('staff'))return;if(!state.supabase)return;
  const {data,error}=await state.supabase.from('tickets').select('*').order('created_at',{ascending:false});if(error){toast(error.message,'error');return}
  const open=(data||[]).filter(t=>t.status==='open').length,closed=(data||[]).filter(t=>t.status==='closed').length;
  $('#statTickets')&&( $('#statTickets').textContent=data?.length||0);$('#statOpen')&&( $('#statOpen').textContent=open);$('#statClosed')&&( $('#statClosed').textContent=closed);$('#statProducts')&&( $('#statProducts').textContent=PRODUCTS.length);
  const body=$('#staffTableBody');if(!body)return;body.innerHTML=(data||[]).map(t=>`<tr><td>${esc(t.subject||'Pedido')}</td><td>${esc(t.user_id?.slice(0,8)||'—')}</td><td>${dateTime(t.created_at)}</td><td><span class="status ${t.status==='open'?'open':'closed'}">${esc(t.status)}</span></td><td><a class="btn btn-outline" style="height:30px;padding:0 10px" href="gestao.html?ticket=${t.id}">Abrir</a></td></tr>`).join('');
  const wanted=new URLSearchParams(location.search).get('ticket');if(wanted)await staffOpenTicket(wanted);else renderStaffChatEmpty();
}
function renderStaffChatEmpty(){const r=$('#staffChatMessages');if(r)r.innerHTML='<div style="color:#888;font-size:12px;padding:20px">Seleciona um pedido para começar.</div>'}
async function staffOpenTicket(id){if(!state.supabase)return;const {data,error}=await state.supabase.from('tickets').select('*').eq('id',id).single();if(error){toast(error.message,'error');return}state.currentTicket=data;$('#staffChatSubject')&&( $('#staffChatSubject').textContent=data.subject||'Pedido');const {data:msgs,error:e2}=await state.supabase.from('ticket_messages').select('*').eq('ticket_id',id).order('created_at',{ascending:true});if(e2){toast(e2.message,'error');return}const r=$('#staffChatMessages');if(r)r.innerHTML=(msgs||[]).map(m=>`<div class="message ${m.user_id===state.session.user.id?'mine':''}">${esc(m.body)}<small>${dateTime(m.created_at)}</small></div>`).join('');r.scrollTop=r.scrollHeight;}
async function staffSend(){const input=$('#staffChatInput');const body=input?.value.trim();if(!body||!state.currentTicket)return;const {error}=await state.supabase.from('ticket_messages').insert({ticket_id:state.currentTicket.id,user_id:state.session.user.id,body});if(error){toast(error.message,'error');return}input.value='';await staffOpenTicket(state.currentTicket.id)}

function initPage(){
  setupGlobal();
  const page=currentPage();
  if(page==='index.html'||page==='')setupHome();
  if(page==='produtos.html')setupCatalog();
  if(page==='produto.html')setupProduct();
  if(page==='conta.html')renderAccountPage();
  if(page==='pedidos.html')loadTicketsPage();
  if(page==='gestao.html')loadStaffPage();
  $('#chatSend')?.addEventListener('click',sendTicketMessage);$('#chatForm')?.addEventListener('submit',e=>{e.preventDefault();sendTicketMessage()});
  $('#staffChatSend')?.addEventListener('click',staffSend);$('#staffChatForm')?.addEventListener('submit',e=>{e.preventDefault();staffSend()});
}

document.addEventListener('DOMContentLoaded',()=>{initPage();initSupabase();});
