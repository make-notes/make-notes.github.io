// Super-admin console (prototype). All state lives in this browser's localStorage; nothing is enforced
// server-side. Everything user-supplied is written with textContent, never as HTML.
(() => {
  const SEED = JSON.parse(document.getElementById('adm-seed').textContent);
  const ADMIN_KEY = 'yz-demo-admin', STATE_KEY = 'yz-admin', CONTACT_KEY = 'yz-contact-config', SETTINGS_KEY = 'yz-settings';
  const USER_REPORTS = 'yz-demo-reports', USER_LISTINGS = 'yz-demo-listings', MSGS = 'yz-demo-msgs';
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? d : v; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };
  const now = () => new Date().toLocaleString('zh-CN', { hour12: false });
  // each section is its own page (admin/<name>.html); ROOT points back to the site root for site links
  const APP = document.getElementById('adm-app'), ROUTE = APP.dataset.section, ROOT = APP.dataset.root || '';
  const site = href => href ? ROOT + href : '';

  // ---------- tiny DOM helper ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === false || v == null) return;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    kids.flat().forEach(c => el.append(c instanceof Node ? c : document.createTextNode(c == null ? '' : String(c))));
    return el;
  }
  const btn = (label, fn, cls = 'btn btn-ghost xs') => h('button', { type: 'button', class: cls, onclick: fn }, label);
  const st = (t) => h('span', { class: 'st ' + ({ 待审核: 'matched', 待处理: 'matched', 正常: 'open', 已公开: 'open', 已上架: 'open', 公开: 'open', 已处理: 'closed' }[t] || 'closed') }, t);
  const table = (heads, rows) => h('div', { class: 'cmp-wrap' }, h('table', { class: 'cmp ct-table adm-table' },
    h('thead', {}, h('tr', {}, heads.map(x => h('th', { scope: 'col' }, x)))),
    h('tbody', {}, rows.length ? rows.map(r => h('tr', {}, r.map(c => h('td', {}, c)))) : h('tr', {}, h('td', { colspan: heads.length }, '没有符合条件的记录。')))));

  // ---------- gate ----------
  const gate = document.getElementById('adm-gate'), app = document.getElementById('adm-app'), headEl = document.getElementById('adm-head');
  function enter() { gate.hidden = true; app.hidden = false; headEl.hidden = false; renderAll(); }
  document.getElementById('adm-login').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    if (f.code.value !== 'admin-demo') { f.querySelector('.ok').textContent = '口令不对（演示环境为 admin-demo）。'; f.code.focus(); return; }
    save(ADMIN_KEY, 1); enter();
  });
  document.getElementById('adm-logout').addEventListener('click', () => { localStorage.removeItem(ADMIN_KEY); location.reload(); });
  document.getElementById('adm-reset').addEventListener('click', () => {
    [STATE_KEY, CONTACT_KEY, SETTINGS_KEY].forEach(k => localStorage.removeItem(k)); location.reload();
  });

  // ---------- state ----------
  const S = load(STATE_KEY, null) || { users: SEED.users, devices: SEED.devices, listings: SEED.listings, reviews: SEED.reviews,
    wanted: SEED.wanted, reports: SEED.reports, chats: [], log: [] };
  const persist = () => save(STATE_KEY, S);
  function log(text) { S.log.unshift({ time: now(), text }); S.log = S.log.slice(0, 200); persist(); }
  // user-submitted listings and reports (from lend.html and the report dialogs) join the queues
  function syncUserData() {
    load(USER_LISTINGS, []).forEach(l => { if (!S.listings.find(x => x.id === l.id)) S.listings.unshift(l); });
    load(USER_REPORTS, []).forEach(r => {
      if (!S.reports.find(x => x.id === r.id)) S.reports.unshift({ ...r, by: '当前演示用户', fromUser: true });
    });
    persist();
  }
  function writeBackReport(r) {
    const list = load(USER_REPORTS, []), i = list.findIndex(x => x.id === r.id);
    if (i > -1) { list[i] = { ...list[i], status: r.status, result: r.result }; save(USER_REPORTS, list); }
  }
  function writeBackListing(l) {
    const list = load(USER_LISTINGS, []), i = list.findIndex(x => x.id === l.id);
    if (i > -1) { list[i] = { ...list[i], status: l.status, reason: l.reason }; save(USER_LISTINGS, list); }
  }

  // ---------- dialog ----------
  const dlg = document.getElementById('adm-dialog'), dlgForm = document.getElementById('adm-dlg-form');
  let dlgOk = null;
  function ask(title, body, okLabel, onOk) {
    document.getElementById('adm-dlg-title').textContent = title;
    const box = document.getElementById('adm-dlg-body'); box.textContent = ''; box.append(...[].concat(body));
    document.getElementById('adm-dlg-ok').textContent = okLabel;
    dlgForm.querySelector('.ok').textContent = ''; dlgOk = onOk; dlg.showModal();
  }
  dlgForm.addEventListener('submit', e => { e.preventDefault(); const err = dlgOk && dlgOk(dlgForm); if (err) { dlgForm.querySelector('.ok').textContent = err; return; } dlg.close(); });
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
  const field = (label, control) => h('label', { class: 'inq-f' }, label, control);

  const go = (id, query = '') => { location.href = id.replace(/^a-/, '') + '.html' + query; };
  const R = {};

  // ---------- 概览 ----------
  R['a-overview'] = () => {
    const count = (arr, s) => arr.filter(x => x.status === s).length;
    const cards = [
      ['待审核的出租方案', count(S.listings, '待审核'), 'a-listings'], ['待处理的举报', count(S.reports, '待处理'), 'a-reports'],
      ['待审核的求租', count(S.wanted, '待审核'), 'a-wanted'], ['用户', S.users.length, 'a-users'],
      ['被限制的用户', S.users.filter(u => u.status !== '正常').length, 'a-users'], ['已隐藏的评价', count(S.reviews, '已隐藏'), 'a-reviews'],
      ['已上架设备', count(S.devices, '已上架'), 'a-devices'], ['客服方式', contacts().channels.filter(c => c.enabled).length + ' 个启用', 'a-contacts'],
    ];
    return [h('div', { class: 'adm-cards' }, cards.map(([t, n, to]) => h('button', { type: 'button', class: 'kpi', onclick: () => go(to) }, h('span', {}, t), h('b', {}, n), h('em', {}, '去处理 →')))),
      h('h3', { class: 'ct-h', style: 'margin-top:28px' }, '最近操作'),
      S.log.length ? h('ul', { class: 'adm-log' }, S.log.slice(0, 6).map(l => h('li', {}, h('time', {}, l.time), h('span', {}, l.text)))) : h('p', { class: 'rp-empty' }, '还没有操作记录。')];
  };

  // ---------- 用户 ----------
  let uq = '', ur = '', us = '';
  R['a-users'] = () => {
    const rows = S.users.filter(u => (!uq || (u.name + u.city + u.id).toLowerCase().includes(uq.toLowerCase())) && (!ur || u.roles.includes(ur)) && (!us || u.status === us));
    const setStatus = (u, s) => { u.status = s; log(`把用户 ${u.name} 设为「${s}」`); renderAll(); };
    return [h('div', { class: 'adm-bar' },
      h('input', { type: 'search', placeholder: '搜索昵称、城市、ID', value: uq, oninput: e => { uq = e.target.value; rerender('a-users', true); } }),
      h('select', { onchange: e => { ur = e.target.value; rerender('a-users'); } }, ['', '租客', '托管房东', '个人房东'].map(v => h('option', { value: v, selected: v === ur }, v || '全部角色'))),
      h('select', { onchange: e => { us = e.target.value; rerender('a-users'); } }, ['', '正常', '禁言', '封禁'].map(v => h('option', { value: v, selected: v === us }, v || '全部状态')))),
    table(['用户', '城市', '角色', '加入', '设备', '状态', '操作'], rows.map(u => [
      h('span', { class: 'uchip' }, h('span', { class: 'host-av', 'aria-hidden': 'true' }, u.av), u.href ? h('a', { href: site(u.href) }, u.name) : u.name),
      u.city, u.roles.join('、'), u.joined, u.hosts, h('div', {}, st(u.status), u.note ? h('span', { class: 'flag' }, '备注：' + u.note) : ''),
      h('div', { class: 'acts' },
        btn('发消息', () => go('a-chat', '?to=' + encodeURIComponent(u.id))),
        u.status === '禁言' ? btn('解除禁言', () => setStatus(u, '正常')) : btn('禁言', () => setStatus(u, '禁言')),
        u.status === '封禁' ? btn('解封', () => setStatus(u, '正常')) : btn('封禁', () => ask(`封禁 ${u.name}`, [h('p', {}, '封禁后不能登录、下单和发布，已上架的设备会下架。'),
          field('原因（会通知对方）', h('textarea', { name: 'why', maxlength: 200 }))], '确认封禁', f => {
          if (f.why.value.trim().length < 4) return '请写明原因。';
          u.status = '封禁'; u.note = f.why.value.trim();
          S.devices.filter(d => d.host === u.name).forEach(d => { d.status = '已下架'; });
          log(`封禁用户 ${u.name}：${u.note}`); renderAll();
        }), 'btn btn-ghost xs danger'),
        u.roles.includes('托管房东') ? btn('取消托管房东', () => { u.roles = u.roles.filter(r => r !== '托管房东'); log(`取消 ${u.name} 的托管房东资格`); renderAll(); })
          : btn('设为托管房东', () => { u.roles.push('托管房东'); log(`把 ${u.name} 设为托管房东`); renderAll(); }),
        btn('备注', () => ask(`给 ${u.name} 加备注`, [field('备注（只有管理员能看到）', h('textarea', { name: 'note', maxlength: 200 }, u.note || ''))], '保存', f => {
          u.note = f.note.value.trim(); log(`更新 ${u.name} 的备注`); renderAll();
        }))),
    ]))];
  };

  // ---------- 设备审核 ----------
  R['a-listings'] = () => {
    const decide = (l, status, reason) => { l.status = status; l.reason = reason || ''; writeBackListing(l);
      if (status === '已通过') S.devices.unshift({ id: l.id, name: l.title, src: '个人直租', city: l.city, price: l.price, host: l.host, status: '已上架', href: '' });
      log(`出租方案 ${l.id}「${l.title}」：${status}${reason ? '（' + reason + '）' : ''}`); renderAll(); };
    const reasonDlg = (l, status) => ask(`${status}：${l.id}`, [field('原因（会通知房东）', h('textarea', { name: 'why', maxlength: 300 },
      l.flags && l.flags.length ? '公开内容里不能留联系方式，请删除后重新提交。' : ''))], status, f => {
      if (f.why.value.trim().length < 4) return '请写明原因。'; decide(l, status, f.why.value.trim());
    });
    return [h('p', { class: 'small', style: 'margin-bottom:12px' }, '房东在「发布出租」提交的方案会出现在这里。通过后上架到设备市场。'),
      table(['编号', '方案', '房东', '城市', '月租', '提交时间', '检查', '状态', '操作'], S.listings.map(l => [
        l.id, h('div', {}, l.title, (l.flags || []).map(f => h('span', { class: 'flag' }, '⚠ ' + f))), l.host, l.city, '¥' + l.price, l.submitted, l.test,
        h('div', {}, st(l.status), l.reason ? h('span', { class: 'flag' }, l.reason) : ''),
        l.status === '待审核' ? h('div', { class: 'acts' }, btn('通过', () => decide(l, '已通过'), 'btn btn-green xs'), btn('要求修改', () => reasonDlg(l, '要求修改')),
          btn('拒绝', () => reasonDlg(l, '已拒绝'), 'btn btn-ghost xs danger')) : '—',
      ]))];
  };

  // ---------- 托管上架 ----------
  // 托管出租 devices are not self-published: after the partnership is agreed, staff create them here.
  R['a-ohost'] = () => {
    const opts = (vals, sel) => vals.map(v => h('option', { selected: v === sel }, v));
    const form = h('form', { class: 'adm-form', novalidate: true },
      h('p', { class: 'small' }, '托管出租的设备由平台在这里上架，房东自己不能发布。机器放在房东家，平台按统一价格销售，负责收款和交付。'),
      field('房东', h('select', { name: 'host' }, h('option', { value: '' }, '选择用户'),
        S.users.filter(u => u.status !== '封禁').map(u => h('option', { value: u.id }, `${u.name}（${u.city}）${u.roles.includes('托管房东') ? ' · 已是托管房东' : ''}`)))),
      h('div', { class: 'inq-2' },
        field('设备名称', h('input', { type: 'text', name: 'name', maxlength: 30, placeholder: '例如 Mac mini M4' })),
        field('系统', h('select', { name: 'os' }, opts(['macOS', 'Windows', 'Linux'])))),
      field('配置', h('input', { type: 'text', name: 'cfg', maxlength: 60, placeholder: '例如 10 核 · 16 GB · 512 GB' })),
      h('div', { class: 'inq-2' },
        field('城市', h('input', { type: 'text', name: 'city', maxlength: 20, value: '吉隆坡' })),
        field('统一月租（¥）', h('input', { type: 'number', name: 'price', min: 50, max: 20000, placeholder: '例如 399' }))),
      field('网络', h('input', { type: 'text', name: 'net', maxlength: 40, value: '家庭光纤 · 住宅 IP' })),
      h('label', { class: 'inq-ack' }, h('input', { type: 'checkbox', name: 'checked' }), h('span', {}, '已签托管协议，设备已通过连接测试和上架前检查')),
      h('div', { class: 'adm-bar' }, h('button', { class: 'btn btn-green', type: 'submit' }, '上架到官方库存'), h('p', { class: 'ok small', role: 'status' })));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const ok = form.querySelector('.ok'), u = S.users.find(x => x.id === form.host.value), price = Number(form.price.value);
      if (!u) { ok.textContent = '请选择房东。'; return; }
      if (form.name.value.trim().length < 2) { ok.textContent = '请填写设备名称。'; form.name.focus(); return; }
      if (form.cfg.value.trim().length < 2) { ok.textContent = '请填写配置。'; form.cfg.focus(); return; }
      if (!(price >= 50 && price <= 20000)) { ok.textContent = '月租要在 ¥50–20,000 之间。'; form.price.focus(); return; }
      if (!form.checked.checked) { ok.textContent = '请先确认协议和上架前检查。'; return; }
      const d = { id: 'OH-' + Date.now().toString().slice(-5), name: form.name.value.trim(), cfg: form.cfg.value.trim(), os: form.os.value,
        src: '托管出租', city: form.city.value.trim() || '吉隆坡', net: form.net.value.trim(),
        price, host: u.name, status: '已上架', href: '' };
      S.devices.unshift(d);
      if (!u.roles.includes('托管房东')) u.roles.push('托管房东');
      u.hosts = (u.hosts || 0) + 1;
      log(`为 ${u.name} 上架托管设备 ${d.name}（¥${d.price}/月）`); renderAll();
      document.querySelector('#a-ohost .ok').textContent = `已上架 ${d.name}，可以在「设备管理」里看到。`;
    });
    const mine = S.devices.filter(d => d.src === '托管出租');
    return [form, h('h3', { class: 'ct-h', style: 'margin-top:28px' }, '托管出租的设备'),
      table(['设备', '房东', '城市', '月租', '状态'], mine.map(d => [d.href ? h('a', { class: 'link', href: site(d.href) }, d.name) : d.name, d.host, d.city, '¥' + d.price, st(d.status)]))];
  };

  // ---------- 设备管理 ----------
  R['a-devices'] = () => [table(['设备', '来源', '城市', '房东', '月租', '状态', '操作'], S.devices.map(d => [
    d.href ? h('a', { class: 'link', href: site(d.href) }, d.name) : d.name, d.src, d.city, d.host, '¥' + d.price, st(d.status),
    d.status === '已上架' ? btn('下架', () => ask(`下架 ${d.name}`, [field('原因', h('textarea', { name: 'why', maxlength: 200 }))], '确认下架', f => {
      if (f.why.value.trim().length < 4) return '请写明原因。'; d.status = '已下架'; log(`下架设备 ${d.name}：${f.why.value.trim()}`); renderAll();
    }), 'btn btn-ghost xs danger') : btn('重新上架', () => { d.status = '已上架'; log(`重新上架设备 ${d.name}`); renderAll(); }),
  ]))];

  // ---------- 举报处理 ----------
  let rf = '待处理';
  const RESULTS = ['无违规，驳回举报', '警告对方', '下架相关内容', '禁言账号', '封禁账号'];
  R['a-reports'] = () => [h('div', { class: 'adm-bar' }, h('select', { onchange: e => { rf = e.target.value; rerender('a-reports'); } },
    ['待处理', '已处理', ''].map(v => h('option', { value: v, selected: v === rf }, v || '全部')))),
  table(['编号', '对象', '原因', '举报人', '情况', '时间', '状态', '操作'], S.reports.filter(r => !rf || r.status === rf).map(r => [
    r.id, h('div', {}, r.href ? h('a', { class: 'link', href: site(r.href) }, r.target) : r.target, h('span', { class: 'flag', style: 'color:var(--muted)' }, r.kind)),
    r.reason, r.by, h('div', {}, r.detail, r.order ? h('span', { class: 'flag', style: 'color:var(--muted)' }, '订单 ' + r.order) : ''), r.time,
    h('div', {}, st(r.status), r.result ? h('span', { class: 'flag' }, r.result) : ''),
    r.status === '待处理' ? btn('处理', () => ask(`处理举报 ${r.id}`, [
      h('p', { class: 'small' }, `对象：${r.target}（${r.kind}）· 原因：${r.reason}`),
      field('处理结果', h('select', { name: 'res' }, RESULTS.map(x => h('option', {}, x)))),
      field('说明（会通知举报人和被举报方）', h('textarea', { name: 'note', maxlength: 300 })),
    ], '提交处理', f => {
      if (f.note.value.trim().length < 4) return '请写明处理说明。';
      r.status = '已处理'; r.result = f.res.value; r.note = f.note.value.trim();
      const user = S.users.find(u => u.name === r.target || (r.kind.includes('房东 ') && r.kind.endsWith(u.name)));
      if (user && f.res.value === '封禁账号') user.status = '封禁';
      if (user && f.res.value === '禁言账号') user.status = '禁言';
      if (f.res.value === '下架相关内容') S.devices.filter(d => d.name === r.target).forEach(d => { d.status = '已下架'; });
      writeBackReport(r); log(`处理举报 ${r.id}：${r.result}（${r.note}）`); renderAll();
    }), 'btn btn-green xs') : '—',
  ]))];

  // ---------- 评价管理 ----------
  R['a-reviews'] = () => [table(['编号', '评价人', '对象', '关于', '评分', '内容', '状态', '操作'], S.reviews.map(v => [
    v.id, v.frm, v.to, v.device, '★'.repeat(v.stars), v.text, st(v.status),
    v.status === '公开' ? btn('隐藏', () => ask(`隐藏评价 ${v.id}`, [field('原因（会通知评价人）', h('textarea', { name: 'why', maxlength: 200 }))], '确认隐藏', f => {
      if (f.why.value.trim().length < 4) return '请写明原因。'; v.status = '已隐藏'; log(`隐藏评价 ${v.id}：${f.why.value.trim()}`); renderAll();
    }), 'btn btn-ghost xs danger') : btn('恢复公开', () => { v.status = '公开'; log(`恢复评价 ${v.id}`); renderAll(); }),
  ]))];

  // ---------- 求租审核 ----------
  R['a-wanted'] = () => [table(['编号', '内容', '发布者', '预算', '状态', '操作'], S.wanted.map(w => [
    h('a', { class: 'link', href: site('wanted.html#' + w.id) }, w.id), w.title, w.poster, w.budget, st(w.status),
    h('div', { class: 'acts' },
      w.status === '待审核' ? btn('通过', () => { w.status = '已公开'; log(`求租 ${w.id} 审核通过`); renderAll(); }, 'btn btn-green xs') : '',
      w.status !== '已关闭' ? btn('关闭', () => { w.status = '已关闭'; log(`关闭求租 ${w.id}`); renderAll(); }, 'btn btn-ghost xs danger') : ''),
  ]))];

  // ---------- 发起对话 ----------
  let chatTo = new URLSearchParams(location.search).get('to') || '';
  if (!S.users.some(u => u.id === chatTo)) chatTo = '';
  R['a-chat'] = () => {
    const form = h('form', { class: 'adm-form', novalidate: true },
      field('发给', h('select', { name: 'to' }, h('option', { value: '' }, '选择用户'), S.users.map(u => h('option', { value: u.id, selected: u.id === chatTo, disabled: u.status === '封禁' }, `${u.name}（${u.city}）${u.status === '封禁' ? ' · 已封禁' : ''}`)))),
      field('关于（选填）', h('input', { type: 'text', name: 'about', maxlength: 40, placeholder: '例如 举报 R-100231 / 方案 L-2051' })),
      field('消息', h('textarea', { name: 'text', maxlength: 1000, rows: 4, placeholder: '以「AgentDesk 客服」的身份发出，对方在消息里能看到并回复。' })),
      h('div', { class: 'adm-bar' }, h('button', { class: 'btn btn-green', type: 'submit' }, '发送'), h('p', { class: 'ok small', role: 'status' })));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const ok = form.querySelector('.ok'), u = S.users.find(x => x.id === form.to.value), text = form.text.value.trim();
      if (!u) { ok.textContent = '请选择用户。'; return; }
      if (text.length < 2) { ok.textContent = '请写消息内容。'; return; }
      S.chats.unshift({ time: now(), to: u.name, about: form.about.value.trim(), text });
      // the demo inbox belongs to 陈一: messages to that user show up on messages.html in this browser
      if (u.id === 'chen') {
        const ms = load(MSGS, { seeded: false, threads: [] });
        let t = ms.threads.find(x => x.id === 'system');
        if (!t) { t = { id: 'system', with: 'system', device: null, unread: 0, messages: [] }; ms.threads.push(t); }
        t.messages.push({ from: 'them', time: now(), text: '【AgentDesk 客服】' + (form.about.value.trim() ? `（${form.about.value.trim()}）` : '') + text });
        t.unread = (t.unread || 0) + 1; save(MSGS, ms);
      }
      log(`以客服身份给 ${u.name} 发消息${form.about.value.trim() ? '（' + form.about.value.trim() + '）' : ''}`);
      chatTo = ''; renderAll();
      document.querySelector('#a-chat .ok').textContent = `已发送给 ${u.name}` + (u.id === 'chen' ? '，可以在消息页的「AgentDesk 平台通知」里看到。' : '（原型：只有示例用户陈一的收件箱能看到）。');
    });
    return [form, h('h3', { class: 'ct-h', style: 'margin-top:28px' }, '发出的消息'),
      S.chats.length ? h('ul', { class: 'adm-log' }, S.chats.map(c => h('li', {}, h('time', {}, c.time), h('span', {}, `给 ${c.to}${c.about ? '（' + c.about + '）' : ''}：${c.text}`)))) : h('p', { class: 'rp-empty' }, '还没有发出的消息。')];
  };

  // ---------- 客服方式 ----------
  const TYPES = { telegram: 'Telegram', whatsapp: 'WhatsApp', wechat: '微信', email: '邮箱', phone: '电话', line: 'LINE', link: '自定义链接' };
  const HINT = { telegram: '用户名，例如 yuanzhuo_support', whatsapp: '带国家区号的号码，例如 60123456789', wechat: '微信号', email: 'support@example.com',
    phone: '+60 3-1234 5678', line: 'LINE ID', link: 'https://…' };
  const contacts = () => load(CONTACT_KEY, null) || { channels: SEED.contacts, qr: '' };
  R['a-contacts'] = () => {
    const cfg = JSON.parse(JSON.stringify(contacts()));
    const list = h('div', {});
    const draw = () => {
      list.textContent = '';
      cfg.channels.forEach((c, i) => {
        list.append(h('div', { class: 'ch' },
          h('label', { title: '启用' }, h('input', { type: 'checkbox', checked: c.enabled, onchange: e => { c.enabled = e.target.checked; } }), ' 启用'),
          h('select', { 'aria-label': '类型', onchange: e => { c.type = e.target.value; c.label = TYPES[c.type]; draw(); } }, Object.entries(TYPES).map(([k, v]) => h('option', { value: k, selected: k === c.type }, v))),
          h('input', { type: 'text', 'aria-label': '显示名称', value: c.label, maxlength: 12, oninput: e => { c.label = e.target.value; } }),
          h('input', { type: 'text', 'aria-label': '账号或链接', value: c.value, placeholder: HINT[c.type], maxlength: 120, oninput: e => { c.value = e.target.value; } }),
          h('label', { title: '默认（浮动按钮的主按钮）' }, h('input', { type: 'radio', name: 'ch-default', checked: c.default, onchange: () => { cfg.channels.forEach(x => { x.default = x === c; }); } }), ' 默认'),
          h('span', { class: 'move' }, btn('↑', () => { if (i) { [cfg.channels[i - 1], cfg.channels[i]] = [cfg.channels[i], cfg.channels[i - 1]]; draw(); } }),
            btn('↓', () => { if (i < cfg.channels.length - 1) { [cfg.channels[i + 1], cfg.channels[i]] = [cfg.channels[i], cfg.channels[i + 1]]; draw(); } }),
            btn('删除', () => { cfg.channels.splice(i, 1); draw(); }, 'btn btn-ghost xs danger'))));
      });
    };
    draw();
    const qrImg = h('img', { alt: '当前微信二维码', src: cfg.qr || site('assets/wechat-qr.svg') });
    const qrIn = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', onchange: e => {
      const f = e.target.files[0]; const ok = document.querySelector('#a-contacts .ok');
      if (!f) return;
      if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { ok.textContent = '只支持 PNG、JPG、WebP 图片。'; return; }
      if (f.size > 300 * 1024) { ok.textContent = '图片请小于 300 KB。'; return; }
      const r = new FileReader(); r.onload = () => { cfg.qr = r.result; qrImg.src = r.result; }; r.readAsDataURL(f);
    } });
    const ok = h('p', { class: 'ok small', role: 'status' });
    return [h('p', { class: 'small', style: 'margin-bottom:10px' }, '这里的设置会用在全站的浮动客服按钮、页脚和求租页的联系卡片上。默认方式是浮动按钮的主按钮，顺序就是菜单里的顺序。'),
      list,
      h('div', { class: 'adm-bar', style: 'margin-top:12px' }, btn('添加客服方式', () => { cfg.channels.push({ type: 'email', label: '邮箱', value: '', enabled: true, default: false }); draw(); }, 'btn btn-ghost')),
      h('div', { class: 'qr-up' }, qrImg, h('div', {}, h('b', {}, '微信二维码'), h('p', { class: 'small' }, '用户点「微信」时显示。PNG / JPG / WebP，小于 300 KB。'), qrIn)),
      h('div', { class: 'adm-bar', style: 'margin-top:16px' },
        btn('保存', () => {
          const on = cfg.channels.filter(c => c.enabled);
          if (!on.length) { ok.textContent = '至少启用一种客服方式。'; return; }
          for (const c of on) {
            if (!c.label.trim()) { ok.textContent = '每种方式都要有显示名称。'; return; }
            if (c.type !== 'wechat' && !contactHref(c)) { ok.textContent = `「${c.label}」的账号格式不对：${HINT[c.type]}`; return; }
            if (c.type === 'wechat' && !/^[A-Za-z][-_A-Za-z0-9]{5,19}$/.test(c.value.trim())) { ok.textContent = '微信号是 6–20 位，以字母开头。'; return; }
          }
          if (!on.some(c => c.default)) on[0].default = true;
          cfg.channels.forEach(c => { if (!c.enabled) c.default = false; });
          save(CONTACT_KEY, cfg); log(`更新客服方式：${on.map(c => c.label).join('、')}（默认 ${on.find(c => c.default).label}）`);
          applyContactConfig(); ok.textContent = '已保存，右下角的客服按钮已经更新。';
        }, 'btn btn-green'),
        btn('恢复默认', () => { localStorage.removeItem(CONTACT_KEY); log('客服方式恢复默认'); location.reload(); }), ok)];
  };

  // ---------- 平台设置 ----------
  R['a-settings'] = () => {
    const vals = load(SETTINGS_KEY, {});
    const form = h('form', { class: 'adm-form', novalidate: true });
    let group = '';
    SEED.settings.forEach(s => {
      if (s.group !== group) { group = s.group; form.append(h('p', { class: 'adm-set-group' }, group)); }
      const v = s.key in vals ? vals[s.key] : s.value;
      let ctrl;
      if (s.type === 'bool') ctrl = h('input', { type: 'checkbox', name: s.key, checked: !!v });
      else if (s.type === 'select') ctrl = h('select', { name: s.key }, s.options.map(o => h('option', { selected: o === v }, o)));
      else if (s.type === 'text') ctrl = h('input', { type: 'text', name: s.key, value: v, maxlength: 80, style: 'width:100%' });
      else ctrl = h('input', { type: 'number', name: s.key, value: v, min: 0, max: 100000, style: 'width:120px' });
      form.append(h('div', { class: 'adm-row' }, h('div', {}, h('b', {}, s.label), s.unit ? h('small', {}, s.unit) : ''), ctrl, h('span', {})));
    });
    const ok = h('p', { class: 'ok small', role: 'status' });
    form.append(h('div', { class: 'adm-bar', style: 'margin-top:14px' }, h('button', { class: 'btn btn-green', type: 'submit' }, '保存设置'), ok));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const out = {};
      for (const s of SEED.settings) {
        const el = form[s.key];
        if (s.type === 'bool') out[s.key] = el.checked;
        else if (s.type === 'number') { const n = Number(el.value); if (!Number.isFinite(n) || n < 0) { ok.textContent = `「${s.label}」要填大于等于 0 的数字。`; el.focus(); return; } out[s.key] = n; }
        else out[s.key] = el.value.trim();
      }
      save(SETTINGS_KEY, out); log('更新平台设置' + (out.announce ? `，全站公告：${out.announce}` : '')); applyAnnouncement();
      ok.textContent = '已保存。全站公告会立即显示；费用、时限等规则在原型里只记录，正式上线需要后端生效。';
    });
    return [form];
  };

  // ---------- 操作日志 ----------
  R['a-log'] = () => [S.log.length ? h('ul', { class: 'adm-log' }, S.log.map(l => h('li', {}, h('time', {}, l.time), h('span', {}, l.text)))) : h('p', { class: 'rp-empty' }, '还没有操作记录。')];

  // ---------- render ----------
  function badges() {
    const n = { 'a-listings': S.listings.filter(x => x.status === '待审核').length, 'a-reports': S.reports.filter(x => x.status === '待处理').length,
      'a-wanted': S.wanted.filter(x => x.status === '待审核').length };
    document.querySelectorAll('.adm-side .badge').forEach(b => { const c = n[b.dataset.count] || 0; b.textContent = c; b.hidden = !c; });
  }
  function rerender(id, keepFocus) {
    const box = document.querySelector(`[data-render="${id}"]`);
    const focused = keepFocus && document.activeElement && document.activeElement.type === 'search';
    box.textContent = '';
    try { if (!R[id]) throw new Error('没有这个页面：' + id); box.append(...R[id]()); } catch (err) { box.append(h('p', { class: 'rp-empty' }, '这一栏加载失败：' + err.message)); console.error(err); }
    if (focused) { const s = box.querySelector('input[type=search]'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
  }
  function renderAll() { persist(); rerender(ROUTE); badges(); }

  syncUserData();
  if (load(ADMIN_KEY, 0)) enter();
})();
