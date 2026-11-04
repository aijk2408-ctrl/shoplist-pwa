/* 出國購物清單 PWA：本機儲存、離線可用、比價與退稅試算 */
(() => {
  'use strict';

  const STORAGE_KEY = 'shoplist.v1';
  const DRAFT_KEY = 'shoplist.draft';

  // 國家規則預設值（試算用，非官方；可在設定中覆寫）
  const COUNTRIES = {
    JP_REFUND: {
      label: '日本（2026/11/1 起・出境退稅）', local: 'JPY', taxRate: 10, threshold: 5000, mode: 'refund',
      hint: '店內付含稅價；出境前先在海關端末或 Visit Japan Web 辦理，再依店家指定方式退款。同店同日未稅滿 ¥5,000 才可退；需在出境前 90 天內購買，商品出境時須全部隨身。食品飲料稅率 8%，可在商品上個別設定。'
    },
    JP_OLD: {
      label: '日本（2026/10/31 前購買・現場免稅）', local: 'JPY', taxRate: 10, threshold: 5000, mode: 'instant',
      hint: '2026/10/31 以前購買適用：店內直接付未稅價，或在免稅櫃台當場退稅。同店同日未稅滿 ¥5,000。'
    },
    KR: {
      label: '韓國（現場即時退稅，參考值）', local: 'KRW', taxRate: 10, threshold: 15000, mode: 'instant',
      hint: '參考值：單筆 ₩15,000 以上多數店家可即時退稅，另有單筆與總額上限；請以店家公告為準並自行調整。'
    },
    TH: {
      label: '泰國（機場退稅，參考值）', local: 'THB', taxRate: 7, threshold: 2000, mode: 'refund', tripMinTotal: 5000, refundRatio: 100, refundFeePct: 0,
      hint: '參考值：同店同日滿 ฿2,000 並索取退稅表單，全程合計滿 ฿5,000，出境時在機場辦理，實際退回會扣手續費；請在進階參數調整「實際退回比例」。'
    },
    CUSTOM: {
      label: '自訂', local: '', taxRate: 0, threshold: 0, mode: 'refund',
      hint: '自行填入稅率、免稅門檻、退稅方式與進階參數。'
    }
  };

  const CHECKLISTS = {
    refund: [
      '購買紀錄齊全（電子紀錄綁定護照，或保留收據）',
      '所有免稅商品先到海關端末確認，再決定隨身或託運；出境前不拆封使用',
      '護照（入境時已蓋章或留有入境紀錄）',
      '全部商品都在出境前 90 天內購買',
      '到機場先辦海關端末或 Visit Japan Web，再去報到',
      '確認每家店的退款方式（信用卡、現金或電子支付）',
      '高單價商品可能被抽查，預留時間並由購買者本人攜帶'
    ],
    instant: [
      '免稅商品隨身攜帶，未拆封使用',
      '護照與購買紀錄備查',
      '出境時海關可能查驗，商品先放手提'
    ]
  };

  // 沖繩範例（取自原本的行程網站待買清單，價格查核日 2026/10/17）
  const SAMPLE_TRIP = { name: '沖繩 2026/10', countryKey: 'JP_REFUND', local: 'JPY', home: 'TWD', fx: 0.2072, fxDefault: false, cardFee: 0, taxRate: 10, threshold: 5000, mode: 'refund', refundEnabled: true, departDate: '', onboarded: true };
  const SAMPLE_ITEMS = [
    { brand: 'On', name: 'THE ROGER Advantage', note: '男款 US 8.5／JP 26.5；配色未指定', store: 'Sports Depo 天久店', homePrice: 5280, localPrice: 20900, coupon: 5, buyer: '爸爸' },
    { brand: 'On', name: 'Cloud X 5', note: '男款 US 8.5／JP 26.5；配色未指定', store: 'Sports Depo 天久店', homePrice: 5380, localPrice: 22000, coupon: 5, buyer: '爸爸' },
    { brand: 'On', name: 'Cloudtilt', note: '男款 US 8.5／JP 26.5；配色未指定', store: 'Sports Depo 天久店', homePrice: 5580, localPrice: 23100, coupon: 5, buyer: '爸爸' },
    { brand: 'HOKA', name: 'Mach 7', note: '男款 US 8.5／26.5 cm；一般楦與寬楦須分辨', store: 'Sports Depo 天久店', homePrice: 4480, localPrice: 17600, coupon: 5, buyer: '爸爸' },
    { brand: 'HOKA', name: 'ORA Recovery Slide 3', note: '拖鞋未見 US 8.5 半碼；現場試穿 US 8／9', store: 'Sports Depo 天久店', homePrice: 1980, localPrice: 8900, coupon: 5, buyer: '媽媽' },
    { brand: 'HOKA', name: 'Arahi 9', note: '男款 US 8.5／26.5 cm；一般楦與寬楦須分辨', store: 'Sports Depo 天久店', homePrice: 4572, localPrice: 19800, coupon: 5, buyer: '爸爸' },
    { brand: 'DJI', name: 'Osmo Pocket 4P 標準套裝', note: '日本型號 OP4P58／OM-POCKET4P-STD', store: 'YAMADA 那霸本店', homePrice: 19290, localPrice: 98010, coupon: 7, buyer: '爸爸', quotes: [{ store: 'EDION PARCO CITY', price: 99800, date: '' }] },
    { brand: 'DJI', name: 'Osmo Pocket 4P Vlog 套裝', note: '日本型號 OP4P62／OM-POCKET4P-VLOG', store: 'YAMADA 那霸本店', homePrice: 21790, localPrice: 112167, coupon: 7, buyer: '爸爸' },
    { brand: 'FUJIFILM', name: 'XF23mm F2.8 R WR', note: 'X 接環；黑／銀擇一，非 XF23mm F2 R WR', store: 'Kitamura 新都心店', homePrice: 14800, localPrice: 57420, coupon: 0, buyer: '爸爸' }
  ];

  // ---------- 狀態 ----------
  let state = load();
  let ui = { tab: 'list', brand: 'all', store: 'all', buyer: 'all', status: 'all', boughtOnly: false, editorPhoto: null, editorQuotes: [], editorSnapshot: '', installEvent: null, prefill: null };

  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function fmtDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function today() { return fmtDate(new Date()); }

  function newTrip(overrides) {
    const base = COUNTRIES.JP_REFUND;
    return Object.assign({
      id: uid(), name: '新旅程', countryKey: 'JP_REFUND', local: base.local, home: 'TWD', fx: 0.21, fxDefault: true, cardFee: 0, cards: [],
      budget: 0, taxRate: base.taxRate, threshold: base.threshold, mode: base.mode, refundEnabled: true, refundFeePct: 0, refundRatio: 100, tripMinTotal: 0,
      departDate: '', lastStore: '', lastBuyer: '', onboarded: false, checklist: {}, createdAt: Date.now(), updatedAt: Date.now()
    }, overrides || {});
  }
  function newItem(tripId, overrides) {
    return Object.assign({
      id: uid(), tripId, brand: '', name: '', note: '', store: '', date: '', buyer: '', card: '', qty: 1, homePrice: 0, localPrice: 0, altPrice: 0, altLabel: '',
      taxFree: true, taxRate: null, priceIsPretax: false, coupon: 0, couponConfirmed: false, bought: false, photo: null, quotes: [], createdAt: Date.now(), updatedAt: Date.now()
    }, overrides || {});
  }
  function refundOn(trip) { return trip.refundEnabled !== false; }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && Array.isArray(s.trips) && Array.isArray(s.items) && s.trips.length) {
          // 舊資料補欄位
          s.trips.forEach((t) => { if (!Array.isArray(t.cards)) t.cards = []; if (t.onboarded == null) t.onboarded = true; });
          s.items.forEach((i) => { if (!Array.isArray(i.quotes)) i.quotes = []; });
          return s;
        }
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
  function recentValues(trip, field, limit) {
    const seen = new Map();
    tripItems(trip).slice().sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
      .forEach((i) => { const s = (i[field] || '').trim(); if (s && !seen.has(normStore(s))) seen.set(normStore(s), s); });
    return Array.from(seen.values()).slice(0, limit || 50);
  }
  function recentStores(trip, limit) { return recentValues(trip, 'store', limit); }
  function recentBuyers(trip, limit) { return recentValues(trip, 'buyer', limit); }

  // ---------- 格式 ----------
  const SYMBOLS = { TWD: 'NT$', JPY: '¥', KRW: '₩', USD: 'US$', EUR: '€', GBP: '£', HKD: 'HK$', CNY: '¥', THB: '฿', SGD: 'S$', MYR: 'RM' };
  const ZERO_DEC = new Set(['JPY', 'KRW', 'TWD', 'HKD', 'THB']);
  function sym(code) { const c = (code || '').toUpperCase(); return SYMBOLS[c] || c || ''; }
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
  function normStore(s) { return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase(); }
  function itemRate(item, trip) { return item.taxRate != null && item.taxRate !== '' ? num(item.taxRate) : num(trip.taxRate); }
  function cardFeeFor(item, trip) {
    if (item.card === 'cash') return 0;
    const c = (trip.cards || []).find((x) => x.id === item.card);
    return c ? num(c.fee) : num(trip.cardFee);
  }
  function cardName(item, trip) {
    if (item.card === 'cash') return '現金';
    const c = (trip.cards || []).find((x) => x.id === item.card);
    return c ? c.name : '';
  }

  // ---------- 計算 ----------
  // 單一商品試算；groupOk 表示該店該日是否達到免稅門檻
  function calcItem(item, trip, groupOk) {
    const qty = Math.max(1, num(item.qty, 1));
    const local = num(item.localPrice) * qty;
    const rate = itemRate(item, trip) / 100;
    const couponRate = Math.min(99, Math.max(0, num(item.coupon))) / 100;
    const couponApplied = couponRate > 0 && !!item.couponConfirmed;
    const couponPending = couponRate > 0 && !item.couponConfirmed;
    const afterCoupon = local * (1 - (couponApplied ? couponRate : 0));
    const pretaxPrice = !!item.priceIsPretax; // 標價已不含稅（機場免稅店等）
    const pretax = pretaxPrice ? afterCoupon : (rate > 0 ? afterCoupon / (1 + rate) : afterCoupon);
    const tax = afterCoupon - pretax;
    const eligible = !pretaxPrice && refundOn(trip) && !!item.taxFree && groupOk !== false && rate > 0;
    // 實際可拿回：稅額 × 退回比例 − 購買金額 × 退稅手續費
    const ratio = trip.refundRatio == null || trip.refundRatio === '' ? 1 : num(trip.refundRatio) / 100;
    const refundFee = num(trip.refundFeePct) / 100;
    const refundAmt = eligible ? Math.max(0, tax * ratio - afterCoupon * refundFee) : 0;
    let pay, refund, net;
    if (eligible && trip.mode === 'instant') { pay = afterCoupon - refundAmt; refund = 0; net = pay; }
    else if (eligible) { pay = afterCoupon; refund = refundAmt; net = pay - refund; }
    else { pay = afterCoupon; refund = 0; net = afterCoupon; }
    const fx = num(trip.fx);
    const feePct = cardFeeFor(item, trip);
    const fee = 1 + feePct / 100;
    const payHome = pay * fx * fee;
    const refundHome = refund * fx;
    const home = payHome - refundHome;
    const homeCompare = num(item.homePrice) * qty;
    const saving = homeCompare > 0 ? homeCompare - home : null;
    const savingRatio = homeCompare > 0 ? saving / homeCompare : null;
    let verdict = 'none', verdictText = '未填出發地參考價';
    if (savingRatio != null) {
      if (savingRatio >= 0.10) { verdict = 'good'; verdictText = '✅ 值得在當地買'; }
      else if (savingRatio >= -0.05) { verdict = 'even'; verdictText = '➖ 價差不大，看方便'; }
      else { verdict = 'bad'; verdictText = '❌ 在出發地買較便宜'; }
    }
    const altCompare = num(item.altPrice) * qty;
    const altSaving = altCompare > 0 ? altCompare - home : null;
    // 若券尚未確認，另外算一個「套券後」的參考
    let withCoupon = null;
    if (couponPending) {
      const ac = local * (1 - couponRate);
      const pt = pretaxPrice ? ac : (rate > 0 ? ac / (1 + rate) : ac);
      const ra = eligible ? Math.max(0, (ac - pt) * ratio - ac * refundFee) : 0;
      let p2, r2;
      if (eligible && trip.mode === 'instant') { p2 = ac - ra; r2 = 0; } else if (eligible) { p2 = ac; r2 = ra; } else { p2 = ac; r2 = 0; }
      withCoupon = { net: p2 - r2, home: p2 * fx * fee - r2 * fx };
    }
    return { qty, local, afterCoupon, pretax, tax, pay, refund, net, payHome, refundHome, home, homeCompare, saving, ratio: savingRatio, verdict, verdictText, altCompare, altSaving, couponApplied, couponPending, withCoupon, eligible, pretaxPrice, feePct, taxFree: !!item.taxFree };
  }

  function countsForThreshold(it) { return !!it.taxFree && !it.priceIsPretax; }

  // 依店家＋日期＋買者分組判斷門檻。
  // 規則：沒填店家的商品各自單獨計算；填了店家但沒填日期的，併入該店（同買者）最近一次有日期的分組。
  function buildGroups(items, trip) {
    const map = new Map();
    const byItem = new Map();
    const keyOf = (it) => {
      const s = normStore(it.store);
      return s ? s + '|' + (it.date || '') + '|' + normStore(it.buyer) : '#' + it.id;
    };
    items.forEach((it) => {
      const k = keyOf(it);
      if (!map.has(k)) map.set(k, { key: k, store: it.store ? it.store.trim() : '', date: it.date || '', buyer: (it.buyer || '').trim(), noStore: !normStore(it.store), items: [], pretaxSum: 0 });
      map.get(k).items.push(it);
    });
    const buckets = new Map();
    map.forEach((g) => { if (!g.noStore) { const s = normStore(g.store) + '|' + normStore(g.buyer); if (!buckets.has(s)) buckets.set(s, []); buckets.get(s).push(g); } });
    buckets.forEach((gs) => {
      const undated = gs.find((g) => !g.date);
      const dated = gs.filter((g) => g.date).sort((a, b) => b.date.localeCompare(a.date));
      if (undated && dated.length) {
        dated[0].items = dated[0].items.concat(undated.items);
        dated[0].mergedUndated = undated.items.length;
        map.delete(undated.key);
      }
    });
    const th = num(trip.threshold);
    map.forEach((g) => {
      g.pretaxSum = 0;
      g.items.forEach((it) => { if (countsForThreshold(it)) g.pretaxSum += calcItem(it, trip, true).pretax; });
      g.ok = th <= 0 || g.pretaxSum >= th;
      g.shortfall = g.ok ? 0 : th - g.pretaxSum;
    });
    // 全程最低總額（泰國等）：達門檻分組的未稅合計仍不足時，全部不可退
    const minTotal = num(trip.tripMinTotal);
    let tripShort = false;
    if (minTotal > 0 && refundOn(trip)) {
      let sum = 0; map.forEach((g) => { if (g.ok) sum += g.pretaxSum; });
      if (sum < minTotal) { tripShort = true; map.forEach((g) => { g.ok = false; g.tripShort = minTotal - sum; }); }
    }
    map.forEach((g) => {
      g.pay = 0; g.refund = 0; g.net = 0; g.home = 0; g.payHome = 0;
      g.items.forEach((it) => {
        const r = calcItem(it, trip, g.ok);
        g.pay += r.pay; g.refund += r.refund; g.net += r.net; g.home += r.home; g.payHome += r.payHome;
        byItem.set(it.id, g);
      });
    });
    return { groups: map, byItem, tripShort };
  }

  function groupOkFor(item, trip, items) {
    const others = items.filter((i) => i.id !== item.id);
    const { byItem } = buildGroups(others.concat([item]), trip);
    const g = byItem.get(item.id);
    return g ? g.ok : true;
  }

  function totals(items, trip) {
    const { groups, byItem, tripShort } = buildGroups(items, trip);
    const t = { count: items.length, bought: items.filter((i) => i.bought).length, pay: 0, refund: 0, net: 0, home: 0, payHome: 0, saving: 0, homeCompare: 0, boughtPay: 0, boughtHome: 0, boughtPayHome: 0, todayPay: 0, byBuyer: new Map(), groups, byItem, tripShort };
    const td = today();
    groups.forEach((g) => {
      t.pay += g.pay; t.refund += g.refund; t.net += g.net; t.home += g.home; t.payHome += g.payHome;
      g.items.forEach((it) => {
        const r = calcItem(it, trip, g.ok);
        if (r.saving != null) { t.saving += r.saving; t.homeCompare += r.homeCompare; }
        if (it.bought) { t.boughtPay += r.pay; t.boughtHome += r.home; t.boughtPayHome += r.payHome; if (it.date === td) t.todayPay += r.pay; }
        const b = (it.buyer || '').trim() || '未指定';
        if (!t.byBuyer.has(b)) t.byBuyer.set(b, { buyer: b, count: 0, pay: 0, refund: 0, home: 0, payHome: 0 });
        const bb = t.byBuyer.get(b); bb.count++; bb.pay += r.pay; bb.refund += r.refund; bb.home += r.home; bb.payHome += r.payHome;
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
  function setCurrencyLabels(local, home) {
    $$('.local-code').forEach((el) => { el.textContent = local || '當地'; });
    $$('.home-code').forEach((el) => { el.textContent = home || '出發地'; });
    $$('.local-sym').forEach((el) => { el.textContent = sym(local) || '¤'; });
    $$('.home-sym').forEach((el) => { el.textContent = sym(home) || '¤'; });
  }

  // ---------- 渲染 ----------
  function renderAll() {
    const trip = currentTrip();
    $('#trip-title').textContent = trip.name || '出國購物清單';
    setCurrencyLabels(trip.local, trip.home);
    renderList(trip);
    renderRefund(trip);
    renderSettings(trip);
  }

  function chipRow(el, values, current, key, allLabel) {
    el.hidden = values.length < 2;
    el.innerHTML = [`<button type="button" class="chip ${current === 'all' ? 'active' : ''}" data-${key}="all">${allLabel}</button>`]
      .concat(values.map((v) => `<button type="button" class="chip ${current === normStore(v) ? 'active' : ''}" data-${key}="${esc(normStore(v))}">${esc(v)}</button>`)).join('');
  }

  function renderList(trip) {
    const items = tripItems(trip);
    const t = totals(items, trip);
    const summary = $('#summary');
    const budget = num(trip.budget);
    const fxStat = trip.fxDefault
      ? `<button type="button" class="stat link warn" data-goto="fx"><div class="k">匯率（預設值，請更新）</div><div class="v">1 ${esc(trip.local)} = ${esc(String(trip.fx))}</div><div class="s">點此到設定填入今天的匯率 ›</div></button>`
      : `<button type="button" class="stat link" data-goto="fx"><div class="k">匯率</div><div class="v">1 ${esc(trip.local)} = ${esc(String(trip.fx))}</div><div class="s">${num(trip.cardFee) > 0 ? `刷卡費 ${num(trip.cardFee)}%・` : ''}點此修改 ›</div></button>`;
    let budgetStat;
    if (budget > 0) {
      const used = t.boughtPay / budget;
      const left = budget - t.boughtPay;
      budgetStat = `<button type="button" class="stat link ${used >= 1 ? 'bad' : (used >= 0.9 ? 'warn' : '')}" data-goto="budget"><div class="k">預算${used >= 1 ? '（已超支）' : ''}</div><div class="v">${left >= 0 ? '剩 ' : '超 '}${money(Math.abs(left), trip.local)}</div><div class="s">預算 ${money(budget, trip.local)}，已用 ${pct(used)}</div></button>`;
    } else {
      budgetStat = `<button type="button" class="stat link" data-goto="budget"><div class="k">預算</div><div class="v">未設定</div><div class="s">設定後顯示剩多少 ›</div></button>`;
    }
    summary.innerHTML = [
      stat('已花（已買）', money(t.boughtPay, trip.local), `≈ ${money(t.boughtPayHome, trip.home)}・今天 ${money(t.todayPay, trip.local)}`),
      budgetStat,
      stat('全部清單', `${t.count} 項`, `已買 ${t.bought} 項・預計 ${money(t.pay, trip.local)}`),
      refundOn(trip)
        ? stat('預計退稅', money(t.refund, trip.local), trip.mode === 'refund' ? '出境後拿回，依各店門檻' : '現場直接扣除')
        : stat('退稅', '不辦理', '可在設定中開啟'),
      stat(`退稅後成本（${trip.home}）`, money(t.home, trip.home), t.homeCompare > 0 ? `比出發地${t.saving >= 0 ? '省' : '多'} ${money(Math.abs(t.saving), trip.home)}` : `已買 ${money(t.boughtHome, trip.home)}`, t.saving > 0 ? 'good' : (t.saving < 0 ? 'bad' : '')),
      fxStat
    ].join('');

    // 快速記一筆提示
    const lastStore = trip.lastStore || recentStores(trip, 1)[0] || '';
    const lastBuyer = trip.lastBuyer || '';
    $('#quick-hint').textContent = `會記為「已購買、今天」${lastStore ? `，店家沿用「${lastStore}」` : ''}${lastBuyer ? `，買者「${lastBuyer}」` : ''}；之後點卡片可補細節。`;
    $('#quick-form').price.placeholder = `標價（${sym(trip.local) || trip.local}）`;

    // 篩選列
    const stores = recentStores(trip).sort((a, b) => a.localeCompare(b));
    if (ui.store !== 'all' && !stores.some((s) => normStore(s) === ui.store)) ui.store = 'all';
    chipRow($('#store-chips'), stores, ui.store, 'store', '全部店家');
    const buyers = recentBuyers(trip).sort((a, b) => a.localeCompare(b));
    if (ui.buyer !== 'all' && !buyers.some((s) => normStore(s) === ui.buyer)) ui.buyer = 'all';
    chipRow($('#buyer-chips'), buyers, ui.buyer, 'buyer', '全部買者');
    const brands = Array.from(new Set(items.map((i) => (i.brand || '').trim()).filter(Boolean))).sort();
    if (ui.brand !== 'all' && !brands.some((b) => normStore(b) === ui.brand)) ui.brand = 'all';
    chipRow($('#brand-chips'), brands, ui.brand, 'brand', '全部品牌');
    $$('.status-chips .chip').forEach((c) => c.classList.toggle('active', c.dataset.status === ui.status));

    const shown = items.filter((i) =>
      (ui.brand === 'all' || normStore(i.brand) === ui.brand) &&
      (ui.store === 'all' || normStore(i.store) === ui.store) &&
      (ui.buyer === 'all' || normStore(i.buyer) === ui.buyer) &&
      (ui.status === 'all' || (ui.status === 'done') === !!i.bought));
    const list = $('#item-list');
    $('#empty-state').hidden = items.length > 0;
    if (!shown.length) {
      list.innerHTML = items.length ? '<p class="hint" style="text-align:center">沒有符合篩選的商品。</p>' : '';
      return;
    }
    const th = num(trip.threshold);
    list.innerHTML = shown.map((it) => {
      const g = t.byItem.get(it.id);
      const r = calcItem(it, trip, g ? g.ok : true);
      let flag = '', flagCls = '';
      if (refundOn(trip) && countsForThreshold(it) && g && !g.ok && th > 0) {
        if (g.tripShort) { flag = `全程未稅合計還差 ${money(g.tripShort, trip.local)} 才能退稅`; flagCls = 'warn'; }
        else if (g.noStore) {
          if (r.pretax < th) { flag = `填店家後可與同店商品合併計算免稅`; flagCls = 'warnless'; }
        } else {
          flag = `${g.store}${g.buyer ? `（${g.buyer}）` : ''} 今天再買 ${money(g.shortfall, trip.local)}（未稅）就能免稅`; flagCls = 'warn';
        }
      } else if (r.couponPending) {
        flag = `券 ${num(it.coupon)}% 待店員確認${r.withCoupon ? `，套券後約 ${money(r.withCoupon.home, trip.home)}` : ''}`; flagCls = 'warnless';
      }
      const thumb = it.photo ? `<img src="${it.photo}" alt="">` : '🛍️';
      const badge = r.verdict === 'none' ? ''
        : `<span class="badge ${r.verdict}">${r.verdictText.slice(0, 1)} ${r.saving >= 0 ? '省' : '多'} ${money(Math.abs(r.saving), trip.home)}・${pct(Math.abs(r.ratio))}</span>`;
      const tags = [];
      if (it.buyer) tags.push(`👤 ${it.buyer}`);
      if (it.priceIsPretax) tags.push('標價已免稅');
      if (it.taxRate != null && it.taxRate !== '' && num(it.taxRate) !== num(trip.taxRate)) tags.push(`稅率 ${num(it.taxRate)}%`);
      const cn = cardName(it, trip); if (cn) tags.push(cn);
      let quoteLine = '';
      if (it.quotes && it.quotes.length) {
        const best = it.quotes.slice().sort((a, b) => num(a.price) - num(b.price))[0];
        const cheaper = num(best.price) < num(it.localPrice);
        quoteLine = `<span class="unit">另 ${it.quotes.length} 家報價${cheaper ? `，${best.store} 較便宜 ${money(num(best.price), trip.local)}` : `，最低 ${money(num(best.price), trip.local)}`}</span>`;
      }
      const unit = r.qty > 1 ? `<span class="unit">${money(num(it.localPrice), trip.local)} × ${r.qty}</span>` : '';
      const prices = [`<span>現場 <b>${money(r.pay, trip.local)}</b> ≈ ${money(r.payHome, trip.home)}</span>`];
      if (r.eligible && r.refund > 0) prices.push(`<span>退稅後 <b>${money(r.home, trip.home)}</b></span>`);
      if (r.homeCompare > 0) prices.push(`<span>出發地 ${money(r.homeCompare, trip.home)}</span>`);
      return `<div class="item ${it.bought ? 'bought' : ''}" data-id="${it.id}">
        <button type="button" class="buy ${it.bought ? 'on' : ''}" data-buy="${it.id}" aria-pressed="${!!it.bought}" aria-label="已購買">${it.bought ? '✓' : ''}</button>
        <button type="button" class="item-main" data-open="${it.id}">
          <div class="thumb">${thumb}</div>
          <div>
            ${it.brand ? `<div class="brand">${esc(it.brand)}</div>` : ''}
            <div class="name">${esc(it.name)}${r.qty > 1 ? ` ×${r.qty}` : ''}</div>
            <div class="meta">${esc([it.store, it.note].concat(tags).filter(Boolean).join('｜'))}</div>
            <div class="prices">${unit}${prices.join('')}${quoteLine}</div>
            ${badge ? `<div class="badges">${badge}</div>` : ''}
            ${flag ? `<div class="flag ${flagCls}">${esc(flag)}</div>` : ''}
          </div>
        </button>
      </div>`;
    }).join('');
  }

  function stat(k, v, s, cls) {
    return `<div class="stat ${cls || ''}"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div><div class="s">${esc(s || '')}</div></div>`;
  }

  function renderRefund(trip) {
    const all = tripItems(trip);
    const items = ui.boughtOnly ? all.filter((i) => i.bought) : all;
    const c = COUNTRIES[trip.countryKey] || COUNTRIES.CUSTOM;
    let modeText;
    if (!refundOn(trip)) modeText = '這個旅程設定為「不辦退稅」：所有商品以含稅價計算。若會辦退稅，請到設定開啟。';
    else if (trip.mode === 'refund') modeText = '這個旅程採「出境退稅」：店內付含稅價，離境時依規定退稅。下方的「預計退稅」是你出境後應拿回的金額。';
    else modeText = '這個旅程採「現場免稅」：達門檻的店家直接付未稅價，沒有額外退稅步驟。';
    let dateHint = '';
    if (refundOn(trip) && trip.mode === 'refund' && trip.departDate && trip.countryKey === 'JP_REFUND') {
      const d = new Date(trip.departDate + 'T00:00:00'); d.setDate(d.getDate() - 90);
      dateHint = ` 出境日 ${trip.departDate}，購買日期須在 ${fmtDate(d)} 之後。`;
    }
    const adv = [];
    if (num(trip.refundFeePct) > 0) adv.push(`退稅手續費 ${num(trip.refundFeePct)}%`);
    if (trip.refundRatio != null && trip.refundRatio !== '' && num(trip.refundRatio) < 100) adv.push(`實際退回 ${num(trip.refundRatio)}%`);
    if (num(trip.tripMinTotal) > 0) adv.push(`全程最低 ${money(num(trip.tripMinTotal), trip.local)}`);
    $('#refund-mode-note').innerHTML = `<b>${esc(c.label === '自訂' ? '自訂規則' : c.label)}</b><br>${esc(modeText)}${esc(dateHint)}${adv.length ? `<br>已套用：${esc(adv.join('、'))}` : ''}<br><span class="hint">${esc(c.hint)}</span>`;

    const t = totals(items, trip);
    $('#refund-totals').innerHTML = [
      stat('現場付款合計', money(t.pay, trip.local), `≈ ${money(t.payHome, trip.home)}・${items.length} 項`),
      stat('預計退稅合計', money(t.refund, trip.local), !refundOn(trip) ? '不辦退稅' : (t.tripShort ? '全程未達最低總額' : (trip.mode === 'refund' ? '達門檻的店才計入' : '現場免稅不另退'))),
      stat('退稅後成本合計', money(t.net, trip.local), '付款減退稅'),
      stat(`換算 ${trip.home}`, money(t.home, trip.home), '含刷卡手續費')
    ].join('');

    // 每人小計
    const buyers = Array.from(t.byBuyer.values()).filter((b) => !(b.buyer === '未指定' && t.byBuyer.size === 1));
    $('#buyer-card').hidden = !buyers.length || (buyers.length === 1 && buyers[0].buyer === '未指定');
    $('#buyer-totals').innerHTML = `<div class="buyer-table">${buyers.map((b) => `<div class="buyer-row"><div><b>${esc(b.buyer)}</b><span class="small">${b.count} 項</span></div><div>現場 ${money(b.pay, trip.local)}</div><div>退稅 ${money(b.refund, trip.local)}</div><div><b>${money(b.home, trip.home)}</b></div></div>`).join('')}</div>`;

    const th = num(trip.threshold);
    $('#threshold-hint').textContent = !refundOn(trip) ? '此旅程不辦退稅，以下僅供參考。'
      : (th > 0
        ? `同一家店、同一天、同一位買者的免稅商品未稅合計需達 ${money(th, trip.local)}。沒填日期的併入該店最近一次購買日；沒填店家的不合併；標價已免稅的不計入。`
        : '目前未設定門檻，所有勾選可免稅的商品都視為可退。');

    const groups = Array.from(t.groups.values());
    const storeGroups = groups.filter((g) => !g.noStore).sort((a, b) => a.store.localeCompare(b.store) || (a.date || '').localeCompare(b.date || '') || a.buyer.localeCompare(b.buyer));
    const noStore = groups.filter((g) => g.noStore);
    let html = storeGroups.map((g) => {
      const taxItems = g.items.filter(countsForThreshold);
      const status = !refundOn(trip) ? '' : (!taxItems.length ? '<span class="badge none">無免稅商品</span>'
        : (g.ok ? '<span class="badge good">達門檻</span>' : (g.tripShort ? '<span class="badge bad">全程未達</span>' : `<span class="badge bad">差 ${money(g.shortfall, trip.local)}</span>`)));
      return `<div class="group">
        <div class="g-head"><div><div class="g-store">${esc(g.store)}${g.buyer ? ` <span class="small">👤 ${esc(g.buyer)}</span>` : ''}</div><div class="g-date">${esc(g.date || '日期未填')}・${g.items.length} 項${g.mergedUndated ? `（含 ${g.mergedUndated} 項未填日期）` : ''}</div></div>${status}</div>
        <div class="g-lines">
          <div><span>免稅商品未稅合計</span><b>${money(g.pretaxSum, trip.local)}</b></div>
          <div><span>現場付款</span><b>${money(g.pay, trip.local)}</b></div>
          <div><span>預計退稅</span><b>${money(g.refund, trip.local)}</b></div>
        </div>
        <div class="g-items">${esc(g.items.map((i) => (i.bought ? '✓ ' : '') + [i.brand, i.name].filter(Boolean).join(' ')).join('、'))}</div>
      </div>`;
    }).join('');
    if (noStore.length) {
      const nItems = noStore.reduce((s, g) => s + g.items.length, 0);
      const pay = noStore.reduce((s, g) => s + g.pay, 0);
      const refund = noStore.reduce((s, g) => s + g.refund, 0);
      const names = noStore.flatMap((g) => g.items).map((i) => (i.bought ? '✓ ' : '') + [i.brand, i.name].filter(Boolean).join(' ')).join('、');
      html += `<div class="group muted">
        <div class="g-head"><div><div class="g-store">未填店家</div><div class="g-date">${nItems} 項・各自單獨計算</div></div>${refundOn(trip) && th > 0 ? '<span class="badge none">未合併</span>' : ''}</div>
        <div class="g-lines">
          <div><span>現場付款</span><b>${money(pay, trip.local)}</b></div>
          <div><span>預計退稅</span><b>${money(refund, trip.local)}</b></div>
        </div>
        <div class="g-items">${esc(names)}</div>
        ${refundOn(trip) && th > 0 ? '<p class="hint">在商品填上店家，就能和同店同日的商品合併計算門檻。</p>' : ''}
      </div>`;
    }
    $('#refund-groups').innerHTML = html || '<p class="hint">還沒有商品。</p>';

    const list = CHECKLISTS[trip.mode] || CHECKLISTS.refund;
    trip.checklist = trip.checklist || {};
    $('#checklist-card').hidden = !refundOn(trip);
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
    form.budget.value = num(trip.budget) > 0 ? trip.budget : '';
    form.cardFee.value = trip.cardFee;
    form.taxRate.value = trip.taxRate;
    form.threshold.value = trip.threshold;
    form.departDate.value = trip.departDate || '';
    form.refundEnabled.checked = refundOn(trip);
    form.refundFeePct.value = num(trip.refundFeePct) > 0 ? trip.refundFeePct : '';
    form.refundRatio.value = trip.refundRatio != null && trip.refundRatio !== '' && num(trip.refundRatio) !== 100 ? trip.refundRatio : '';
    form.tripMinTotal.value = num(trip.tripMinTotal) > 0 ? trip.tripMinTotal : '';
    const radio = form.querySelector(`input[name=mode][value=${trip.mode === 'instant' ? 'instant' : 'refund'}]`);
    if (radio) radio.checked = true;
    $('#country-hint').textContent = (COUNTRIES[trip.countryKey] || COUNTRIES.CUSTOM).hint;
    renderCards(trip.cards || []);
    renderFxPreview();

    $('#trip-list').innerHTML = state.trips.map((t) => {
      const n = state.items.filter((i) => i.tripId === t.id).length;
      return `<div class="trip-row ${t.id === trip.id ? 'active' : ''}" data-trip="${t.id}"><span>${esc(t.name)}</span><span class="small">${n} 項・${esc(t.local)}→${esc(t.home)}</span></div>`;
    }).join('');

    renderInstall();
  }

  function renderCards(cards) {
    const box = $('#cards-list');
    box.innerHTML = cards.map((c) => `<div class="card-row" data-card="${esc(c.id)}">
      <input type="text" value="${esc(c.name)}" placeholder="卡片名稱，例：JCB" data-card-name>
      <input type="number" value="${esc(c.fee)}" step="0.1" min="0" max="20" inputmode="decimal" placeholder="費率 %" data-card-fee>
      <button type="button" class="btn small danger" data-card-del>刪除</button>
    </div>`).join('');
  }
  function readCards() {
    return $$('#cards-list .card-row').map((row) => ({ id: row.dataset.card, name: $('[data-card-name]', row).value.trim() || '卡片', fee: num($('[data-card-fee]', row).value) }));
  }

  // 匯率即時預覽與填反提示
  function fxPreviewText(fx, local, home) {
    if (!(fx > 0)) return { text: '請填入「1 當地幣 ＝ 多少出發地幣」。', warn: false };
    const sample = ['JPY', 'KRW'].includes(local) ? 1000 : 100;
    let text = `${money(sample, local)} ≈ ${money(sample * fx, home)}`;
    const smallUnit = ['JPY', 'KRW', 'THB', 'TWD', 'HKD', 'CNY'].includes(local) && ['TWD', 'HKD', 'USD', 'EUR', 'GBP', 'SGD', 'CNY', 'MYR'].includes(home);
    const reversed = (fx >= 1 && smallUnit && local !== home && !(local === 'TWD' && home === 'HKD') && !(local === 'CNY' && home === 'HKD')) || fx >= 100;
    if (reversed) text += `。匯率看起來填反了：這裡要填「1 ${local} 換多少 ${home}」，通常小於 1。`;
    return { text, warn: reversed };
  }
  function renderFxPreview() {
    const form = $('#trip-form');
    const local = (form.local.value || '').trim().toUpperCase() || '當地';
    const home = (form.home.value || '').trim().toUpperCase() || '出發地';
    const p = fxPreviewText(num(form.fx.value), local, home);
    const box = $('#fx-preview');
    box.className = 'hint' + (p.warn ? ' fx-warn' : '');
    box.textContent = p.text;
    const link = home === 'TWD'
      ? `<a href="https://rate.bot.com.tw/xrt?Lang=zh-TW" target="_blank" rel="noopener">臺銀牌告匯率 ↗</a>（現金或即期賣出）`
      : `<a href="https://www.google.com/search?q=1+${encodeURIComponent(local)}+to+${encodeURIComponent(home)}" target="_blank" rel="noopener">查 1 ${esc(local)} 兌 ${esc(home)} 匯率 ↗</a>`;
    $('#fx-link').innerHTML = `參考 ${link}。若填的是刷卡實際匯率，手續費請設 0。`;
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

  // ---------- 首次設定 ----------
  function openOnboard() {
    const trip = currentTrip();
    const form = $('#onboard-form');
    const sel = $('#onboard-country');
    sel.innerHTML = Object.keys(COUNTRIES).filter((k) => k !== 'JP_OLD').map((k) => `<option value="${k}">${esc(COUNTRIES[k].label)}</option>`).join('');
    form.home.value = ['TWD', 'HKD', 'SGD', 'MYR', 'USD'].includes(trip.home) ? trip.home : 'OTHER';
    form.homeOther.value = form.home.value === 'OTHER' ? trip.home : '';
    $('#onboard-home-other').hidden = form.home.value !== 'OTHER';
    form.countryKey.value = trip.countryKey && trip.countryKey !== 'JP_OLD' ? trip.countryKey : 'JP_REFUND';
    form.fx.value = trip.fxDefault ? '' : trip.fx;
    form.refundEnabled.checked = refundOn(trip);
    renderOnboardPreview();
    $('#onboard').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function onboardHome() {
    const form = $('#onboard-form');
    return (form.home.value === 'OTHER' ? form.homeOther.value.trim().toUpperCase() : form.home.value) || 'TWD';
  }
  function renderOnboardPreview() {
    const form = $('#onboard-form');
    const c = COUNTRIES[form.countryKey.value] || COUNTRIES.JP_REFUND;
    const local = c.local || '當地';
    $$('.ob-local').forEach((el) => { el.textContent = local; });
    $$('.ob-home').forEach((el) => { el.textContent = onboardHome(); });
    $('#onboard-home-other').hidden = form.home.value !== 'OTHER';
    const fx = num(form.fx.value);
    const box = $('#onboard-fx-preview');
    if (!(fx > 0)) { box.className = 'hint'; box.textContent = '可以先空著，之後清單頁會提醒你填。'; return; }
    const p = fxPreviewText(fx, local, onboardHome());
    box.className = 'hint' + (p.warn ? ' fx-warn' : ''); box.textContent = p.text;
  }
  function closeOnboard(apply) {
    const trip = currentTrip();
    if (apply) {
      const form = $('#onboard-form');
      const c = COUNTRIES[form.countryKey.value] || COUNTRIES.JP_REFUND;
      trip.home = onboardHome();
      trip.countryKey = form.countryKey.value;
      if (c.local) trip.local = c.local;
      trip.taxRate = c.taxRate; trip.threshold = c.threshold; trip.mode = c.mode;
      trip.tripMinTotal = c.tripMinTotal || 0; trip.refundRatio = c.refundRatio == null ? 100 : c.refundRatio; trip.refundFeePct = c.refundFeePct || 0;
      const fx = num(form.fx.value);
      if (fx > 0) { trip.fx = fx; trip.fxDefault = false; }
      trip.refundEnabled = form.refundEnabled.checked;
    }
    trip.onboarded = true;
    save();
    $('#onboard').hidden = true; document.body.style.overflow = '';
    renderAll();
    if (apply) toast('設定完成');
  }

  // ---------- 編輯面板 ----------
  const FIELDS = ['brand', 'name', 'note', 'store', 'date', 'buyer', 'card', 'qty', 'homePrice', 'localPrice', 'altPrice', 'altLabel', 'taxRate', 'coupon'];
  const CHECKS = ['taxFree', 'priceIsPretax', 'couponConfirmed', 'bought'];

  function formSnapshot() {
    const form = $('#item-form');
    const o = {};
    FIELDS.forEach((f) => { o[f] = form[f].value; });
    CHECKS.forEach((f) => { o[f] = form[f].checked; });
    o.photo = ui.editorPhoto ? ui.editorPhoto.length : 0;
    o.quotes = JSON.stringify(ui.editorQuotes);
    return JSON.stringify(o);
  }
  function applySnapshot(data) {
    const form = $('#item-form');
    FIELDS.forEach((f) => { if (data[f] != null) form[f].value = data[f]; });
    CHECKS.forEach((f) => { if (data[f] != null) form[f].checked = !!data[f]; });
  }
  function saveDraft() {
    const form = $('#item-form');
    if ($('#editor').hidden) return;
    const data = {};
    FIELDS.forEach((f) => { data[f] = form[f].value; });
    CHECKS.forEach((f) => { data[f] = form[f].checked; });
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ id: form.id.value || '', tripId: currentTrip().id, data, photo: ui.editorPhoto, quotes: ui.editorQuotes })); } catch (_) { /* 空間不足就略過草稿 */ }
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (_) { /* ignore */ } }
  function readDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (_) { return null; } }

  function openEditor(id) {
    const trip = currentTrip();
    const form = $('#item-form');
    form.reset();
    const item = id ? state.items.find((i) => i.id === id) : null;
    $('#editor-title').textContent = item ? '編輯商品' : '新增商品';
    $('#btn-editor-delete').hidden = !item;
    $('#btn-editor-save-next').hidden = !!item;
    // 付款方式選項
    const cardSel = $('#card-select');
    cardSel.innerHTML = [`<option value="">旅程預設（${num(trip.cardFee)}%）</option>`, '<option value="cash">現金（0%）</option>']
      .concat((trip.cards || []).map((c) => `<option value="${esc(c.id)}">${esc(c.name)}（${num(c.fee)}%）</option>`)).join('');
    form.id.value = item ? item.id : '';
    form.brand.value = item ? item.brand : '';
    form.name.value = item ? item.name : '';
    form.note.value = item ? item.note : '';
    form.store.value = item ? item.store : (ui.prefill ? ui.prefill.store : '');
    form.date.value = item ? (item.date || '') : (ui.prefill ? ui.prefill.date : '');
    form.buyer.value = item ? (item.buyer || '') : (ui.prefill ? ui.prefill.buyer : (trip.lastBuyer || ''));
    form.card.value = item && item.card ? item.card : '';
    if (form.card.value !== (item && item.card ? item.card : '')) form.card.value = '';
    form.qty.value = item ? item.qty : 1;
    form.homePrice.value = item && item.homePrice ? item.homePrice : '';
    form.localPrice.value = item && item.localPrice ? item.localPrice : '';
    form.altPrice.value = item && item.altPrice ? item.altPrice : '';
    form.altLabel.value = item ? (item.altLabel || '') : '';
    form.taxRate.value = item && item.taxRate != null && item.taxRate !== '' ? String(num(item.taxRate)) : '';
    form.taxFree.checked = item ? !!item.taxFree : refundOn(trip);
    form.priceIsPretax.checked = item ? !!item.priceIsPretax : false;
    form.coupon.value = item ? item.coupon : 0;
    form.couponConfirmed.checked = item ? !!item.couponConfirmed : false;
    form.bought.checked = item ? !!item.bought : false;
    $('#editor-more').open = !!(item && (item.brand || item.note || item.photo || item.altPrice));
    $('#editor-quotes').open = !!(item && item.quotes && item.quotes.length);
    ui.editorPhoto = item ? item.photo : null;
    ui.editorQuotes = item && Array.isArray(item.quotes) ? item.quotes.map((q) => Object.assign({}, q)) : [];
    ui.prefill = null;
    ui.editorSnapshot = formSnapshot(); // 以未套草稿前的內容為基準，還原的草稿仍視為未儲存
    const draft = readDraft();
    if (draft && draft.tripId === trip.id && (draft.id || '') === (id || '')) {
      applySnapshot(draft.data || {});
      if (draft.photo) ui.editorPhoto = draft.photo;
      if (Array.isArray(draft.quotes)) ui.editorQuotes = draft.quotes;
      toast('已還原上次未儲存的內容');
    }
    renderPhoto();
    renderQuotes(trip);
    renderStoreQuick(trip);
    setCurrencyLabels(trip.local, trip.home);
    renderTaxRows(trip);
    renderEditorResult();
    $('#editor').hidden = false;
    document.body.style.overflow = 'hidden';
    $('#editor .sheet-body').scrollTop = 0;
    setTimeout(() => { if (!item) form.name.focus(); }, 50);
  }
  function renderStoreQuick(trip) {
    const stores = recentStores(trip, 6);
    $('#store-list').innerHTML = recentStores(trip).map((s) => `<option value="${esc(s)}">`).join('');
    const box = $('#store-quick');
    box.hidden = !stores.length;
    box.innerHTML = stores.map((s) => `<button type="button" class="chip" data-pick-store="${esc(s)}">${esc(s)}</button>`).join('');
    const buyers = recentBuyers(trip, 6);
    $('#buyer-list').innerHTML = buyers.map((s) => `<option value="${esc(s)}">`).join('');
    const bb = $('#buyer-quick');
    bb.hidden = !buyers.length;
    bb.innerHTML = buyers.map((s) => `<button type="button" class="chip" data-pick-buyer="${esc(s)}">${esc(s)}</button>`).join('');
  }
  function renderQuotes(trip) {
    const box = $('#quotes-list');
    const main = num($('#item-form').localPrice.value);
    box.innerHTML = ui.editorQuotes.length ? ui.editorQuotes.map((q, i) => {
      const p = num(q.price);
      const diff = main > 0 && p > 0 ? p - main : null;
      return `<div class="quote-row"><div><b>${esc(q.store || '未填店家')}</b><span class="small">${diff == null ? '' : (diff < 0 ? ` 便宜 ${money(-diff, trip.local)}` : (diff > 0 ? ` 貴 ${money(diff, trip.local)}` : ' 同價'))}</span></div><div>${money(p, trip.local)}</div><div><button type="button" class="btn small" data-quote-use="${i}">採用</button> <button type="button" class="btn small danger" data-quote-del="${i}">刪</button></div></div>`;
    }).join('') : '<p class="hint">還沒有其他店的報價。</p>';
  }
  function renderTaxRows(trip) {
    const form = $('#item-form');
    $('#taxfree-row').hidden = !refundOn(trip) || form.priceIsPretax.checked;
  }
  function closeEditor(force) {
    if (!force && !$('#editor').hidden && formSnapshot() !== ui.editorSnapshot) {
      if (!confirm('有尚未儲存的修改，確定要放棄？')) return false;
    }
    clearDraft();
    $('#editor').hidden = true; document.body.style.overflow = '';
    return true;
  }

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
      date: form.date.value, buyer: form.buyer.value.trim(), card: form.card.value, qty: Math.max(1, Math.round(num(form.qty.value, 1))),
      homePrice: num(form.homePrice.value), localPrice: num(form.localPrice.value), altPrice: num(form.altPrice.value), altLabel: form.altLabel.value.trim(),
      taxFree: form.taxFree.checked, taxRate: form.taxRate.value === '' ? null : num(form.taxRate.value), priceIsPretax: form.priceIsPretax.checked,
      coupon: num(form.coupon.value), couponConfirmed: form.couponConfirmed.checked, bought: form.bought.checked, photo: ui.editorPhoto,
      quotes: ui.editorQuotes.map((q) => ({ store: (q.store || '').trim(), price: num(q.price), date: q.date || '' })), updatedAt: Date.now()
    }));
  }

  function renderEditorResult() {
    const trip = currentTrip();
    const item = formToItem();
    const box = $('#editor-result');
    if (!(item.localPrice > 0)) {
      box.className = 'result';
      box.innerHTML = '<div class="label">輸入當地標價後即時試算</div>';
      return;
    }
    const ok = groupOkFor(item, trip, tripItems(trip));
    const r = calcItem(item, trip, ok);
    const th = num(trip.threshold);
    const lines = [
      r.qty > 1 ? ['單價 × 數量', `${money(num(item.localPrice), trip.local)} × ${r.qty}`] : null,
      r.couponApplied ? [`已套券 ${num(item.coupon)}%`, `-${money(r.local - r.afterCoupon, trip.local)}`] : null,
      [r.pretaxPrice ? '現場付款（標價已免稅）' : (trip.mode === 'refund' || !r.eligible ? '現場付款（含稅）' : '現場付款（已免稅）'), money(r.pay, trip.local)],
      r.eligible && r.refund > 0 ? ['預計退稅', `${money(r.refund, trip.local)} ≈ ${money(r.refundHome, trip.home)}`] : null,
      r.eligible && r.refund > 0 ? [`退稅後成本`, money(r.home, trip.home)] : null,
      r.homeCompare > 0 ? [`出發地參考價${r.qty > 1 ? ` ×${r.qty}` : ''}`, money(r.homeCompare, trip.home)] : null,
      r.altCompare > 0 ? [`${item.altLabel || '第二參考價'}${r.qty > 1 ? ` ×${r.qty}` : ''}`, `${money(r.altCompare, trip.home)}（${r.altSaving >= 0 ? '省' : '多'} ${money(Math.abs(r.altSaving), trip.home)}）`] : null
    ].filter(Boolean);
    const warn = [];
    if (trip.fxDefault) warn.push(`目前用的是預設匯率 ${trip.fx}，請到設定填入今天的匯率。`);
    if (r.homeCompare > 0) {
      const k = (num(item.localPrice) * num(trip.fx)) / num(item.homePrice);
      if (k > 3 || k < 1 / 3) warn.push(`兩個價格相差超過三倍：當地標價換算約 ${money(num(item.localPrice) * num(trip.fx), trip.home)}，出發地參考價 ${money(num(item.homePrice), trip.home)}。是不是填反了？`);
    }
    if (refundOn(trip) && countsForThreshold(item) && !ok && th > 0) {
      warn.push(normStore(item.store)
        ? `${item.store.trim()} 同一天${item.buyer ? `、${item.buyer.trim()}` : ''}的免稅商品未稅合計還差一些才到 ${money(th, trip.local)}，目前以不免稅計算。`
        : `未稅價未達 ${money(th, trip.local)}；填上店家可與同店同日的商品合併計算。`);
    }
    if (refundOn(trip) && item.taxFree && !item.priceIsPretax && itemRate(item, trip) <= 0) warn.push('稅率為 0，免稅沒有差異。');
    if (r.couponPending) warn.push(`折價券 ${num(item.coupon)}% 尚未確認，未套用；套券後約 ${money(r.withCoupon.home, trip.home)}。`);
    box.className = 'result ' + (r.verdict === 'none' ? '' : r.verdict);
    box.innerHTML = `<div class="label">現場要付（${r.feePct > 0 ? `含刷卡費 ${r.feePct}%` : '不含手續費'}）</div><div class="big">${money(r.payHome, trip.home)}</div>
      <div class="lines">${lines.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
      <div class="verdict ${r.verdict}">${r.verdict === 'none' ? '填入出發地參考價就能比較划不划算' : `${r.verdictText}：${r.saving >= 0 ? '省' : '多花'} ${money(Math.abs(r.saving), trip.home)}（${pct(Math.abs(r.ratio))}）`}</div>
      ${warn.map((w) => `<div class="warn">${esc(w)}</div>`).join('')}`;
    renderQuotes(trip);
  }

  function saveEditor(andNext) {
    const form = $('#item-form');
    if (!form.name.value.trim()) { form.name.focus(); toast('請填商品名稱'); return; }
    const item = formToItem();
    const idx = state.items.findIndex((i) => i.id === item.id);
    if (idx >= 0) state.items[idx] = item; else state.items.push(item);
    const trip = currentTrip();
    if (item.store) trip.lastStore = item.store;
    if (item.buyer) trip.lastBuyer = item.buyer;
    if (save()) {
      closeEditor(true); renderAll();
      if (andNext) { ui.prefill = { store: item.store, date: item.date, buyer: item.buyer }; toast('已加入，接著填下一項'); openEditor(null); }
      else toast(idx >= 0 ? '已更新' : '已加入清單');
    }
  }

  function quickAdd(e) {
    e.preventDefault();
    const form = $('#quick-form');
    const name = form.name.value.trim();
    if (!name) { form.name.focus(); return; }
    const trip = currentTrip();
    const store = trip.lastStore || recentStores(trip, 1)[0] || '';
    const item = newItem(trip.id, { name, localPrice: num(form.price.value), store, buyer: trip.lastBuyer || '', date: today(), bought: true, taxFree: refundOn(trip) });
    state.items.push(item);
    if (save()) { form.reset(); renderAll(); toast(`已記下「${name}」`); form.name.focus(); }
  }

  function deleteItem(id) {
    const it = state.items.find((i) => i.id === id);
    if (!it) return;
    if (!confirm(`刪除「${it.name}」？`)) return;
    state.items = state.items.filter((i) => i.id !== id);
    save(); closeEditor(true); renderAll(); toast('已刪除');
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
        renderPhoto(); saveDraft();
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
    const fx = num(form.fx.value);
    if (!(fx > 0)) { form.fx.focus(); toast('請填入大於 0 的匯率'); return; }
    trip.name = form.name.value.trim() || '旅程';
    trip.countryKey = form.countryKey.value;
    trip.local = form.local.value.trim().toUpperCase() || 'JPY';
    trip.home = form.home.value.trim().toUpperCase() || 'TWD';
    trip.fx = fx;
    trip.fxDefault = false;
    trip.budget = num(form.budget.value);
    trip.cardFee = num(form.cardFee.value);
    trip.cards = readCards();
    trip.taxRate = num(form.taxRate.value);
    trip.threshold = num(form.threshold.value);
    trip.departDate = form.departDate.value;
    trip.refundEnabled = form.refundEnabled.checked;
    trip.mode = form.mode.value === 'instant' ? 'instant' : 'refund';
    trip.refundFeePct = num(form.refundFeePct.value);
    trip.refundRatio = form.refundRatio.value === '' ? 100 : Math.min(100, Math.max(0, num(form.refundRatio.value)));
    trip.tripMinTotal = num(form.tripMinTotal.value);
    trip.onboarded = true;
    trip.updatedAt = Date.now();
    save(); renderAll(); toast('設定已儲存');
  }

  function applyCountryPreset(key) {
    const c = COUNTRIES[key]; if (!c) return;
    const form = $('#trip-form');
    if (c.local) form.local.value = c.local;
    if (key !== 'CUSTOM') { form.taxRate.value = c.taxRate; form.threshold.value = c.threshold; }
    form.tripMinTotal.value = c.tripMinTotal ? c.tripMinTotal : '';
    form.refundRatio.value = c.refundRatio != null && c.refundRatio !== 100 ? c.refundRatio : '';
    form.refundFeePct.value = c.refundFeePct ? c.refundFeePct : '';
    const radio = form.querySelector(`input[name=mode][value=${c.mode}]`); if (radio) radio.checked = true;
    $('#country-hint').textContent = c.hint;
    $$('.local-code').forEach((el) => { el.textContent = form.local.value || '當地'; });
    renderFxPreview();
  }

  function addTrip() {
    const name = prompt('旅程名稱', '東京 ' + today().slice(0, 7));
    if (name == null) return;
    const cur = currentTrip();
    const t = newTrip({ name: name.trim() || '新旅程', home: cur.home, cards: (cur.cards || []).map((c) => Object.assign({}, c)), cardFee: cur.cardFee, onboarded: false });
    state.trips.push(t); state.currentTripId = t.id;
    save(); renderAll(); showTab('list'); openOnboard();
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
  function switchTrip(id) { state.currentTripId = id; ui.store = 'all'; ui.brand = 'all'; ui.buyer = 'all'; save(); renderAll(); }

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
  function backupBlob() { return new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' }); }
  function backupName() { const t = currentTrip(); return `購物清單_${(t.name || '旅程').replace(/[\\/:*?"<>|]/g, '')}_${today()}.json`; }
  function exportJson() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(backupBlob());
    a.download = backupName();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function shareFile() {
    const file = new File([backupBlob()], backupName(), { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: '購物清單備份' }); return; } catch (_) { return; }
    }
    exportJson(); toast('此裝置不支援直接分享檔案，已改為下載');
  }
  function mergeState(incoming) {
    let added = 0, updated = 0;
    const tripIds = new Set(state.trips.map((t) => t.id));
    incoming.trips.forEach((t) => { if (!tripIds.has(t.id)) { state.trips.push(t); tripIds.add(t.id); } });
    const byId = new Map(state.items.map((i) => [i.id, i]));
    incoming.items.forEach((inc) => {
      const cur = byId.get(inc.id);
      if (!cur) { state.items.push(inc); added++; return; }
      const newer = (inc.updatedAt || 0) > (cur.updatedAt || 0);
      const merged = Object.assign({}, newer ? inc : cur);
      merged.bought = !!(cur.bought || inc.bought);
      if (merged.bought && !merged.date) merged.date = cur.date || inc.date || '';
      if (!merged.photo) merged.photo = cur.photo || inc.photo || null;
      if (JSON.stringify(merged) !== JSON.stringify(cur)) { Object.assign(cur, merged); updated++; }
    });
    return { added, updated };
  }
  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.trips) || !Array.isArray(data.items)) throw new Error('bad');
        data.trips.forEach((t) => { if (!Array.isArray(t.cards)) t.cards = []; });
        data.items.forEach((i) => { if (!Array.isArray(i.quotes)) i.quotes = []; });
        const merge = confirm(`匯入 ${data.trips.length} 個旅程、${data.items.length} 項商品。\n\n按「確定」＝合併：保留雙方新增的商品，已購買取聯集，價格以較新者為準。\n按「取消」＝下一步可選擇取代全部資料。`);
        if (merge) {
          const r = mergeState(data);
          save(); renderAll(); toast(`已合併：新增 ${r.added} 項、更新 ${r.updated} 項`);
          return;
        }
        if (!confirm('取代目前所有資料？這會清掉這支手機上既有的清單。')) return;
        state = data;
        if (!state.trips.find((t) => t.id === state.currentTripId)) state.currentTripId = state.trips[0] && state.trips[0].id;
        if (!state.trips.length) { const t = newTrip({ name: '我的旅程' }); state.trips.push(t); state.currentTripId = t.id; }
        save(); renderAll(); toast('已取代');
      } catch (_) { toast('檔案格式不正確'); }
    };
    reader.readAsText(file);
  }
  function summaryText() {
    const trip = currentTrip();
    const items = tripItems(trip);
    const t = totals(items, trip);
    const lines = [`【${trip.name}】購物清單（1 ${trip.local} = ${trip.fx} ${trip.home}${num(trip.cardFee) > 0 ? `，刷卡費 ${trip.cardFee}%` : ''}）`];
    const line = (it) => {
      const g = t.byItem.get(it.id);
      const r = calcItem(it, trip, g ? g.ok : true);
      const cmp = r.saving != null ? `（${r.saving >= 0 ? '省' : '多'} ${money(Math.abs(r.saving), trip.home)}，${pct(Math.abs(r.ratio))}）` : '';
      return `${it.bought ? '☑' : '☐'} ${[it.brand, it.name].filter(Boolean).join(' ')}${r.qty > 1 ? ` ×${r.qty}` : ''}｜現場 ${money(r.pay, trip.local)} ≈ ${money(r.payHome, trip.home)}${r.refund > 0 ? `，退稅後約 ${money(r.home, trip.home)}` : ''}${cmp}${it.store ? `｜${it.store}` : ''}`;
    };
    const buyers = Array.from(t.byBuyer.keys());
    if (buyers.length > 1 || (buyers.length === 1 && buyers[0] !== '未指定')) {
      buyers.forEach((b) => {
        const bb = t.byBuyer.get(b);
        lines.push(`\n▍${b}（${bb.count} 項）`);
        items.filter((i) => ((i.buyer || '').trim() || '未指定') === b).forEach((it) => lines.push(line(it)));
        lines.push(`小計：現場 ${money(bb.pay, trip.local)}、退稅 ${money(bb.refund, trip.local)}、實際約 ${money(bb.home, trip.home)}`);
      });
      lines.push('');
    } else {
      items.forEach((it) => lines.push(line(it)));
    }
    lines.push(`預計現場付款 ${money(t.pay, trip.local)} ≈ ${money(t.payHome, trip.home)}、預計退稅 ${money(t.refund, trip.local)}、退稅後成本約 ${money(t.home, trip.home)}`);
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
  function gotoSetting(field) {
    showTab('settings');
    setTimeout(() => { const el = $('#trip-form')[field]; if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); } }, 60);
  }

  // ---------- 事件 ----------
  function bind() {
    $$('.tab').forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));
    $('#btn-add').addEventListener('click', () => openEditor(null));
    $('#btn-empty-add').addEventListener('click', () => openEditor(null));
    $('#btn-empty-sample').addEventListener('click', loadSample);
    $('#btn-sample').addEventListener('click', loadSample);
    $('#btn-trip-switch').addEventListener('click', () => { showTab('settings'); $('#trip-list').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    $('#summary').addEventListener('click', (e) => {
      const b = e.target.closest('[data-goto]');
      if (b) gotoSetting(b.dataset.goto);
    });
    $('#quick-form').addEventListener('submit', quickAdd);

    $('#store-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-store]'); if (b) { ui.store = b.dataset.store; renderList(currentTrip()); } });
    $('#buyer-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-buyer]'); if (b) { ui.buyer = b.dataset.buyer; renderList(currentTrip()); } });
    $('#brand-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-brand]'); if (b) { ui.brand = b.dataset.brand; renderList(currentTrip()); } });
    $$('.status-chips .chip').forEach((c) => c.addEventListener('click', () => { ui.status = c.dataset.status; renderList(currentTrip()); }));

    $('#item-list').addEventListener('click', (e) => {
      const buy = e.target.closest('[data-buy]');
      if (buy) {
        const it = state.items.find((i) => i.id === buy.dataset.buy);
        if (it) { it.bought = !it.bought; it.updatedAt = Date.now(); if (it.bought && !it.date) it.date = today(); save(); renderAll(); }
        return;
      }
      const open = e.target.closest('[data-open]');
      if (open) openEditor(open.dataset.open);
    });

    // 編輯面板
    $('#btn-editor-cancel').addEventListener('click', () => closeEditor(false));
    $('#btn-editor-save').addEventListener('click', () => saveEditor(false));
    $('#btn-editor-save-bottom').addEventListener('click', () => saveEditor(false));
    $('#btn-editor-save-next').addEventListener('click', () => saveEditor(true));
    $('#item-form').addEventListener('submit', (e) => { e.preventDefault(); saveEditor(false); });
    $('#item-form').addEventListener('input', () => { renderEditorResult(); saveDraft(); });
    $('#item-form').addEventListener('change', (e) => {
      const form = $('#item-form');
      if (e.target.name === 'bought' && e.target.checked && !form.date.value) form.date.value = today();
      if (e.target.name === 'priceIsPretax') renderTaxRows(currentTrip());
      renderEditorResult(); saveDraft();
    });
    $('#store-quick').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick-store]');
      if (b) { $('#item-form').store.value = b.dataset.pickStore; renderEditorResult(); saveDraft(); }
    });
    $('#buyer-quick').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick-buyer]');
      if (b) { $('#item-form').buyer.value = b.dataset.pickBuyer; renderEditorResult(); saveDraft(); }
    });
    $('#btn-quote-add').addEventListener('click', () => {
      const s = $('#quote-store').value.trim(); const p = num($('#quote-price').value);
      if (!(p > 0)) { $('#quote-price').focus(); toast('請填報價'); return; }
      ui.editorQuotes.push({ store: s, price: p, date: today() });
      $('#quote-store').value = ''; $('#quote-price').value = '';
      renderQuotes(currentTrip()); saveDraft();
    });
    $('#quotes-list').addEventListener('click', (e) => {
      const use = e.target.closest('[data-quote-use]'); const del = e.target.closest('[data-quote-del]');
      const form = $('#item-form');
      if (use) {
        const i = +use.dataset.quoteUse; const q = ui.editorQuotes[i]; if (!q) return;
        const prevStore = form.store.value.trim(), prevPrice = num(form.localPrice.value);
        form.store.value = q.store; form.localPrice.value = q.price;
        ui.editorQuotes.splice(i, 1);
        if (prevPrice > 0) ui.editorQuotes.push({ store: prevStore, price: prevPrice, date: today() });
        renderEditorResult(); saveDraft(); toast(`已改用 ${q.store || '該店'} 的報價`);
      } else if (del) { ui.editorQuotes.splice(+del.dataset.quoteDel, 1); renderQuotes(currentTrip()); saveDraft(); }
    });
    $('#btn-editor-delete').addEventListener('click', () => deleteItem($('#item-form').id.value));
    $('#photo-input').addEventListener('change', (e) => { handlePhoto(e.target.files[0]); e.target.value = ''; });
    $('#photo-camera').addEventListener('change', (e) => { handlePhoto(e.target.files[0]); e.target.value = ''; });
    $('#btn-photo-clear').addEventListener('click', () => { ui.editorPhoto = null; renderPhoto(); saveDraft(); });
    $('#editor').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeEditor(false); });

    // 退稅
    $('#refund-bought-only').addEventListener('change', (e) => { ui.boughtOnly = e.target.checked; renderRefund(currentTrip()); });
    $('#checklist').addEventListener('change', (e) => {
      const i = e.target.dataset.check; if (i == null) return;
      const trip = currentTrip(); trip.checklist = trip.checklist || {}; trip.checklist[i] = e.target.checked; save();
    });

    // 設定
    $('#trip-form').addEventListener('submit', saveTripForm);
    $('#country-select').addEventListener('change', (e) => applyCountryPreset(e.target.value));
    $('#trip-form').fx.addEventListener('input', renderFxPreview);
    $('#trip-form').local.addEventListener('input', (e) => { $$('.local-code').forEach((el) => { el.textContent = e.target.value.toUpperCase() || '當地'; }); renderFxPreview(); });
    $('#trip-form').home.addEventListener('input', (e) => { $$('.home-code').forEach((el) => { el.textContent = e.target.value.toUpperCase() || '出發地'; }); renderFxPreview(); });
    $('#btn-card-add').addEventListener('click', () => { const cards = readCards(); cards.push({ id: uid(), name: '', fee: 1.5 }); renderCards(cards); const last = $$('#cards-list [data-card-name]').pop(); if (last) last.focus(); });
    $('#cards-list').addEventListener('click', (e) => { const d = e.target.closest('[data-card-del]'); if (d) { const row = d.closest('.card-row'); const cards = readCards().filter((c) => c.id !== row.dataset.card); renderCards(cards); } });
    $('#btn-trip-new').addEventListener('click', addTrip);
    $('#btn-trip-delete').addEventListener('click', deleteTrip);
    $('#trip-list').addEventListener('click', (e) => { const row = e.target.closest('[data-trip]'); if (row) switchTrip(row.dataset.trip); });
    $('#btn-copy-summary').addEventListener('click', copySummary);
    $('#btn-share-file').addEventListener('click', shareFile);
    $('#btn-export').addEventListener('click', exportJson);
    $('#file-import').addEventListener('change', (e) => { importJson(e.target.files[0]); e.target.value = ''; });
    $('#btn-onboard-again').addEventListener('click', openOnboard);

    // 首次設定
    $('#onboard-form').addEventListener('submit', (e) => { e.preventDefault(); closeOnboard(true); });
    $('#onboard-form').addEventListener('input', renderOnboardPreview);
    $('#onboard-form').addEventListener('change', renderOnboardPreview);
    $('#btn-onboard-skip').addEventListener('click', () => closeOnboard(false));

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
  const pending = readDraft();
  const trip0 = currentTrip();
  if (pending && pending.tripId === trip0.id && (pending.data && (pending.data.name || pending.data.localPrice))) {
    openEditor(pending.id || null);
  } else if (!trip0.onboarded && tripItems(trip0).length === 0) {
    openOnboard();
  }
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* 非安全環境或不支援時略過 */ }); });
  }
})();
