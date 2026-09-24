/*
  ALCOBAÇA STORE — configuração rápida de produtos
  ------------------------------------------------
  Para adicionar um produto, copia um bloco dentro de PRODUCTS e altera:
  id, name, description, price, image, gallery, category, badge, shipping, availability.
*/

const CONFIG = {
  STORE_NAME: 'Alcobaça Store',
  LOCALE: 'pt-PT',
  CURRENCY: 'EUR',

  // Preenche com os valores do teu projeto Supabase.
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY',
};

const PRODUCTS = [
  {
    id: 'exemplo-produto',
    name: 'Produto Exemplo',
    description: 'Produto de demonstração para a Alcobaça Store. Substitui este texto pela descrição real do artigo.',
    price: 29.90,
    image: 'images/exemplo.png',
    gallery: ['images/exemplo.png'],
    category: 'Seleção',
    badge: 'NOVO',
    shipping: 'Envio em Portugal',
    availability: 'Disponível',
  },
  // ===== COPIA O OBJETO ACIMA PARA ADICIONAR OUTRO PRODUTO =====
  // {
  //   id: 'produto-02',
  //   name: 'Nome do produto',
  //   description: 'Descrição do produto.',
  //   price: 49.90,
  //   image: 'images/produto-02.png',
  //   gallery: ['images/produto-02.png', 'images/produto-02-2.png'],
  //   category: 'Categoria',
  //   badge: 'DESTAQUE',
  //   shipping: 'Envio em Portugal',
  //   availability: 'Disponível',
  // },
];

const state = {
  supabase: null,
  session: null,
  profile: null,
  currentProduct: null,
  activeTicket: null,
  activeStaffTicket: null,
  ticketChannel: null,
  staffChannel: null,
  otpEmail: '',
  otpCooldown: 0,
  otpTimerHandle: null,
  searchTerm: '',
  cookieChoice: localStorage.getItem('alcobaca_cookie_choice'),
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  }[char]));
}

function currency(value) {
  return new Intl.NumberFormat(CONFIG.LOCALE, { style: 'currency', currency: CONFIG.CURRENCY }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(CONFIG.LOCALE, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function initials(text) {
  return String(text || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';
}

function isStaff() {
  return ['staff', 'owner'].includes(state.profile?.role);
}

function isConfigured() {
  return CONFIG.SUPABASE_URL.startsWith('https://') &&
    !CONFIG.SUPABASE_URL.includes('YOUR-PROJECT') &&
    Boolean(CONFIG.SUPABASE_ANON_KEY) &&
    !CONFIG.SUPABASE_ANON_KEY.includes('YOUR_SUPABASE');
}

function showToast(message, type = '') {
  const region = $('#toastRegion');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  region.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

function setAuthMessage(message = '', type = '') {
  const element = $('#authMessage');
  element.textContent = message;
  element.className = `form-message ${type}`;
}

function lockBody(value) {
  document.body.classList.toggle('no-scroll', value);
}

function openOverlay(id) {
  const element = $(`#${id}`);
  if (!element) return;
  element.classList.remove('hidden');
  element.setAttribute('aria-hidden', 'false');
  lockBody(true);
}

function closeOverlay(id) {
  const element = $(`#${id}`);
  if (!element) return;
  element.classList.add('hidden');
  element.setAttribute('aria-hidden', 'true');
  const anyOpen = ['authOverlay', 'productModal', 'privacyModal', 'ticketDrawer', 'staffDrawer'].some((name) => !$(`#${name}`).classList.contains('hidden'));
  lockBody(anyOpen);
}

function openAccountPopover() {
  const popover = $('#accountPopover');
  const next = popover.classList.toggle('hidden') === false;
  $('#accountBtn').setAttribute('aria-expanded', String(next));
}

function closeAccountPopover() {
  $('#accountPopover').classList.add('hidden');
  $('#accountBtn').setAttribute('aria-expanded', 'false');
}

function userDisplayName() {
  return state.profile?.display_name ||
    state.session?.user?.user_metadata?.full_name ||
    state.session?.user?.user_metadata?.name ||
    state.session?.user?.email?.split('@')[0] ||
    'Utilizador';
}

function updateAccountUI() {
  const logged = Boolean(state.session);
  const staff = isStaff();
  const name = logged ? userDisplayName() : 'Conta';

  $('#accountState').textContent = logged ? (staff ? 'Gestão' : 'Ligado') : 'Entrar';
  $('#accountName').textContent = name;
  $('#accountAvatar').textContent = logged ? initials(name) : 'A';
  $('#openTicketsBtn').classList.toggle('hidden', !logged);
  $('#openStaffBtn').classList.toggle('hidden', !staff);
  $('#mobileTicketsBtn').classList.toggle('hidden', !logged);
  $('#mobileStaffBtn').classList.toggle('hidden', !staff);
  $('#popoverGuest').classList.toggle('hidden', logged);
  $('#popoverUser').classList.toggle('hidden', !logged);

  if (logged) {
    $('#popoverName').textContent = name;
    $('#popoverEmail').textContent = state.session.user.email || '';
    $('#popoverAvatar').textContent = initials(name);
  }
}

function renderProducts() {
  const query = state.searchTerm.trim().toLowerCase();
  const products = PRODUCTS.filter((product) => {
    const text = `${product.name} ${product.description} ${product.category}`.toLowerCase();
    return !query || text.includes(query);
  });

  $('#productCount').textContent = `${products.length} ${products.length === 1 ? 'produto' : 'produtos'}`;
  $('#emptyProducts').classList.toggle('hidden', products.length !== 0);

  $('#productGrid').innerHTML = products.map((product) => `
    <article class="product-card">
      <div class="product-card-media">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.style.display='none';">
        <span class="product-badge">${escapeHtml(product.badge || 'SELEÇÃO')}</span>
      </div>
      <div class="product-card-body">
        <div class="product-topline"><span class="product-category">${escapeHtml(product.category || 'Produto')}</span><span class="product-price-ref">Preço de referência</span></div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description)}</p>
        <div class="product-card-footer">
          <div><strong>${currency(product.price)}</strong><small>${escapeHtml(product.shipping || 'Envio em Portugal')}</small></div>
          <button class="product-open" type="button" data-product-id="${escapeHtml(product.id)}">Ver detalhe <span>→</span></button>
        </div>
      </div>
    </article>
  `).join('');

  $$('.product-open').forEach((button) => {
    button.addEventListener('click', () => openProduct(button.dataset.productId));
  });

  updateFeaturedProduct();
}

function updateFeaturedProduct() {
  const product = PRODUCTS[0];
  if (!product) return;
  $('#featuredProductImage').src = product.image;
  $('#featuredProductImage').alt = product.name;
  $('#featuredProductCategory').textContent = product.category || 'Seleção';
  $('#featuredProductName').textContent = product.name;
  $('#featuredProductDescription').textContent = product.description;
  $('#featuredProductPrice').textContent = currency(product.price);
  $('#featuredOpenBtn').onclick = () => openProduct(product.id);
}

function openAuth() {
  closeAccountPopover();
  $('#authStart').classList.remove('hidden');
  $('#authOtp').classList.add('hidden');
  setAuthMessage('');
  openOverlay('authOverlay');
  setTimeout(() => $('#emailInput')?.focus(), 60);
}

function closeAuth() { closeOverlay('authOverlay'); }

function openProduct(productId) {
  const product = PRODUCTS.find((item) => item.id === productId);
  if (!product) return;
  state.currentProduct = product;

  $('#productTitle').textContent = product.name;
  $('#productDescription').textContent = product.description;
  $('#productPrice').textContent = currency(product.price);
  $('#productShipping').textContent = product.shipping || 'Envio em Portugal';
  $('#productAvailability').textContent = product.availability || 'Disponível';
  $('#productBadge').textContent = product.badge || 'SELEÇÃO';
  $('#productCategory').textContent = (product.category || 'Produto').toUpperCase();

  const gallery = product.gallery?.length ? product.gallery : [product.image];
  $('#productGallery').innerHTML = `<img src="${escapeHtml(gallery[0])}" alt="${escapeHtml(product.name)}" onerror="this.outerHTML='<div class=\"gallery-placeholder\">${escapeHtml(initials(product.name))}</div>'">`;
  openOverlay('productModal');
}

async function handleDiscussPrice() {
  closeOverlay('productModal');
  await createTicket(state.currentProduct);
}

function openPrivacy() { openOverlay('privacyModal'); }
function closePrivacy() { closeOverlay('privacyModal'); }

function openCookieBanner() { $('#cookieBanner').classList.remove('hidden'); }
function saveCookieChoice(choice) {
  state.cookieChoice = choice;
  localStorage.setItem('alcobaca_cookie_choice', choice);
  $('#cookieBanner').classList.add('hidden');
}

function requireLogin(callback) {
  if (!state.session) {
    openAuth();
    showToast('Entra na tua conta para continuares.');
    return;
  }
  callback?.();
}

async function sendOtp(email) {
  if (!state.supabase) {
    setAuthMessage('Configura o Supabase no início de script.js para ativar o acesso real.', 'error');
    return;
  }

  const cleanEmail = email.trim();
  if (!cleanEmail) return;
  const form = $('#emailForm');
  form.classList.add('loading');
  setAuthMessage('A enviar o código…');

  const { error } = await state.supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: { shouldCreateUser: true },
  });

  form.classList.remove('loading');
  if (error) {
    setAuthMessage(error.message, 'error');
    return;
  }

  state.otpEmail = cleanEmail;
  $('#otpEmailLabel').textContent = cleanEmail;
  $('#authStart').classList.add('hidden');
  $('#authOtp').classList.remove('hidden');
  $('#otpInput').value = '';
  setAuthMessage('Código enviado para o teu email.', 'success');
  startOtpCooldown();
  setTimeout(() => $('#otpInput')?.focus(), 50);
}

async function verifyOtp(code) {
  if (!state.supabase) return;
  const cleanCode = code.trim();
  if (!/^\d{6}$/.test(cleanCode)) {
    setAuthMessage('Introduz um código válido com 6 dígitos.', 'error');
    return;
  }

  setAuthMessage('A verificar…');
  const form = $('#otpForm');
  form.classList.add('loading');
  const { data, error } = await state.supabase.auth.verifyOtp({ email: state.otpEmail, token: cleanCode, type: 'email' });
  form.classList.remove('loading');

  if (error) {
    setAuthMessage(error.message, 'error');
    return;
  }

  state.session = data.session;
  await refreshProfile();
  setAuthMessage('Acesso confirmado.', 'success');
  setTimeout(closeAuth, 250);
}

function startOtpCooldown() {
  state.otpCooldown = 45;
  clearInterval(state.otpTimerHandle);
  const timer = $('#otpTimer');
  timer.textContent = 'Podes reenviar em 45s.';
  state.otpTimerHandle = setInterval(() => {
    state.otpCooldown -= 1;
    if (state.otpCooldown <= 0) {
      clearInterval(state.otpTimerHandle);
      timer.textContent = 'Podes pedir outro código.';
      return;
    }
    timer.textContent = `Podes reenviar em ${state.otpCooldown}s.`;
  }, 1000);
}

async function loginGoogle() {
  if (!state.supabase) {
    setAuthMessage('Configura o Supabase no início de script.js para ativar o acesso real.', 'error');
    return;
  }

  $('#googleLoginBtn').classList.add('loading');
  const { error } = await state.supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  $('#googleLoginBtn').classList.remove('loading');
  if (error) setAuthMessage(error.message, 'error');
}

async function logout() {
  if (!state.supabase) return;
  const { error } = await state.supabase.auth.signOut();
  if (error) {
    showToast(error.message, 'error');
    return;
  }
  state.session = null;
  state.profile = null;
  updateAccountUI();
  closeAccountPopover();
  showToast('Sessão terminada.');
}

async function refreshProfile() {
  if (!state.supabase || !state.session?.user) return;
  const { data, error } = await state.supabase.from('profiles').select('*').eq('id', state.session.user.id).maybeSingle();
  if (!error) state.profile = data;
  updateAccountUI();
}

async function initSupabase() {
  if (!isConfigured()) {
    console.warn('[Alcobaça Store] Supabase ainda não configurado.');
    updateAccountUI();
    return;
  }

  state.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'alcobaca-store-auth',
    },
  });

  const { data } = await state.supabase.auth.getSession();
  state.session = data.session;
  if (state.session) await refreshProfile();
  updateAccountUI();

  state.supabase.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    if (session) await refreshProfile();
    else {
      state.profile = null;
      updateAccountUI();
    }
  });
}

async function createTicket(product = null) {
  requireLogin(async () => {
    if (!state.supabase) {
      showToast('Configura o Supabase antes de criar pedidos.', 'error');
      return;
    }

    const subject = product ? `Negociação — ${product.name}` : 'Pedido geral';
    const payload = {
      user_id: state.session.user.id,
      subject,
      product_id: product?.id || null,
      product_name: product?.name || null,
      status: 'open',
      priority: 'normal',
    };

    const { data, error } = await state.supabase.from('tickets').insert(payload).select('*').single();
    if (error) {
      showToast(error.message, 'error');
      return;
    }

    state.activeTicket = data;
    openTicketDrawer(data.id);
  });
}

function ticketStatusLabel(status) {
  return { open: 'Aberto', waiting: 'À espera', closed: 'Fechado' }[status] || status || 'Aberto';
}

async function loadTickets() {
  if (!state.supabase || !state.session) return;
  const { data, error } = await state.supabase.from('tickets').select('*').eq('user_id', state.session.user.id).order('created_at', { ascending: false });
  if (error) {
    $('#ticketList').innerHTML = `<div class="empty-state"><h3>Não foi possível carregar.</h3><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }

  const tickets = data || [];
  $('#ticketList').innerHTML = tickets.length ? tickets.map((ticket) => `
    <button class="ticket-item" type="button" data-ticket-id="${escapeHtml(ticket.id)}">
      <div class="ticket-item-top"><strong>${escapeHtml(ticket.subject)}</strong><time>${formatDate(ticket.updated_at || ticket.created_at)}</time></div>
      <p>${escapeHtml(ticket.product_name || 'Pedido geral')}</p>
      <div class="ticket-tags"><span class="ticket-tag ${escapeHtml(ticket.status)}">${escapeHtml(ticketStatusLabel(ticket.status))}</span><span class="ticket-tag">${escapeHtml(ticket.priority || 'normal')}</span></div>
    </button>
  `).join('') : `
    <div class="empty-state"><h3>Sem pedidos.</h3><p>Quando iniciares uma conversa com a equipa, ela aparecerá aqui.</p></div>
  `;

  $$('.ticket-item').forEach((element) => element.addEventListener('click', () => openTicketDrawer(element.dataset.ticketId)));
}

function openTicketsDrawer() {
  requireLogin(async () => {
    closeAccountPopover();
    $('#ticketComposer').classList.add('hidden');
    $('#ticketList').classList.remove('hidden');
    $('#newTicketArea').classList.remove('hidden');
    $('#drawerTitle').textContent = 'Os meus pedidos';
    openOverlay('ticketDrawer');
    await loadTickets();
  });
}

async function openTicketDrawer(ticketId) {
  if (!state.supabase) return;
  if (!state.session) return openAuth();

  const { data, error } = await state.supabase.from('tickets').select('*').eq('id', ticketId).single();
  if (error) {
    showToast(error.message, 'error');
    return;
  }

  state.activeTicket = data;
  $('#ticketList').classList.add('hidden');
  $('#newTicketArea').classList.add('hidden');
  $('#ticketComposer').classList.remove('hidden');
  $('#drawerTitle').textContent = 'Pedido';
  renderTicketMeta($('#activeTicketMeta'), data, false);
  openOverlay('ticketDrawer');
  await loadTicketMessages(ticketId, $('#ticketMessages'));
  subscribeToTicket(ticketId, false);
}

function renderTicketMeta(target, ticket, staffMode) {
  target.innerHTML = `<strong>${escapeHtml(ticket.subject)}</strong><span>${escapeHtml(ticket.product_name || 'Pedido geral')} · ${escapeHtml(ticketStatusLabel(ticket.status))}${staffMode && ticket.user_email ? ` · ${escapeHtml(ticket.user_email)}` : ''}</span>`;
}

async function loadTicketMessages(ticketId, target) {
  if (!state.supabase) return;
  const { data, error } = await state.supabase.from('ticket_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
  if (error) {
    target.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }

  target.innerHTML = (data || []).length ? (data || []).map((message) => {
    const mine = message.sender_id === state.session?.user?.id;
    const staff = Boolean(message.is_staff);
    return `<div class="message-bubble ${mine ? 'me' : ''} ${staff ? 'staff' : ''}"><p>${escapeHtml(message.message)}</p><small>${staff ? 'Equipa' : mine ? 'Tu' : 'Utilizador'} · ${formatDate(message.created_at)}</small></div>`;
  }).join('') : `<div class="empty-state"><p>Inicia a conversa a partir daqui.</p></div>`;
  target.scrollTop = target.scrollHeight;
}

function subscribeToTicket(ticketId, staffMode) {
  if (!state.supabase) return;
  const current = staffMode ? state.staffChannel : state.ticketChannel;
  if (current) state.supabase.removeChannel(current);

  const channel = state.supabase.channel(`ticket-${ticketId}-${staffMode ? 'staff' : 'client'}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticketId}` }, async () => {
      if (staffMode) await loadTicketMessages(ticketId, $('#staffTicketMessages'));
      else await loadTicketMessages(ticketId, $('#ticketMessages'));
    })
    .subscribe();

  if (staffMode) state.staffChannel = channel;
  else state.ticketChannel = channel;
}

function closeTicketDrawer() {
  closeOverlay('ticketDrawer');
  if (state.ticketChannel && state.supabase) state.supabase.removeChannel(state.ticketChannel);
  state.ticketChannel = null;
}

async function sendTicketMessage(input, ticketId, staffMode, form) {
  const message = input.value.trim();
  if (!message || !ticketId || !state.supabase || !state.session) return;

  form.classList.add('loading');
  const { error } = await state.supabase.from('ticket_messages').insert({
    ticket_id: ticketId,
    sender_id: state.session.user.id,
    message,
    is_staff: Boolean(staffMode),
  });
  form.classList.remove('loading');

  if (error) {
    showToast(error.message, 'error');
    return;
  }

  input.value = '';
  await state.supabase.from('tickets').update({ status: staffMode ? 'waiting' : 'open', updated_at: new Date().toISOString() }).eq('id', ticketId);
}

async function loadStaffTickets() {
  if (!state.supabase || !isStaff()) return;
  const { data, error } = await state.supabase.from('tickets').select('*').order('updated_at', { ascending: false });
  if (error) {
    $('#staffTicketsView').innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }

  const tickets = data || [];
  renderStaffDashboard(tickets);
  renderStaffTickets(tickets);
}

function renderStaffDashboard(tickets) {
  const open = tickets.filter((ticket) => ticket.status === 'open').length;
  const waiting = tickets.filter((ticket) => ticket.status === 'waiting').length;
  const closed = tickets.filter((ticket) => ticket.status === 'closed').length;

  $('#staffDashboardView').innerHTML = `
    <div class="stats-grid"><div class="stat-card"><small>Total</small><strong>${tickets.length}</strong></div><div class="stat-card"><small>Abertos</small><strong>${open}</strong></div><div class="stat-card"><small>À espera</small><strong>${waiting}</strong></div></div>
    <div class="staff-table"><div class="staff-row"><div><strong>Conta atual</strong><span>${escapeHtml(userDisplayName())} · ${escapeHtml(state.profile?.role || 'staff')}</span></div><span class="ticket-tag closed">Autorizado</span></div><div class="staff-row"><div><strong>Pedidos fechados</strong><span>Continuam disponíveis no histórico.</span></div><strong>${closed}</strong></div></div>
  `;
}

function renderStaffTickets(tickets) {
  $('#staffTicketsView').innerHTML = tickets.length ? `
    <div class="staff-table">${tickets.map((ticket) => `
      <div class="staff-row"><div><strong>${escapeHtml(ticket.subject)}</strong><span>${escapeHtml(ticket.product_name || 'Pedido geral')} · ${escapeHtml(ticketStatusLabel(ticket.status))} · ${formatDate(ticket.updated_at || ticket.created_at)}</span></div><button class="staff-open-btn" type="button" data-staff-ticket-id="${escapeHtml(ticket.id)}">Abrir</button></div>
    `).join('')}</div>
  ` : `<div class="empty-state"><h3>Sem pedidos.</h3><p>As conversas dos utilizadores aparecerão nesta área.</p></div>`;

  $$('.staff-open-btn').forEach((button) => button.addEventListener('click', () => openStaffTicket(button.dataset.staffTicketId)));
}

async function openStaffDrawer() {
  if (!state.session) return openAuth();
  if (!isStaff()) {
    showToast('Esta área está reservada à equipa de gestão.', 'error');
    return;
  }
  closeAccountPopover();
  $('#staffDrawer').classList.remove('hidden');
  $('#staffDrawer').setAttribute('aria-hidden', 'false');
  lockBody(true);
  switchStaffView('dashboard');
  await loadStaffTickets();
}

function switchStaffView(view) {
  $$('.staff-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.staffView === view));
  $('#staffDashboardView').classList.toggle('hidden', view !== 'dashboard');
  $('#staffTicketsView').classList.toggle('hidden', view !== 'tickets');
  $('#staffChatView').classList.add('hidden');
  $('.staff-tabs').classList.remove('hidden');
}

async function openStaffTicket(ticketId) {
  if (!state.supabase || !isStaff()) return;
  const { data, error } = await state.supabase.from('tickets').select('*').eq('id', ticketId).single();
  if (error) {
    showToast(error.message, 'error');
    return;
  }

  state.activeStaffTicket = data;
  $('#staffDashboardView').classList.add('hidden');
  $('#staffTicketsView').classList.add('hidden');
  $('#staffChatView').classList.remove('hidden');
  $('.staff-tabs').classList.add('hidden');
  renderTicketMeta($('#staffActiveTicketMeta'), data, true);
  await loadTicketMessages(ticketId, $('#staffTicketMessages'));
  subscribeToTicket(ticketId, true);
}

function closeStaffDrawer() {
  $('#staffDrawer').classList.add('hidden');
  $('#staffDrawer').setAttribute('aria-hidden', 'true');
  lockBody(false);
  if (state.staffChannel && state.supabase) state.supabase.removeChannel(state.staffChannel);
  state.staffChannel = null;
  $('.staff-tabs').classList.remove('hidden');
}

function mobileMenuToggle() {
  const open = $('#mobileNav').classList.toggle('open');
  $('#mobileMenuBtn').setAttribute('aria-expanded', String(open));
}

function bindEvents() {
  $('#accountBtn').addEventListener('click', openAccountPopover);
  $('#heroAccountBtn').addEventListener('click', () => state.session ? openAccountPopover() : openAuth());
  $('#footerAccountBtn').addEventListener('click', () => state.session ? openAccountPopover() : openAuth());
  $('#footerTicketsBtn').addEventListener('click', openTicketsDrawer);
  $('#popoverLoginBtn').addEventListener('click', openAuth);
  $('#popoverTicketsBtn').addEventListener('click', openTicketsDrawer);
  $('#logoutBtn').addEventListener('click', logout);
  $('#openTicketsBtn').addEventListener('click', openTicketsDrawer);
  $('#openStaffBtn').addEventListener('click', openStaffDrawer);
  $('#mobileTicketsBtn').addEventListener('click', openTicketsDrawer);
  $('#mobileStaffBtn').addEventListener('click', openStaffDrawer);
  $('#mobileMenuBtn').addEventListener('click', mobileMenuToggle);
  $$('#mobileNav a').forEach((link) => link.addEventListener('click', () => { $('#mobileNav').classList.remove('open'); $('#mobileMenuBtn').setAttribute('aria-expanded', 'false'); }));

  $('#googleLoginBtn').addEventListener('click', loginGoogle);
  $('#emailForm').addEventListener('submit', (event) => { event.preventDefault(); sendOtp($('#emailInput').value); });
  $('#otpForm').addEventListener('submit', (event) => { event.preventDefault(); verifyOtp($('#otpInput').value); });
  $('#otpInput').addEventListener('input', (event) => { event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6); });
  $('#backToEmailBtn').addEventListener('click', () => { $('#authOtp').classList.add('hidden'); $('#authStart').classList.remove('hidden'); setAuthMessage(''); $('#emailInput').focus(); });
  $('#resendOtpBtn').addEventListener('click', () => state.otpCooldown <= 0 ? sendOtp(state.otpEmail) : setAuthMessage(`Espera mais ${state.otpCooldown}s antes de reenviar.`));

  $('#closeAuthBtn').addEventListener('click', closeAuth);
  $('#closeProductModalBtn').addEventListener('click', () => closeOverlay('productModal'));
  $('#closeProductTextBtn').addEventListener('click', () => closeOverlay('productModal'));
  $('#discussPriceBtn').addEventListener('click', handleDiscussPrice);
  $('#closePrivacyBtn').addEventListener('click', closePrivacy);
  $('#privacyBtn').addEventListener('click', openPrivacy);
  $('#cookieSettingsBtn').addEventListener('click', openCookieBanner);
  $('#cookieAcceptBtn').addEventListener('click', () => saveCookieChoice('all'));
  $('#cookieEssentialBtn').addEventListener('click', () => saveCookieChoice('essential'));
  $('#supportTicketBtn').addEventListener('click', () => createTicket());
  $('#newSupportTicketBtn').addEventListener('click', () => createTicket());

  $('#closeTicketDrawerBtn').addEventListener('click', closeTicketDrawer);
  $('#backToTicketListBtn').addEventListener('click', openTicketsDrawer);
  $('#ticketMessageForm').addEventListener('submit', (event) => { event.preventDefault(); sendTicketMessage($('#ticketMessageInput'), state.activeTicket?.id, false, $('#ticketMessageForm')); });

  $('#closeStaffDrawerBtn').addEventListener('click', closeStaffDrawer);
  $('#backToStaffTicketsBtn').addEventListener('click', async () => { switchStaffView('tickets'); await loadStaffTickets(); });
  $('#staffMessageForm').addEventListener('submit', (event) => { event.preventDefault(); sendTicketMessage($('#staffMessageInput'), state.activeStaffTicket?.id, true, $('#staffMessageForm')); });
  $$('.staff-tab').forEach((tab) => tab.addEventListener('click', async () => { switchStaffView(tab.dataset.staffView); if (tab.dataset.staffView === 'tickets') await loadStaffTickets(); }));

  $('#productSearch').addEventListener('input', (event) => { state.searchTerm = event.target.value; renderProducts(); });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('#accountPopover') && !event.target.closest('#accountBtn')) closeAccountPopover();
    if (event.target === $('#authOverlay')) closeAuth();
    if (event.target === $('#productModal')) closeOverlay('productModal');
    if (event.target === $('#privacyModal')) closePrivacy();
    if (event.target === $('#ticketDrawer')) closeTicketDrawer();
    if (event.target === $('#staffDrawer')) closeStaffDrawer();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeAccountPopover();
    if (!$('#authOverlay').classList.contains('hidden')) closeAuth();
    if (!$('#productModal').classList.contains('hidden')) closeOverlay('productModal');
    if (!$('#privacyModal').classList.contains('hidden')) closePrivacy();
    if (!$('#ticketDrawer').classList.contains('hidden')) closeTicketDrawer();
    if (!$('#staffDrawer').classList.contains('hidden')) closeStaffDrawer();
  });
}

function setupReveal() {
  const elements = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    elements.forEach((element) => element.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.14 });
  elements.forEach((element) => observer.observe(element));
}

function setupScrollUI() {
  const header = $('#siteHeader');
  const progress = $('#pageProgress');
  const update = () => {
    const top = window.scrollY || 0;
    header.classList.toggle('scrolled', top > 10);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = max > 0 ? `${Math.min(100, (top / max) * 100)}%` : '0%';
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
}

async function init() {
  $('#currentYear').textContent = new Date().getFullYear();
  renderProducts();
  updateAccountUI();
  bindEvents();
  setupReveal();
  setupScrollUI();
  await initSupabase();

  if (!state.cookieChoice) setTimeout(openCookieBanner, 700);
}

document.addEventListener('DOMContentLoaded', init);
