// Shared behaviour for every page. Each block only runs when its elements exist on the page.

// Reveal on scroll. Runs first so an error in a later block can never leave content hidden;
// .rv is only hidden when <html> has the js class (set in <head>).
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' }) : null;
document.querySelectorAll('.rv').forEach(el => io ? io.observe(el) : el.classList.add('in'));

// Customer-service channels are configurable in the admin console (prototype: stored in this browser).
// When a config exists, the floating button, footer links and request-page cards are rebuilt from it.
function contactHref(c) {
  const v = (c.value || '').trim();
  switch (c.type) {
    case 'telegram': { const u = v.replace(/^@/, ''); return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(u) ? 'https://t.me/' + u : ''; }
    case 'whatsapp': { const d = v.replace(/\D/g, ''); return d.length >= 8 && d.length <= 15 ? 'https://wa.me/' + d : ''; }
    case 'email': return /^[^\s@<>"]+@[^\s@<>"]+\.[A-Za-z]{2,}$/.test(v) ? 'mailto:' + v : '';
    case 'phone': { const d = v.replace(/[^\d+]/g, ''); return /^\+?\d{6,15}$/.test(d) ? 'tel:' + d : ''; }
    case 'line': return /^[\w.-]{3,40}$/.test(v) ? 'https://line.me/ti/p/~' + v : '';
    case 'link': return /^https:\/\/[^\s<>"]+$/.test(v) ? v : '';
    default: return '';
  }
}
function applyContactConfig() {
  let cfg = null;
  try { cfg = JSON.parse(localStorage.getItem('yz-contact-config') || 'null'); } catch (e) { cfg = null; }
  if (!cfg || !Array.isArray(cfg.channels)) return;
  const on = cfg.channels.filter(c => c.enabled && (c.type === 'wechat' || contactHref(c)));
  if (!on.length) return;
  const icons = {};
  document.querySelectorAll('.cw-ic').forEach(i => { ['tg', 'wa', 'wx'].forEach(k => { if (i.classList.contains(k) && !icons[k]) icons[k] = i.innerHTML; }); });
  const iconKey = { telegram: 'tg', whatsapp: 'wa', wechat: 'wx' };
  const mkIcon = c => {
    const s = document.createElement('span'); s.className = 'cw-ic ' + (iconKey[c.type] || 'other');
    if (icons[iconKey[c.type]]) s.innerHTML = icons[iconKey[c.type]]; // our own static SVG markup, not user input
    else { s.textContent = (c.label || '?').slice(0, 1); s.style.background = 'var(--ink)'; }
    return s;
  };
  const mkLink = (c, cls, inner) => {
    const el = c.type === 'wechat' ? document.createElement('button') : document.createElement('a');
    el.className = cls;
    if (c.type === 'wechat') { el.type = 'button'; el.setAttribute('data-wechat', ''); }
    else { el.href = contactHref(c); el.target = '_blank'; el.rel = 'noopener'; }
    el.append(...inner); return el;
  };
  const sub = c => c.type === 'wechat' ? '扫码添加客服' : c.value;
  const menu = document.getElementById('cw-menu');
  if (menu) {
    menu.querySelectorAll('.cw-item').forEach(x => x.remove());
    const note = menu.querySelector('.cw-note'); if (note) note.remove();
    on.forEach(c => {
      const txt = document.createElement('span'), b = document.createElement('b'), sm = document.createElement('small');
      b.textContent = c.label; sm.textContent = sub(c); txt.append(b, sm);
      menu.append(mkLink(c, 'cw-item', [mkIcon(c), txt]));
    });
    const def = on.find(c => c.default) || on[0];
    const main = document.querySelector('.cw-main');
    if (main) {
      const label = document.createElement('span'); label.textContent = def.label + ' 咨询';
      const icon = mkIcon(def); icon.className = ''; icon.style.cssText = 'display:inline-grid;place-items:center';
      const nm = mkLink(def, 'cw-main', [icon, label]); nm.setAttribute('aria-label', def.label + ' 咨询');
      main.replaceWith(nm);
    }
  }
  const foot = document.querySelector('.foot-ct');
  if (foot) {
    foot.textContent = '联系我们：';
    on.forEach(c => { const t = document.createElement('span'); t.textContent = c.label; foot.append(mkLink(c, '', [t])); });
  }
  const cards = document.querySelector('.ct-cards');
  if (cards) {
    cards.textContent = '';
    on.forEach(c => { const b = document.createElement('b'), sm = document.createElement('small'); b.textContent = c.label; sm.textContent = c.type === 'wechat' ? '点击显示二维码' : sub(c); cards.append(mkLink(c, 'ct-card' + (c.default ? ' main' : ''), [mkIcon(c), b, sm])); });
  }
  const wxc = on.find(c => c.type === 'wechat'), wxd = document.getElementById('wx-dialog');
  if (wxd && wxc) {
    wxd.querySelector('.wx-in b').textContent = wxc.value;
    wxd.querySelector('[data-copy]').dataset.copy = wxc.value;
    if (typeof cfg.qr === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(cfg.qr)) wxd.querySelector('img').src = cfg.qr;
  }
}
applyContactConfig();
// Site-wide announcement set in the admin console
function applyAnnouncement() {
  let msg = '';
  try { msg = (JSON.parse(localStorage.getItem('yz-settings') || '{}').announce || '').trim(); } catch (e) { msg = ''; }
  let bar = document.querySelector('.announce');
  if (!msg) { if (bar) bar.hidden = true; return; }
  if (!bar) { bar = document.createElement('div'); bar.className = 'announce'; bar.setAttribute('role', 'status'); document.body.prepend(bar); }
  bar.textContent = msg; bar.hidden = false;
}
applyAnnouncement();

// Contact: floating widget (Telegram first), WeChat QR dialog, copy WeChat ID
const cw = document.getElementById('cw');
if (cw) {
  const more = cw.querySelector('.cw-more'), menu = document.getElementById('cw-menu');
  const setOpen = open => { menu.hidden = !open; more.setAttribute('aria-expanded', open); };
  more.addEventListener('click', () => setOpen(menu.hidden));
  document.addEventListener('click', e => { if (!cw.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); more.focus(); } });
}
const wx = document.getElementById('wx-dialog');
if (wx) {
  document.addEventListener('click', e => { if (e.target.closest('[data-wechat]')) wx.showModal(); });
  wx.querySelector('[data-close]').addEventListener('click', () => wx.close());
  wx.addEventListener('click', e => { if (e.target === wx) wx.close(); });
  wx.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = '已复制'; }
    catch (err) { b.textContent = '请长按微信号复制'; }
  }));
}

// Contact field in forms: Telegram by default, WeChat or WhatsApp optional; each has its own format check
const CT = {
  tg: { ph: '@你的 Telegram 用户名', mode: 'text', re: /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/, err: 'Telegram 用户名是 5–32 位字母、数字或下划线，以字母开头。' },
  wx: { ph: '你的微信号', mode: 'text', re: /^[A-Za-z][-_A-Za-z0-9]{5,19}$/, err: '微信号是 6–20 位，以字母开头，可以包含字母、数字、下划线和减号。' },
  wa: { ph: '带国家区号的手机号，例如 +86 138 0000 0000', mode: 'tel', re: /^\+?[0-9][0-9 -]{6,18}[0-9]$/, err: '请填写带国家区号的 WhatsApp 手机号，例如 +86 138 0000 0000。' },
};
const ctMethod = fs => CT[fs.querySelector('[name=ct]:checked').value];
document.querySelectorAll('[data-contact]').forEach(fs => {
  const input = fs.querySelector('[name=contact]');
  const sync = () => { const m = ctMethod(fs); input.placeholder = m.ph; input.inputMode = m.mode; };
  fs.addEventListener('change', sync); sync();
});
// Returns an error message, or '' when the contact is filled in correctly
function contactError(form) {
  const fs = form.querySelector('[data-contact]');
  if (!fs) return '';
  const v = form.contact.value.trim(), m = ctMethod(fs);
  if (!v) return '请留下联系方式。';
  return m.re.test(v) ? '' : m.err;
}

// Demo login: the "account" lives in this browser only (localStorage). There is no real account
// system in the prototype; nothing is verified or sent anywhere.
const AUTH_KEY = 'yz-demo-user';
const getUser = () => { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (e) { return null; } };
const setUser = u => { try { u ? localStorage.setItem(AUTH_KEY, JSON.stringify(u)) : localStorage.removeItem(AUTH_KEY); } catch (e) { /* storage blocked */ } };
const here = () => (location.pathname.split('/').pop() || 'index.html') + location.search;
const loginUrl = () => 'login.html?next=' + encodeURIComponent(here());
function renderAuth() {
  const u = getUser();
  document.querySelectorAll('[data-auth-in]').forEach(el => { el.hidden = !u; });
  document.querySelectorAll('[data-auth-out]').forEach(el => { el.hidden = !!u; });
  if (u) {
    document.querySelectorAll('[data-user-name]').forEach(el => { el.textContent = u.name; });
    document.querySelectorAll('[data-user-initial]').forEach(el => { el.textContent = u.name.slice(0, 1).toUpperCase(); });
    document.querySelectorAll('[data-user-bio]').forEach(el => { el.textContent = u.bio || ''; });
  }
}
renderAuth();
// Shows "请先登录" with a link back to this page after login; returns true when the user must log in first
function needLogin(msgEl) {
  if (getUser()) return false;
  msgEl.textContent = '请先登录，再提交。';
  const a = document.createElement('a');
  a.className = 'link'; a.href = loginUrl(); a.textContent = '去登录 →';
  msgEl.append(' ', a);
  return true;
}

// Messages. Prototype only: threads live in this browser (localStorage) and are never delivered.
// The demo inbox is seeded on the messages page; elsewhere the nav badge falls back to data-default.
const MSG_KEY = 'yz-demo-msgs';
const msgStore = () => { try { return JSON.parse(localStorage.getItem(MSG_KEY) || 'null') || { seeded: false, threads: [] }; } catch (e) { return { seeded: false, threads: [] }; } };
const msgSave = st => { try { localStorage.setItem(MSG_KEY, JSON.stringify(st)); } catch (e) { /* storage blocked */ } };
const threadId = (to, device) => to === 'system' ? 'system' : `${to}-${device || 'none'}`;
const nowStamp = () => { const d = new Date(), z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`; };
function msgUnread() {
  const st = msgStore();
  const own = st.threads.reduce((n, t) => n + (t.unread || 0), 0);
  if (st.seeded) return own;
  const badge = document.querySelector('[data-unread]');
  return own + Number(badge ? badge.dataset.default : 0);
}
function renderUnread() {
  const n = msgUnread();
  document.querySelectorAll('[data-unread]').forEach(b => { b.textContent = n > 9 ? '9+' : n; b.hidden = !n; });
  document.querySelectorAll('[data-unread-num]').forEach(b => { b.textContent = n; });
}
// Append my message to the thread with a user about a device (creates the thread if needed)
function msgAppend(to, device, text) {
  const st = msgStore(), id = threadId(to, device);
  let t = st.threads.find(x => x.id === id);
  if (!t) { t = { id, with: to, device, unread: 0, messages: [] }; st.threads.push(t); }
  t.messages.push({ from: 'me', time: nowStamp(), text });
  msgSave(st);
}
if (getUser()) renderUnread();

// Login page: email + code (demo code 123456) or Telegram (demo). Redirects back to ?next= when it is a page of this site.
const lf = document.getElementById('login-form');
if (lf) {
  const next = new URLSearchParams(location.search).get('next');
  const target = next && /^[a-z0-9-]+\.html(\?[A-Za-z0-9=&%._-]*)?$/i.test(next) ? next : 'console.html';
  const ok = lf.querySelector('.ok'), hint = document.getElementById('code-hint'), send = document.getElementById('send-code');
  const done = u => { setUser(u); location.href = target; };
  send.addEventListener('click', () => {
    if (!lf.email.checkValidity() || !lf.email.value) { hint.textContent = '请先填写正确的邮箱。'; lf.email.focus(); return; }
    hint.textContent = '原型演示：验证码没有真的发出，请输入 123456。';
    let left = 60; send.disabled = true; send.textContent = `${left} 秒后重发`;
    const t = setInterval(() => { left -= 1; send.textContent = `${left} 秒后重发`; if (!left) { clearInterval(t); send.disabled = false; send.textContent = '重新发送'; } }, 1000);
    lf.code.focus();
  });
  lf.addEventListener('submit', e => {
    e.preventDefault();
    if (!lf.email.checkValidity() || !lf.email.value) { ok.textContent = '请填写正确的邮箱。'; lf.email.focus(); return; }
    if (lf.code.value.trim() !== '123456') { ok.textContent = '验证码不对（演示环境固定为 123456）。'; lf.code.focus(); return; }
    done({ name: lf.email.value.split('@')[0].slice(0, 20), email: lf.email.value, via: 'email' });
  });
  document.getElementById('tg-login').addEventListener('click', () => done({ name: 'Telegram 用户', email: '', via: 'telegram' }));
  if (getUser()) ok.textContent = `你已经以「${getUser().name}」登录，重新登录会替换当前账号。`;
}

// Console: account settings, logout, demo-only buttons, jump links between tabs
const acct = document.getElementById('acct-form');
if (acct && getUser()) {
  const u = getUser(), ok = acct.querySelector('.ok');
  acct.name.value = u.name; acct.email.value = u.email || '（通过 Telegram 登录）';
  acct.bio.value = u.bio || ''; acct.city.value = u.city || '';
  const count = document.getElementById('bio-count');
  const syncCount = () => { count.textContent = `${acct.bio.value.length} / 200`; };
  acct.bio.addEventListener('input', syncCount); syncCount();
  acct.addEventListener('submit', e => {
    e.preventDefault();
    const name = acct.name.value.trim();
    if (!name) { ok.textContent = '昵称不能为空。'; acct.name.focus(); return; }
    const ce = contactError(acct);
    if (ce) { ok.textContent = ce; acct.contact.focus(); return; }
    setUser({ ...u, name, bio: acct.bio.value.trim(), city: acct.city.value.trim() }); renderAuth();
    ok.textContent = '已保存（只保存在这台浏览器里）。';
  });
  document.getElementById('logout').addEventListener('click', () => { setUser(null); location.href = 'index.html'; });
}
document.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => {
  document.getElementById('demo-msg').textContent = `原型演示：「${b.dataset.demo}」需要后端，暂未实现。`;
}));
document.querySelectorAll('[data-tab-jump]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault(); const tab = document.getElementById(a.dataset.tabJump); tab.click(); tab.focus();
  tab.closest('.tabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
}));

// Sticky nav border + mobile menu
const nav = document.getElementById('nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 8), { passive: true });
const menu = document.querySelector('.menu'), links = document.getElementById('navlinks');
menu.addEventListener('click', () => menu.setAttribute('aria-expanded', links.classList.toggle('open')));
links.addEventListener('click', e => { if (e.target.closest('a')) { links.classList.remove('open'); menu.setAttribute('aria-expanded', false); } });

// Live clocks (Beijing and Kuala Lumpur share UTC+8)
function tick() {
  document.querySelectorAll('[data-tz]').forEach(el => {
    el.textContent = new Intl.DateTimeFormat('zh-CN', { timeZone: el.dataset.tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  });
}
tick(); setInterval(tick, 15000);

// Task tabs with arrow-key support
document.querySelectorAll('.tabs[role=tablist]').forEach(list => {
  const tabs = [...list.querySelectorAll('[role=tab]')];
  const select = t => tabs.forEach(b => {
    const on = b === t;
    b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1;
    document.getElementById(b.getAttribute('aria-controls')).hidden = !on;
  });
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { const n = tabs[(i + d + tabs.length) % tabs.length]; select(n); n.focus(); }
    });
  });
});

// Market and wanted-board filters: each .seg[data-key] narrows [data-item] by the matching data attribute
const mkRows = [...document.querySelectorAll('[data-filterable] [data-item]')];
const picked = {};
document.querySelectorAll('.seg[data-key]').forEach(seg => {
  const buttons = seg.querySelectorAll('button');
  picked[seg.dataset.key] = seg.querySelector('[aria-pressed="true"]').dataset.v;
  buttons.forEach(b => b.addEventListener('click', () => {
    buttons.forEach(x => x.setAttribute('aria-pressed', x === b));
    picked[seg.dataset.key] = b.dataset.v;
    let shown = 0;
    mkRows.forEach(r => {
      const ok = Object.entries(picked).every(([k, v]) => v === 'all' || r.dataset[k] === v);
      r.hidden = !ok; shown += ok;
    });
    document.getElementById('mk-count').textContent = shown;
    document.getElementById('mk-empty').hidden = shown > 0;
  }));
});

// Request form: intent toggle (also from ?type=), relabelled fields, prototype submit (no network request)
const rf = document.getElementById('rf');
if (rf) {
  const labels = { want: '提交求租', lend: '提交出租信息', host: '提交托管申请' };
  const toggles = rf.querySelectorAll('.ftabs button'), submit = rf.querySelector('[type=submit]');
  const cap = k => k[0].toUpperCase() + k.slice(1);
  let intent = 'want';
  const setIntent = k => {
    intent = k;
    toggles.forEach(b => b.setAttribute('aria-pressed', b.dataset.k === k));
    submit.textContent = labels[k];
    rf.querySelectorAll('[data-want]').forEach(el => { el.textContent = el.dataset[k]; });
    rf.querySelectorAll('[data-ph-want]').forEach(el => { el.placeholder = el.dataset['ph' + cap(k)]; });
    document.querySelectorAll('[data-for]').forEach(el => { el.hidden = el.dataset.for !== k; });
  };
  toggles.forEach(b => b.addEventListener('click', () => setIntent(b.dataset.k)));
  const q = new URLSearchParams(location.search).get('type');
  // 发布出租 has its own page; only replies to a wanted post (?for=) still use this form
  if (q === 'lend' && !new URLSearchParams(location.search).get('for')) location.replace('lend.html');
  // 托管出租 devices are set up by the platform in the admin console; applicants contact support instead
  if (q === 'host') location.replace('host.html#apply');
  if (labels[q]) setIntent(q);
  // Quoting on a wanted post: ?for=W-1031. Only a strict id pattern is accepted, and it is set as text.
  const forId = new URLSearchParams(location.search).get('for'), replyTo = document.getElementById('reply-to');
  if (replyTo && forId && /^W-\d{4}$/.test(forId)) {
    replyTo.textContent = `正在回复求租 ${forId}：填写你能提供的设备和报价，平台会转给求租方。`;
    replyTo.hidden = false;
  }
  rf.addEventListener('submit', e => {
    e.preventDefault();
    const ok = rf.querySelector('.ok');
    if (needLogin(ok)) return;
    const ce = contactError(rf);
    if (ce) { ok.textContent = ce; rf.contact.focus(); return; }
    ok.textContent = intent === 'want'
      ? '已收到（原型演示，未实际发送）。审核通过后会显示在求租广场，我们也会在 24 小时内联系你。'
      : '已收到（原型演示，未实际发送）。我们会在 24 小时内联系你。';
    rf.reset();
    rf.querySelector('[data-contact]').dispatchEvent(new Event('change'));
  });
}

// FAQ categories with arrow-key support; faq.html#pay opens that category
const fTabs = [...document.querySelectorAll('.faq-nav [role=tab]')];
function pickCat(t) {
  fTabs.forEach(b => { const on = b === t; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
  document.querySelectorAll('.faq-group').forEach(g => g.hidden = g.dataset.cat !== t.dataset.cat);
}
fTabs.forEach((t, i) => {
  t.addEventListener('click', () => pickCat(t));
  t.addEventListener('keydown', e => {
    const d = ['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : ['ArrowUp', 'ArrowLeft'].includes(e.key) ? -1 : 0;
    if (d) { e.preventDefault(); const n = fTabs[(i + d + fTabs.length) % fTabs.length]; pickCat(n); n.focus(); }
  });
});
const fromHash = fTabs.find(t => '#' + t.dataset.cat === location.hash);
if (fromHash) pickCat(fromHash);

// Device pages (platform-sold devices): term → total price. The card's data-mode decides the next step:
// "order" opens 确认订单, "reserve" opens 预约 for a device that is not free yet. Nothing is paid or sent.
const order = document.getElementById('order-form');
if (order) {
  const price = Number(order.dataset.price), total = document.getElementById('o-total');
  const update = () => { total.textContent = '¥' + (price * Number(order.term.value)).toLocaleString('zh-CN'); };
  order.addEventListener('change', update); update();

  const reserve = order.dataset.mode === 'reserve';
  const dlg = document.getElementById(reserve ? 'reserve-dialog' : 'order-dialog');
  const df = dlg.querySelector('form'), dfOk = df.querySelector('.ok');
  const fill = (k, v) => dlg.querySelectorAll(`[data-fill="${k}"]`).forEach(el => { el.textContent = v; });
  order.addEventListener('submit', e => {
    e.preventDefault();
    if (!getUser()) { location.href = loginUrl(); return; }
    fill('name', order.dataset.name); fill('meta', order.dataset.meta);
    fill('term', `${order.term.value} 个月`); fill('total', total.textContent);
    dfOk.textContent = '';
    dlg.showModal();
  });
  dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => dlg.close()));
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); }); // click on the backdrop

  if (reserve) {
    df.addEventListener('submit', e => {
      e.preventDefault();
      if (!df.date.value || df.date.value < order.dataset.avail) { dfOk.textContent = `开始日期不能早于 ${order.dataset.avail}。`; df.date.focus(); return; }
      if (!df.email.checkValidity()) { dfOk.textContent = '请填写正确的通知邮箱。'; df.email.focus(); return; }
      if (contactError(df)) { dfOk.textContent = contactError(df); df.contact.focus(); return; }
      if (!df.ack.checked) { dfOk.textContent = '请先勾选确认预约规则。'; df.ack.focus(); return; }
      dfOk.textContent = `原型演示，未提交：预约从 ${df.date.value} 开始，${order.term.value} 个月。正式上线后，设备可用时会发邮件通知你付款。`;
    });
  } else {
    const dateField = df.querySelector('[data-start-date]');
    df.addEventListener('change', () => { dateField.hidden = df.start.value !== 'date'; });
    df.addEventListener('submit', e => {
      e.preventDefault();
      if (df.start.value === 'date' && !df.date.value) { dfOk.textContent = '请选择开始日期。'; df.date.focus(); return; }
      if (!df.email.checkValidity()) { dfOk.textContent = '请填写正确的交付邮箱。'; df.email.focus(); return; }
      if (contactError(df)) { dfOk.textContent = contactError(df); df.contact.focus(); return; }
      if (!df.ack.checked) { dfOk.textContent = '请先勾选确认服务约定和使用规则。'; df.ack.focus(); return; }
      const pre = [...df.querySelectorAll('[name=pre]:checked')].map(c => c.value);
      dfOk.textContent = `原型演示，未创建订单：${order.term.value} 个月，合计 ${total.textContent}` +
        (pre.length ? `，预装 ${pre.join('、')}` : '') + '。正式上线后会跳到付款页。';
    });
  }
}

// Network page: typing demo, remote echo delayed by the chosen round trip, mosh echo immediate
const lagInput = document.getElementById('lag-input');
if (lagInput) {
  let lagMs = 85;
  const remote = document.getElementById('lag-remote'), local = document.getElementById('lag-local');
  const lagButtons = document.querySelectorAll('#lag [data-ms]');
  lagButtons.forEach(b => b.addEventListener('click', () => {
    lagButtons.forEach(x => x.setAttribute('aria-pressed', x === b));
    lagMs = Number(b.dataset.ms);
  }));
  lagInput.addEventListener('input', () => {
    const v = lagInput.value;
    local.textContent = v;
    setTimeout(() => { remote.textContent = v; }, lagMs);
  });
}

// 托管出租 page: earnings estimate = price − fixed monthly service fee (example figure, not a commitment).
const calc = document.getElementById('calc-form');
if (calc) {
  const yuan = n => '¥' + Math.round(n).toLocaleString('zh-CN');
  const fee = Number(calc.dataset.fee);
  const update = () => {
    const price = Number(calc.price.value), months = Number(calc.months.value);
    const perMonth = Math.max(0, price - fee);
    document.getElementById('c-months').textContent = months;
    document.getElementById('c-month').textContent = yuan(perMonth);
    document.getElementById('c-year').textContent = yuan(perMonth * months);
    document.getElementById('c-rate').textContent =
      `租客月付 ${yuan(price)} − 服务费 ${yuan(fee)}，约占 ${Math.round(perMonth * 100 / price)}%`;
  };
  calc.addEventListener('input', update); update();
}

// Device pages (market-host devices): 申请租用 (data-kind="apply") or 预约 (data-kind="reserve").
// Composes the first message to the host live, keeps a draft in this browser (best effort: storage
// can be unavailable), and never sends anything in the prototype.
document.querySelectorAll('form[data-inquiry]').forEach(form => {
  const preview = document.getElementById(form.id + '-preview');
  const dateField = form.querySelector('[data-when-date]');
  const ok = form.querySelector('.ok');
  const key = 'inq-draft:' + location.pathname + '#' + form.id;
  const fields = ['date', 'term', 'use', 'q'];
  const compose = () => {
    const when = form.when.value;
    const kind = form.dataset.kind;
    const start = when === 'asap' ? (kind === 'reserve' ? '空出来就开始' : '尽快开始') : when === 'tbd' ? '开始日期待定' : form.date.value ? `从 ${form.date.value} 开始` : '从〔日期〕开始';
    const term = form.term.value.trim() || '〔时长〕', use = form.use.value.trim() || '〔用途〕';
    const verb = kind === 'reserve' ? '我想预约这台，' : '我想租用这台，';
    preview.textContent = `${verb}计划${start}，租用约 ${term}，用于${use}。\n${form.q.value.trim()}`;
    dateField.hidden = when !== 'date';
  };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved) {
      fields.forEach(f => { if (typeof saved[f] === 'string') form[f].value = saved[f]; });
      const radio = form.querySelector(`[name=when][value="${saved.when}"]`);
      if (radio) radio.checked = true;
    }
  } catch (e) { /* storage blocked: start empty */ }
  form.addEventListener('input', () => {
    compose();
    try {
      const draft = { when: form.when.value };
      fields.forEach(f => { draft[f] = form[f].value; });
      localStorage.setItem(key, JSON.stringify(draft));
    } catch (e) { /* storage blocked: draft just isn't kept */ }
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (needLogin(ok)) return;
    if (form.when.value === 'date' && !form.date.value) { ok.textContent = '请选择开始日期。'; form.date.focus(); return; }
    if (contactError(form)) { ok.textContent = contactError(form); form.contact.focus(); return; }
    if (form.ack && !form.ack.checked) { ok.textContent = '请先勾选确认，了解平台和房东各自负责什么。'; form.ack.focus(); return; }
    if (form.dataset.host) {
      msgAppend(form.dataset.host, form.dataset.device, preview.textContent);
      const link = document.createElement('a'); link.className = 'link'; link.textContent = '在消息里查看 →';
      link.href = `messages.html?to=${form.dataset.host}&device=${form.dataset.device}`;
      setTimeout(() => ok.append(' ', link), 0);
    }
    ok.textContent = form.dataset.kind === 'reserve'
      ? '原型演示，未实际发送。正式上线后会先请你用邮箱验证码登录，再把预约发给房东；房东确认后会通知你。'
      : '原型演示，未实际发送。正式上线后会先请你用邮箱验证码登录，再把租用申请发给房东；房东确认后你会收到付款链接。';
  });
  compose();
});

// Report a listing or a user: needs login; saved locally and listed in the console's 举报 tab (prototype only)
const REPORTS_KEY = 'yz-demo-reports';
const getReports = () => { try { return JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]'); } catch (e) { return []; } };
const reportBtn = document.querySelector('[data-report]');
if (reportBtn) {
  const dlg = document.getElementById('report-dialog'), rp = document.getElementById('rp-form'), ok = rp.querySelector('.ok');
  reportBtn.addEventListener('click', () => {
    if (!getUser()) { location.href = loginUrl(); return; }
    dlg.querySelector('[data-fill="target"]').textContent = reportBtn.dataset.target;
    dlg.querySelector('[data-fill="kind"]').textContent = '举报对象：' + reportBtn.dataset.kind;
    ok.textContent = ''; dlg.showModal();
  });
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  rp.addEventListener('submit', e => {
    e.preventDefault();
    const detail = rp.detail.value.trim(), order = rp.order.value.trim();
    if (detail.length < 10) { ok.textContent = '请把情况写具体一些（至少 10 个字）。'; rp.detail.focus(); return; }
    if (order && !/^YZ-\d{8}-\d{4}$/.test(order)) { ok.textContent = '订单号格式是 YZ-20261012-0041，可以在控制台的订单里找到。'; rp.order.focus(); return; }
    if (!rp.ack.checked) { ok.textContent = '请先勾选确认。'; rp.ack.focus(); return; }
    const item = { id: 'R-' + Date.now().toString().slice(-6), target: reportBtn.dataset.target, kind: reportBtn.dataset.kind,
      href: reportBtn.dataset.href, reason: rp.querySelector('[name=reason]:checked + span').textContent, detail, order,
      time: new Date().toLocaleString('zh-CN', { hour12: false }), status: '待处理' };
    try { localStorage.setItem(REPORTS_KEY, JSON.stringify([item, ...getReports()].slice(0, 50))); } catch (err) { /* storage blocked */ }
    rp.reset();
    ok.textContent = `已提交举报 ${item.id}（原型演示，只保存在这台浏览器）。`;
    const a = document.createElement('a'); a.className = 'link'; a.href = 'console.html#reports'; a.textContent = '在控制台查看进度 →';
    ok.append(' ', a);
    document.getElementById('report-msg').textContent = `你已举报过这条（${item.id}，${item.status}）。`;
  });
}

// Messages page: conversation list + thread, Enter to send, warning on off-platform contact/payment
const msgApp = document.getElementById('msg-app');
if (msgApp && getUser()) {
  const people = JSON.parse(document.getElementById('msg-people').textContent);
  const devices = JSON.parse(document.getElementById('msg-devices').textContent);
  const st = msgStore();
  if (!st.seeded) {
    JSON.parse(document.getElementById('msg-seed').textContent).forEach(seedT => {
      const own = st.threads.find(t => t.id === seedT.id);
      if (own) { own.messages = [...seedT.messages, ...own.messages]; own.unread = (own.unread || 0) + seedT.unread; }
      else st.threads.push(seedT);
    });
    st.seeded = true; msgSave(st);
  }
  const list = document.getElementById('msg-threads'), log = document.getElementById('msg-log');
  const thread = document.getElementById('msg-thread'), empty = document.getElementById('msg-empty');
  const form = document.getElementById('msg-form'), text = document.getElementById('msg-text'), warn = document.getElementById('msg-warn');
  const OFFSITE = /(微信|vx|wx|weixin|v信|加我|电话|手机号|1[3-9]\d{9}|支付宝|转账|私下|线下付|telegram|whatsapp|t\.me|wa\.me)/i;
  let current = null;
  const lastTime = t => (t.messages[t.messages.length - 1] || { time: '' }).time;
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };

  function renderList() {
    const s2 = msgStore();
    list.textContent = '';
    s2.threads.slice().sort((a, b) => lastTime(b).localeCompare(lastTime(a))).forEach(t => {
      const p = people[t.with], last = t.messages[t.messages.length - 1];
      const li = el('li'), b = el('button', 'msg-item'); b.type = 'button';
      if (current === t.id) b.setAttribute('aria-current', 'true');
      const av = el('span', 'host-av' + (t.with === 'system' ? ' sys' : ''), p.av); av.setAttribute('aria-hidden', 'true');
      const name = el('b', '', p.name + (t.device ? ' · ' + devices[t.device].name : ''));
      const time = el('time', '', last ? last.time.slice(5, 10) : '');
      const lastTxt = el('span', 'last', last ? (last.from === 'me' ? '我：' : '') + last.text : '还没有消息');
      b.append(av, name, time, lastTxt);
      if (t.unread) { const u = el('span', 'unread', t.unread); u.setAttribute('aria-label', t.unread + ' 条未读'); b.append(u); }
      b.addEventListener('click', () => open(t.id));
      li.append(b); list.append(li);
    });
  }
  function open(id) {
    const s2 = msgStore(), t = s2.threads.find(x => x.id === id);
    if (!t) return;
    current = id; t.unread = 0; msgSave(s2);
    const p = people[t.with];
    document.getElementById('msg-av').textContent = p.av;
    const nameEl = document.getElementById('msg-name'); nameEl.textContent = p.name;
    if (p.href) nameEl.href = p.href; else nameEl.removeAttribute('href');
    const about = document.getElementById('msg-about'); about.textContent = '';
    if (t.device) { about.append('关于 '); const a = el('a', 'link', devices[t.device].name); a.href = devices[t.device].href; about.append(a); }
    else if (t.with === 'system') about.textContent = '订单、预约、结算和举报的进度通知，不能回复';
    log.textContent = '';
    if (!t.messages.length) {
      const li = el('li', 'sys'); li.append(el('span', 'b', '还没有消息。不要在消息里交换联系方式或私下付款，付款请走平台。')); log.append(li);
    }
    t.messages.forEach(m => {
      const li = el('li', t.with === 'system' ? 'sys' : (m.from === 'me' ? 'me' : 'them'));
      li.append(el('span', 'b', m.text), el('time', '', m.time)); log.append(li);
    });
    form.hidden = t.with === 'system';
    warn.hidden = true; delete form.dataset.warned;
    empty.hidden = true; thread.hidden = false; msgApp.classList.add('open');
    log.scrollTop = log.scrollHeight;
    renderList(); renderUnread();
    if (!form.hidden) text.focus();
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = text.value.trim();
    if (!v || !current) return;
    if (OFFSITE.test(v) && !form.dataset.warned) { warn.hidden = false; form.dataset.warned = '1'; return; }
    const s2 = msgStore(), t = s2.threads.find(x => x.id === current);
    if (!t || t.with === 'system') return; // platform notifications are read-only
    t.messages.push({ from: 'me', time: nowStamp(), text: v }); msgSave(s2);
    text.value = ''; open(current);
  });
  text.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
  text.addEventListener('input', () => { if (!warn.hidden && !OFFSITE.test(text.value)) { warn.hidden = true; delete form.dataset.warned; } });
  document.getElementById('msg-back').addEventListener('click', () => { msgApp.classList.remove('open'); current = null; renderList(); });

  // ?to=wei&device=linux opens (or starts) that conversation; only known people and devices are accepted
  const q = new URLSearchParams(location.search), to = q.get('to'), dev = q.get('device');
  if (to && people[to] && to !== 'system' && (!dev || devices[dev])) {
    const s2 = msgStore(), id = threadId(to, dev);
    if (!s2.threads.find(x => x.id === id)) { s2.threads.push({ id, with: to, device: dev || null, unread: 0, messages: [] }); msgSave(s2); }
    renderList(); open(id);
  } else renderList();
}

// 发布出租 wizard: 6 steps with per-step checks, contact info blocked in public text, live preview,
// draft kept in this browser, login required to submit. Nothing is sent in the prototype.
const lend = document.getElementById('lend');
if (lend) {
  const panels = [...lend.querySelectorAll('[data-step-panel]')], stepBtns = [...lend.querySelectorAll('[data-step]')];
  const prev = lend.querySelector('[data-prev]'), next = lend.querySelector('[data-next]'), submit = lend.querySelector('[type=submit]');
  const ok = lend.querySelector('.ok'), saved = document.getElementById('lend-saved');
  const DRAFT = 'lend-draft';
  const CONTACT_RE = /(微信|vx|wx|weixin|v信|qq|电话|手机|1[3-9]\d{9}|\+?\d[\d -]{7,}\d|@|t\.me|wa\.me|telegram|whatsapp|https?:\/\/|www\.|路\d|号楼|单元)/i;
  let step = 0;
  const val = n => { const els = lend.querySelectorAll(`[name="${n}"]`); if (els[0] && els[0].type === 'radio') { const c = lend.querySelector(`[name="${n}"]:checked`); return c ? c.value : ''; } return els[0] ? els[0].value.trim() : ''; };
  const many = n => [...lend.querySelectorAll(`[name="${n}"]:checked`)].map(x => x.value);
  function stepError(i) {
    lend.querySelectorAll('.field-err').forEach(e => e.classList.remove('field-err'));
    const panel = panels[i];
    for (const el of panel.querySelectorAll('[required]')) {
      const bad = el.type === 'checkbox' ? !el.checked : (!el.value.trim() || !el.checkValidity());
      if (bad) { el.classList.add('field-err'); el.focus(); return el.type === 'checkbox' ? '请先勾选确认。' : `请填写「${el.closest('label').firstChild.textContent.trim()}」。`; }
    }
    for (const n of ['title', 'intro', 'limits', 'city']) {
      const el = panel.querySelector(`[name="${n}"]`);
      if (el && CONTACT_RE.test(el.value)) { el.classList.add('field-err'); el.focus(); return '公开内容里不能写手机号、微信、邮箱、网址或详细地址，沟通请走站内消息。'; }
    }
    if (i === 2 && !many('conn').length) return '至少选一种连接方式。';
    if (i === 5 && many('safe').length < 4) return '请先完成全部安全设置，并逐项勾选。';
    return '';
  }
  function preview() {
    const box = document.getElementById('lend-preview'); box.textContent = '';
    const row = document.createElement('div'); row.className = 'row';
    const left = document.createElement('div');
    const tags = document.createElement('span'); tags.className = 'src t'; tags.textContent = '个人直租';
    const h = document.createElement('h3'); h.textContent = val('title') || '（标题）';
    const cfg = document.createElement('p'); cfg.className = 'cfg';
    cfg.textContent = [val('cpu'), val('ram'), val('disk'), val('gpu'), val('os')].filter(Boolean).join(' · ');
    left.append(tags, h, cfg);
    const cell = t => { const c = document.createElement('span'); c.textContent = t; return c; };
    const price = document.createElement('span'); price.className = 'price'; price.textContent = '¥' + (val('price') || '—');
    const small = document.createElement('small'); small.textContent = ' /月'; price.append(small);
    row.append(left, cell(val('city') || '城市'), cell(`${val('net')} · ${val('ip')}`), cell(val('down') ? `${val('down')}/${val('up')} Mbps（房东自述）` : '带宽'), cell(`最短 ${val('minterm')}`), price, cell(''));
    box.append(row);
  }
  function show(i) {
    step = i;
    panels.forEach((p, k) => { p.hidden = k !== i; });
    stepBtns.forEach((b, k) => { b.toggleAttribute('aria-current', k === i); if (k === i) b.setAttribute('aria-current', 'step'); b.classList.toggle('done', k < i); });
    prev.hidden = i === 0; next.hidden = i === panels.length - 1; submit.hidden = i !== panels.length - 1;
    if (i === panels.length - 1) preview();
    ok.textContent = '';
  }
  function saveDraft(note) {
    const data = {};
    lend.querySelectorAll('input[name], select[name], textarea[name]').forEach(el => {
      if (el.type === 'checkbox') { (data[el.name] = data[el.name] || []); if (el.checked) data[el.name].push(el.value); }
      else if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
      else data[el.name] = el.value;
    });
    try { localStorage.setItem(DRAFT, JSON.stringify({ data, step })); if (note) saved.textContent = `草稿已保存 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`; } catch (e) { /* storage blocked */ }
  }
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT) || 'null');
    if (d) {
      Object.entries(d.data).forEach(([n, v]) => lend.querySelectorAll(`[name="${n}"]`).forEach(el => {
        if (el.type === 'checkbox') el.checked = Array.isArray(v) && v.includes(el.value);
        else if (el.type === 'radio') el.checked = el.value === v;
        else el.value = v;
      }));
      saved.textContent = '已恢复上次的草稿';
      show(Math.min(d.step || 0, panels.length - 1));
    } else show(0);
  } catch (e) { show(0); }
  let t;
  lend.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => saveDraft(true), 600); });
  next.addEventListener('click', () => { const err = stepError(step); if (err) { ok.textContent = err; return; } show(step + 1); saveDraft(false); lend.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  prev.addEventListener('click', () => show(step - 1));
  lend.querySelector('[data-draft]').addEventListener('click', () => saveDraft(true));
  stepBtns.forEach((b, k) => b.addEventListener('click', () => {
    for (let i = 0; i < k; i += 1) { const err = stepError(i); if (err) { show(i); ok.textContent = err; return; } }
    show(k);
  }));
  lend.addEventListener('submit', e => {
    e.preventDefault();
    for (let i = 0; i < panels.length; i += 1) { const err = stepError(i); if (err) { show(i); ok.textContent = err; return; } }
    if (needLogin(ok)) return;
    try {
      const list = JSON.parse(localStorage.getItem('yz-demo-listings') || '[]');
      list.unshift({ id: 'L-' + Date.now().toString().slice(-4), title: val('title'), host: getUser().name, city: val('city'), price: Number(val('price')),
        submitted: new Date().toLocaleString('zh-CN', { hour12: false }), test: '还没做连接测试', flags: [], status: '待审核' });
      localStorage.setItem('yz-demo-listings', JSON.stringify(list.slice(0, 20)));
      localStorage.removeItem(DRAFT);
    } catch (err) { /* storage blocked */ }
    ok.textContent = '已提交审核（原型演示，未实际发送）。通过后会公开在设备市场，可以在控制台的「我的发布」里管理。';
    const a = document.createElement('a'); a.className = 'link'; a.href = 'console.html'; a.textContent = '去控制台 →'; ok.append(' ', a);
    submit.disabled = true;
  });
}

// Console 评价: write a review for a finished rental. Saved in this browser only (prototype);
// written reviews move from 待评价 to 我写过的, and the counts follow.
const REVIEWS_KEY = 'yz-demo-reviews';
const getMyReviews = () => { try { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]'); } catch (e) { return []; } };
const rvDialog = document.getElementById('review-dialog');
if (rvDialog) {
  const form = document.getElementById('rv-form'), ok = form.querySelector('.ok');
  const todoList = document.getElementById('rv-todo-list'), wroteList = document.getElementById('rv-wrote-list');
  let current = null;
  const setCount = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
  const addWritten = r => {
    const li = document.createElement('li'); li.className = 'rev';
    const who = document.createElement('span'); who.className = 'uchip'; who.textContent = r.target;
    const meta = document.createElement('div'); meta.className = 'rev-m';
    const st = document.createElement('span'); st.className = 'stars'; st.textContent = '★'.repeat(r.stars);
    const off = document.createElement('span'); off.className = 'off'; off.textContent = '★'.repeat(5 - r.stars); st.append(off);
    const sm = document.createElement('span'); sm.className = 'small'; sm.textContent = `${r.time} · ${r.about} · 刚刚写的`;
    meta.append(st, sm);
    const p = document.createElement('p'); p.textContent = r.text;
    li.append(who, meta, p); wroteList.prepend(li);
  };
  const refresh = () => {
    const done = new Set(getMyReviews().map(r => r.todo));
    let left = 0;
    todoList.querySelectorAll('[data-review-todo]').forEach(li => { li.hidden = done.has(li.dataset.reviewTodo); left += !li.hidden; });
    document.querySelectorAll('button[data-write-review]').forEach(b => {
      if (done.has(b.dataset.writeReview) && !b.closest('[data-review-todo]')) { const t = document.createElement('span'); t.className = 'small'; t.textContent = '已评价'; b.replaceWith(t); }
    });
    document.getElementById('rv-todo-empty').hidden = left > 0;
    setCount('rv-todo-count', left);
    setCount('rv-wrote-count', wroteList.querySelectorAll('.rev').length);
  };
  getMyReviews().slice().reverse().forEach(addWritten);
  refresh();
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-write-review]');
    if (!b) return;
    current = todoList.querySelector(`[data-review-todo="${b.dataset.writeReview}"]`);
    if (!current) return;
    rvDialog.querySelector('[data-fill="target"]').textContent = '评价房东 ' + current.dataset.target;
    rvDialog.querySelector('[data-fill="about"]').textContent = current.dataset.about;
    form.reset(); ok.textContent = ''; rvDialog.showModal();
  });
  rvDialog.querySelector('[data-close]').addEventListener('click', () => rvDialog.close());
  rvDialog.addEventListener('click', e => { if (e.target === rvDialog) rvDialog.close(); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const star = form.querySelector('[name=stars]:checked'), text = form.text.value.trim();
    if (!star) { ok.textContent = '请先选择评分。'; form.querySelector('[name=stars]').focus(); return; }
    if (text.length < 10) { ok.textContent = '请写得具体一些（至少 10 个字）。'; form.text.focus(); return; }
    const r = { todo: current.dataset.reviewTodo, target: current.dataset.target, about: current.dataset.about, stars: Number(star.value), text,
      time: new Date().toISOString().slice(0, 7) };
    try { localStorage.setItem(REVIEWS_KEY, JSON.stringify([r, ...getMyReviews()])); } catch (err) { /* storage blocked */ }
    addWritten(r); refresh(); rvDialog.close();
    document.getElementById('t-rv-wrote').click();
    document.getElementById('demo-msg').textContent = `已提交对 ${r.target} 的评价（原型演示，只保存在这台浏览器）。`;
  });
  if (location.hash === '#reviews') document.getElementById('t-c-reviews').click();
}

// Console 举报 tab: list this browser's reports (all values set as text)
const reportList = document.getElementById('report-list');
if (reportList) {
  const items = getReports();
  if (!items.length) {
    const p = document.createElement('p'); p.className = 'rp-empty'; p.textContent = '你还没有举报过。在设备页或用户主页底部可以举报。'; reportList.append(p);
  }
  items.forEach(r => {
    const row = document.createElement('div'); row.className = 'rp-item';
    const title = document.createElement('div');
    const a = document.createElement('a'); a.className = 'link'; a.textContent = r.target;
    if (/^(device|user)-[a-z0-9]+\.html$/.test(r.href)) a.href = r.href;
    const b = document.createElement('b'); b.textContent = `${r.id} · `;
    const meta = document.createElement('span'); meta.className = 'small'; meta.textContent = `  ${r.kind} · ${r.reason} · ${r.time}${r.order ? ' · ' + r.order : ''}`;
    title.append(b, a, meta);
    const st = document.createElement('span'); st.className = 'st ' + (r.status === '已处理' ? 'closed' : 'matched'); st.textContent = r.status + (r.result ? ' · ' + r.result : '');
    const p = document.createElement('p'); p.textContent = r.detail;
    row.append(title, st, p); reportList.append(row);
  });
  if (location.hash === '#reports') document.getElementById('t-c-reports').click();
}
