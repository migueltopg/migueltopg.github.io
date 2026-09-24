/*
  NELSTORE — Frontend
  ------------------------------------------------------------
  1) Put your Supabase URL + anon/publishable key below.
  2) Products are configured in the PRODUCTS array below.
  3) Staff permissions come from the profiles.role field in Supabase.
     Do NOT put service_role keys in this file.
*/

const CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY',
  STORE_NAME: 'NELSTORE',
  CURRENCY: 'EUR',
  LOCALE: 'pt-PT',
  TICKET_PREVIEW_LIMIT: 80,
};

/*
  ======== ADICIONAR PRODUTOS ========
  Para criar outro produto, copia um objeto inteiro e altera os campos.
  image e gallery apontam para ficheiros dentro da pasta /images.
*/
const PRODUCTS = [
  {
    id: 'exemplo-produto',
    name: 'Produto Exemplo',
    description: 'Este é um produto de demonstração. Substitui nome, descrição, imagem e preço por aquilo que queres vender.',
    price: 29.90,
    image: 'images/exemplo.png',
    gallery: ['images/exemplo.png'],
    category: 'Destaque',
    badge: 'NOVO',
    shipping: 'Envio nacional',
    availability: 'Disponível',
  },
  // === COPIA O BLOCO ACIMA PARA ADICIONAR OUTRO PRODUTO ===
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
  searchTerm: '',
  cookieChoice: localStorage.getItem('nelstore_cookie_choice'),
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function isSupabaseConfigured() {
  return CONFIG.SUPABASE_URL.startsWith('https://') &&
    !CONFIG.SUPABASE_URL.includes('YOUR-PROJECT') &&
    CONFIG.SUPABASE_ANON_KEY &&
    !CONFIG.SUPABASE_ANON_KEY.includes('YOUR_SUPABASE');
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  })[char]);
}

function currency(value) {
  return new Intl.NumberFormat(CONFIG.LOCALE, { style: 'currency', currency: CONFIG.CURRENCY }).format(Number(value) || 0);
}

function relativeDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Intl.DateTimeFormat(CONFIG.LOCALE, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

function userName() {
  return state.profile?.display_name || state.session?.user?.user_metadata?.full_name || state.session?.user?.user_metadata?.name || state.session?.user?.email?.split('@')[0] || 'Utilizador';
}

function initials(text) {
  const chars = String(text || '?').trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase());
  return chars.join('') || '?';
}

function showToast(message, type = '') {
  const region = $('#toastRegion');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  region.appendChild(toast);
  setTimeout(() => toast.remove(), 4300);
}

function setAuthMessage(message = '', type = '') {
  const el = $('#authMessage');
  el.textContent = message;
  el.className = `form-message ${type}`;
}

function setBodyLock(locked) {
  document.body.classList.toggle('modal-open', locked);
}

function setDrawerLock(locked) {
  document.body.classList.toggle('drawer-open', locked);
}

function renderProducts() {
  const term = state.searchTerm.trim().toLowerCase();
  const products = PRODUCTS.filter(product => {
    const text = `${product.name} ${product.description} ${product.category}`.toLowerCase();
    return !term || text.includes(term);
  });

  $('#productCount').textContent = `${products.length} ${products.length === 1 ? 'produto' : 'produtos'}`;
  $('#emptyProducts').classList.toggle('is-hidden', products.length > 0);

  $('#productGrid').innerHTML = products.map(product => `
    <article class="product-card">
      <div class="product-image">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';">
        <div class="image-fallback" style="display:none">${escapeHtml(initials(product.name))}</div>
      </div>
      <div class="product-body">
        <div class="product-topline">
          <span class="product-category">${escapeHtml(product.category || 'Produto')}</span>
          <span class="product-badge">${escapeHtml(product.badge || 'SELEÇÃO')}</span>
        </div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description)}</p>
        <div class="product-footer">
          <div class="product-price">${currency(product.price)}<small>${escapeHtml(product.shipping || 'Envio nacional')}</small></div>
          <button class="open-product" data-product-id="${escapeHtml(product.id)}" type="button">Ver produto →</button>
        </div>
      </div>
    </article>
  `).join('');

  $$('.open-product').forEach(button => {
    button.addEventListener('click', () => openProductModal(button.dataset.productId));
  });
}

function openAuth() {
  $('#authOverlay').classList.remove('is-hidden');
  $('#authOverlay').setAttribute('aria-hidden', 'false');
  setBodyLock(true);
  $('#emailInput').focus();
}

function closeAuth() {
  $('#authOverlay').classList.add('is-hidden');
  $('#authOverlay').setAttribute('aria-hidden', 'true');
  if (!$('#productModal').classList.contains('is-hidden') || !$('#privacyModal').classList.contains('is-hidden')) return;
  setBodyLock(false);
}

function updateAuthUI() {
  const logged = Boolean(state.session);
  const staff = ['staff', 'owner'].includes(state.profile?.role);

  $('#accountState').textContent = logged ? (staff ? 'Staff' : 'Ligado') : 'Entrar';
  $('#accountName').textContent = logged ? userName() : 'Conta';
  $('#accountAvatar').textContent = logged ? initials(userName()) : '?';
  $('#openTicketsBtn').classList.toggle('is-hidden', !logged);
  $('#openStaffBtn').classList.toggle('is-hidden', !staff);
  $('#popoverGuest').classList.toggle('is-hidden', logged);
  $('#popoverUser').classList.toggle('is-hidden', !logged);

  if (logged) {
    $('#popoverName').textContent = userName();
    $('#popoverEmail').textContent = state.session.user.email || '';
    $('#popoverAvatar').textContent = initials(userName());
  }
}

function openAccountPopover() {
  $('#accountPopover').classList.toggle('is-hidden');
}

function closeAccountPopover() {
  $('#accountPopover').classList.add('is-hidden');
}

async function sendOtp(email) {
  if (!state.supabase) return demoSupabaseNotice();
  setAuthMessage('A enviar o código...', '');
  $('#emailForm').classList.add('loading');
  const { error } = await state.supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true }
  });
  $('#emailForm').classList.remove('loading');
  if (error) {
    setAuthMessage(error.message, 'error');
    return;
  }
  state.otpEmail = email.trim();
  $('#otpEmailLabel').textContent = state.otpEmail;
  $('#authStart').classList.add('is-hidden');
  $('#authOtp').classList.remove('is-hidden');
  $('#otpInput').value = '';
  $('#otpInput').focus();
  startOtpCooldown();
  setAuthMessage('Código enviado. Verifica o teu email.', 'success');
}

async function verifyOtp(code) {
  if (!state.supabase) return demoSupabaseNotice();
  setAuthMessage('A verificar...', '');
  $('#otpForm').classList.add('loading');
  const { data, error } = await state.supabase.auth.verifyOtp({
    email: state.otpEmail,
    token: code.trim(),
    type: 'email'
  });
  $('#otpForm').classList.remove('loading');
  if (error) {
    setAuthMessage(error.message, 'error');
    return;
  }
  state.session = data.session;
  await refreshProfile();
  setAuthMessage('Sessão iniciada.', 'success');
  setTimeout(closeAuth, 250);
}

function startOtpCooldown() {
  state.otpCooldown = 45;
  const timer = $('#otpTimer');
  clearInterval(state.otpTimerHandle);
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
  if (!state.supabase) return demoSupabaseNotice();
  $('#googleLoginBtn').classList.add('loading');
  const { error } = await state.supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname }
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
  closeAccountPopover();
  updateAuthUI();
  showToast('Sessão terminada.');
  openAuth();
}

async function refreshProfile() {
  if (!state.supabase || !state.session?.user) return;
  const { data, error } = await state.supabase.from('profiles').select('*').eq('id', state.session.user.id).maybeSingle();
  if (error) {
    console.warn('Profile load:', error.message);
    state.profile = null;
  } else {
    state.profile = data;
  }
  updateAuthUI();
}

function demoSupabaseNotice() {
  setAuthMessage('Configura o URL e a chave do Supabase no início de script.js para ativar o login real.', 'error');
  showToast('Supabase ainda não está configurado.', 'error');
}

function openProductModal(productId) {
  const product = PRODUCTS.find(item => item.id === productId);
  if (!product) return;
  state.currentProduct = product;
  $('#productTitle').textContent = product.name;
  $('#productDescription').textContent = product.description;
  $('#productPrice').textContent = currency(product.price);
  $('#productShipping').textContent = product.shipping || 'Envio em Portugal';
  $('#productBadge').textContent = product.badge || 'SELEÇÃO';
  $('#productAvailability').textContent = product.availability || 'Disponível';

  const gallery = product.gallery?.length ? product.gallery : [product.image];
  $('#productGallery').innerHTML = `
    <img class="gallery-main" src="${escapeHtml(gallery[0])}" alt="${escapeHtml(product.name)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';">
    <div class="gallery-placeholder" style="display:none">${escapeHtml(initials(product.name))}</div>
  `;

  $('#productModal').classList.remove('is-hidden');
  $('#productModal').setAttribute('aria-hidden', 'false');
  setBodyLock(true);
}

function closeProductModal() {
  $('#productModal').classList.add('is-hidden');
  $('#productModal').setAttribute('aria-hidden', 'true');
  setBodyLock(false);
}

function openPrivacy() {
  $('#privacyModal').classList.remove('is-hidden');
  $('#privacyModal').setAttribute('aria-hidden', 'false');
  setBodyLock(true);
}

function closePrivacy() {
  $('#privacyModal').classList.add('is-hidden');
  $('#privacyModal').setAttribute('aria-hidden', 'true');
  setBodyLock(false);
}

function openCookieBanner() {
  $('#cookieBanner').classList.remove('is-hidden');
}

function saveCookieChoice(choice) {
  state.cookieChoice = choice;
  localStorage.setItem('nelstore_cookie_choice', choice);
  $('#cookieBanner').classList.add('is-hidden');
}

function ensureLoggedIn(callback) {
  if (!state.session) {
    closeAccountPopover();
    openAuth();
    showToast('Entra na tua conta para continuares.');
    return;
  }
  callback?.();
}

async function createTicket(product = null) {
  ensureLoggedIn(async () => {
    if (!state.supabase) return demoSupabaseNotice();
    const subject = product ? `Negociação — ${product.name}` : 'Apoio / Pedido geral';
    const { data, error } = await state.supabase.from('tickets').insert({
      user_id: state.session.user.id,
      subject,
      product_id: product?.id || null,
      product_name: product?.name || null,
      status: 'open',
      priority: 'normal'
    }).select('*').single();

    if (error) {
      showToast(error.message, 'error');
      return;
    }

    state.activeTicket = data;
    await loadTickets();
    openTicketDrawer(data.id);
    $('#ticketMessageInput').focus();
  });
}

async function loadTickets() {
  if (!state.supabase || !state.session) return;
  const { data, error } = await state.supabase
    .from('tickets')
    .select('*')
    .eq('user_id', state.session.user.id)
    .order('created_at', { ascending: false });
  if (error) {
    $('#ticketList').innerHTML = `<div class="empty-state"><h3>Não foi possível carregar</h3><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }
  renderTicketList(data || []);
}

function ticketStatusLabel(status) {
  return ({ open: 'Aberto', waiting: 'À espera', closed: 'Fechado' })[status] || status || 'Aberto';
}

function renderTicketList(tickets) {
  if (!tickets.length) {
    $('#ticketList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">▣</div>
        <h3>Ainda não tens tickets</h3>
        <p>Abre um a partir de um produto ou usa o botão abaixo.</p>
      </div>
    `;
    return;
  }
  $('#ticketList').innerHTML = tickets.map(ticket => `
    <button class="ticket-item" data-ticket-id="${escapeHtml(ticket.id)}" type="button">
      <div class="ticket-item-top"><strong>${escapeHtml(ticket.subject)}</strong><time>${relativeDate(ticket.updated_at || ticket.created_at)}</time></div>
      <p>${escapeHtml(ticket.product_name || 'Pedido geral')}</p>
      <div class="ticket-tags"><span class="ticket-tag ${escapeHtml(ticket.status)}">${escapeHtml(ticketStatusLabel(ticket.status))}</span><span class="ticket-tag">${escapeHtml(ticket.priority || 'normal')}</span></div>
    </button>
  `).join('');
  $$('.ticket-item').forEach(el => el.addEventListener('click', () => openTicketDrawer(el.dataset.ticketId)));
}

function openTicketsDrawer() {
  ensureLoggedIn(async () => {
    $('#ticketDrawer').classList.remove('is-hidden');
    $('#ticketDrawer').setAttribute('aria-hidden', 'false');
    setDrawerLock(true);
    $('#ticketComposer').classList.add('is-hidden');
    $('#ticketList').classList.remove('is-hidden');
    $('#newTicketArea').classList.remove('is-hidden');
    $('#drawerTitle').textContent = 'Os meus tickets';
    await loadTickets();
  });
}

async function openTicketDrawer(ticketId) {
  if (!state.supabase) return demoSupabaseNotice();
  $('#ticketDrawer').classList.remove('is-hidden');
  $('#ticketDrawer').setAttribute('aria-hidden', 'false');
  setDrawerLock(true);
  $('#ticketList').classList.add('is-hidden');
  $('#newTicketArea').classList.add('is-hidden');
  $('#ticketComposer').classList.remove('is-hidden');
  $('#drawerTitle').textContent = 'Ticket';

  const { data, error } = await state.supabase.from('tickets').select('*').eq('id', ticketId).single();
  if (error) {
    showToast(error.message, 'error');
    return;
  }
  state.activeTicket = data;
  renderActiveTicketMeta($('#activeTicketMeta'), data, false);
  await loadTicketMessages(ticketId, $('#ticketMessages'));
  subscribeToTicket(ticketId, false);
}

function renderActiveTicketMeta(target, ticket, staffMode) {
  target.innerHTML = `
    <strong>${escapeHtml(ticket.subject)}</strong>
    <span>${escapeHtml(ticket.product_name || 'Pedido geral')} · ${escapeHtml(ticketStatusLabel(ticket.status))}${staffMode ? ` · ${escapeHtml(ticket.user_email || '')}` : ''}</span>
  `;
}

async function loadTicketMessages(ticketId, target, staffMode = false) {
  if (!state.supabase) return;
  const { data, error } = await state.supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) {
    target.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }
  target.innerHTML = (data || []).map(message => {
    const mine = state.session?.user?.id === message.sender_id && !message.is_staff;
    return `
      <div class="message ${mine ? 'mine' : 'staff'}">
        <div>${escapeHtml(message.message)}</div>
        <div class="message-meta">${message.is_staff ? 'Staff' : (mine ? 'Tu' : 'Utilizador')} · ${relativeDate(message.created_at)}</div>
      </div>
    `;
  }).join('') || `<div class="empty-state"><p>Inicia a conversa com a equipa.</p></div>`;
  target.scrollTop = target.scrollHeight;
}

function subscribeToTicket(ticketId, staffMode = false) {
  if (!state.supabase) return;
  const existing = staffMode ? state.staffChannel : state.ticketChannel;
  if (existing) state.supabase.removeChannel(existing);
  const channel = state.supabase.channel(`ticket-${ticketId}-${staffMode ? 'staff' : 'user'}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticketId}` }, payload => {
      const target = staffMode ? $('#staffTicketMessages') : $('#ticketMessages');
      const msg = payload.new;
      const mine = state.session?.user?.id === msg.sender_id && !msg.is_staff;
      const el = document.createElement('div');
      el.className = `message ${mine ? 'mine' : 'staff'}`;
      el.innerHTML = `<div>${escapeHtml(msg.message)}</div><div class="message-meta">${msg.is_staff ? 'Staff' : (mine ? 'Tu' : 'Utilizador')} · ${relativeDate(msg.created_at)}</div>`;
      target.appendChild(el);
      target.scrollTop = target.scrollHeight;
    }).subscribe();
  if (staffMode) state.staffChannel = channel; else state.ticketChannel = channel;
}

function closeTicketDrawer() {
  $('#ticketDrawer').classList.add('is-hidden');
  $('#ticketDrawer').setAttribute('aria-hidden', 'true');
  setDrawerLock(false);
  if (state.ticketChannel && state.supabase) state.supabase.removeChannel(state.ticketChannel);
  state.ticketChannel = null;
}

async function sendTicketMessage(input, ticketId, isStaff, buttonForm) {
  const message = input.value.trim();
  if (!message || !state.supabase || !state.session) return;
  buttonForm.classList.add('loading');
  const { error } = await state.supabase.from('ticket_messages').insert({
    ticket_id: ticketId,
    sender_id: state.session.user.id,
    message,
    is_staff: Boolean(isStaff)
  });
  buttonForm.classList.remove('loading');
  if (error) {
    showToast(error.message, 'error');
    return;
  }
  input.value = '';
  await state.supabase.from('tickets').update({
    status: isStaff ? 'waiting' : 'open',
    updated_at: new Date().toISOString()
  }).eq('id', ticketId);
}

async function loadStaffTickets() {
  if (!state.supabase || !['staff','owner'].includes(state.profile?.role)) return;
  const { data, error } = await state.supabase
    .from('tickets')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) {
    $('#staffTicketsView').innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }
  renderStaffTickets(data || []);
  renderStaffDashboard(data || []);
}

function renderStaffDashboard(tickets) {
  const open = tickets.filter(t => t.status === 'open').length;
  const waiting = tickets.filter(t => t.status === 'waiting').length;
  const closed = tickets.filter(t => t.status === 'closed').length;
  $('#staffDashboardView').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><small>Total</small><strong>${tickets.length}</strong></div>
      <div class="stat-card"><small>Abertos</small><strong>${open}</strong></div>
      <div class="stat-card"><small>À espera</small><strong>${waiting}</strong></div>
    </div>
    <div class="staff-table">
      <div class="staff-row"><div><strong>Acesso</strong><span>${escapeHtml(userName())} · ${escapeHtml(state.profile?.role || '')}</span></div><span class="ticket-tag open">Seguro</span></div>
      <div class="staff-row"><div><strong>Tickets fechados</strong><span>Histórico disponível na vista de tickets</span></div><strong>${closed}</strong></div>
    </div>
  `;
}

function renderStaffTickets(tickets) {
  $('#staffTicketsView').innerHTML = tickets.length ? `
    <div class="staff-table">
      ${tickets.map(ticket => `
        <div class="staff-row">
          <div><strong>${escapeHtml(ticket.subject)}</strong><span>${escapeHtml(ticket.product_name || 'Pedido geral')} · ${escapeHtml(ticketStatusLabel(ticket.status))} · ${relativeDate(ticket.updated_at || ticket.created_at)}</span></div>
          <button class="staff-open-btn" data-staff-ticket-id="${escapeHtml(ticket.id)}" type="button">Abrir</button>
        </div>
      `).join('')}
    </div>
  ` : `<div class="empty-state"><h3>Sem tickets</h3><p>Os tickets dos utilizadores aparecerão aqui.</p></div>`;
  $$('.staff-open-btn').forEach(btn => btn.addEventListener('click', () => openStaffTicket(btn.dataset.staffTicketId)));
}

async function openStaffDrawer() {
  if (!state.session) return openAuth();
  if (!['staff','owner'].includes(state.profile?.role)) {
    showToast('A tua conta não tem permissões de staff.', 'error');
    return;
  }
  $('#staffDrawer').classList.remove('is-hidden');
  $('#staffDrawer').setAttribute('aria-hidden', 'false');
  setDrawerLock(true);
  switchStaffView('dashboard');
  await loadStaffTickets();
}

function switchStaffView(view) {
  $$('.staff-tab').forEach(tab => tab.classList.toggle('is-active', tab.dataset.staffView === view));
  $('#staffDashboardView').classList.toggle('is-hidden', view !== 'dashboard');
  $('#staffTicketsView').classList.toggle('is-hidden', view !== 'tickets');
  $('#staffChatView').classList.add('is-hidden');
}

async function openStaffTicket(ticketId) {
  if (!state.supabase) return;
  const { data, error } = await state.supabase.from('tickets').select('*').eq('id', ticketId).single();
  if (error) return showToast(error.message, 'error');
  state.activeStaffTicket = data;
  $('#staffDashboardView').classList.add('is-hidden');
  $('#staffTicketsView').classList.add('is-hidden');
  $('#staffChatView').classList.remove('is-hidden');
  $('.staff-tabs').classList.add('is-hidden');
  renderActiveTicketMeta($('#staffActiveTicketMeta'), data, true);
  await loadTicketMessages(ticketId, $('#staffTicketMessages'), true);
  subscribeToTicket(ticketId, true);
}

function closeStaffDrawer() {
  $('#staffDrawer').classList.add('is-hidden');
  $('#staffDrawer').setAttribute('aria-hidden', 'true');
  setDrawerLock(false);
  if (state.staffChannel && state.supabase) state.supabase.removeChannel(state.staffChannel);
  state.staffChannel = null;
  $('.staff-tabs').classList.remove('is-hidden');
}

function bindEvents() {
  $('#accountBtn').addEventListener('click', openAccountPopover);
  $('#heroAccountBtn').addEventListener('click', () => state.session ? openAccountPopover() : openAuth());
  $('#popoverLoginBtn').addEventListener('click', () => { closeAccountPopover(); openAuth(); });
  $('#popoverTicketsBtn').addEventListener('click', () => { closeAccountPopover(); openTicketsDrawer(); });
  $('#openTicketsBtn').addEventListener('click', openTicketsDrawer);
  $('#openStaffBtn').addEventListener('click', openStaffDrawer);
  $('#logoutBtn').addEventListener('click', logout);
  $('#privacyBtn').addEventListener('click', openPrivacy);
  $('#closePrivacyBtn').addEventListener('click', closePrivacy);
  $('#cookieSettingsBtn').addEventListener('click', openCookieBanner);
  $('#cookieAcceptBtn').addEventListener('click', () => saveCookieChoice('all'));
  $('#cookieEssentialBtn').addEventListener('click', () => saveCookieChoice('essential'));
  $('#supportTicketBtn').addEventListener('click', () => createTicket());
  $('#newSupportTicketBtn').addEventListener('click', () => createTicket());
  $('#closeAuthBtn').addEventListener('click', closeAuth);
  $('#googleLoginBtn').addEventListener('click', loginGoogle);
  $('#emailForm').addEventListener('submit', e => { e.preventDefault(); sendOtp($('#emailInput').value); });
  $('#otpForm').addEventListener('submit', e => { e.preventDefault(); verifyOtp($('#otpInput').value); });
  $('#backToEmailBtn').addEventListener('click', () => { $('#authOtp').classList.add('is-hidden'); $('#authStart').classList.remove('is-hidden'); setAuthMessage(''); $('#emailInput').focus(); });
  $('#resendOtpBtn').addEventListener('click', () => state.otpCooldown <= 0 ? sendOtp(state.otpEmail) : setAuthMessage(`Espera mais ${state.otpCooldown}s antes de reenviar.`));
  $('#closeProductModalBtn').addEventListener('click', closeProductModal);
  $('#closeProductTextBtn').addEventListener('click', closeProductModal);
  $('#discussPriceBtn').addEventListener('click', () => { closeProductModal(); createTicket(state.currentProduct); });
  $('#closeTicketDrawerBtn').addEventListener('click', closeTicketDrawer);
  $('#backToTicketListBtn').addEventListener('click', openTicketsDrawer);
  $('#ticketMessageForm').addEventListener('submit', e => { e.preventDefault(); sendTicketMessage($('#ticketMessageInput'), state.activeTicket?.id, false, $('#ticketMessageForm')); });
  $('#closeStaffDrawerBtn').addEventListener('click', closeStaffDrawer);
  $('#backToStaffTicketsBtn').addEventListener('click', async () => { switchStaffView('tickets'); await loadStaffTickets(); });
  $('#staffMessageForm').addEventListener('submit', e => { e.preventDefault(); sendTicketMessage($('#staffMessageInput'), state.activeStaffTicket?.id, true, $('#staffMessageForm')); });
  $$('.staff-tab').forEach(tab => tab.addEventListener('click', async () => { switchStaffView(tab.dataset.staffView); if (tab.dataset.staffView === 'tickets') await loadStaffTickets(); }));
  $('#productSearch').addEventListener('input', e => { state.searchTerm = e.target.value; renderProducts(); });

  document.addEventListener('click', e => {
    if (!e.target.closest('#accountPopover') && !e.target.closest('#accountBtn')) closeAccountPopover();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeAccountPopover();
      if (!$('#productModal').classList.contains('is-hidden')) closeProductModal();
      if (!$('#privacyModal').classList.contains('is-hidden')) closePrivacy();
      if (!$('#ticketDrawer').classList.contains('is-hidden')) closeTicketDrawer();
      if (!$('#staffDrawer').classList.contains('is-hidden')) closeStaffDrawer();
    }
  });
}

async function initSupabase() {
  if (!isSupabaseConfigured()) {
    console.warn('[NELSTORE] Supabase ainda não configurado. O frontend abre em modo de demonstração.');
    return;
  }

  state.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'nelstore-auth'
    }
  });

  const { data } = await state.supabase.auth.getSession();
  state.session = data.session;
  if (state.session) await refreshProfile();
  updateAuthUI();

  state.supabase.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    if (session) await refreshProfile(); else { state.profile = null; updateAuthUI(); }
  });
}

async function init() {
  $('#currentYear').textContent = new Date().getFullYear();
  renderProducts();
  bindEvents();
  updateAuthUI();
  await initSupabase();

  if (!state.session) {
    setTimeout(openAuth, 280);
  }
  if (!state.cookieChoice) {
    setTimeout(openCookieBanner, 750);
  }
}

document.addEventListener('DOMContentLoaded', init);
