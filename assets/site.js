// Shared behaviour for every page. Each block only runs when its elements exist on the page.

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

// Market filters: each .seg[data-key] narrows the rows by the matching data attribute
const mkRows = [...document.querySelectorAll('.listing[data-filterable] .row[data-src]')];
const picked = {};
document.querySelectorAll('.seg[data-key]').forEach(seg => {
  const buttons = seg.querySelectorAll('button');
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
  const labels = { want: '提交求租', lend: '提交出租信息', host: '提交合作申请' };
  const toggles = rf.querySelectorAll('.ftabs button'), submit = rf.querySelector('[type=submit]');
  const cap = k => k[0].toUpperCase() + k.slice(1);
  const setIntent = k => {
    toggles.forEach(b => b.setAttribute('aria-pressed', b.dataset.k === k));
    submit.textContent = labels[k];
    rf.querySelectorAll('[data-want]').forEach(el => { el.textContent = el.dataset[k]; });
    rf.querySelectorAll('[data-ph-want]').forEach(el => { el.placeholder = el.dataset['ph' + cap(k)]; });
    document.querySelectorAll('[data-for]').forEach(el => { el.hidden = el.dataset.for !== k; });
  };
  toggles.forEach(b => b.addEventListener('click', () => setIntent(b.dataset.k)));
  const q = new URLSearchParams(location.search).get('type');
  if (labels[q]) setIntent(q);
  rf.addEventListener('submit', e => {
    e.preventDefault();
    const ok = rf.querySelector('.ok');
    if (!rf.contact.value.trim()) { ok.textContent = '请留下联系方式。'; rf.contact.focus(); return; }
    ok.textContent = '已收到（原型演示，未实际发送）。我们会在 24 小时内联系你。';
    rf.reset();
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

// Device page: rental term → total price, prototype order (no payment)
const order = document.getElementById('order-form');
if (order) {
  const price = Number(order.dataset.price), total = document.getElementById('o-total'), ok = order.querySelector('.ok');
  const update = () => { total.textContent = '¥' + (price * Number(order.term.value)).toLocaleString('zh-CN'); };
  order.addEventListener('change', update); update();
  order.addEventListener('submit', e => {
    e.preventDefault();
    ok.textContent = `已选 ${order.term.value} 个月，合计 ${total.textContent}（原型演示，未创建订单）。`;
  });
}

// Reveal on scroll
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' }) : null;
document.querySelectorAll('.rv').forEach(el => io ? io.observe(el) : el.classList.add('in'));
