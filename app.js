/* 出國購物清單 PWA：本機儲存、離線可用、比價與退稅試算 */
(() => {
  'use strict';

  const STORAGE_KEY = 'shoplist.v1';

  // 國家規則預設值（試算用，非官方；可在設定中覆寫）
  const COUNTRIES = {
    JP_REFUND: {
      label: '日本（2026/11/1 起・出境退稅）', local: 'JPY', taxRate: 10, threshold: 5000, mode: 'refund',
      hint: '店內付含稅價；出境前先在海關端末或 Visit Japan Web 辦理，再依店家指定方式退款。同店同日未稅滿 ¥5,000 才可退；需在出境前 90 天內購買，商品出境時須全部隨身。'
    },
    JP_OLD: {
      label: '日本（2026/10/31 前購買・現場免稅）', local: 'JPY', taxRate: 10, threshold: 5000, mode: 'instant',
      hint: '2026/10/31 以前購買適用：店內直接付未稅價，或在免稅櫃台當場退稅。同店同日未稅滿 ¥5,000。'
    },
    KR: {
      label: '韓國（現場即時退稅，參考值）', local: 'KRW', taxRate: 10, threshold: 15000, mode: 'instant',
      hint: '參考值：單筆 ₩15,000 以上多數店家可即時退稅，另有單筆與總額上限；請以店家公告為準並自行調整。'
    },
    CUSTOM: {
      label: '自訂', local: '', taxRate: 0, threshold: 0, mode: 'refund',
      hint: '自行填入稅率、免稅門檻與退稅方式。'
    }
  };

  const CHECKLISTS = {
    refund: [
      '購買紀錄齊全（電子紀錄綁定護照，或保留收據）',
      '所有免稅商品隨身攜帶，未拆封使用',
      '護照（入境時已蓋章或留有入境紀錄）',
      '全部商品都在出境前 90 天內購買',
      '到機場先辦海關端末或 Visit Japan Web，再去報到',
      '確認每家店的退款方式（信用卡、現金或電子支付）'
    ],
    instant: [
      '免稅商品隨身攜帶，未拆封使用',
      '護照與購買紀錄備查',
      '出境時海關可能查驗，商品先放手提'
    ]
  };

  // 沖繩範例（取自原本的行程網站待買清單，價格查核日 2026/10/17）
  const SAMPLE_TRIP = { name: '沖繩 2026/10', countryKey: 'JP_REFUND', local: 'JPY', home: 'TWD', fx: 0.2072, cardFee: 0, taxRate: 10, threshold: 5000, mode: 'refund', departDate: '' };
  const SAMPLE_ITEMS = [
    { brand: 'On', name: 'THE ROGER Advantage', note: '男款 US 8.5／JP 26.5；配色未指定', store: 'Sports Depo 天久店', homePrice: 5280, localPrice: 20900, coupon: 5 },
    { brand: 'On', name: 'Cloud X 5', note: '男款 US 8.5／JP 26.5；配色未指定', store: 'Sports Depo 天久店', homePrice: 5380, localPrice: 22000, coupon: 5 },
    { brand: 'On', name: 'Cloudtilt', note: '男款 US 8.5／JP 26.5；配色未指定', store: 'Sports Depo 天久店', homePrice: 5580, localPrice: 23100, coupon: 5 },
    { brand: 'HOKA', name: 'Mach 7', note: '男款 US 8.5／26.5 cm；一般楦與寬楦須分辨', store: 'Sports Depo 天久店', homePrice: 4480, localPrice: 17600, coupon: 5 },
    { brand: 'HOKA', name: 'ORA Recovery Slide 3', note: '拖鞋未見 US 8.5 半碼；現場試穿 US 8／9', store: 'Sports Depo 天久店', homePrice: 1980, localPrice: 8900, coupon: 5 },
    { brand: 'HOKA', name: 'Arahi 9', note: '男款 US 8.5／26.5 cm；一般楦與寬楦須分辨', store: 'Sports Depo 天久店', homePrice: 4572, localPrice: 19800, coupon: 5 },
    { brand: 'DJI', name: 'Osmo Pocket 4P 標準套裝', note: '日本型號 OP4P58／OM-POCKET4P-STD', store: 'YAMADA 那霸本店', homePrice: 19290, localPrice: 98010, coupon: 7 },
    { brand: 'DJI', name: 'Osmo Pocket 4P Vlog 套裝', note: '日本型號 OP4P62／OM-POCKET4P-VLOG', store: 'YAMADA 那霸本店', homePrice: 21790, localPrice: 112167, coupon: 7 },
    { brand: 'FUJIFILM', name: 'XF23mm F2.8 R WR', note: 'X 接環；黑／銀擇一，非 XF23mm F2 R WR', store: 'Kitamura 新都心店', homePrice: 14800, localPrice: 57420, coupon: 0 }
  ];

  // ---------- 狀態 ----------
  let state = load();
  let ui = { tab: 'list', brand: 'all', status: 'all', boughtOnly: false, editorPhoto: null, installEvent: null };

  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function newTrip(overrides) {
    const base = COUNTRIES.JP_REFUND;
    return Object.assign({
      id: uid(), name: '新旅程', countryKey: 'JP_REFUND', local: base.local, home: 'TWD', fx: 0.21, cardFee: 0,
      taxRate: base.taxRate, threshold: base.threshold, mode: base.mode, departDate: '', checklist: {}, createdAt: Date.now()
    }, overrides || {});
  }
  function newItem(tripId, overrides) {
    return Object.assign({
      id: uid(), tripId, brand: '', name: '', note: '', store: '', date: '', qty: 1, homePrice: 0, localPrice: 0,
      taxFree: true, coupon: 0, couponConfirmed: false, bought: false, photo: null, createdAt: Date.now()
    }, overrides || {});
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && Array.isArray(s.trips) && Array.isArray(s.items) && s.trips.length) return s;
      }
    } catch (_) { /* 讀取失敗就重建 */ }
    const t = newTrip({ name: '我的旅程' });
    return { trips: [t], items: [], currentTripId: t.id };
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      toast('儲存失敗：空間不足，請移除部分照片');
      return false;
    }
  }
  function currentTrip() {
    return state.trips.find((t) => t.id === state.currentTripId) || state.trips[0];
  }
  function tripItems(trip) { return state.items.filter((i) => i.tripId === trip.id); }

  // ---------- 格式 ----------
  const SYMBOLS = { TWD: 'NT$', JPY: '¥', KRW: '₩', USD: 'US$', EUR: '€', GBP: '£', HKD: 'HK$', CNY: '¥', THB: '฿', SGD: 'S$' };
  const ZERO_DEC = new Set(['JPY', 'KRW', 'TWD']);
  function money(n, code) {
    if (!Number.isFinite(n)) return '—';
    const c = (code || '').toUpperCase();
    const digits = ZERO_DEC.has(c) ? 0 : 2;
    const num = new Intl.NumberFormat('zh-Hant-TW', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Math.round(n * Math.pow(10, digits)) / Math.pow(10, digits));
    return (SYMBOLS[c] || (c ? c + ' ' : '')) + num;
  }
  function pct(x) { return (x * 100).toFixed(x >= 0.1 || x <= -0.1 ? 0 : 1) + '%'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
  function num(v, d) { const n = parseFloat(v); return Number.isFinite(n) ? n : (d == null ? 0 : d); }

  // ---------- 計算 ----------
  function groupKey(item) { return item.store ? item.store.trim() + '|' + (item.date || '') : '#' + item.id; }

  // 單一商品試算；groupOk 表示該店該日是否達到免稅門檻
  function calcItem(item, trip, groupOk) {
    const qty = Math.max(1, num(item.qty, 1));
    const local = num(item.localPrice) * qty;
    const rate = num(trip.taxRate) / 100;
    const couponRate = Math.min(99, Math.max(0, num(item.coupon))) / 100;
    const couponApplied = couponRate > 0 && !!item.couponConfirmed;
    const couponPending = couponRate > 0 && !item.couponConfirmed;
    const afterCoupon = local * (1 - (couponApplied ? couponRate : 0));
    const pretax = rate > 0 ? afterCoupon / (1 + rate) : afterCoupon;
    const tax = afterCoupon - pretax;
    const eligible = !!item.taxFree && groupOk !== false && rate > 0;
    let pay, refund, net;
    if (eligible && trip.mode === 'instant') { pay = pretax; refund = 0; net = pretax; }
    else if (eligible) { pay = afterCoupon; refund = tax; net = pretax; }
    else { pay = afterCoupon; refund = 0; net = afterCoupon; }
    const fx = num(trip.fx);
    const fee = 1 + num(trip.cardFee) / 100;
    const home = net * fx * fee;
    const homeCompare = num(item.homePrice) * qty;
    const saving = homeCompare > 0 ? homeCompare - home : null;
    const ratio = homeCompare > 0 ? saving / homeCompare : null;
    let verdict = 'none', verdictText = '未填本國參考價';
    if (ratio != null) {
      if (ratio >= 0.10) { verdict = 'good'; verdictText = '值得在當地買'; }
      else if (ratio >= -0.05) { verdict = 'even'; verdictText = '價差不大，看方便'; }
      else { verdict = 'bad'; verdictText = '在本國買較便宜'; }
    }
    // 若券尚未確認，另外算一個「套券後」的參考
    let withCoupon = null;
    if (couponPending) {
      const ac = local * (1 - couponRate);
      const pt = rate > 0 ? ac / (1 + rate) : ac;
      const n2 = eligible ? pt : ac;
      withCoupon = { net: n2, home: n2 * fx * fee };
    }
    return { qty, local, afterCoupon, pretax, tax, pay, refund, net, home, homeCompare, saving, ratio, verdict, verdictText, couponApplied, couponPending, withCoupon, eligible, taxFree: !!item.taxFree };
  }

  // 依店家＋日期分組，判斷門檻
  function buildGroups(items, trip) {
    const map = new Map();
    items.forEach((it) => {
      const k = groupKey(it);
      if (!map.has(k)) map.set(k, { key: k, store: it.store ? it.store.trim() : '', date: it.date || '', items: [], pretaxSum: 0 });
      const g = map.get(k);
      g.items.push(it);
      if (it.taxFree) g.pretaxSum += calcItem(it, trip, true).pretax;
    });
    const th = num(trip.threshold);
    map.forEach((g) => {
      g.ok = th <= 0 || g.pretaxSum >= th;
      g.shortfall = g.ok ? 0 : th - g.pretaxSum;
      g.pay = 0; g.refund = 0; g.net = 0; g.home = 0;
      g.items.forEach((it) => {
        const r = calcItem(it, trip, g.ok);
        g.pay += r.pay; g.refund += r.refund; g.net += r.net; g.home += r.home;
      });
    });
    return map;
  }

  function groupOkFor(item, trip, items) {
    if (!item.store) { // 沒填店家：單獨算
      const th = num(trip.threshold);
      return th <= 0 || !item.taxFree || calcItem(item, trip, true).pretax >= th;
    }
    const others = items.filter((i) => i.id !== item.id);
    const groups = buildGroups(others.concat([item]), trip);
    const g = groups.get(groupKey(item));
    return g ? g.ok : true;
  }

  function totals(items, trip) {
    const groups = buildGroups(items, trip);
    const t = { count: items.length, bought: items.filter((i) => i.bought).length, pay: 0, refund: 0, net: 0, home: 0, saving: 0, homeCompare: 0, groups };
    groups.forEach((g) => {
      t.pay += g.pay; t.refund += g.refund; t.net += g.net; t.home += g.home;
      g.items.forEach((it) => {
        const r = calcItem(it, trip, g.ok);
        if (r.saving != null) { t.saving += r.saving; t.homeCompare += r.homeCompare; }
      });
    });
    return t;
  }

  // ---------- DOM 工具 ----------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
  }

  // ---------- 渲染 ----------
  function renderAll() {
    const trip = currentTrip();
    $('#trip-title').textContent = trip.name || '出國購物清單';
    $$('.local-code').forEach((el) => { el.textContent = trip.local || '當地'; });
    $$('.home-code').forEach((el) => { el.textContent = trip.home || '本國'; });
    renderList(trip);
    renderRefund(trip);
    renderSettings(trip);
  }

  function renderList(trip) {
    const items = tripItems(trip);
    const t = totals(items, trip);
    const summary = $('#summary');
    const savingCls = t.saving > 0 ? 'good' : (t.saving < 0 ? 'bad' : '');
    summary.innerHTML = [
      stat('清單', `${t.count} 項`, `已買 ${t.bought} 項`),
      stat('預計現場付款', money(t.pay, trip.local), trip.mode === 'refund' ? '含稅，出境後退稅' : '已扣免稅'),
      stat('預計退稅', money(t.refund, trip.local), '依各店門檻判斷'),
      stat(`實際成本（${trip.home}）`, money(t.home, trip.home), t.homeCompare > 0 ? `比本國${t.saving >= 0 ? '省' : '多'} ${money(Math.abs(t.saving), trip.home)}` : '未填本國價', savingCls)
    ].join('');

    // 品牌篩選
    const brands = Array.from(new Set(items.map((i) => (i.brand || '').trim()).filter(Boolean))).sort();
    if (ui.brand !== 'all' && !brands.includes(ui.brand)) ui.brand = 'all';
    $('#brand-chips').innerHTML = [`<button type="button" class="chip ${ui.brand === 'all' ? 'active' : ''}" data-brand="all">全部品牌</button>`]
      .concat(brands.map((b) => `<button type="button" class="chip ${ui.brand === b ? 'active' : ''}" data-brand="${esc(b)}">${esc(b)}</button>`)).join('');
    $$('.status-chips .chip').forEach((c) => c.classList.toggle('active', c.dataset.status === ui.status));

    const shown = items.filter((i) => (ui.brand === 'all' || (i.brand || '').trim() === ui.brand) && (ui.status === 'all' || (ui.status === 'done') === !!i.bought));
    const list = $('#item-list');
    $('#empty-state').hidden = items.length > 0;
    if (!shown.length) {
      list.innerHTML = items.length ? '<p class="hint" style="text-align:center">沒有符合篩選的商品。</p>' : '';
      return;
    }
    list.innerHTML = shown.map((it) => {
      const g = t.groups.get(groupKey(it));
      const r = calcItem(it, trip, g ? g.ok : true);
      const flag = it.taxFree && g && !g.ok && num(trip.threshold) > 0
        ? `本店本日未稅差 ${money(g.shortfall, trip.local)} 才達免稅門檻`
        : (r.couponPending ? `券 ${num(it.coupon)}% 待店員確認${r.withCoupon ? `，套券後約 ${money(r.withCoupon.home, trip.home)}` : ''}` : '');
      const thumb = it.photo ? `<img src="${it.photo}" alt="">` : '🛍️';
      const badge = r.verdict === 'none' ? '<span class="badge none">未填本國價</span>'
        : `<span class="badge ${r.verdict}">${r.saving >= 0 ? '省' : '多'} ${money(Math.abs(r.saving), trip.home)}・${pct(Math.abs(r.ratio))}</span>`;
      return `<button type="button" class="item ${it.bought ? 'bought' : ''}" data-id="${it.id}">
        <div class="thumb">${thumb}</div>
        <div>
          <div class="brand">${esc(it.brand)}</div>
          <div class="name">${esc(it.name)}${r.qty > 1 ? ` ×${r.qty}` : ''}</div>
          <div class="meta">${esc([it.store, it.note].filter(Boolean).join('｜'))}</div>
          <div class="prices"><span>現場 <b>${money(r.pay, trip.local)}</b></span><span>實際 <b>${money(r.home, trip.home)}</b></span>${r.homeCompare > 0 ? `<span>本國 ${money(r.homeCompare, trip.home)}</span>` : ''}</div>
          ${flag ? `<div class="flag ${r.couponPending && !(g && !g.ok) ? 'warnless' : ''}">${esc(flag)}</div>` : ''}
        </div>
        <div class="side">${badge}<span class="buy" data-buy="${it.id}" role="checkbox" aria-checked="${!!it.bought}" aria-label="已購買">${it.bought ? '✓' : ''}</span></div>
      </button>`;
    }).join('');
  }

  function stat(k, v, s, cls) {
    return `<div class="stat ${cls || ''}"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div><div class="s">${esc(s || '')}</div></div>`;
  }

  function renderRefund(trip) {
    const all = tripItems(trip);
    const items = ui.boughtOnly ? all.filter((i) => i.bought) : all;
    const c = COUNTRIES[trip.countryKey] || COUNTRIES.CUSTOM;
    const modeText = trip.mode === 'refund'
      ? '這個旅程採「出境退稅」：店內付含稅價，離境時依規定退稅。下方的「預計退稅」是你出境後應拿回的金額。'
      : '這個旅程採「現場免稅」：達門檻的店家直接付未稅價，沒有額外退稅步驟。';
    let dateHint = '';
    if (trip.mode === 'refund' && trip.departDate && trip.countryKey === 'JP_REFUND') {
      const d = new Date(trip.departDate + 'T00:00:00'); d.setDate(d.getDate() - 90);
      dateHint = ` 出境日 ${trip.departDate}，購買日期須在 ${d.toISOString().slice(0, 10)} 之後。`;
    }
    $('#refund-mode-note').innerHTML = `<b>${esc(c.label === '自訂' ? '自訂規則' : c.label)}</b><br>${esc(modeText)}${esc(dateHint)}<br><span class="hint">${esc(c.hint)}</span>`;

    const t = totals(items, trip);
    $('#refund-totals').innerHTML = [
      stat('現場付款合計', money(t.pay, trip.local), `${items.length} 項`),
      stat('預計退稅合計', money(t.refund, trip.local), trip.mode === 'refund' ? '達門檻的店才計入' : '現場免稅不另退'),
      stat('實際成本合計', money(t.net, trip.local), '付款減退稅'),
      stat(`換算 ${trip.home}`, money(t.home, trip.home), num(trip.cardFee) > 0 ? `含刷卡費 ${num(trip.cardFee)}%` : '依設定匯率')
    ].join('');

    $('#threshold-hint').textContent = num(trip.threshold) > 0
      ? `同一店家、同一天的免稅商品未稅合計需達 ${money(num(trip.threshold), trip.local)}。沒填店家的商品單獨計算；填了店家但沒填日期的，視為同一天。`
      : '目前未設定門檻，所有勾選可免稅的商品都視為可退。';

    const groups = Array.from(t.groups.values()).sort((a, b) => (a.store || '~').localeCompare(b.store || '~') || (a.date || '').localeCompare(b.date || ''));
    $('#refund-groups').innerHTML = groups.length ? groups.map((g) => {
      const taxItems = g.items.filter((i) => i.taxFree);
      const status = !taxItems.length ? '<span class="badge none">無免稅商品</span>'
        : (g.ok ? '<span class="badge good">達門檻</span>' : `<span class="badge bad">差 ${money(g.shortfall, trip.local)}</span>`);
      return `<div class="group">
        <div class="g-head"><div><div class="g-store">${esc(g.store || '未填店家')}</div><div class="g-date">${esc(g.date || '日期未填')}・${g.items.length} 項</div></div>${status}</div>
        <div class="g-lines">
          <div><span>免稅商品未稅合計</span><b>${money(g.pretaxSum, trip.local)}</b></div>
          <div><span>現場付款</span><b>${money(g.pay, trip.local)}</b></div>
          <div><span>預計退稅</span><b>${money(g.refund, trip.local)}</b></div>
        </div>
        <div class="g-items">${esc(g.items.map((i) => (i.bought ? '✓ ' : '') + [i.brand, i.name].filter(Boolean).join(' ')).join('、'))}</div>
      </div>`;
    }).join('') : '<p class="hint">還沒有商品。</p>';

    const list = CHECKLISTS[trip.mode] || CHECKLISTS.refund;
    trip.checklist = trip.checklist || {};
    $('#checklist').innerHTML = list.map((text, i) => `<label class="checklist-item"><input type="checkbox" data-check="${i}" ${trip.checklist[i] ? 'checked' : ''}><span>${esc(text)}</span></label>`).join('');
  }

  function renderSettings(trip) {
    const form = $('#trip-form');
    const sel = $('#country-select');
    if (!sel.options.length) {
      sel.innerHTML = Object.keys(COUNTRIES).map((k) => `<option value="${k}">${esc(COUNTRIES[k].label)}</option>`).join('');
    }
    form.name.value = trip.name || '';
    form.countryKey.value = trip.countryKey || 'CUSTOM';
    form.local.value = trip.local || '';
    form.home.value = trip.home || '';
    form.fx.value = trip.fx;
    form.cardFee.value = trip.cardFee;
    form.taxRate.value = trip.taxRate;
    form.threshold.value = trip.threshold;
    form.departDate.value = trip.departDate || '';
    const radio = form.querySelector(`input[name=mode][value=${trip.mode === 'instant' ? 'instant' : 'refund'}]`);
    if (radio) radio.checked = true;
    $('#country-hint').textContent = (COUNTRIES[trip.countryKey] || COUNTRIES.CUSTOM).hint;

    $('#trip-list').innerHTML = state.trips.map((t) => {
      const n = state.items.filter((i) => i.tripId === t.id).length;
      return `<div class="trip-row ${t.id === trip.id ? 'active' : ''}" data-trip="${t.id}"><span>${esc(t.name)}</span><span class="small">${n} 項・${esc(t.local)}→${esc(t.home)}</span></div>`;
    }).join('');

    renderInstall();
  }

  function renderInstall() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const btn = $('#btn-install');
    const hint = $('#install-hint');
    if (standalone) { btn.hidden = true; hint.textContent = '已安裝到主畫面，可直接離線使用。'; return; }
    if (ui.installEvent) { btn.hidden = false; hint.textContent = '安裝後會出現在主畫面，沒有網路也能開啟清單。'; return; }
    btn.hidden = true;
    hint.textContent = isIOS
      ? 'iPhone：用 Safari 開啟這個網址，點下方「分享」→「加入主畫面」。'
      : 'Android／Chrome：點瀏覽器選單的「安裝應用程式」或「加到主畫面」。';
  }

  // ---------- 編輯面板 ----------
  function openEditor(id) {
    const trip = currentTrip();
    const form = $('#item-form');
    form.reset();
    const item = id ? state.items.find((i) => i.id === id) : null;
    $('#editor-title').textContent = item ? '編輯商品' : '新增商品';
    $('#btn-editor-delete').hidden = !item;
    form.id.value = item ? item.id : '';
    form.brand.value = item ? item.brand : '';
    form.name.value = item ? item.name : '';
    form.note.value = item ? item.note : '';
    form.store.value = item ? item.store : '';
    form.date.value = item ? (item.date || '') : '';
    form.qty.value = item ? item.qty : 1;
    form.homePrice.value = item && item.homePrice ? item.homePrice : '';
    form.localPrice.value = item && item.localPrice ? item.localPrice : '';
    form.taxFree.checked = item ? !!item.taxFree : true;
    form.coupon.value = item ? item.coupon : 0;
    form.couponConfirmed.checked = item ? !!item.couponConfirmed : false;
    form.bought.checked = item ? !!item.bought : false;
    ui.editorPhoto = item ? item.photo : null;
    renderPhoto();
    const stores = Array.from(new Set(tripItems(trip).map((i) => i.store).filter(Boolean)));
    $('#store-list').innerHTML = stores.map((s) => `<option value="${esc(s)}">`).join('');
    $$('.local-code').forEach((el) => { el.textContent = trip.local || '當地'; });
    $$('.home-code').forEach((el) => { el.textContent = trip.home || '本國'; });
    renderEditorResult();
    $('#editor').hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => { if (!item) form.name.focus(); }, 50);
  }
  function closeEditor() { $('#editor').hidden = true; document.body.style.overflow = ''; }

  function renderPhoto() {
    const box = $('#photo-box');
    box.innerHTML = ui.editorPhoto ? `<img src="${ui.editorPhoto}" alt="商品照片">` : '<span class="photo-empty">＋ 照片</span>';
  }

  function formToItem() {
    const form = $('#item-form');
    const trip = currentTrip();
    const existing = form.id.value ? state.items.find((i) => i.id === form.id.value) : null;
    return newItem(trip.id, Object.assign({}, existing || {}, {
      brand: form.brand.value.trim(), name: form.name.value.trim(), note: form.note.value.trim(), store: form.store.value.trim(),
      date: form.date.value, qty: Math.max(1, Math.round(num(form.qty.value, 1))), homePrice: num(form.homePrice.value), localPrice: num(form.localPrice.value),
      taxFree: form.taxFree.checked, coupon: num(form.coupon.value), couponConfirmed: form.couponConfirmed.checked, bought: form.bought.checked, photo: ui.editorPhoto
    }));
  }

  function renderEditorResult() {
    const trip = currentTrip();
    const item = formToItem();
    const box = $('#editor-result');
    if (!(item.localPrice > 0)) {
      box.className = 'result';
      box.innerHTML = '<div class="label">輸入當地含稅標價後即時試算</div>';
      return;
    }
    const ok = groupOkFor(item, trip, tripItems(trip));
    const r = calcItem(item, trip, ok);
    const lines = [
      [trip.mode === 'refund' ? '現場付款（含稅）' : '現場付款', money(r.pay, trip.local)],
      r.couponApplied ? [`已套券 ${num(item.coupon)}%`, `-${money(r.local - r.afterCoupon, trip.local)}`] : null,
      r.eligible ? [trip.mode === 'refund' ? '預計退稅' : '免稅省下', money(trip.mode === 'refund' ? r.refund : r.tax, trip.local)] : null,
      ['實際成本', money(r.net, trip.local)],
      [`換算 ${trip.home}${num(trip.cardFee) > 0 ? `（含刷卡費 ${num(trip.cardFee)}%）` : ''}`, money(r.home, trip.home)],
      r.homeCompare > 0 ? [`本國參考價${r.qty > 1 ? ` ×${r.qty}` : ''}`, money(r.homeCompare, trip.home)] : null
    ].filter(Boolean);
    const warn = [];
    if (item.taxFree && !ok && num(trip.threshold) > 0) warn.push(`同店同日未稅合計未達 ${money(num(trip.threshold), trip.local)}，目前以不免稅計算。`);
    if (item.taxFree && num(trip.taxRate) <= 0) warn.push('稅率為 0，免稅沒有差異。');
    if (r.couponPending) warn.push(`折價券 ${num(item.coupon)}% 尚未確認，未套用；套券後約 ${money(r.withCoupon.home, trip.home)}。`);
    box.className = 'result ' + (r.verdict === 'none' ? '' : r.verdict);
    box.innerHTML = `<div class="label">實際成本換算</div><div class="big">${money(r.home, trip.home)}</div>
      <div class="lines">${lines.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
      <div class="verdict">${r.verdict === 'none' ? '填入本國參考價就能比較' : `${r.verdictText}：${r.saving >= 0 ? '省' : '多花'} ${money(Math.abs(r.saving), trip.home)}（${pct(Math.abs(r.ratio))}）`}</div>
      ${warn.map((w) => `<div class="warn">${esc(w)}</div>`).join('')}`;
  }

  function saveEditor() {
    const form = $('#item-form');
    if (!form.name.value.trim()) { form.name.focus(); toast('請填商品名稱'); return; }
    const item = formToItem();
    const idx = state.items.findIndex((i) => i.id === item.id);
    if (idx >= 0) state.items[idx] = item; else state.items.push(item);
    if (save()) { closeEditor(); renderAll(); toast(idx >= 0 ? '已更新' : '已加入清單'); }
  }

  function deleteItem(id) {
    const it = state.items.find((i) => i.id === id);
    if (!it) return;
    if (!confirm(`刪除「${it.name}」？`)) return;
    state.items = state.items.filter((i) => i.id !== id);
    save(); closeEditor(); renderAll(); toast('已刪除');
  }

  function handlePhoto(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 640;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        ui.editorPhoto = canvas.toDataURL('image/jpeg', 0.78);
        renderPhoto();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // ---------- 旅程與設定 ----------
  function saveTripForm(e) {
    e.preventDefault();
    const form = $('#trip-form');
    const trip = currentTrip();
    trip.name = form.name.value.trim() || '旅程';
    trip.countryKey = form.countryKey.value;
    trip.local = form.local.value.trim().toUpperCase() || 'JPY';
    trip.home = form.home.value.trim().toUpperCase() || 'TWD';
    trip.fx = num(form.fx.value, 1);
    trip.cardFee = num(form.cardFee.value);
    trip.taxRate = num(form.taxRate.value);
    trip.threshold = num(form.threshold.value);
    trip.departDate = form.departDate.value;
    trip.mode = form.mode.value === 'instant' ? 'instant' : 'refund';
    save(); renderAll(); toast('設定已儲存');
  }

  function applyCountryPreset(key) {
    const c = COUNTRIES[key]; if (!c) return;
    const form = $('#trip-form');
    if (c.local) form.local.value = c.local;
    if (key !== 'CUSTOM') { form.taxRate.value = c.taxRate; form.threshold.value = c.threshold; }
    const radio = form.querySelector(`input[name=mode][value=${c.mode}]`); if (radio) radio.checked = true;
    $('#country-hint').textContent = c.hint;
    $$('.local-code').forEach((el) => { el.textContent = form.local.value || '當地'; });
  }

  function addTrip() {
    const name = prompt('旅程名稱', '東京 ' + today().slice(0, 7));
    if (name == null) return;
    const t = newTrip({ name: name.trim() || '新旅程' });
    state.trips.push(t); state.currentTripId = t.id;
    save(); renderAll(); showTab('settings'); toast('已建立旅程');
  }
  function deleteTrip() {
    const trip = currentTrip();
    if (state.trips.length <= 1) { toast('至少要保留一個旅程'); return; }
    const n = tripItems(trip).length;
    if (!confirm(`刪除「${trip.name}」及其 ${n} 項商品？`)) return;
    state.items = state.items.filter((i) => i.tripId !== trip.id);
    state.trips = state.trips.filter((t) => t.id !== trip.id);
    state.currentTripId = state.trips[0].id;
    save(); renderAll(); toast('已刪除旅程');
  }
  function switchTrip(id) { state.currentTripId = id; save(); renderAll(); }

  function loadSample() {
    const n = state.items.length;
    const msg = n ? '另外建立一個「沖繩 2026/10」範例旅程？（不會影響現有資料）' : '載入「沖繩 2026/10」範例旅程？';
    if (!confirm(msg)) return;
    const t = newTrip(Object.assign({}, SAMPLE_TRIP));
    state.trips.push(t); state.currentTripId = t.id;
    SAMPLE_ITEMS.forEach((s) => state.items.push(newItem(t.id, s)));
    save(); renderAll(); showTab('list'); toast('已載入範例');
  }

  // ---------- 匯出／匯入／分享 ----------
  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `購物清單備份_${today()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.trips) || !Array.isArray(data.items)) throw new Error('bad');
        if (!confirm(`匯入 ${data.trips.length} 個旅程、${data.items.length} 項商品，並取代目前所有資料？`)) return;
        state = data;
        if (!state.trips.find((t) => t.id === state.currentTripId)) state.currentTripId = state.trips[0] && state.trips[0].id;
        if (!state.trips.length) { const t = newTrip({ name: '我的旅程' }); state.trips.push(t); state.currentTripId = t.id; }
        save(); renderAll(); toast('已匯入');
      } catch (_) { toast('檔案格式不正確'); }
    };
    reader.readAsText(file);
  }
  function summaryText() {
    const trip = currentTrip();
    const items = tripItems(trip);
    const t = totals(items, trip);
    const lines = [`【${trip.name}】購物清單（1 ${trip.local} = ${trip.fx} ${trip.home}${num(trip.cardFee) > 0 ? `，刷卡費 ${trip.cardFee}%` : ''}）`];
    items.forEach((it) => {
      const g = t.groups.get(groupKey(it));
      const r = calcItem(it, trip, g ? g.ok : true);
      const cmp = r.saving != null ? `（${r.saving >= 0 ? '省' : '多'} ${money(Math.abs(r.saving), trip.home)}，${pct(Math.abs(r.ratio))}）` : '';
      lines.push(`${it.bought ? '☑' : '☐'} ${[it.brand, it.name].filter(Boolean).join(' ')}${r.qty > 1 ? ` ×${r.qty}` : ''}｜現場 ${money(r.pay, trip.local)} → 實際約 ${money(r.home, trip.home)}${cmp}${it.store ? `｜${it.store}` : ''}`);
    });
    lines.push(`預計現場付款 ${money(t.pay, trip.local)}、預計退稅 ${money(t.refund, trip.local)}、實際成本約 ${money(t.home, trip.home)}`);
    lines.push('＊以上為試算，非官方金額。');
    return lines.join('\n');
  }
  async function copySummary() {
    const text = summaryText();
    try {
      if (navigator.share && /android|iphone|ipad/i.test(navigator.userAgent)) { await navigator.share({ text }); return; }
    } catch (_) { /* 使用者取消分享則改複製 */ }
    try { await navigator.clipboard.writeText(text); toast('已複製，可貼到 LINE'); }
    catch (_) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('已複製，可貼到 LINE'); } catch (e) { toast('複製失敗'); }
      ta.remove();
    }
  }

  // ---------- 分頁 ----------
  function showTab(name) {
    ui.tab = name;
    $$('.view').forEach((v) => { v.hidden = v.dataset.view !== name; });
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    $('#btn-add').hidden = name !== 'list';
    window.scrollTo({ top: 0 });
  }

  // ---------- 事件 ----------
  function bind() {
    $$('.tab').forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));
    $('#btn-add').addEventListener('click', () => openEditor(null));
    $('#btn-empty-add').addEventListener('click', () => openEditor(null));
    $('#btn-empty-sample').addEventListener('click', loadSample);
    $('#btn-sample').addEventListener('click', loadSample);
    $('#btn-trip-switch').addEventListener('click', () => { showTab('settings'); $('#trip-list').scrollIntoView({ behavior: 'smooth', block: 'center' }); });

    $('#brand-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-brand]'); if (b) { ui.brand = b.dataset.brand; renderList(currentTrip()); } });
    $$('.status-chips .chip').forEach((c) => c.addEventListener('click', () => { ui.status = c.dataset.status; renderList(currentTrip()); }));

    $('#item-list').addEventListener('click', (e) => {
      const buy = e.target.closest('[data-buy]');
      if (buy) {
        e.stopPropagation();
        const it = state.items.find((i) => i.id === buy.dataset.buy);
        if (it) { it.bought = !it.bought; if (it.bought && !it.date) it.date = today(); save(); renderAll(); }
        return;
      }
      const card = e.target.closest('.item');
      if (card) openEditor(card.dataset.id);
    });

    // 編輯面板
    $('#btn-editor-cancel').addEventListener('click', closeEditor);
    $('#btn-editor-save').addEventListener('click', saveEditor);
    $('#item-form').addEventListener('submit', (e) => { e.preventDefault(); saveEditor(); });
    $('#item-form').addEventListener('input', renderEditorResult);
    $('#item-form').addEventListener('change', (e) => {
      const form = $('#item-form');
      if (e.target.name === 'bought' && e.target.checked && !form.date.value) form.date.value = today();
      renderEditorResult();
    });
    $('#btn-editor-delete').addEventListener('click', () => deleteItem($('#item-form').id.value));
    $('#photo-input').addEventListener('change', (e) => { handlePhoto(e.target.files[0]); e.target.value = ''; });
    $('#btn-photo-clear').addEventListener('click', () => { ui.editorPhoto = null; renderPhoto(); });
    $('#editor').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeEditor(); });

    // 退稅
    $('#refund-bought-only').addEventListener('change', (e) => { ui.boughtOnly = e.target.checked; renderRefund(currentTrip()); });
    $('#checklist').addEventListener('change', (e) => {
      const i = e.target.dataset.check; if (i == null) return;
      const trip = currentTrip(); trip.checklist = trip.checklist || {}; trip.checklist[i] = e.target.checked; save();
    });

    // 設定
    $('#trip-form').addEventListener('submit', saveTripForm);
    $('#country-select').addEventListener('change', (e) => applyCountryPreset(e.target.value));
    $('#trip-form').local.addEventListener('input', (e) => { $$('.local-code').forEach((el) => { el.textContent = e.target.value.toUpperCase() || '當地'; }); });
    $('#trip-form').home.addEventListener('input', (e) => { $$('.home-code').forEach((el) => { el.textContent = e.target.value.toUpperCase() || '本國'; }); });
    $('#btn-trip-new').addEventListener('click', addTrip);
    $('#btn-trip-delete').addEventListener('click', deleteTrip);
    $('#trip-list').addEventListener('click', (e) => { const row = e.target.closest('[data-trip]'); if (row) switchTrip(row.dataset.trip); });
    $('#btn-copy-summary').addEventListener('click', copySummary);
    $('#btn-export').addEventListener('click', exportJson);
    $('#file-import').addEventListener('change', (e) => { importJson(e.target.files[0]); e.target.value = ''; });

    // 安裝
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); ui.installEvent = e; renderInstall(); });
    $('#btn-install').addEventListener('click', async () => {
      if (!ui.installEvent) return;
      ui.installEvent.prompt();
      try { await ui.installEvent.userChoice; } catch (_) { /* ignore */ }
      ui.installEvent = null; renderInstall();
    });
    window.addEventListener('appinstalled', () => { ui.installEvent = null; renderInstall(); toast('已安裝到主畫面'); });

    // 與另一個分頁同步
    window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY) { state = load(); renderAll(); } });
  }

  // ---------- 啟動 ----------
  bind();
  renderAll();
  showTab('list');
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* 非安全環境或不支援時略過 */ }); });
  }
})();
