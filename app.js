/* 出國購物清單 PWA：本機儲存、離線可用、比價與退稅試算 */
(() => {
  'use strict';

  const STORAGE_KEY = 'shoplist.v1';
  const DRAFT_KEY = 'shoplist.draft';
  const CORRUPT_KEY = 'shoplist.corrupt';
  const APP_VERSION = 'v8（2026-11-05）';

  // 國家規則預設值（試算用，非官方；可在設定中覆寫）
  const COUNTRIES = {
    JP_REFUND: {
      label: '日本（2026/11/1 起・出境退稅）', local: 'JPY', taxRate: 10, threshold: 5000, mode: 'refund', guide: 'JP', windowDays: 90, regimeFrom: '2026-11-01',
      hint: '店內付含稅價；出境前先在海關端末或 Visit Japan Web 辦理，再依店家指定方式退款。同店同日未稅滿 ¥5,000 才可退；需在出境前 90 天內購買，商品出境時須全部隨身。食品飲料稅率 8%，可在商品上個別設定。'
    },
    JP_OLD: {
      label: '日本（2026/10/31 前購買・現場免稅）', local: 'JPY', taxRate: 10, threshold: 5000, mode: 'instant', guide: 'JP',
      hint: '2026/10/31 以前購買適用：店內直接付未稅價，或在免稅櫃台當場退稅。同店同日未稅滿 ¥5,000。'
    },
    KR: {
      label: '韓國（現場即時退稅，參考值）', local: 'KRW', taxRate: 10, threshold: 15000, mode: 'instant', guide: 'KR',
      hint: '參考值：單筆 ₩15,000 以上多數店家可即時退稅，另有單筆與總額上限；請以店家公告為準並自行調整。'
    },
    TH: {
      label: '泰國（機場退稅，參考值）', local: 'THB', taxRate: 7, threshold: 2000, mode: 'refund', tripMinTotal: 5000, refundRatio: 100, refundFeePct: 0, guide: 'TH',
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
      '旅途中用掉的消耗品要向稅關申報；同一張收據的其他商品也不能退',
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
  let corruptRaw = null; // 讀不懂的舊資料，保留原文讓使用者下載
  let state = load();
  let lastSaved = JSON.stringify(state); // 上一次成功寫入的內容；存檔失敗時還原到這裡
  let ui = { tab: 'list', brand: 'all', store: 'all', buyer: 'all', status: 'all', boughtOnly: false, editorPhoto: null, editorQuotes: [], editorSnapshot: '', installEvent: null, prefill: null };

  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function fmtDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function today() { return fmtDate(new Date()); }

  function newTrip(overrides) {
    const base = COUNTRIES.JP_REFUND;
    return Object.assign({
      id: uid(), name: '新旅程', countryKey: 'JP_REFUND', local: base.local, home: 'TWD', fx: 0.21, fxDefault: true, cardFee: 0, cards: [],
      budget: 0, taxRate: base.taxRate, threshold: base.threshold, mode: base.mode, refundEnabled: true, refundFeePct: 0, refundRatio: 100, tripMinTotal: 0,
      departDate: '', airport: '', coupons: [], lastStore: '', lastBuyer: '', onboarded: false, checklist: {}, createdAt: Date.now(), updatedAt: Date.now()
    }, overrides || {});
  }
  function guideFor(trip) {
    const c = COUNTRIES[trip.countryKey];
    const code = c && c.guide;
    return code && window.SHOPLIST_GUIDES && window.SHOPLIST_GUIDES[code] ? window.SHOPLIST_GUIDES[code] : null;
  }
  function couponsFor(trip, store) {
    const s = normStore(store);
    if (!s) return [];
    return (trip.coupons || []).filter((c) => { const cs = normStore(c.store); return cs && (s.includes(cs) || cs.includes(s)); });
  }
  function couponExpired(c) { return !!c.expires && c.expires < today(); }
  function newItem(tripId, overrides) {
    return Object.assign({
      id: uid(), tripId, brand: '', name: '', note: '', store: '', date: '', buyer: '', card: '', qty: 1, homePrice: 0, localPrice: null, altPrice: 0, altLabel: '',
      taxFree: true, taxRate: null, priceIsPretax: false, consumed: false, consumedSeparate: false, coupon: 0, couponConfirmed: false, bought: false, photo: null, quotes: [], createdAt: Date.now(), updatedAt: Date.now()
    }, overrides || {});
  }
  function refundOn(trip) { return trip.refundEnabled !== false; }

  // 補齊舊資料欄位並修正舊版未驗證的數值；讀取本機資料與匯入備份都會經過這裡
  function migrateState(s) {
    const fromOld = !(s.schema >= 2);
    s.trips.forEach((t) => { if (!Array.isArray(t.cards)) t.cards = []; if (!Array.isArray(t.coupons)) t.coupons = []; if (t.onboarded == null) t.onboarded = true; });
    s.items.forEach((i) => {
      if (!Array.isArray(i.quotes)) i.quotes = [];
      const p = i.localPrice == null || i.localPrice === '' ? null : Number(i.localPrice);
      // 舊版沒有「待查價」，空白價會存成 0
      i.localPrice = p == null || !Number.isFinite(p) || p < 0 || (fromOld && p === 0) ? null : p;
      const q = Math.round(Number(i.qty));
      i.qty = q >= 1 ? q : 1;
      const c = Number(i.coupon);
      // 超出範圍的折扣視為誤填，歸零並取消已確認，不改成接近上限的值
      if (!Number.isFinite(c) || c < 0 || c > 99) { i.coupon = 0; i.couponConfirmed = false; } else i.coupon = c;
      ['homePrice', 'altPrice'].forEach((k) => { const v = Number(i[k]); i[k] = Number.isFinite(v) && v > 0 ? v : 0; });
    });
    if (!s.deleted || typeof s.deleted !== 'object') s.deleted = {};
    s.schema = 2;
    return s;
  }
  // 逐欄記錄修改時間，合併時才不會因為對方改了別的欄位，就蓋掉這邊的已買
  const MERGE_FIELDS = ['brand', 'name', 'note', 'store', 'date', 'buyer', 'card', 'qty', 'homePrice', 'localPrice', 'altPrice', 'altLabel', 'taxFree', 'taxRate', 'priceIsPretax', 'coupon', 'couponConfirmed', 'consumed', 'consumedSeparate', 'bought', 'photo', 'quotes'];
  function sameValue(a, b) {
    const n = (v) => (v == null || v === false ? null : v);
    return JSON.stringify(n(a)) === JSON.stringify(n(b));
  }
  function fieldTime(i, f) {
    const t = i.ft && i.ft[f];
    if (t) return t;
    return i.ftBase != null ? i.ftBase : (i.updatedAt || 0);
  }
  function stampChanges(next, prev) {
    const now = Date.now();
    const ft = Object.assign({}, prev.ft);
    MERGE_FIELDS.forEach((f) => { if (!sameValue(next[f], prev[f])) ft[f] = now; });
    next.ft = ft;
    next.ftBase = prev.ftBase != null ? prev.ftBase : (prev.updatedAt || 0);
  }
  function mergeItem(cur, inc) {
    let changed = false;
    const base = cur.ftBase != null ? cur.ftBase : (cur.updatedAt || 0);
    const ft = Object.assign({}, cur.ft);
    MERGE_FIELDS.forEach((f) => {
      const ti = fieldTime(inc, f);
      if (ti > fieldTime(cur, f)) {
        if (!sameValue(cur[f], inc[f])) { cur[f] = inc[f]; changed = true; }
        ft[f] = ti;
      }
    });
    cur.ft = ft;
    cur.ftBase = base;
    cur.updatedAt = Math.max(cur.updatedAt || 0, inc.updatedAt || 0);
    return changed;
  }
  function markDeleted(id) { state.deleted = state.deleted || {}; state.deleted[id] = Date.now(); }

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (_) { /* 無法讀取就視為沒有資料 */ }
    if (raw) {
      try {
        const s = JSON.parse(raw);
        if (s && Array.isArray(s.trips) && Array.isArray(s.items) && s.trips.length) return migrateState(s);
      } catch (_) { /* 解析失敗，往下保留原文 */ }
      corruptRaw = raw;
      try { localStorage.setItem(CORRUPT_KEY, raw); } catch (_) { /* 空間不足時仍可從記憶體下載 */ }
    }
    const t = newTrip({ name: '我的旅程' });
    return { trips: [t], items: [], currentTripId: t.id, deleted: {}, schema: 2 };
  }
  // 成功才算數；失敗時把記憶體還原成上次存好的內容，畫面才不會顯示假資料
  function save() {
    const json = JSON.stringify(state);
    try {
      localStorage.setItem(STORAGE_KEY, json);
      lastSaved = json;
      hideBanner('save');
      return true;
    } catch (e) {
      state = JSON.parse(lastSaved);
      showBanner('save');
      renderAll();
      return false;
    }
  }
  function showBanner(kind) {
    const box = $('#app-banner');
    box.dataset.kind = kind;
    $('#app-banner-text').textContent = kind === 'corrupt'
      ? '讀取舊資料時發生問題，目前顯示的是空白清單。原始內容已另外保留，請先下載，之後可以協助救回。'
      : '沒有存成功：手機或 App 的儲存空間不足，剛才的修改沒有存下。請刪掉一些照片或券圖後再試，或先下載備份。';
    $('#btn-banner-download').textContent = kind === 'corrupt' ? '下載舊資料' : '下載備份';
    box.hidden = false;
  }
  function hideBanner(kind) {
    const box = $('#app-banner');
    if (box && !box.hidden && box.dataset.kind === kind) box.hidden = true;
  }
  function downloadCorrupt() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([corruptRaw || localStorage.getItem(CORRUPT_KEY) || ''], { type: 'text/plain' }));
    a.download = `購物清單受損資料_${today()}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
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
  function hasPrice(item) { return item.localPrice != null && item.localPrice !== ''; }
  // 依購買日與出境日判斷退稅資格。block 為 true 時不計退稅；false 只提示
  function dateRule(item, trip) {
    const c = COUNTRIES[trip.countryKey];
    if (!c || !c.windowDays || !refundOn(trip) || !item.date) return null;
    if (trip.departDate) {
      if (item.date > trip.departDate) return { block: true, text: `購買日晚於出境日 ${trip.departDate}，不計退稅` };
      const d = new Date(trip.departDate + 'T00:00:00'); d.setDate(d.getDate() - c.windowDays);
      if (item.date < fmtDate(d)) return { block: true, text: `購買日早於出境前 ${c.windowDays} 天（${fmtDate(d)}），不計退稅` };
    }
    if (c.regimeFrom && item.date < c.regimeFrom) return { block: false, text: `購買日在 ${c.regimeFrom} 新制上路前，實際依舊制辦理；這裡仍以新制試算` };
    return null;
  }
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
    const pendingPrice = !hasPrice(item);
    const local = Math.max(0, num(item.localPrice)) * qty;
    const rate = itemRate(item, trip) / 100;
    const couponRate = Math.min(99, Math.max(0, num(item.coupon))) / 100;
    const couponApplied = couponRate > 0 && !!item.couponConfirmed;
    const couponPending = couponRate > 0 && !item.couponConfirmed;
    const afterCoupon = local * (1 - (couponApplied ? couponRate : 0));
    const pretaxPrice = !!item.priceIsPretax; // 標價已不含稅（機場免稅店等）
    const pretax = pretaxPrice ? afterCoupon : (rate > 0 ? afterCoupon / (1 + rate) : afterCoupon);
    const tax = afterCoupon - pretax;
    const dr = item.taxFree && !pretaxPrice ? dateRule(item, trip) : null;
    const eligible = !pretaxPrice && refundOn(trip) && !!item.taxFree && groupOk !== false && rate > 0 && !(dr && dr.block) && !item.consumed;
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
    const saving = homeCompare > 0 && !pendingPrice ? homeCompare - home : null;
    const savingRatio = saving != null ? saving / homeCompare : null;
    let verdict = 'none', verdictText = '未填出發地參考價';
    if (savingRatio != null) {
      if (savingRatio >= 0.10) { verdict = 'good'; verdictText = '✅ 值得在當地買'; }
      else if (savingRatio >= -0.05) { verdict = 'even'; verdictText = '➖ 價差不大，看方便'; }
      else { verdict = 'bad'; verdictText = '❌ 在出發地買較便宜'; }
    }
    const altCompare = num(item.altPrice) * qty;
    const altSaving = altCompare > 0 && !pendingPrice ? altCompare - home : null;
    return { qty, local, afterCoupon, pretax, tax, pay, refund, net, payHome, refundHome, home, homeCompare, saving, ratio: savingRatio, verdict, verdictText, altCompare, altSaving, couponApplied, couponPending, eligible, pretaxPrice, feePct, pendingPrice, dateRule: dr, taxFree: !!item.taxFree };
  }

  function countsForThreshold(it, trip) {
    if (!it.taxFree || it.priceIsPretax || it.consumed) return false;
    const dr = dateRule(it, trip);
    return !(dr && dr.block);
  }

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
      // 只併入今天或之後的購買日；日期已過的那天，未買的商品不可能再算進去
      if (undated && dated.length && dated[0].date >= today()) {
        dated[0].items = dated[0].items.concat(undated.items);
        dated[0].mergedUndated = undated.items.length;
        map.delete(undated.key);
      }
    });
    const th = num(trip.threshold);
    map.forEach((g) => {
      g.pretaxSum = 0;
      g.items.forEach((it) => { if (countsForThreshold(it, trip)) g.pretaxSum += calcItem(it, trip, true).pretax; });
      g.ok = th <= 0 || g.pretaxSum >= th;
      g.shortfall = g.ok ? 0 : th - g.pretaxSum;
      g.boughtPretax = 0;
      g.items.forEach((it) => { if (it.bought && countsForThreshold(it, trip)) g.boughtPretax += calcItem(it, trip, true).pretax; });
      g.boughtOk = th <= 0 || g.boughtPretax >= th;
      g.pendingCount = g.items.filter((it) => !hasPrice(it)).length;
      // 官方以收據判定：用掉一件，同一張收據的其他商品也不能退
      g.receiptBlocked = refundOn(trip) && g.items.some((it) => it.consumed && !it.consumedSeparate && it.taxFree && !it.priceIsPretax);
      if (g.receiptBlocked) { g.ok = false; g.boughtOk = false; g.shortfall = 0; }
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

  function groupFor(item, trip, items) {
    const others = items.filter((i) => i.id !== item.id);
    const { byItem } = buildGroups(others.concat([item]), trip);
    return byItem.get(item.id) || null;
  }
  // 比較用券與不用券對整趟的影響：券可能讓同店同日跌破門檻，連帶失去其他商品的退稅
  function couponCompare(item, trip, items) {
    const rate = Math.min(99, Math.max(0, num(item.coupon)));
    if (!(rate > 0) || !(num(item.localPrice) > 0)) return null;
    const others = items.filter((i) => i.id !== item.id);
    const withC = totals(others.concat([Object.assign({}, item, { couponConfirmed: true })]), trip);
    const noC = totals(others.concat([Object.assign({}, item, { coupon: 0, couponConfirmed: false })]), trip);
    const discount = num(item.localPrice) * Math.max(1, num(item.qty, 1)) * rate / 100;
    const netDelta = withC.net - noC.net;
    return { rate, discount, netDelta, homeDelta: withC.home - noC.home, lostRefund: Math.max(0, discount + netDelta) };
  }
  function grossUp(pretax, ratePct) { return pretax * (1 + ratePct / 100); }
  // 同店同日有多張券時，列舉每種用法找最省的。假設每張券可以各自決定用或不用
  function couponPlan(item, trip, items) {
    const g = groupFor(item, trip, items);
    if (!g || g.noStore) return null;
    const members = g.items.filter((i) => num(i.coupon) > 0 && num(i.localPrice) > 0);
    if (members.length < 2 || members.length > 8) return null;
    const ids = new Set(members.map((m) => m.id));
    const pool = (num(trip.tripMinTotal) > 0 ? items.filter((i) => i.id !== item.id).concat(g.items.filter((i) => i.id === item.id)) : g.items).filter((i) => !ids.has(i.id));
    const evalMask = (mask) => {
      const variants = members.map((m, ix) => Object.assign({}, m, mask & (1 << ix) ? { couponConfirmed: true } : { coupon: 0, couponConfirmed: false }));
      const t = totals(pool.concat(variants), trip);
      return { mask, net: t.net, home: t.home };
    };
    let best = null;
    let ties = 0;
    for (let mask = 0; mask < (1 << members.length); mask++) {
      const e = evalMask(mask);
      if (!best || e.home < best.home - 0.5) { best = e; ties = 0; } else if (Math.abs(e.home - best.home) <= 0.5) ties++;
    }
    let currentMask = 0;
    members.forEach((m, ix) => { if (m.couponConfirmed) currentMask |= 1 << ix; });
    const names = members.filter((m, ix) => best.mask & (1 << ix)).map((m) => m.name);
    const desc = !names.length ? '都不用券' : (names.length === members.length ? '全部用券' : `只用「${names.join('、')}」的券`);
    return { members, best, ties, desc, current: evalMask(currentMask), all: evalMask((1 << members.length) - 1), none: evalMask(0),
      uses: (id) => { const ix = members.findIndex((m) => m.id === id); return ix >= 0 && !!(best.mask & (1 << ix)); } };
  }
  function planText(plan, trip) {
    return `同店同日 ${plan.members.length} 張券，最省是${plan.desc}：淨成本 ${money(plan.best.net, trip.local)}（全用 ${money(plan.all.net, trip.local)}，全不用 ${money(plan.none.net, trip.local)}${plan.ties ? '；同樣省的用法不只一種' : ''}）`;
  }

  function totals(items, trip) {
    const { groups, byItem, tripShort } = buildGroups(items, trip);
    const t = { count: items.length, bought: items.filter((i) => i.bought).length, pending: items.filter((i) => !hasPrice(i)).length, boughtPending: items.filter((i) => i.bought && !hasPrice(i)).length, pay: 0, refund: 0, net: 0, home: 0, payHome: 0, saving: 0, homeCompare: 0, boughtPay: 0, boughtHome: 0, boughtPayHome: 0, todayPay: 0, confirmedRefund: 0, plannedRefund: 0, byBuyer: new Map(), groups, byItem, tripShort };
    const td = today();
    groups.forEach((g) => {
      t.pay += g.pay; t.refund += g.refund; t.net += g.net; t.home += g.home; t.payHome += g.payHome;
      g.items.forEach((it) => {
        const r = calcItem(it, trip, g.ok);
        if (r.saving != null) { t.saving += r.saving; t.homeCompare += r.homeCompare; }
        const b = (it.buyer || '').trim() || '未指定';
        if (!t.byBuyer.has(b)) t.byBuyer.set(b, { buyer: b, count: 0, pay: 0, refund: 0, home: 0, payHome: 0 });
        const bb = t.byBuyer.get(b); bb.count++; bb.pay += r.pay; bb.refund += r.refund; bb.home += r.home; bb.payHome += r.payHome;
      });
    });
    // 已確定只看真的買了的商品：未買的不能幫已買的湊門檻
    buildGroups(items.filter((i) => i.bought), trip).groups.forEach((g) => {
      g.items.forEach((it) => {
        const r = calcItem(it, trip, g.ok);
        t.boughtPay += r.pay; t.boughtHome += r.home; t.boughtPayHome += r.payHome; t.confirmedRefund += r.refund;
        if (it.date === td) t.todayPay += r.pay;
      });
    });
    t.plannedRefund = Math.max(0, t.refund - t.confirmedRefund);
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
    const used = budget > 0 ? t.boughtPay / budget : 0;
    const left = budget - t.boughtPay;
    // 需要處理的事才放在最上面，其餘收進「更多數字」
    const alerts = [];
    if (trip.fxDefault) alerts.push(`<button type="button" class="alert-line" data-goto="fx">⚠ 匯率還是預設值 ${esc(String(trip.fx))}，點此更新 ›</button>`);
    if (t.pending) alerts.push(`<button type="button" class="alert-line" data-show-pending>${t.pending} 項待查價，合計未含，點此查看 ›</button>`);
    if (budget > 0 && used >= 0.9) alerts.push(`<button type="button" class="alert-line ${used >= 1 ? 'bad' : ''}" data-goto="budget">${left >= 0 ? `預算只剩 ${money(left, trip.local)}` : `已超支 ${money(-left, trip.local)}`} ›</button>`);
    const refundStat = !refundOn(trip)
      ? stat('退稅', '不辦理', '可在設定中開啟')
      : (trip.mode === 'instant'
        ? stat('現場免稅', '自動扣除', '達門檻的店直接付未稅價')
        : stat('已確定退稅', money(t.confirmedRefund, trip.local), t.plannedRefund > 0.5 ? `買齊計畫再加 ${money(t.plannedRefund, trip.local)}` : '依已買商品計算'));
    summary.innerHTML = [
      stat('已花（已買）', money(t.boughtPay, trip.local), `≈ ${money(t.boughtPayHome, trip.home)}・今天 ${money(t.todayPay, trip.local)}${t.boughtPending ? `・${t.boughtPending} 項未填價` : ''}`),
      refundStat
    ].concat(alerts).join('');
    $('#summary-more').hidden = !ui.moreOpen;
    $('#btn-more').textContent = ui.moreOpen ? '收起數字 ▴' : '更多數字 ▾';
    $('#summary-more').innerHTML = [
      budget > 0
        ? `<button type="button" class="stat link" data-goto="budget"><div class="k">預算</div><div class="v">${left >= 0 ? '剩 ' : '超 '}${money(Math.abs(left), trip.local)}</div><div class="s">預算 ${money(budget, trip.local)}，已用 ${pct(used)}</div></button>`
        : `<button type="button" class="stat link" data-goto="budget"><div class="k">預算</div><div class="v">未設定</div><div class="s">設定後顯示剩多少 ›</div></button>`,
      stat('全部清單', `${t.count} 項`, `已買 ${t.bought} 項・預計 ${money(t.pay, trip.local)}`),
      stat(`買齊後成本（${trip.home}）`, money(t.home, trip.home), t.homeCompare > 0 ? `比出發地${t.saving >= 0 ? '省' : '多'} ${money(Math.abs(t.saving), trip.home)}` : `已買 ${money(t.boughtHome, trip.home)}`, t.saving > 0 ? 'good' : (t.saving < 0 ? 'bad' : '')),
      `<button type="button" class="stat link" data-goto="fx"><div class="k">匯率</div><div class="v">1 ${esc(trip.local)} = ${esc(String(trip.fx))}</div><div class="s">${num(trip.cardFee) > 0 ? `刷卡費 ${num(trip.cardFee)}%・` : ''}點此修改 ›</div></button>`
    ].join('');

    // 快速記一筆：店家與買者可直接修改，下一筆沿用
    const qf = $('#quick-form');
    if (document.activeElement !== qf.store) qf.store.value = trip.lastStore || '';
    if (document.activeElement !== qf.buyer) qf.buyer.value = trip.lastBuyer || '';
    $('#quick-hint').textContent = '會記為「已購買、今天」；店家與買者可以直接改，下一筆會沿用。';
    qf.price.placeholder = `標價（${sym(trip.local) || trip.local}）`;
    $('#store-list').innerHTML = recentStores(trip).map((s) => `<option value="${esc(s)}">`).join('');
    $('#buyer-list').innerHTML = recentBuyers(trip).map((s) => `<option value="${esc(s)}">`).join('');
    const nCoupons = (trip.coupons || []).filter((c) => !couponExpired(c)).length;
    $('#btn-coupons').textContent = `🎫 我的券${nCoupons ? `（${nCoupons}）` : ''}`;

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
    const activeFilters = [ui.store, ui.buyer, ui.brand].filter((v) => v !== 'all').length;
    const canFilter = stores.length >= 2 || buyers.length >= 2 || brands.length >= 2;
    $('#btn-filter').hidden = !canFilter;
    $('#btn-filter').textContent = `篩選${activeFilters ? `・${activeFilters}` : ''}`;
    $('#btn-filter').classList.toggle('active', activeFilters > 0);
    $('#filter-panel').hidden = !ui.filterOpen || !canFilter;
    $$('.status-chips .chip').forEach((c) => c.classList.toggle('active', c.dataset.status === ui.status));

    const shown = items.filter((i) =>
      (ui.brand === 'all' || normStore(i.brand) === ui.brand) &&
      (ui.store === 'all' || normStore(i.store) === ui.store) &&
      (ui.buyer === 'all' || normStore(i.buyer) === ui.buyer) &&
      (ui.status === 'all' || (ui.status === 'pending' ? !hasPrice(i) : (ui.status === 'done') === !!i.bought)));
    const list = $('#item-list');
    $('#empty-state').hidden = items.length > 0;
    if (!shown.length) {
      list.innerHTML = items.length ? '<p class="hint" style="text-align:center">沒有符合篩選的商品。</p>' : '';
      return;
    }
    const th = num(trip.threshold);
    const planCache = new Map();
    list.innerHTML = shown.map((it) => {
      const g = t.byItem.get(it.id);
      const r = calcItem(it, trip, g ? g.ok : true);
      let flag = '', flagCls = '';
      let plan = null;
      if (!r.pendingPrice && num(it.coupon) > 0 && g) {
        if (!planCache.has(g.key)) planCache.set(g.key, couponPlan(it, trip, items));
        plan = planCache.get(g.key);
      }
      const cc = r.pendingPrice || plan ? null : couponCompare(it, trip, items);
      if (r.pendingPrice) {
        flag = '還沒有標價，點卡片填入後才會計入合計'; flagCls = 'warnless';
      } else if (r.dateRule) {
        flag = `⚠ ${r.dateRule.text}`; flagCls = r.dateRule.block ? 'warn' : 'warnless';
      } else if (it.consumed && it.consumedSeparate) {
        flag = '這件會拆用且單獨結帳，不計退稅'; flagCls = 'warnless';
      } else if (it.consumed) {
        flag = '⚠ 這件會拆用，同一張收據的其他商品也不能退。單獨結帳可以保住其他商品的退稅'; flagCls = 'warn';
      } else if (g && g.receiptBlocked) {
        flag = '⚠ 同店有會拆用的商品，這組目前不計退稅。把拆用的東西單獨結帳可以保住'; flagCls = 'warn';
      } else if (plan && !plan.uses(it.id) && it.couponConfirmed) {
        // 已經套用但不划算才警告；還沒確認的券只是建議，不必吵
        flag = `⚠ 建議不要用這張券。${planText(plan, trip)}`; flagCls = 'warn';
      } else if (plan && !plan.uses(it.id)) {
        flag = `券 ${num(it.coupon)}% 這張不用比較省：同店最省是${plan.desc}`; flagCls = 'warnless';
      } else if (plan && !it.couponConfirmed) {
        flag = `券 ${num(it.coupon)}% 待店員確認，這張建議用：同店最省是${plan.desc}`; flagCls = 'warnless';
      } else if (cc && cc.netDelta > 0.5) {
        flag = `⚠ 用 ${cc.rate}% 券反而多花 ${money(cc.netDelta, trip.local)}，因為退稅會少 ${money(cc.lostRefund, trip.local)}`; flagCls = 'warn';
      } else if (it.bought && g && g.ok && !g.boughtOk && countsForThreshold(it, trip)) {
        flag = g.date && g.date < today()
          ? `${g.date} 已買的未稅 ${money(g.boughtPretax, trip.local)} 沒到門檻，這天已過，不計入已確定退稅`
          : `已買的未稅 ${money(g.boughtPretax, trip.local)} 還沒到門檻，同一天買齊計畫中的商品才會退稅`; flagCls = 'warn';
      } else if (refundOn(trip) && countsForThreshold(it, trip) && g && !g.ok && th > 0) {
        if (g.tripShort) { flag = `全程未稅合計還差 ${money(g.tripShort, trip.local)} 才能退稅`; flagCls = 'warn'; }
        else if (g.noStore) {
          if (r.pretax > 0 && r.pretax < th) { flag = `填店家後可與同店商品合併計算免稅`; flagCls = 'warnless'; }
        } else if (g.date && g.date < today()) {
          flag = `${g.date} 的未稅合計沒到門檻，這些商品不計退稅`; flagCls = 'warn';
        } else {
          const rp = itemRate(it, trip);
          flag = `${g.store}${g.buyer ? `（${g.buyer}）` : ''} 同一天再買含稅約 ${money(grossUp(g.shortfall, rp), trip.local)} 就能退稅（未稅 ${money(g.shortfall, trip.local)}，以 ${rp}% 估）`; flagCls = 'warn';
        }
      } else if (r.couponPending) {
        flag = `券 ${num(it.coupon)}% 待店員確認${cc ? `，用券約再省 ${money(-cc.netDelta, trip.local)}` : ''}`; flagCls = 'warnless';
      }
      const thumb = it.photo ? `<img src="${it.photo}" alt="">` : '🛍️';
      const badge = r.verdict === 'none' ? ''
        : `<span class="badge ${r.verdict}">${r.verdictText.slice(0, 1)} ${r.saving >= 0 ? '省' : '多'} ${money(Math.abs(r.saving), trip.home)}・${pct(Math.abs(r.ratio))}</span>`;
      const tags = [];
      if (it.buyer) tags.push(`👤 ${it.buyer}`);
      const cps = couponsFor(trip, it.store).filter((c) => !couponExpired(c));
      if (cps.length) tags.push(`🎫 有券 ${cps.length} 張`);
      if (it.priceIsPretax) tags.push('標價已免稅');
      if (it.taxRate != null && it.taxRate !== '' && num(it.taxRate) !== num(trip.taxRate)) tags.push(`稅率 ${num(it.taxRate)}%`);
      const cn = cardName(it, trip);
      if (it.card === 'cash') tags.push(cn);
      else if (cn) tags.push(`${cn} ${r.feePct}%`);
      else if (r.feePct > 0) tags.push(`刷卡費 ${r.feePct}%`);
      let quoteLine = '';
      if (it.quotes && it.quotes.length) {
        const best = it.quotes.slice().sort((a, b) => num(a.price) - num(b.price))[0];
        const bestPrice = money(num(best.price), trip.local);
        const quoteText = r.pendingPrice ? `另有 ${it.quotes.length} 家報價，最低 ${bestPrice}`
          : (num(best.price) < num(it.localPrice) ? `其他店有更便宜的：${best.store || '未填店家'} ${bestPrice}` : `目前採用的是最低價，其他店最低 ${bestPrice}`);
        quoteLine = `<span class="unit">${esc(quoteText)}</span>`;
      }
      const unit = r.qty > 1 && !r.pendingPrice ? `<span class="unit">${money(num(it.localPrice), trip.local)} × ${r.qty}</span>` : '';
      const prices = r.pendingPrice ? ['<span class="pending">待查價</span>'] : [`<span>現場 <b>${money(r.pay, trip.local)}</b> ≈ ${money(r.payHome, trip.home)}</span>`];
      if (r.eligible && r.refund > 0) prices.push(`<span>${it.bought && g && !g.boughtOk ? '買齊後' : '退稅後'} <b>${money(r.home, trip.home)}</b></span>`);
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
    if (refundOn(trip) && trip.departDate && c.windowDays) {
      const d = new Date(trip.departDate + 'T00:00:00'); d.setDate(d.getDate() - c.windowDays);
      dateHint = ` 出境日 ${trip.departDate}，購買日須在 ${fmtDate(d)} 到出境日之間，超出範圍不計退稅。`;
    }
    const adv = [];
    if (num(trip.refundFeePct) > 0) adv.push(`退稅手續費 ${num(trip.refundFeePct)}%`);
    if (trip.refundRatio != null && trip.refundRatio !== '' && num(trip.refundRatio) < 100) adv.push(`實際退回 ${num(trip.refundRatio)}%`);
    if (num(trip.tripMinTotal) > 0) adv.push(`全程最低 ${money(num(trip.tripMinTotal), trip.local)}`);
    $('#refund-mode-note').innerHTML = `<b>${esc(c.label === '自訂' ? '自訂規則' : c.label)}</b><br>${esc(modeText)}${esc(dateHint)}${adv.length ? `<br>已套用：${esc(adv.join('、'))}` : ''}<br><span class="hint">${esc(c.hint)}</span>`;

    const t = totals(items, trip);
    $('#refund-totals').innerHTML = [
      stat('現場付款合計', money(t.pay, trip.local), `≈ ${money(t.payHome, trip.home)}・${items.length} 項${t.pending ? `，${t.pending} 項待查價未計` : ''}`),
      stat('已確定退稅', money(t.confirmedRefund, trip.local), !refundOn(trip) ? '不辦退稅' : (t.tripShort ? '全程未達最低總額' : (trip.mode === 'refund' ? '只算已買的商品' : '現場免稅不另退'))),
      stat('計畫中再加', money(t.plannedRefund, trip.local), '買齊未買的商品才會有'),
      stat('買齊後成本', money(t.net, trip.local), '付款減退稅'),
      stat(`換算 ${trip.home}`, money(t.home, trip.home), '含刷卡手續費')
    ].join('');

    // 每人小計
    const buyers = Array.from(t.byBuyer.values()).filter((b) => !(b.buyer === '未指定' && t.byBuyer.size === 1));
    $('#buyer-card').hidden = !buyers.length || (buyers.length === 1 && buyers[0].buyer === '未指定');
    $('#buyer-totals').innerHTML = `<div class="buyer-table">${buyers.map((b) => `<div class="buyer-row"><div><b>${esc(b.buyer)}</b><span class="small">${b.count} 項</span></div><div>現場 ${money(b.pay, trip.local)}</div><div>退稅 ${money(b.refund, trip.local)}</div><div><b>${money(b.home, trip.home)}</b></div></div>`).join('')}</div>`;

    const th = num(trip.threshold);
    $('#threshold-hint').textContent = !refundOn(trip) ? '此旅程不辦退稅，以下僅供參考。'
      : (th > 0
        ? `同一家店、同一天、同一位買者的免稅商品未稅合計需達 ${money(th, trip.local)}。沒填日期的只併入今天或之後的購買日；沒填店家的不合併；標價已免稅的不計入。`
        : '目前未設定門檻，所有勾選可免稅的商品都視為可退。');

    const groups = Array.from(t.groups.values());
    const storeGroups = groups.filter((g) => !g.noStore).sort((a, b) => a.store.localeCompare(b.store) || (a.date || '').localeCompare(b.date || '') || a.buyer.localeCompare(b.buyer));
    const noStore = groups.filter((g) => g.noStore);
    let html = storeGroups.map((g) => {
      const taxItems = g.items.filter((i) => countsForThreshold(i, trip));
      const blocked = g.items.filter((i) => { const dr = i.taxFree && !i.priceIsPretax ? dateRule(i, trip) : null; return dr && dr.block; });
      const pricedTax = taxItems.filter(hasPrice);
      const firstCoupon = g.items.find((i) => num(i.coupon) > 0 && num(i.localPrice) > 0);
      const groupPlan = firstCoupon ? couponPlan(firstCoupon, trip, items) : null;
      const status = !refundOn(trip) ? '' : (g.receiptBlocked ? '<span class="badge bad">有拆用商品</span>'
        : (!taxItems.length ? (blocked.length ? '<span class="badge bad">日期不符</span>' : '<span class="badge none">無免稅商品</span>')
        : (!pricedTax.length ? '<span class="badge none">待查價</span>'
        : (g.ok ? (g.boughtOk ? '<span class="badge good">已達門檻</span>' : '<span class="badge even">計畫達標，還沒買齊</span>')
        : (g.tripShort ? '<span class="badge bad">全程未達</span>' : `<span class="badge bad">差 ${money(g.shortfall, trip.local)}</span>`)))));
      return `<div class="group">
        <div class="g-head"><div><div class="g-store">${esc(g.store)}${g.buyer ? ` <span class="small">👤 ${esc(g.buyer)}</span>` : ''}</div><div class="g-date">${esc(g.date || '日期未填')}・${g.items.length} 項${g.mergedUndated ? `（含 ${g.mergedUndated} 項未填日期，假設同日購買）` : ''}</div></div>${status}</div>
        <div class="g-lines">
          <div><span>免稅商品未稅合計</span><b>${money(g.pretaxSum, trip.local)}</b></div>
          ${g.boughtPretax > 0 && g.boughtPretax !== g.pretaxSum ? `<div><span>其中已買</span><b>${money(g.boughtPretax, trip.local)}</b></div>` : ''}
          <div><span>現場付款</span><b>${money(g.pay, trip.local)}</b></div>
          <div><span>預計退稅</span><b>${money(g.refund, trip.local)}</b></div>
        </div>
        <div class="g-items">${esc(g.items.map((i) => (i.bought ? '✓ ' : '') + [i.brand, i.name].filter(Boolean).join(' ')).join('、'))}</div>
        ${g.pendingCount ? `<p class="hint">另有 ${g.pendingCount} 項待查價，未計入上面的金額。</p>` : ''}
        ${g.receiptBlocked ? '<p class="g-warn">⚠ 用掉一件，同一張收據的其他商品也不能退。把拆用的東西單獨結帳可以保住。</p>' : ''}
        ${groupPlan && groupPlan.current.home - groupPlan.best.home > 0.5 ? (groupPlan.members.some((m) => m.couponConfirmed && !groupPlan.uses(m.id)) ? `<p class="g-warn">⚠ ${esc(planText(groupPlan, trip))}</p>` : `<p class="hint">${esc(planText(groupPlan, trip))}</p>`) : ''}
        ${refundOn(trip) && !g.ok && g.shortfall > 0 && !g.tripShort && pricedTax.length && !(g.date && g.date < today()) ? `<p class="hint">同一天再買含稅約 ${money(grossUp(g.shortfall, num(trip.taxRate)), trip.local)} 就達門檻（以 ${num(trip.taxRate)}% 估）。</p>` : ''}
        ${blocked.length ? `<p class="g-warn">⚠ 日期不符、不計退稅：${esc(blocked.map((i) => i.name).join('、'))}</p>` : ''}
      </div>`;
    }).join('');
    if (noStore.length) {
      const nItems = noStore.reduce((s, g) => s + g.items.length, 0);
      const pay = noStore.reduce((s, g) => s + g.pay, 0);
      const refund = noStore.reduce((s, g) => s + g.refund, 0);
      const canMerge = refundOn(trip) && th > 0 && noStore.flatMap((g) => g.items).some((i) => countsForThreshold(i, trip));
      const names = noStore.flatMap((g) => g.items).map((i) => (i.bought ? '✓ ' : '') + [i.brand, i.name].filter(Boolean).join(' ')).join('、');
      html += `<div class="group muted">
        <div class="g-head"><div><div class="g-store">未填店家</div><div class="g-date">${nItems} 項・各自單獨計算</div></div>${canMerge ? '<span class="badge none">未合併</span>' : ''}</div>
        <div class="g-lines">
          <div><span>現場付款</span><b>${money(pay, trip.local)}</b></div>
          <div><span>預計退稅</span><b>${money(refund, trip.local)}</b></div>
        </div>
        <div class="g-items">${esc(names)}</div>
        ${noStore.flatMap((g) => g.items).some((i) => { const dr = i.taxFree && !i.priceIsPretax ? dateRule(i, trip) : null; return dr && dr.block; }) ? '<p class="g-warn">⚠ 其中有商品日期不符，不計退稅。</p>' : ''}
        ${canMerge ? '<p class="hint">在商品填上店家，就能和同店同日的商品合併計算門檻。</p>' : ''}
      </div>`;
    }
    $('#refund-groups').innerHTML = html || '<p class="hint">還沒有商品。</p>';

    const list = CHECKLISTS[trip.mode] || CHECKLISTS.refund;
    trip.checklist = trip.checklist || {};
    $('#checklist-card').hidden = !refundOn(trip);
    $('#checklist').innerHTML = list.map((text, i) => `<label class="checklist-item"><input type="checkbox" data-check="${i}" ${trip.checklist[i] ? 'checked' : ''}><span>${esc(text)}</span></label>`).join('');
    renderGuide(trip);
  }

  // ---------- 退稅指引與券入口 ----------
  function renderGuide(trip) {
    const g = guideFor(trip);
    const card = $('#guide-card');
    if (!g) {
      card.hidden = false;
      $('#guide-meta').textContent = '這個國家目前還沒有指引。';
      $('#guide-body').innerHTML = '<p class="hint">指引依國家載入，之後會陸續補上其他國家。</p>';
      return;
    }
    card.hidden = false;
    $('#guide-meta').textContent = `${g.country}・整理資訊非官方，查核日期 ${g.checked}。`;
    const sec = ui.guideTab || 'rules';
    const tabs = [['rules', '新制說明'], ['stores', '店家類型'], ['airports', '機場流程'], ['coupons', '券入口']];
    let body = `<div class="guide-tabs">${tabs.map(([k, l]) => `<button type="button" class="chip ${sec === k ? 'active' : ''}" data-guide-tab="${k}">${l}</button>`).join('')}</div>`;
    const srcs = (arr) => arr && arr.length ? `<div class="guide-src">來源：${arr.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)} ↗</a>`).join('')}</div>` : '';
    if (sec === 'rules') {
      body += `<div class="guide-section"><h3>${esc(g.rules.title)}</h3>${g.rules.sections.map((s) => `<h3>${esc(s.h)}</h3><ul>${s.p.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`).join('')}${srcs(g.rules.sources)}</div>`;
    } else if (sec === 'stores') {
      body += `<div class="guide-section">${g.storeTypes.map((s) => `<div class="store-type"><b>${esc(s.type)}</b><span>${esc(s.examples)}</span><p>流程：${esc(s.flow)}</p><p>退款：${esc(s.refund)}</p><p>提醒：${esc(s.tips)}</p></div>`).join('')}</div>`;
    } else if (sec === 'airports') {
      const list = g.airports || [];
      if (!list.length) body += '<p class="hint">機場資訊整理中。</p>';
      else {
        if (g.airportsNote) body += `<p class="hint">${esc(g.airportsNote)}</p>`;
        const cur = list.find((a) => a.code === trip.airport) || list[0];
        body += `<div class="chips">${list.map((a) => `<button type="button" class="chip ${a.code === cur.code ? 'active' : ''}" data-guide-airport="${esc(a.code)}">${esc(a.short || a.code)}</button>`).join('')}</div>`;
        const conf = cur.confidence === 'official' ? '<span class="conf official">官方已公布</span>' : (cur.confidence === 'media' ? '<span class="conf">媒體轉述</span>' : '<span class="conf">尚未公布</span>');
        body += `<div class="guide-section"><h3>${esc(cur.name)} ${conf}</h3>
          ${cur.steps && cur.steps.length ? `<p><b>流程</b></p><ul>${cur.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
          ${cur.location ? `<p><b>位置</b>：${esc(cur.location)}</p>` : ''}
          ${cur.time ? `<p><b>時間提醒</b>：${esc(cur.time)}</p>` : ''}
          ${cur.cash ? `<p><b>現金退款</b>：${esc(cur.cash)}</p>` : ''}
          ${cur.note ? `<p class="hint">${esc(cur.note)}</p>` : ''}
          ${srcs(cur.sources)}<div class="guide-src">查證日期 ${esc(cur.checked || g.checked)}</div></div>`;
        if (!trip.airport) body += '<p class="hint">在設定頁選「出境機場」後，這裡會固定顯示你的機場。</p>';
      }
    } else if (sec === 'coupons') {
      const c = g.coupons || { groups: [] };
      body += `<p class="hint">${esc(c.note || '')}</p>`;
      if (!c.groups || !c.groups.length) body += '<p class="hint">官方優惠頁連結整理中。</p>';
      else {
        const confTag = (k) => k === 'official' ? '<span class="conf official">官方</span>' : (k === 'partner' ? '<span class="conf">官方合作平台</span>' : (k === 'unverified' ? '<span class="conf warn">待確認</span>' : ''));
        body += c.groups.map((grp) => `<div class="guide-section"><h3>${esc(grp.name)}</h3>${grp.stores.map((s) => `<div class="coupon-link"><div><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)} ↗</a>${confTag(s.confidence)}<div class="cl-meta">${esc(s.summary || '')}${s.conditions ? `｜${esc(s.conditions)}` : ''}${s.valid ? `｜效期 ${esc(s.valid)}` : ''}</div></div></div>`).join('')}</div>`).join('');
        if (c.none) body += `<p class="hint">${esc(c.none)}</p>`;
      }
      body += '<div class="row"><button type="button" class="btn small" data-open-coupons>🎫 把券截圖存到我的券</button></div>';
    }
    $('#guide-body').innerHTML = body;
  }

  // ---------- 我的券 ----------
  function openCoupons(prefillStore) {
    const trip = currentTrip();
    ui.couponPhoto = null; ui.couponEditId = '';
    const form = $('#coupon-form'); form.reset(); form.id.value = '';
    if (prefillStore) form.store.value = prefillStore;
    $('#btn-coupon-reset').hidden = true;
    $('#store-list').innerHTML = recentStores(trip).map((s) => `<option value="${esc(s)}">`).join('');
    renderCouponPhoto(); renderCoupons(trip);
    $('#coupons').hidden = false; document.body.style.overflow = 'hidden';
  }
  function closeCoupons() { $('#coupons').hidden = true; if ($('#editor').hidden) document.body.style.overflow = ''; renderAll(); if (!$('#editor').hidden) renderStoreCouponNote(); }
  function renderCouponPhoto() {
    $('#coupon-photo-box').innerHTML = ui.couponPhoto ? `<img src="${ui.couponPhoto}" alt="券圖">` : '<span class="photo-empty">＋ 券圖</span>';
  }
  function renderCoupons(trip) {
    const list = (trip.coupons || []).slice().sort((a, b) => (couponExpired(a) ? 1 : 0) - (couponExpired(b) ? 1 : 0) || (a.store || '').localeCompare(b.store || ''));
    $('#coupon-list').innerHTML = list.length ? list.map((c) => `<div class="coupon-row ${couponExpired(c) ? 'expired' : ''}">
      ${c.photo ? `<img src="${c.photo}" alt="" data-view="${esc(c.id)}">` : '<div class="no-img">🎫</div>'}
      <div><div class="c-title">${esc(c.title || '未命名的券')}</div><div class="c-meta">${esc(c.store || '未綁定店家')}${c.expires ? `・到 ${esc(c.expires)}${couponExpired(c) ? '（已過期）' : ''}` : ''}${c.note ? `・${esc(c.note)}` : ''}</div></div>
      <div class="c-actions"><button type="button" class="btn small" data-coupon-edit="${esc(c.id)}">編輯</button><button type="button" class="btn small danger" data-coupon-del="${esc(c.id)}">刪除</button></div>
    </div>`).join('') : '<p class="hint">還沒有券。</p>';
  }
  function saveCoupon(e) {
    e.preventDefault();
    const trip = currentTrip();
    const form = $('#coupon-form');
    const title = form.title.value.trim(), store = form.store.value.trim();
    if (!title && !store && !ui.couponPhoto) { toast('至少填店家或券名'); return; }
    trip.coupons = trip.coupons || [];
    const existing = trip.coupons.find((c) => c.id === form.id.value);
    const data = { store, title, note: form.note.value.trim(), expires: form.expires.value, photo: ui.couponPhoto, updatedAt: Date.now() };
    if (existing) Object.assign(existing, data); else trip.coupons.push(Object.assign({ id: uid(), createdAt: Date.now() }, data));
    if (save()) { form.reset(); form.id.value = ''; ui.couponPhoto = null; $('#btn-coupon-reset').hidden = true; renderCouponPhoto(); renderCoupons(trip); toast(existing ? '券已更新' : '券已存好'); }
  }
  function editCoupon(id) {
    const trip = currentTrip(); const c = (trip.coupons || []).find((x) => x.id === id); if (!c) return;
    const form = $('#coupon-form'); form.id.value = c.id; form.store.value = c.store || ''; form.title.value = c.title || ''; form.note.value = c.note || ''; form.expires.value = c.expires || '';
    ui.couponPhoto = c.photo || null; renderCouponPhoto(); $('#btn-coupon-reset').hidden = false; form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function deleteCoupon(id) {
    const trip = currentTrip(); const c = (trip.coupons || []).find((x) => x.id === id); if (!c) return;
    if (!confirm(`刪除「${c.title || c.store || '這張券'}」？`)) return;
    markDeleted(id);
    trip.coupons = trip.coupons.filter((x) => x.id !== id);
    if (!save()) { renderCoupons(currentTrip()); return; }
    renderCoupons(trip); toast('已刪除');
  }
  function openViewer(src) { $('#viewer-img').src = src; $('#viewer').hidden = false; }
  function closeViewer() { $('#viewer').hidden = true; $('#viewer-img').src = ''; }
  function renderStoreCouponNote() {
    const trip = currentTrip();
    const store = $('#item-form').store.value;
    const cps = couponsFor(trip, store).filter((c) => !couponExpired(c));
    const box = $('#store-coupon-note');
    box.hidden = !cps.length;
    if (!cps.length) return;
    box.innerHTML = `🎫 這家店你有 ${cps.length} 張券，結帳前出示：${esc(cps.map((c) => c.title || '未命名').join('、'))}
      <div class="thumbs">${cps.filter((c) => c.photo).map((c) => `<img src="${c.photo}" alt="" data-view="${esc(c.id)}">`).join('')}<button type="button" class="btn small" data-open-coupons>看券</button></div>`;
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
    renderAirportSelect(trip);
    renderFxPreview();

    $('#trip-list').innerHTML = state.trips.map((t) => {
      const n = state.items.filter((i) => i.tripId === t.id).length;
      return `<div class="trip-row ${t.id === trip.id ? 'active' : ''}" data-trip="${t.id}"><span>${esc(t.name)}</span><span class="small">${n} 項・${esc(t.local)}→${esc(t.home)}</span></div>`;
    }).join('');

    renderInstall();
    $('#app-version').textContent = `版本 ${APP_VERSION}`;
  }

  function renderAirportSelect(trip, countryKey) {
    const c = COUNTRIES[countryKey || trip.countryKey];
    const g = c && c.guide && window.SHOPLIST_GUIDES ? window.SHOPLIST_GUIDES[c.guide] : null;
    const list = g && g.airports ? g.airports : [];
    const row = $('#airport-row'); const sel = $('#airport-select');
    row.hidden = !list.length;
    sel.innerHTML = ['<option value="">未選擇</option>'].concat(list.map((a) => `<option value="${esc(a.code)}">${esc(a.name)}</option>`)).join('');
    sel.value = list.some((a) => a.code === trip.airport) ? trip.airport : '';
  }
  function renderCards(cards) {
    const box = $('#cards-list');
    box.innerHTML = cards.map((c) => `<div class="card-row" data-card="${esc(c.id)}">
      <input type="text" value="${esc(c.name)}" placeholder="卡片名稱，例：JCB" data-card-name>
      <input type="number" value="${esc(c.fee)}" step="any" min="0" max="20" inputmode="decimal" placeholder="費率 %" data-card-fee>
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
    if (apply && lastSaved === JSON.stringify(state)) toast('設定完成');
  }

  // ---------- 編輯面板 ----------
  const FIELDS = ['brand', 'name', 'note', 'store', 'date', 'buyer', 'card', 'qty', 'homePrice', 'localPrice', 'altPrice', 'altLabel', 'taxRate', 'coupon'];
  const CHECKS = ['taxFree', 'priceIsPretax', 'consumed', 'consumedSeparate', 'couponConfirmed', 'bought'];

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
    form.localPrice.value = item && hasPrice(item) ? item.localPrice : '';
    form.altPrice.value = item && item.altPrice ? item.altPrice : '';
    form.altLabel.value = item ? (item.altLabel || '') : '';
    form.taxRate.value = item && item.taxRate != null && item.taxRate !== '' ? String(num(item.taxRate)) : '';
    form.taxFree.checked = item ? !!item.taxFree : refundOn(trip);
    form.priceIsPretax.checked = item ? !!item.priceIsPretax : false;
    form.consumed.checked = item ? !!item.consumed : false;
    form.consumedSeparate.checked = item ? !!item.consumedSeparate : false;
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
    renderStoreCouponNote();
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
    $('#consumed-row').hidden = !refundOn(trip) || form.priceIsPretax.checked;
    $('#consumed-detail').hidden = !form.consumed.checked;
    $('#local-price-kind').textContent = form.priceIsPretax.checked ? '已不含稅' : '含稅';
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
      homePrice: num(form.homePrice.value), localPrice: form.localPrice.value.trim() === '' ? null : num(form.localPrice.value), altPrice: num(form.altPrice.value), altLabel: form.altLabel.value.trim(),
      taxFree: form.taxFree.checked, taxRate: form.taxRate.value === '' ? null : num(form.taxRate.value), priceIsPretax: form.priceIsPretax.checked, consumed: form.consumed.checked, consumedSeparate: form.consumedSeparate.checked,
      coupon: num(form.coupon.value), couponConfirmed: form.couponConfirmed.checked, bought: form.bought.checked, photo: ui.editorPhoto,
      quotes: ui.editorQuotes.map((q) => ({ store: (q.store || '').trim(), price: num(q.price), date: q.date || '' })), updatedAt: Date.now()
    }));
  }

  // 儲存前的數值檢查；有問題時回傳欄位與原因，不自動修正使用者的輸入
  function validateItem() {
    const f = $('#item-form');
    const bad = (name, message) => ({ field: f[name], message });
    const amount = (name, label) => {
      const el = f[name];
      if (el.validity.badInput) return bad(name, `${label}不是有效的數字`);
      if (el.value.trim() === '') return null;
      const v = Number(el.value);
      if (!Number.isFinite(v) || v < 0) return bad(name, `${label}不能是負數`);
      if (v > 1e10) return bad(name, `${label}太大了，請確認是否多打了數字`);
      return null;
    };
    const err = amount('localPrice', '當地標價') || amount('homePrice', '出發地參考價') || amount('altPrice', '第二參考價');
    if (err) return err;
    const q = Number(f.qty.value);
    if (f.qty.validity.badInput || f.qty.value.trim() === '' || !Number.isInteger(q) || q < 1) return bad('qty', '數量要是 1 以上的整數');
    if (f.coupon.validity.badInput) return bad('coupon', '折價券不是有效的數字');
    if (f.coupon.value.trim() !== '') {
      const c = Number(f.coupon.value);
      if (!Number.isFinite(c) || c < 0 || c > 99) return bad('coupon', '折價券要介於 0 到 99%');
    }
    return null;
  }

  function renderEditorResult() {
    const trip = currentTrip();
    const box = $('#editor-result');
    const invalid = validateItem();
    if (invalid) {
      box.className = 'result bad';
      box.innerHTML = `<div class="label">請先修正才能試算與儲存</div><div class="warn">${esc(invalid.message)}</div>`;
      return;
    }
    const item = formToItem();
    if (!hasPrice(item)) {
      box.className = 'result';
      box.innerHTML = '<div class="label">輸入當地標價後即時試算；還不知道價格也可以先存，會標示待查價</div>';
      return;
    }
    const items = tripItems(trip);
    const g = groupFor(item, trip, items);
    const ok = g ? g.ok : true;
    const r = calcItem(item, trip, ok);
    const cc = couponCompare(item, trip, items);
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
    if (r.dateRule) warn.push(`${r.dateRule.text}。`);
    if (item.consumed && item.consumedSeparate) warn.push('這件會拆用且單獨結帳，不計退稅。');
    else if (item.consumed) warn.push('用掉一件，同一張收據的其他商品也不能退，所以這組目前不計退稅。勾「分開結帳」可以保住其他商品。');
    else if (g && g.receiptBlocked) warn.push('同店有會拆用的商品，這組目前不計退稅。');
    if (item.bought && g && g.ok && !g.boughtOk && countsForThreshold(item, trip) && !(g.date && g.date < today())) warn.push(`已買的未稅 ${money(g.boughtPretax, trip.local)} 還沒到門檻，同一天買齊計畫中的商品才會退稅。`);
    if (refundOn(trip) && countsForThreshold(item, trip) && !ok && th > 0 && !(g && g.receiptBlocked)) {
      const rp = itemRate(item, trip);
      warn.push(g && g.tripShort
        ? `全程未稅合計還差 ${money(g.tripShort, trip.local)} 才能退稅，目前以不免稅計算。`
        : (g && g.date && g.date < today()
          ? `${g.date} 的未稅合計沒到門檻，這天已過，目前以不免稅計算。`
          : normStore(item.store)
          ? `${item.store.trim()} 同一天${item.buyer ? `、${item.buyer.trim()}` : ''}再買含稅約 ${money(grossUp(g.shortfall, rp), trip.local)} 就能退稅（未稅 ${money(g.shortfall, trip.local)}，以 ${rp}% 估），目前以不免稅計算。`
          : `未稅價未達 ${money(th, trip.local)}；填上店家可與同店同日的商品合併計算。`));
    }
    if (refundOn(trip) && item.taxFree && !item.priceIsPretax && itemRate(item, trip) <= 0) warn.push('稅率為 0，免稅沒有差異。');
    if (r.couponPending) warn.push(`折價券 ${num(item.coupon)}% 尚未確認，目前未套用。`);
    let couponNote = '';
    const plan = couponPlan(item, trip, items);
    if (plan) {
      const harm = !plan.uses(item.id) && item.couponConfirmed;
      couponNote = `<div class="coupon-cmp ${harm ? 'bad' : ''}">${harm ? '⚠ ' : ''}${plan.uses(item.id) ? '這張建議用。' : '這張不用比較省。'}${esc(planText(plan, trip))}</div>`;
    } else if (cc) {
      const parts = `用 ${cc.rate}% 券：折抵 ${money(cc.discount, trip.local)}${cc.lostRefund > 0.5 ? `，退稅少 ${money(cc.lostRefund, trip.local)}` : ''}`;
      couponNote = cc.netDelta > 0.5
        ? `<div class="coupon-cmp bad">⚠ ${esc(parts)}，反而多花 ${esc(money(cc.netDelta, trip.local))}（約 ${esc(money(cc.homeDelta, trip.home))}）。建議不要用這張券。</div>`
        : `<div class="coupon-cmp">${esc(parts)}，實際再省 ${esc(money(-cc.netDelta, trip.local))}（約 ${esc(money(-cc.homeDelta, trip.home))}）。</div>`;
    }
    box.className = 'result ' + (r.verdict === 'none' ? '' : r.verdict);
    box.innerHTML = `<div class="label">現場要付（${r.feePct > 0 ? `含刷卡費 ${r.feePct}%` : '不含手續費'}）</div><div class="big">${money(r.payHome, trip.home)}</div>
      <div class="lines">${lines.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
      <div class="verdict ${r.verdict}">${r.verdict === 'none' ? '填入出發地參考價就能比較划不划算' : `${r.verdictText}：${r.saving >= 0 ? '省' : '多花'} ${money(Math.abs(r.saving), trip.home)}（${pct(Math.abs(r.ratio))}）`}</div>
      ${couponNote}
      ${warn.map((w) => `<div class="warn">${esc(w)}</div>`).join('')}`;
    renderQuotes(trip);
  }

  function saveEditor(andNext) {
    const form = $('#item-form');
    if (!form.name.value.trim()) { form.name.focus(); toast('請填商品名稱'); return; }
    const invalid = validateItem();
    if (invalid) {
      const d = invalid.field.closest('details');
      if (d) d.open = true;
      invalid.field.focus();
      toast(invalid.message);
      renderEditorResult();
      return;
    }
    const item = formToItem();
    const idx = state.items.findIndex((i) => i.id === item.id);
    if (idx >= 0) { stampChanges(item, state.items[idx]); state.items[idx] = item; } else state.items.push(item);
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
    const raw = form.price.value.trim();
    const price = raw === '' ? null : Number(raw);
    if (form.price.validity.badInput || (price != null && (!Number.isFinite(price) || price < 0))) { form.price.focus(); toast('標價要是 0 以上的數字'); return; }
    const trip = currentTrip();
    const store = form.store.value.trim();
    const buyer = form.buyer.value.trim();
    trip.lastStore = store;
    trip.lastBuyer = buyer;
    const item = newItem(trip.id, { name, localPrice: price, store, buyer, date: today(), bought: true, taxFree: refundOn(trip) });
    state.items.push(item);
    if (save()) {
      form.reset(); renderAll();
      form.store.value = store; form.buyer.value = buyer;
      toast(price == null ? `已記下「${name}」，價格待查` : `已記下「${name}」`);
      form.name.focus();
    }
  }

  function deleteItem(id) {
    const it = state.items.find((i) => i.id === id);
    if (!it) return;
    if (!confirm(`刪除「${it.name}」？`)) return;
    markDeleted(id);
    state.items = state.items.filter((i) => i.id !== id);
    if (!save()) return;
    closeEditor(true); renderAll(); toast('已刪除');
  }

  function readImage(file, max, quality, cb) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        cb(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  function handlePhoto(file) { readImage(file, 640, 0.78, (data) => { ui.editorPhoto = data; renderPhoto(); saveDraft(); }); }
  // 券圖保留較高解析度，條碼才掃得到
  function handleCouponPhoto(file) { readImage(file, 1280, 0.82, (data) => { ui.couponPhoto = data; renderCouponPhoto(); }); }

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
    trip.airport = form.airport.value || '';
    trip.refundEnabled = form.refundEnabled.checked;
    trip.mode = form.mode.value === 'instant' ? 'instant' : 'refund';
    trip.refundFeePct = num(form.refundFeePct.value);
    trip.refundRatio = form.refundRatio.value === '' ? 100 : Math.min(100, Math.max(0, num(form.refundRatio.value)));
    trip.tripMinTotal = num(form.tripMinTotal.value);
    trip.onboarded = true;
    trip.updatedAt = Date.now();
    if (!save()) return;
    renderAll(); toast('設定已儲存');
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
    renderAirportSelect(currentTrip(), key);
    renderFxPreview();
  }

  function addTrip() {
    const name = prompt('旅程名稱', '東京 ' + today().slice(0, 7));
    if (name == null) return;
    const cur = currentTrip();
    const t = newTrip({ name: name.trim() || '新旅程', home: cur.home, cards: (cur.cards || []).map((c) => Object.assign({}, c)), cardFee: cur.cardFee, onboarded: false });
    state.trips.push(t); state.currentTripId = t.id;
    if (!save()) return;
    renderAll(); showTab('list'); openOnboard();
  }
  function deleteTrip() {
    const trip = currentTrip();
    if (state.trips.length <= 1) { toast('至少要保留一個旅程'); return; }
    const n = tripItems(trip).length;
    if (!confirm(`刪除「${trip.name}」及其 ${n} 項商品？`)) return;
    markDeleted(trip.id);
    state.items.filter((i) => i.tripId === trip.id).forEach((i) => markDeleted(i.id));
    state.items = state.items.filter((i) => i.tripId !== trip.id);
    state.trips = state.trips.filter((t) => t.id !== trip.id);
    state.currentTripId = state.trips[0].id;
    if (!save()) return;
    renderAll(); toast('已刪除旅程');
  }
  function switchTrip(id) { state.currentTripId = id; ui.store = 'all'; ui.brand = 'all'; ui.buyer = 'all'; save(); renderAll(); }

  function loadSample() {
    const n = state.items.length;
    const msg = n ? '另外建立一個「沖繩 2026/10」範例旅程？（不會影響現有資料）' : '載入「沖繩 2026/10」範例旅程？';
    if (!confirm(msg)) return;
    const t = newTrip(Object.assign({}, SAMPLE_TRIP));
    state.trips.push(t); state.currentTripId = t.id;
    SAMPLE_ITEMS.forEach((s) => state.items.push(newItem(t.id, s)));
    if (!save()) return;
    renderAll(); showTab('list'); toast('已載入範例');
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
  // 同一商品逐欄取較新的修改（包含取消已買）；刪除紀錄比商品新時，商品會被移除
  function mergeState(incoming) {
    let added = 0, updated = 0;
    const touched = new Map(); // 各旅程有變動的商品數，用來決定合併後顯示哪個旅程
    const bump = (tripId) => touched.set(tripId, (touched.get(tripId) || 0) + 1);
    state.deleted = state.deleted || {};
    const del = state.deleted;
    Object.keys(incoming.deleted || {}).forEach((id) => { if (!(del[id] >= incoming.deleted[id])) del[id] = incoming.deleted[id]; });
    const isDeleted = (x) => !!del[x.id] && del[x.id] >= (x.updatedAt || 0);
    incoming.trips.forEach((t) => {
      if (isDeleted(t)) return;
      const cur = state.trips.find((x) => x.id === t.id);
      if (!cur) { state.trips.push(t); return; }
      cur.coupons = cur.coupons || [];
      (t.coupons || []).forEach((c) => {
        const i = cur.coupons.findIndex((x) => x.id === c.id);
        if (i < 0) cur.coupons.push(c);
        else if ((c.updatedAt || 0) > (cur.coupons[i].updatedAt || 0)) cur.coupons[i] = c;
      });
    });
    const byId = new Map(state.items.map((i) => [i.id, i]));
    incoming.items.forEach((inc) => {
      if (isDeleted(inc)) return;
      const cur = byId.get(inc.id);
      if (!cur) { state.items.push(inc); byId.set(inc.id, inc); added++; bump(inc.tripId); return; }
      if (mergeItem(cur, inc)) { updated++; bump(cur.tripId); }
    });
    state.trips = state.trips.filter((t) => !isDeleted(t));
    state.trips.forEach((t) => { t.coupons = (t.coupons || []).filter((c) => !isDeleted(c)); });
    if (!state.trips.length) state.trips.push(newTrip({ name: '我的旅程' }));
    if (!state.trips.some((t) => t.id === state.currentTripId)) state.currentTripId = state.trips[0].id;
    const tripIds = new Set(state.trips.map((t) => t.id));
    const before = state.items.length;
    state.items = state.items.filter((i) => !isDeleted(i) && tripIds.has(i.tripId));
    // 目前的旅程沒有變動、別的旅程有時，切過去，才不會看起來像匯入失敗
    let switched = '';
    if (!touched.get(state.currentTripId) && touched.size) {
      const target = Array.from(touched.entries()).filter(([id]) => tripIds.has(id)).sort((a, b) => b[1] - a[1])[0];
      if (target) {
        state.currentTripId = target[0];
        ui.store = 'all'; ui.brand = 'all'; ui.buyer = 'all'; ui.status = 'all';
        switched = (state.trips.find((t) => t.id === target[0]) || {}).name || '';
      }
    }
    return { added, updated, removed: before - state.items.length, switched };
  }
  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.trips) || !Array.isArray(data.items)) throw new Error('bad');
        migrateState(data);
        const merge = confirm(`匯入 ${data.trips.length} 個旅程、${data.items.length} 項商品。\n\n按「確定」＝合併：雙方新增的商品都保留；同一商品以較新的修改為準，包含取消已買；對方刪除的商品也會刪除。\n按「取消」＝下一步可選擇取代全部資料。`);
        if (merge) {
          const r = mergeState(data);
          if (!save()) return;
          renderAll(); showTab('list'); toast(`已合併：新增 ${r.added} 項、更新 ${r.updated} 項、移除 ${r.removed} 項${r.switched ? `，已切到「${r.switched}」` : ''}`);
          return;
        }
        if (!confirm('取代目前所有資料？這會清掉這支手機上既有的清單。')) return;
        state = data;
        if (!state.trips.find((t) => t.id === state.currentTripId)) state.currentTripId = state.trips[0] && state.trips[0].id;
        if (!state.trips.length) { const t = newTrip({ name: '我的旅程' }); state.trips.push(t); state.currentTripId = t.id; }
        if (!save()) return;
        renderAll(); toast('已取代');
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
      if (r.pendingPrice) return `${it.bought ? '☑' : '☐'} ${[it.brand, it.name].filter(Boolean).join(' ')}${r.qty > 1 ? ` ×${r.qty}` : ''}｜待查價${it.store ? `｜${it.store}` : ''}`;
      const cmp = r.saving != null ? `（${r.saving >= 0 ? '省' : '多'} ${money(Math.abs(r.saving), trip.home)}，${pct(Math.abs(r.ratio))}）` : '';
      return `${it.bought ? '☑' : '☐'} ${[it.brand, it.name].filter(Boolean).join(' ')}${r.qty > 1 ? ` ×${r.qty}` : ''}｜現場 ${money(r.pay, trip.local)} ≈ ${money(r.payHome, trip.home)}${r.refund > 0 ? `，退稅後約 ${money(r.home, trip.home)}` : ''}${cmp}${it.store ? `｜${it.store}` : ''}${r.dateRule && r.dateRule.block ? '｜日期不符，不計退稅' : ''}`;
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
    lines.push(`已花 ${money(t.boughtPay, trip.local)}、已確定退稅 ${money(t.confirmedRefund, trip.local)}${t.plannedRefund > 0.5 ? `，買齊計畫再加 ${money(t.plannedRefund, trip.local)}` : ''}`);
    lines.push(`全部買齊：現場付款 ${money(t.pay, trip.local)} ≈ ${money(t.payHome, trip.home)}，成本約 ${money(t.home, trip.home)}`);
    if (t.pending) lines.push(`有 ${t.pending} 項待查價，以上合計未含。`);
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
    ['#summary', '#summary-more'].forEach((sel) => $(sel).addEventListener('click', (e) => {
      if (e.target.closest('[data-show-pending]')) { ui.status = 'pending'; renderList(currentTrip()); return; }
      const b = e.target.closest('[data-goto]');
      if (b) gotoSetting(b.dataset.goto);
    }));
    $('#btn-more').addEventListener('click', () => { ui.moreOpen = !ui.moreOpen; renderList(currentTrip()); });
    $('#btn-filter').addEventListener('click', () => { ui.filterOpen = !ui.filterOpen; renderList(currentTrip()); });
    $('#quick-form').addEventListener('focusin', () => $('#quick-form').classList.add('open'));
    document.addEventListener('click', (e) => { if (!e.target.closest('#quick-form')) $('#quick-form').classList.remove('open'); });
    $('#btn-banner-close').addEventListener('click', () => { $('#app-banner').hidden = true; });
    $('#btn-banner-download').addEventListener('click', () => { if ($('#app-banner').dataset.kind === 'corrupt') downloadCorrupt(); else exportJson(); });
    $('#quick-form').addEventListener('submit', quickAdd);

    $('#store-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-store]'); if (b) { ui.store = b.dataset.store; renderList(currentTrip()); } });
    $('#buyer-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-buyer]'); if (b) { ui.buyer = b.dataset.buyer; renderList(currentTrip()); } });
    $('#brand-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-brand]'); if (b) { ui.brand = b.dataset.brand; renderList(currentTrip()); } });
    $$('.status-chips .chip').forEach((c) => c.addEventListener('click', () => { ui.status = c.dataset.status; renderList(currentTrip()); }));

    $('#item-list').addEventListener('click', (e) => {
      const buy = e.target.closest('[data-buy]');
      if (buy) {
        const it = state.items.find((i) => i.id === buy.dataset.buy);
        if (it) {
          const prev = Object.assign({}, it);
          it.bought = !it.bought; it.updatedAt = Date.now();
          if (it.bought && !it.date) it.date = today();
          stampChanges(it, prev);
          save(); renderAll();
        }
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
      if (e.target.name === 'priceIsPretax' || e.target.name === 'consumed') renderTaxRows(currentTrip());
      renderEditorResult(); saveDraft();
    });
    $('#store-quick').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick-store]');
      if (b) { $('#item-form').store.value = b.dataset.pickStore; renderEditorResult(); renderStoreCouponNote(); saveDraft(); }
    });
    $('#item-form').store.addEventListener('input', renderStoreCouponNote);

    // 我的券與圖片放大
    $('#btn-coupons').addEventListener('click', () => openCoupons(''));
    $('#btn-coupons-close').addEventListener('click', closeCoupons);
    $('#coupons').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeCoupons(); });
    $('#coupon-form').addEventListener('submit', saveCoupon);
    $('#btn-coupon-reset').addEventListener('click', () => { const f = $('#coupon-form'); f.reset(); f.id.value = ''; ui.couponPhoto = null; renderCouponPhoto(); $('#btn-coupon-reset').hidden = true; });
    $('#coupon-camera').addEventListener('change', (e) => { handleCouponPhoto(e.target.files[0]); e.target.value = ''; });
    $('#coupon-photo').addEventListener('change', (e) => { handleCouponPhoto(e.target.files[0]); e.target.value = ''; });
    $('#btn-coupon-photo-clear').addEventListener('click', () => { ui.couponPhoto = null; renderCouponPhoto(); });
    $('#coupon-list').addEventListener('click', (e) => {
      const ed = e.target.closest('[data-coupon-edit]'); const del = e.target.closest('[data-coupon-del]'); const v = e.target.closest('[data-view]');
      if (ed) editCoupon(ed.dataset.couponEdit); else if (del) deleteCoupon(del.dataset.couponDel); else if (v) openViewer(v.src);
    });
    document.addEventListener('click', (e) => {
      const oc = e.target.closest('[data-open-coupons]');
      if (oc) { openCoupons($('#editor').hidden ? '' : $('#item-form').store.value); return; }
      const v = e.target.closest('#store-coupon-note [data-view]');
      if (v) openViewer(v.src);
      const gt = e.target.closest('[data-guide-tab]');
      if (gt) { ui.guideTab = gt.dataset.guideTab; renderGuide(currentTrip()); $('#guide-card').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      const ga = e.target.closest('[data-guide-airport]');
      if (ga) { const t = currentTrip(); t.airport = ga.dataset.guideAirport; save(); renderGuide(t); renderAirportSelect(t); }
    });
    $('#viewer').addEventListener('click', closeViewer);
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
    window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY) { state = load(); lastSaved = JSON.stringify(state); renderAll(); } });
  }

  // ---------- 啟動 ----------
  bind();
  renderAll();
  showTab('list');
  if (corruptRaw) showBanner('corrupt');
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
