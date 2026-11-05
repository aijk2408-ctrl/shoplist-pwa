/* 退稅指引與券入口：依國家代碼載入。新增國家時在這裡加一個鍵即可（結構相同）。
   所有內容皆為整理資訊，非官方；每段附來源與查核日期。 */
window.SHOPLIST_GUIDES = {
  JP: {
    country: '日本',
    checked: '2026-11-04',
    rules: {
      title: '日本免稅新制（2026/11/1 起）',
      sections: [
        { h: '改了什麼', p: [
          '以前在店裡直接付未稅價；現在店內一律付含稅價，離開日本時才把消費稅退給你。',
          '以「購買日」判斷：2026 年 11 月 1 日以後買的走新制；10 月 31 日以前買的仍依舊制，即使 11 月才出境。'
        ] },
        { h: '可以退的條件', p: [
          '同一家店、同一天，未稅合計滿 ¥5,000（一般商品與消耗品合併計算，原本消耗品 ¥50 萬的上限取消）。',
          '購買日起 90 天內出境並完成稅關確認；商品出境時全部隨身可供查驗。以「一張收據」為單位，少一件整張收據都不退。',
          '消耗品不再需要密封包裝，但在日本用掉一件，同一張收據的其他商品也不能退；用掉的要向稅關人員申報。會拆開用的東西（尿布、零食）建議單獨結帳。',
          '身分條件：外國籍須入境未滿 6 個月，在留資格或上陸許可為短期滯在、外交、公用、寄港地、通過、船舶觀光、乘員等。打工度假、留學、工作、長住不在官方名單內。',
          '日本籍須連續住海外 2 年以上並有證明（戶籍附票、在留證明或註記國外轉出的 My Number 卡），且回日未滿 6 個月。',
          '未稅單價 ¥100 萬以上的商品可能被要求出示鑑定書或保證書。'
        ] },
        { h: '出境時怎麼做', p: [
          '到機場後、託運與安檢之前，先到國際線出發大廳的「免税手続端末」刷護照；或在同一區連上稅關專用 Wi-Fi（SSID Customs_WiFi_For_TaxRefund，密碼 jcustoms）用 Visit Japan Web 線上辦理（目前只列七個機場）。Visit Japan Web 不能在家先辦完，只能先建帳號與登錄護照。',
          '畫面顯示 GREEN 就完成，去報到；顯示 RED 要帶全部商品到旁邊的稅關檢查處人工查驗。放棄查驗等於沒辦。',
          '只能在出境當天辦；行李託運後或過了出國審查就不能再辦。高單價商品容易被抽查，請預留時間，並由購買者本人攜帶。',
          '確認完成後，退款依「店家指定的方式」進行：信用卡回沖、QR 支付、匯款，或出國審查後到機場的現金退款機或櫃台領日圓。'
        ] },
        { h: '常見誤區', p: [
          '食品、飲料的稅率是 8%，退的也是 8%；App 可在商品上個別設定。',
          '百貨公司集中免稅櫃台多半收約 1.55% 手續費，實際退回會少一點；App 設定頁可填「退稅手續費」。',
          '機場免稅店（Duty Free）的標價已經不含稅，不走這個流程；在 App 勾「標價已不含稅」即可。',
          '國內線轉國際線：在最後出境的機場辦，第一段不要把退稅商品託運。',
          '酒、菸帶回台灣有數量限制（酒 1 公升、菸 200 支），超過要申報課稅。'
        ] }
      ],
      sources: [
        { name: '観光庁 免税購入対象者一覧', url: 'https://www.mlit.go.jp/kankocho/tax-free/content/001977885.pdf' },
        { name: '観光庁 旅行者向け特設ページ', url: 'https://www.mlit.go.jp/kankocho/tax-free/page01_000001_00021.html' },
        { name: '観光庁 FAQ', url: 'https://www.mlit.go.jp/kankocho/tax-free/page01_000001_00023.html' },
        { name: '税関 免税制度（リファンド方式）', url: 'https://www.customs.go.jp/kaigairyoko/taxrefund/jpn.htm' },
        { name: '国税庁 線上稅關確認 FAQ', url: 'https://www.nta.go.jp/publication/pamph/shohi/menzei/201805/format/002/onlinetetsuzuki/faqjpn.htm' },
        { name: 'JNTO 英文說明', url: 'https://www.japan.travel/en/ca/news/changes-are-coming-to-japans-tax-free-shopping/' }
      ]
    },
    storeTypes: [
      { type: '百貨公司', examples: '高島屋、三越伊勢丹、大丸松坂屋、阪急阪神', flow: '各專櫃付款後，帶收據與護照到樓層或館內的「免稅櫃台」集中登記；委託櫃台辦理時可合併同日多店的購買額。', refund: '多數收約 1.55% 手續費；退款方式依百貨指定（常見為信用卡回沖或機場現金）。', tips: '外國旅客賓客卡（約 5% off）要先在服務台辦，與免稅分開計算；App 設定頁可填退稅手續費。' },
      { type: '品牌直營店', examples: 'LV、Chanel、Apple、Nintendo 直營', flow: '結帳時出示護照，店家直接登記。', refund: '依品牌指定，部分只退信用卡。', tips: '高單價商品出境時容易被抽查，請由購買者本人隨身攜帶並保留收據。' },
      { type: '藥妝、3C 連鎖', examples: '松本清、唐吉訶德、Bic Camera、Yodobashi、EDION、YAMADA', flow: '到免稅收銀台結帳並出示護照；同店同日可合併計算門檻。', refund: '依店家指定；連鎖店多提供信用卡回沖或機場現金櫃台。', tips: '折價券能否與免稅併用各店不同，結帳前先問；食品飲料 8%。' },
      { type: '購物中心、Outlet', examples: 'AEON MALL、PARCO、三井 Outlet、御殿場 Outlet', flow: '多數是各店各自登記免稅，少數商場設統一櫃台；門檻以「同一個免稅登記店」為單位。', refund: '依各店指定。', tips: '同一商場不同店不能合併門檻，除非商場是統一登記。' },
      { type: '機場免稅店（Duty Free）', examples: '出境後管制區內的店', flow: '標價已不含消費稅（部分也免關稅、酒稅），不需要辦免稅手續。', refund: '沒有退稅。', tips: '在 App 的商品勾「標價已不含稅」，就不會算進門檻與退稅。' }
    ],
    airportsNote: '共通：到機場先辦稅關確認（託運前、安檢前），GREEN 才去報到；現金退款多在出國審查後。端末只能在出境當天用。國內線轉機的話，到最後出境的機場才辦，第一段不要託運退稅商品。',
    airports: [
      {
        code: 'NRT', short: '成田', name: '成田機場 NRT', confidence: 'official', checked: '2026-11-04',
        steps: ['託運前在出發大廳刷稅關端末，或連稅關 Wi-Fi 用 Visit Japan Web', 'GREEN 完成；RED 到旁邊稅關檢查處人工查驗', '報到託運、安檢、出國審查', '現金退款者到出國後的退款機或櫃台'],
        location: '第 1 航廈：中央大樓 4F 出發大廳（安檢前）。第 2 航廈：本館 3F（安檢前）。第 3 航廈：本館 2F（安檢前，與稅關櫃台同處）。端末服務時間 05:30–23:00。',
        time: '機場建議出發 2 小時以上前抵達，另預留稅關確認時間；深夜或清晨班機注意端末時間。',
        cash: '安檢前：Self Tax Refund 機台在 T1 中央大樓 4F、T2 本館 3F（06:00–24:00，需先完成稅關確認）。出國後：Cash Japan 在 T1 南翼與北翼 3F、T2 本館 3F 與衛星樓 3F、T3 本館 3F（24 小時）。能否現金退款取決於店家使用的退款業者。',
        sources: [
          { name: '成田機場 消費税返金手続き', url: 'https://www.narita-airport.jp/ja/service/exchange/taxrefund/' },
          { name: '税関 端末設置場所', url: 'https://www.customs.go.jp/kaigairyoko/taxrefund/map.htm' },
          { name: 'Cash Japan 退款點', url: 'https://www.cashjapan.com/ja/get-your-refund/' }
        ]
      },
      {
        code: 'HND', short: '羽田', name: '羽田機場 HND', confidence: 'official', checked: '2026-11-04',
        steps: ['報到前先在 3F 的免税手続端末刷護照，或用 Visit Japan Web', 'RED 到端末附近的稅關檢查處', '報到託運、安檢、出國審查', '現金退款者到出發大廳（出國後）的 Self Tax Refund'],
        location: '第 2 航廈（國際線區）：3F 安檢前，8 台，06:00–翌日 02:00。第 3 航廈：3F 安檢前，13 台，24 小時。第 1 航廈為國內線，沒有退稅服務。',
        time: '稅關預估羽田每天約一萬人辦理；T3 早晚班次尖峰時段排隊明顯，請提早。',
        cash: '出國後：Self Tax Refund 在 T2 3F 出發大廳（06:45–翌日 01:30，依航班調整）、T3 3F 出發大廳 CENTRAL（24 小時）。沒有 Cash Japan 櫃台。',
        sources: [
          { name: '羽田機場 Tax Refund', url: 'https://tokyo-haneda.com/service/facilities/tax_refund.html' },
          { name: '税関 端末設置場所', url: 'https://www.customs.go.jp/kaigairyoko/taxrefund/map.htm' }
        ]
      },
      {
        code: 'KIX', short: '關西', name: '關西機場 KIX', confidence: 'official', checked: '2026-11-04',
        steps: ['託運前完成稅關確認：端末或 Visit Japan Web（機場建議用線上，端末可能排隊）', 'GREEN 去報到；RED 帶全部商品依職員指示查驗', '安檢、出國審查', '現金退款者到出國審查後的 Cash Japan'],
        location: '第 1 航廈：4F 國際線出發樓層，沿報到櫃台 A–H 設兩組端末共 24 台（安檢前），24 小時；稅關人員從報到開始到安檢關閉。第 2 航廈：1F 報到大廳（安檢前），4 台，24 小時。',
        time: '稅關確認只能在出境當天辦；機場提醒預留充裕時間。國內線轉機者第一段不要託運退稅商品。',
        cash: '出國審查後：T1 3F Cash Japan 櫃台 07:00–24:00、機台 05:30 至末班機；T2 1F 機台 05:30 至末班機。',
        sources: [
          { name: '關西機場 タックスリファンド', url: 'https://www.kansai-airport.or.jp/tax-refund' },
          { name: '大阪税関 関西空港案内（PDF）', url: 'https://www.customs.go.jp/osaka/about/images/kix_tax%20refund_jp.pdf' },
          { name: 'Cash Japan 退款點', url: 'https://www.cashjapan.com/ja/get-your-refund/' }
        ]
      },
      {
        code: 'NGO', short: '中部', name: '中部國際機場 NGO', confidence: 'official', checked: '2026-11-04',
        steps: ['到機場先以退稅手續為最優先：報到前刷稅關 KIOSK（擁擠時可用 Visit Japan Web）', 'RED 到 KIOSK 附近的稅關確認處', '報到託運、安檢、出國審查', '現金退款者到出國審查後的專用櫃台或機台'],
        location: '第 1 航廈：3F 國際線報到櫃台前（KIOSK 與稅關確認處都在這裡），依航班開放。第 2 航廈：2F 報到櫃台旁的「CIQ 資訊角」，稅關確認處在往安檢途中，10:00–21:30。',
        time: '機場提醒退稅手續可能耗時，請預留時間；報到櫃台約出發前 2～3 小時開放，先報到就不能辦。',
        cash: '出國審查後：T1 出國審查處附近 KIOSK 5 台、20 號登機門附近有人櫃台（07:00–22:15）；T2 出國審查出口即到，10:00–21:30。只退日圓。',
        sources: [
          { name: '中部機場 TAXリファンド', url: 'https://www.centrair.jp/taxrefund/index.html' },
          { name: '税関 端末設置場所', url: 'https://www.customs.go.jp/kaigairyoko/taxrefund/map.htm' }
        ]
      },
      {
        code: 'FUK', short: '福岡', name: '福岡機場 FUK', confidence: 'official', checked: '2026-11-04',
        steps: ['託運前刷稅關 KIOSK 或用 Visit Japan Web', 'RED 到 KIOSK 旁的稅關確認處', '報到託運、安檢、出國審查（出國後不能回到出發大廳）', '現金退款者到出國後免稅店區的退款點'],
        location: '國際線航廈 3F 南側、J～M 報到櫃台前，12 台，06:00–21:00；稅關確認處在同一處。稅關 Wi-Fi 只在國際線 3F 出發大廳可用。',
        time: '端末只開到 21:00；機場提醒可能耗時，請提早到。',
        cash: '出國審查後：3F 免稅店區「HAKATA FOOD HALL」入口旁，機台 06:00–21:00、櫃台 07:00–21:00，只退日圓。',
        sources: [
          { name: '福岡機場 免税手続', url: 'https://www.fukuoka-airport.jp/taxrefund_info.html' },
          { name: '税関 端末設置場所', url: 'https://www.customs.go.jp/kaigairyoko/taxrefund/map.htm' }
        ]
      },
      {
        code: 'CTS', short: '新千歲', name: '新千歲機場 CTS', confidence: 'media', checked: '2026-11-04',
        steps: ['託運前在國際線航廈 3F 刷稅關端末或用 Visit Japan Web', 'RED 到稅關檢查處', '報到託運、安檢、出國審查', '現金退款者到 Cash Japan'],
        location: '國際線航廈 3F（機場官網只寫樓層），06:00 至閉館；媒體報導為 3F 出發大廳、10 台固定式端末。具體靠近哪個櫃台官方未公布。',
        time: '沒有機場專屬提醒，請依共通原則提早到。',
        cash: 'Cash Japan 在國際線航廈 3F，櫃台 07:00–20:00、機台 06:00–20:30；位於出國審查前或後官方未註明。',
        note: '新千歲官網資訊較少，到場後以現場指標與稅關人員指引為準。',
        sources: [
          { name: '新千歲機場 免税手続端末', url: 'https://www.hokkaido-airports.com/ja/new-chitose/service/money/customs-tax-refund-kiosk/' },
          { name: '新千歲機場 現金退款', url: 'https://www.hokkaido-airports.com/ja/new-chitose/service/money/cash-japan-tax-refund/' },
          { name: '北海道新聞', url: 'https://www.hokkaido-np.co.jp/article/1396745/' }
        ]
      },
      {
        code: 'OKA', short: '那霸', name: '那霸機場 OKA', confidence: 'media', checked: '2026-11-04',
        steps: ['託運前在國際線 3F 刷稅關端末或用 Visit Japan Web（稅關有人員引導，建議用線上）', 'RED 到稅關檢查處', '報到託運、安檢、出國審查', '現金退款者到出國後 2F 出發大廳的 Self Tax Refund'],
        location: '國際線航廈 3F 國際線區（稅關官方）；媒體報導為 3F 報到櫃台區、10 台。那霸機場官網尚未刊登新制資訊。',
        time: '沒有機場專屬提醒；稅關表示會依購買金額與數量判斷查驗，大額請提早。',
        cash: '出國後：Self Tax Refund 在 2F 出發大廳，06:00–21:00（依航班調整）。沖繩縣內只有那霸機場有現金退款點；沒有 Cash Japan。',
        note: '那霸機場官網無新制頁面，到場後以現場指標為準。',
        sources: [
          { name: '税関 端末設置場所', url: 'https://www.customs.go.jp/kaigairyoko/taxrefund/map.htm' },
          { name: '琉球新報', url: 'https://ryukyushimpo.jp/economics/entry-5577184.html' },
          { name: 'Glory Self Tax Refund', url: 'https://www.glory.co.jp/company/news/detail/id=3680' }
        ]
      }
      ,
      {
        code: 'CRUISE', short: '郵輪', name: '搭郵輪離開日本', confidence: 'official', confLabel: '規則官方，港口位置未查實', checked: '2026-11-05',
        steps: ['海外發著的郵輪：在日本最後一個停靠港辦理，要在託運行李與上船手續之前完成', '坐完郵輪再從日本機場回國（Fly & Cruise）：在出境機場辦理，請改看該機場', 'GREEN 就完成；RED 要帶全部商品給稅關查驗'],
        location: '官方沒有逐港列出位置，部分港口也沒有常設端末。請向船公司或港口人員確認，或洽管轄的稅關。那霸、石垣等港口的實際位置本次未查實。',
        time: '停靠時間短，建議上船前先問船公司最後一港怎麼辦。',
        cash: '港口有沒有現金退款未查實。結帳時建議選信用卡回沖，不要選機場現金。',
        note: 'Visit Japan Web 線上確認目前只列七個機場，港口請用端末或依現場指引。持船舶觀光上陸許可時，購物可能要出示許可書。',
        sources: [
          { name: '観光庁 FAQ（郵輪）', url: 'https://www.mlit.go.jp/kankocho/tax-free/page01_000001_00023.html' },
          { name: '観光庁 免税購入対象者一覧', url: 'https://www.mlit.go.jp/kankocho/tax-free/content/001977885.pdf' },
          { name: '税関 端末設置場所', url: 'https://www.customs.go.jp/kaigairyoko/taxrefund/map.htm' }
        ]
      }
    ],
    coupons: {
      note: '只放官方或官方合作平台的優惠頁連結，不放券圖；使用前請確認頁面上的有效期限與條件。券頁上的「免稅 10%」是舊制寫法，新制下店內付含稅價、出境後退。標「待確認」的是官方網域但本次未能開啟頁面，請自行點開核對。查證日期 2026-11-04。',
      groups: [
        { name: '總入口', stores: [
          { name: 'taxfreeshops.jp 旅客優惠券總覽（多家連鎖）', url: 'https://www.taxfreeshops.jp/zhtw/tieup/coupon', summary: '藥妝、3C、百貨的官方合作券集中頁', conditions: '各券條件不同，付款前出示', confidence: 'partner' }
        ] },
        { name: '藥妝', stores: [
          { name: '唐吉訶德 Don Quijote', url: 'https://japanportal.donki-global.com/coupon/', summary: '免稅＋最高 7% 券', conditions: '限外國護照、限免稅結帳；付款前出示，付款後不受理', confidence: 'official' },
          { name: 'Sun Drug', url: 'https://www.taxfreeshops.jp/zhtw/tieup/4', summary: '免稅＋最高 7%', conditions: '限免稅結帳、手機出示；部分專櫃化妝品除外', confidence: 'partner' },
          { name: 'Kokumin', url: 'https://www.taxfreeshops.jp/zhtw/tieup/18', summary: '免稅＋最高 8%', conditions: '限頁面列出的店舖', confidence: 'partner' },
          { name: 'Tsuruha', url: 'https://www.taxfreeshops.jp/zhtw/tieup/9', summary: '免稅＋最高 7%', conditions: '需護照正本', confidence: 'partner' },
          { name: 'Welcia（含 HAC）', url: 'https://www.taxfreeshops.jp/zhtw/tieup/21', summary: '免稅＋最高 8%', conditions: '限免稅對應店；不可併用', confidence: 'partner' }
        ] },
        { name: '3C', stores: [
          { name: 'Bic Camera（含 Kojima、Sofmap）', url: 'https://www.taxfreeshops.jp/zhtw/tieup/2', summary: '免稅＋家電相機 7%、藥妝日用品 5%、日本酒 3%', conditions: '未稅 ¥5,000 以上、護照正本；Apple、Rolex 等除外', confidence: 'partner' },
          { name: 'EDION', url: 'https://www.taxfreeshops.jp/zhtw/tieup/6', summary: '免稅＋最高 7%', conditions: '未稅 ¥5,000 以上，付款前於免稅櫃台出示', confidence: 'partner' },
          { name: 'EDION 官方訪日專頁', url: 'https://www.edion.com/ito/contents/special/lp/edion_inbound/taxfree/', summary: '免稅店一覽與券', conditions: '', confidence: 'unverified' },
          { name: 'YAMADA（LABI、Tecc Land）', url: 'https://www.taxfreeshops.jp/zhtw/tieup/12', summary: '免稅＋最高 7%', conditions: '未稅 ¥5,000 以上、付款前出示、不可併用；Apple、遊戲主機除外', confidence: 'partner' }
        ] },
        { name: '百貨、購物中心', stores: [
          { name: '高島屋 Shopper’s Card', url: 'https://www.takashimaya.co.jp/store/special/shopperscard/index_tw.html', summary: '5% off', conditions: '憑護照在免稅櫃台領卡；單筆未稅 ¥3,000 以上；鐘錶寶飾、精品除外', confidence: 'unverified' },
          { name: '三越伊勢丹 Guest Card', url: 'https://cp.mistore.jp/global/en/guestcard.html', summary: '5% off＋免稅，全國集團店通用', conditions: '外國護照、入境未滿 6 個月；部分商品除外', confidence: 'unverified' },
          { name: '大丸松坂屋 Shopping Support Ticket', url: 'https://www.taxfreeshops.jp/zhtw/tieup/7', summary: '免稅＋5% off', conditions: '含稅 ¥3,000 以上；精品、手錶、食品、特價品除外', confidence: 'partner' },
          { name: '阪急梅田本店 Guest Coupon', url: 'https://global.hankyu-hanshin-dept.co.jp/store/hankyuhonten/service/#guest', summary: '5% off', conditions: '憑護照在 B1 海外客櫃台或 1F 服務台領取；食品、特價品、部分品牌除外；發行後 7 日內有效', confidence: 'official' },
          { name: '西武 SOGO', url: 'https://www.sogo-seibu.jp/global/special-coupon/en', summary: '5% off＋免稅券', conditions: '付款前出示券 QR 與護照；部分商品除外', confidence: 'official' },
          { name: '東急百貨店', url: 'https://www.tokyu-dept.co.jp/global/en/service/#coupon', summary: '出示護照領 5% off 券', conditions: '各店服務略有不同', confidence: 'official' },
          { name: 'AEON Happy Coupon', url: 'https://www.welcome-aeon.com/coupon/', summary: '5% off', conditions: '限外國訪客；每店限用一次；查證當日顯示無可用券，請自行確認', confidence: 'official' },
          { name: 'AEON MALL 旅客禮遇', url: 'https://en.aeonmall.global/coupons/', summary: '¥500 購物券或禮品（含沖繩來客夢）', conditions: '憑護照到服務台兌換；各館不同', confidence: 'official' },
          { name: '御殿場 Premium Outlets E-Coupon', url: 'https://www.premiumoutlets.co.jp/en/gotemba/events/', summary: '指定店舖額外折扣', conditions: '掃園區或服務中心 QR 下載', confidence: 'unverified' }
        ] },
        { name: '運動、眼鏡', stores: [
          { name: 'Alpen、Sports Depo、GOLF5', url: 'https://www.taxfreeshops.jp/zhtw/tieup/11', summary: '免稅＋最高 5%', conditions: '含稅 ¥5,500 以上、出示護照與券畫面、不可併用', confidence: 'partner' },
          { name: 'JINS', url: 'https://www.taxfreeshops.jp/zhtw/tieup/3', summary: '免稅＋最高 5%', conditions: '', confidence: 'partner' }
        ] }
      ],
      none: '查證時沒有官方旅客券頁的店：松本清、大國藥妝、Sugi、Yodobashi、Joshin、Nojima、Loft、Hands、PARCO、三井 Outlet、ABC-MART、Zoff、UNIQLO、Animate、Mandarake、Kiddy Land。這些店仍可免稅，只是沒有額外券。'
    }
  }
};
