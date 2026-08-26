/* 运乘风水 · 数据与服务层
 * 双实现：
 *   本地模式（YC_API_BASE 为空）——localStorage 模拟，纯前端可跑；
 *   远程模式（config.js 填后端地址）——走 yuncheng-server 真实 API。
 * 所有方法统一返回 Promise；user() 走本地缓存可同步读（仅用于 UI 展示，鉴权以后端为准）。
 */
(function(root){
var LS_USER = "yc_user_v1", LS_TOKEN = "yc_token_v1", LS_ORDERS = "yc_orders_v1", LS_IMG = "yc_images_v1";
var PRICE = 9.9, PRICE_OLD = 99, TITLE = "户型居住环境分析报告";

function lsGet(k, d){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } }
function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }
function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }
function uid(p){ return p + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase(); }
function fmtTime(ts){ var d=new Date(ts); function p(n){return (n<10?"0":"")+n;} return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+" "+p(d.getHours())+":"+p(d.getMinutes()); }
function isMobile(){ return /iPhone|Android|Mobile/i.test(navigator.userAgent) || (root.matchMedia && root.matchMedia("(max-width:760px)").matches); }

function apiBase(){ return (root.YC_API_BASE || "").replace(/\/+$/, ""); }
function remote(){ return !!apiBase(); }

/* ---------- 户型图本地缓存（远程模式下服务器不存图，图片仅留本机） ---------- */
function saveImg(oid, dataUrl){ var m = lsGet(LS_IMG, {}); m[oid] = dataUrl; if(!lsSet(LS_IMG, m)){ delete m[oid]; } }
function getImg(oid){ return lsGet(LS_IMG, {})[oid] || null; }

/* ---------- 户型图 OCR（远程模式调用服务端 /api/ocr/floorplan，阿里百炼 qwen-vl） ----------
 * 原图只用于识别与本地展示，服务器不保存；识别结果（房间框 + 门方位提示）随订单 plan 保存。 */
function dataUrlToBlob(dataUrl){
  var m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || "");
  if(!m) return null;
  var bin = atob(m[2]), buf = new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: m[1] });
}
function ocrFloorplan(dataUrl){
  if(!remote()) return Promise.resolve(null);
  var blob = dataUrlToBlob(dataUrl);
  if(!blob) return Promise.resolve(null);
  var fd = new FormData();
  fd.append("file", blob, "floorplan.jpg");
  var headers = {}, t = lsGet(LS_TOKEN, null);
  if(t) headers.Authorization = "Bearer " + t;
  return fetch(apiBase() + "/api/ocr/floorplan", { method: "POST", headers: headers, body: fd })
    .then(function(r){
      if(!r.ok) return r.json().catch(function(){ return {}; }).then(function(b){ throw new Error(b.detail || ("HTTP " + r.status)); });
      return r.json();
    })
    .then(function(d){
      if(!d || d.status !== "ok" || !d.rooms || !d.rooms.length) return null;
      return { rooms: d.rooms, door_hint: d.door_hint || "unknown", confidence: d.confidence || 0 };
    });
}
/* door_hint（n/ne/e/se/s/sw/w/nw）→ 宫位 */
var DOOR_HINT_GONG = { n:"坎", ne:"艮", e:"震", se:"巽", s:"离", sw:"坤", w:"兑", nw:"乾" };
function doorHintGong(hint){ return DOOR_HINT_GONG[hint] || null; }
/* 房间落宫：以全部房间框的外接矩形为户型范围，按上北下南切 3×3 九宫 */
var GRID3 = [["乾","坎","艮"],["兑",null,"震"],["坤","离","巽"]];
function houseBoxOf(rooms){
  var x1=1000, y1=1000, x2=0, y2=0, n=0;
  (rooms||[]).forEach(function(r){
    if(!r.box) return; n++;
    x1=Math.min(x1,r.box[0]); y1=Math.min(y1,r.box[1]);
    x2=Math.max(x2,r.box[2]); y2=Math.max(y2,r.box[3]);
  });
  return n ? [x1,y1,x2,y2] : null;
}
function roomGong(box, houseBox){
  if(!box || !houseBox) return null;
  var w = houseBox[2]-houseBox[0], h = houseBox[3]-houseBox[1];
  if(w <= 0 || h <= 0) return null;
  var col = Math.min(2, Math.max(0, Math.floor(((box[0]+box[2])/2 - houseBox[0]) / w * 3)));
  var row = Math.min(2, Math.max(0, Math.floor(((box[1]+box[3])/2 - houseBox[1]) / h * 3)));
  return GRID3[row][col];
}
/* 在户型图上叠加房间落宫层。byGong: {宫: palace对象}；container 需为空元素。 */
function renderOcrOverlay(container, imgUrl, ocr, byGong){
  if(typeof document === "undefined" || !container) return false;
  var house = houseBoxOf(ocr && ocr.rooms);
  if(!house) return false;
  container.innerHTML = "";
  container.style.position = "relative";
  var img = document.createElement("img");
  img.src = imgUrl; img.alt = "户型图（AI 识别叠加）";
  img.style.cssText = "display:block;width:100%;border-radius:12px";
  container.appendChild(img);
  var layer = document.createElement("div");
  layer.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none";
  container.appendChild(layer);
  ocr.rooms.forEach(function(room){
    if(!room.box || /入户门/.test(room.name || "")) return; // 入户门是标记不是房间，不参与落宫
    var g = roomGong(room.box, house);
    var j = (g && byGong) ? byGong[g] : null;
    var good = j && (j.base === "大吉" || j.base.indexOf("中吉") === 0);
    var color = !j ? "160,160,160" : good ? "92,185,138" : (j.base === "大凶" ? "224,122,100" : "230,200,134");
    var d = document.createElement("div");
    d.style.cssText = "position:absolute;box-sizing:border-box;border:1.5px solid rgba("+color+",.95);"+
      "background:rgba("+color+",.16);border-radius:6px;"+
      "left:"+(room.box[0]/10)+"%;top:"+(room.box[1]/10)+"%;"+
      "width:"+((room.box[2]-room.box[0])/10)+"%;height:"+((room.box[3]-room.box[1])/10)+"%";
    var tag = document.createElement("span");
    tag.style.cssText = "position:absolute;left:2px;top:2px;font-size:11px;line-height:1.35;padding:1px 6px;"+
      "border-radius:6px;background:rgba(14,17,22,.78);color:#ece6d6;white-space:nowrap";
    tag.textContent = room.name + (j ? " · " + g + "宫·" + j.star : (g ? " · " + g + "宫" : ""));
    d.appendChild(tag);
    layer.appendChild(d);
  });
  return true;
}

/* ---------- 会话 ---------- */
function user(){ return lsGet(LS_USER, null); }
function setSession(u, token){ lsSet(LS_USER, u); if(token) lsSet(LS_TOKEN, token); }
function logout(){ lsDel(LS_USER); lsDel(LS_TOKEN); }

/* ---------- API helper ---------- */
function api(path, opts){
  opts = opts || {};
  opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
  var t = lsGet(LS_TOKEN, null);
  if(t) opts.headers.Authorization = "Bearer " + t;
  return fetch(apiBase() + path, opts).then(function(r){
    if(!r.ok) return r.json().catch(function(){ return {}; }).then(function(b){ throw new Error(b.detail || ("HTTP " + r.status)); });
    return r.json();
  });
}
function serverHealth(){ return remote() ? api("/api/health") : Promise.resolve(null); }

/* ---------- 登录 ---------- */
function loginWechatMock(){
  var u = { openid: "mock_" + Math.random().toString(36).slice(2,10),
            nick: "微信用户" + Math.floor(1000+Math.random()*9000), loginAt: Date.now() };
  setSession(u, null); return Promise.resolve(u);
}
/* 手机端：微信内授权 code 换会话；本地模式直接模拟 */
function loginMobile(code){
  if(!remote()) return loginWechatMock();
  return api("/api/auth/wechat/mobile-code", { method: "POST",
    body: JSON.stringify({ code: code || ("mock_" + Math.random().toString(36).slice(2)) }) })
    .then(function(r){ setSession(r.user, r.token); return r.user; });
}
/* PC 扫码：取票 → 轮询 →（mock 服务器用 mock-confirm 模拟手机确认） */
function loginQRStart(){
  if(!remote()) return Promise.resolve({ ticket: null, qr_url: "mock-local" });
  return api("/api/auth/wechat/qrcode", { method: "POST" });
}
function loginQRPoll(ticket){
  return api("/api/auth/wechat/status?ticket=" + encodeURIComponent(ticket)).then(function(r){
    if(r.status === "confirmed") setSession(r.user, r.token);
    return r;
  });
}
function loginQRMockConfirm(ticket){
  if(!remote()) return Promise.resolve({ ok: true });
  return api("/api/auth/wechat/mock-confirm", { method: "POST", body: JSON.stringify({ ticket: ticket }) });
}
/* 微信网页授权回跳：URL 带 ?code= 时自动换会话 */
function initFromUrl(){
  if(!remote() || typeof location === "undefined") return;
  var m = location.search.match(/[?&]code=([^&]+)/);
  if(m && !user()){
    loginMobile(decodeURIComponent(m[1])).then(function(){
      var url = location.pathname + location.search.replace(/[?&]code=[^&]+/, "").replace(/[?&]state=[^&]+/, "");
      history.replaceState(null, "", url); location.reload();
    }).catch(function(){});
  }
}

/* ---------- 订单 ---------- */
function normOrder(o){
  if(o && o.created_at != null){ // 远程 → 本地形态
    return { id: o.id, title: o.title, amount: o.amount, amountOld: o.amount_old,
             status: o.status, plan: Object.assign({}, o.plan, { img: getImg(o.id) }),
             createdAt: o.created_at * 1000, paidAt: o.paid_at ? o.paid_at * 1000 : null,
             reportReady: o.status === "paid" };
  }
  return o;
}
function createOrder(draft){
  if(!remote()){
    var o = { id: uid("YC"), createdAt: Date.now(), status: "pending_payment",
              title: TITLE, amount: PRICE, amountOld: PRICE_OLD, plan: draft };
    var os = lsGet(LS_ORDERS, []); os.unshift(o);
    if(!lsSet(LS_ORDERS, os)){ o.plan.img = null; o.plan.imgDropped = true; lsSet(LS_ORDERS, os); }
    return Promise.resolve(o);
  }
  var plan = { name: draft.name, area: draft.area, door: draft.door, facing: draft.facing,
               birthYear: draft.birthYear, gender: draft.gender, note: draft.note };
  if(draft.ocr) plan.ocr = draft.ocr;
  return api("/api/orders", { method: "POST", body: JSON.stringify({ plan: plan }) })
    .then(function(o){ if(draft.img) saveImg(o.id, draft.img); return normOrder(o); });
}
function listOrders(){
  if(!remote()) return Promise.resolve(lsGet(LS_ORDERS, []));
  return api("/api/orders").then(function(r){ return r.orders.map(normOrder); });
}
function getOrder(id){
  if(!remote()){
    var os = lsGet(LS_ORDERS, []);
    for(var i=0;i<os.length;i++) if(os[i].id===id) return Promise.resolve(os[i]);
    return Promise.resolve(null);
  }
  return api("/api/orders/" + encodeURIComponent(id)).then(normOrder).catch(function(){ return null; });
}
function updateOrder(id, patch){ // 本地模式专用（远程订单状态只由服务端变更）
  if(remote()) return Promise.resolve(null);
  var os = lsGet(LS_ORDERS, []);
  for(var i=0;i<os.length;i++) if(os[i].id===id){ for(var k in patch) os[i][k]=patch[k]; lsSet(LS_ORDERS, os); return Promise.resolve(os[i]); }
  return Promise.resolve(null);
}
/* 支付：返回支付后的订单。远程 mock 服务器用 mock-notify 模拟回调；
   正式服务器（YC_MOCK=0）只能等真实微信回调，这里轮询状态。 */
function payOrder(id, scene){
  if(!remote()) return Promise.resolve(updateOrder(id, { status: "paid", paidAt: Date.now(), reportReady: true }));
  return api("/api/pay/wechat", { method: "POST", body: JSON.stringify({ order_id: id, scene: scene || "native" }) })
    .then(function(p){
      if(p.status === "paid") return getOrder(id);
      return api("/api/pay/wechat/mock-notify", { method: "POST", body: JSON.stringify({ order_id: id }) })
        .then(function(){ return getOrder(id); })
        .catch(function(){ return getOrder(id); }); // 正式环境：等回调，前端轮询
    });
}
/* 发起支付并返回服务端原始应答（含 code_url / pay_params），由页面自行渲染与轮询 */
function createPrepay(id, scene){
  if(!remote()){
    return updateOrder(id, { status: "paid", paidAt: Date.now(), reportReady: true })
      .then(function(){ return { status: "paid" }; });
  }
  return api("/api/pay/wechat", { method: "POST", body: JSON.stringify({ order_id: id, scene: scene || "native" }) });
}
/* 用 qrcode-generator 把文本渲染为 canvas 上的真实二维码（微信支付 code_url 等） */
function drawQR(canvas, text){
  if(typeof qrcode === "undefined") return false;
  var qr = qrcode(0, "M"); qr.addData(text); qr.make();
  var n = qr.getModuleCount(), tile = Math.floor(canvas.width / (n + 8)), pad = Math.floor((canvas.width - tile * n) / 2);
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f4f1e8"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#1a1610";
  for(var r = 0; r < n; r++) for(var c = 0; c < n; c++)
    if(qr.isDark(r, c)) ctx.fillRect(pad + c * tile, pad + r * tile, tile, tile);
  return true;
}

/* ---------- 报告数据（统一形态；远程调引擎 API，本地用 JS 引擎） ---------- */
function getReport(plan){
  if(remote()){
    return api("/api/analyze", { method: "POST", body: JSON.stringify({
      door: plan.door, birth_year: plan.birthYear, gender: plan.gender || "男" }) });
  }
  return Promise.resolve(localReport(plan.door, plan.birthYear, plan.gender));
}
function yiji(base){
  return (base === "大吉" || base.indexOf("中吉") === 0)
    ? "吉位宜动宜通：宜高大明亮、宜开门窗、可作卧室或常活动区（八星吉凶总要：临宫得位福禄增）"
    : "凶位宜静宜闭：宜整洁少动、可作卫浴储物；储物须留泄口，勿封死成窝";
}
function localReport(door, birthYear, gender){
  var E = root.YC_ENG, sum = E.doorSummary(door);
  function w(b){ return b === "大吉" ? 0 : (b.indexOf("中吉") === 0 ? 1 : (b === "次凶" ? 2 : 3)); }
  var palaces = sum.items.slice().sort(function(a,b){ return w(a.base) - w(b.base); }).map(function(j){
    var yx = E.YX[j.star];
    return { gong: j.gong, dir: E.DIRNAME[j.gong], star: j.star, star_ming: yx.star,
             rel: j.rel, rel_desc: j.desc, base: j.base, note: j.note, level: yx.level,
             yingxiang: yx.应象, yingqi: yx.应期, yiji: yiji(j.base) };
  });
  var compare = E.compareDoors().map(function(s){
    return { door: s.door, group: s.group, ji: s.ji, zhongji: s.zhongji, daxiong: s.daxiong };
  });
  var chk = E.selfCheck();
  var r = { door: door, door_dir: E.DIRNAME[door], group: sum.group,
            counts: { ji: sum.ji, zhongji: sum.zhongji, daxiong: sum.daxiong },
            palaces: palaces, door_compare: compare,
            huajie: E.HUAJIE, iron_rule: E.IRON, zongjue: E.ZONGJUE,
            engine_check: { total: chk.total, pass: chk.pass } };
  if(birthYear){
    var mg = E.mingGua(birthYear, gender || "男");
    mg.match = (mg.group === "东四命") === !!E.DONG[door];
    r.minggua = mg;
  }
  return r;
}

/* ---------- 登录弹层（DOM） ---------- */
function pseudoQR(canvas, seedStr){
  var n=25, ctx=canvas.getContext("2d"), s=canvas.width/n, seed=0;
  for(var i=0;i<seedStr.length;i++) seed=(seed*31+seedStr.charCodeAt(i))>>>0;
  function rnd(){ seed=(seed*1103515245+12345)>>>0; return seed/4294967296; }
  ctx.fillStyle="#f4f1e8"; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#1a1610";
  for(var y=0;y<n;y++) for(var x=0;x<n;x++){ if(rnd()>0.52) ctx.fillRect(x*s,y*s,s,s); }
  function finder(fx,fy){ ctx.fillStyle="#1a1610"; ctx.fillRect(fx*s,fy*s,7*s,7*s); ctx.fillStyle="#f4f1e8"; ctx.fillRect((fx+1)*s,(fy+1)*s,5*s,5*s); ctx.fillStyle="#1a1610"; ctx.fillRect((fx+2)*s,(fy+2)*s,3*s,3*s); }
  finder(0,0); finder(n-7,0); finder(0,n-7);
}
/* 按需加载二维码库（真实授权链接需要可扫的真码） */
function ensureQRLib(cb){
  if(typeof qrcode !== "undefined") return cb(true);
  var s = document.createElement("script");
  s.src = "assets/js/qrcode.min.js";
  s.onload = function(){ cb(true); };
  s.onerror = function(){ cb(false); };
  document.head.appendChild(s);
}
function authAuthorize(state){
  return api("/api/auth/wechat/authorize" + (state ? "?state=" + encodeURIComponent(state) : ""));
}
function openLoginModal(onOk){
  if(typeof document === "undefined") return;
  closeLoginModal();
  var mobile = isMobile();
  var mask = document.createElement("div"); mask.className = "mask"; mask.id = "ycLoginMask";
  mask.innerHTML =
    '<div class="modal">'+
      '<button class="m-close" id="ycLoginClose">×</button>'+
      '<h3>微信一键登录</h3>'+
      '<div class="m-sub">登录后可上传户型图、保存订单与报告<span class="mock-tag">内测模拟</span></div>'+
      (mobile
        ? '<div style="padding:18px 0 4px"><button class="btn btn-wechat btn-block" id="ycDoLogin" disabled>微信一键登录</button></div>'
        : '<div class="qr"><canvas id="ycQR" width="200" height="200"></canvas></div>'+
          '<div class="m-sub" style="margin-bottom:4px">请使用微信扫码授权登录</div>'+
          '<div style="margin-top:10px"><button class="btn btn-wechat" id="ycDoLogin" disabled>模拟：我已在微信中确认</button></div>')+
      '<label class="agree"><input type="checkbox" id="ycAgree"><span>我已阅读并同意《用户协议》与《隐私政策》，授权获取微信昵称与手机号用于订单服务</span></label>'+
      '<div class="hint" id="ycLoginErr" style="color:var(--bad)"></div>'+
    '</div>';
  document.body.appendChild(mask);
  var btn = document.getElementById("ycDoLogin"), chk = document.getElementById("ycAgree");
  var err = document.getElementById("ycLoginErr");
  chk.onchange = function(){ btn.disabled = !chk.checked; };
  document.getElementById("ycLoginClose").onclick = closeLoginModal;
  mask.onclick = function(e){ if(e.target === mask) closeLoginModal(); };
  var timer = null;
  function done(){ if(timer) clearInterval(timer); closeLoginModal(); if(onOk) onOk(user()); }

  if(mobile){
    btn.onclick = function(){
      btn.disabled = true; btn.textContent = "登录中…";
      if(!remote()){ loginWechatMock().then(done); return; }
      serverHealth().then(function(h){
        if(h && h.mock_mode === false){ // 真实：跳微信网页授权
          try{ sessionStorage.setItem("yc_auth_back", location.pathname.split("/").pop() || "index.html"); }catch(e){}
          return authAuthorize("mob").then(function(r){ location.href = r.url; });
        }
        return loginMobile().then(done);
      }).catch(function(e){ err.textContent = e.message; btn.disabled = false; btn.textContent = "微信一键登录"; });
    };
  }else{
    loginQRStart().then(function(q){
      var c = document.getElementById("ycQR");
      var realQR = q.qr_url && q.qr_url.indexOf("http") === 0; // 真实授权链接 → 真二维码
      if(c){
        if(realQR){
          ensureQRLib(function(ok){ if(ok) drawQR(c, q.qr_url); else pseudoQR(c, q.qr_url); });
          btn.style.display = "none"; // 真实模式无模拟确认
          var sub = mask.querySelector(".m-sub");
          if(sub) sub.textContent = "请使用微信扫码，并在手机上确认授权";
        }else{
          pseudoQR(c, q.qr_url || String(Date.now()));
        }
      }
      if(q.ticket){
        timer = setInterval(function(){
          loginQRPoll(q.ticket).then(function(r){ if(r.status === "confirmed") done(); }).catch(function(){});
        }, 2000);
        btn.onclick = function(){ // mock 服务器：模拟手机端确认
          btn.disabled = true; btn.textContent = "等待确认…";
          loginQRMockConfirm(q.ticket).catch(function(e){ err.textContent = e.message; });
        };
      }else{ // 纯本地模式
        btn.onclick = function(){
          btn.disabled = true; btn.textContent = "登录中…";
          loginWechatMock().then(done);
        };
      }
    }).catch(function(e){ err.textContent = "无法连接服务：" + e.message; });
  }
}
function closeLoginModal(){ var m = document.getElementById("ycLoginMask"); if(m) m.remove(); }
function requireAuth(onOk){
  if(user()){ if(onOk) onOk(user()); return true; }
  openLoginModal(onOk); return false;
}

/* ---------- 顶栏登录态 ---------- */
function renderNav(){
  if(typeof document === "undefined") return;
  initFromUrl();
  var nav = document.querySelector(".nav"); if(!nav) return;
  var u = user();
  var html = u
    ? '<a class="keep" href="orders.html">我的订单</a><span class="nav-user">' + u.nick + '</span><a class="keep" id="ycLogout" href="#">退出</a>'
    : '<a class="keep" id="ycLoginLink" href="#">微信登录</a>';
  nav.insertAdjacentHTML("afterbegin", html);
  var lo = document.getElementById("ycLogout");
  if(lo) lo.onclick = function(e){ e.preventDefault(); logout(); location.href = "index.html"; };
  var li = document.getElementById("ycLoginLink");
  if(li) li.onclick = function(e){ e.preventDefault(); openLoginModal(function(){ location.reload(); }); };
}

/* ---------- 开发/演示引导（?dev=1，仅本地模式） ---------- */
function devBootstrap(){
  if(typeof location === "undefined" || remote()) return false;
  if(location.search.indexOf("dev=1") < 0) return false;
  if(!user()) setSession({ openid: "mock_dev", nick: "内测体验员", loginAt: Date.now() }, null);
  var os = lsGet(LS_ORDERS, []);
  if(!os.some(function(o){ return o.id === "demo"; })){
    os.unshift({ id: "demo", createdAt: Date.now()-86400000, status: "paid", title: TITLE,
      amount: PRICE, amountOld: PRICE_OLD, paidAt: Date.now()-86000000, reportReady: true,
      plan: { img: null, name: "示例房源 · 三房两厅", area: 108, door: "兑", facing: "坐北朝南",
              birthYear: 1990, gender: "男", note: "演示订单：门开正西（兑门伏位）" } });
    lsSet(LS_ORDERS, os);
  }
  os = lsGet(LS_ORDERS, []);
  if(!os.some(function(o){ return o.id === "demo-pending"; })){
    os.unshift({ id: "demo-pending", createdAt: Date.now()-3600000, status: "pending_payment", title: TITLE,
      amount: PRICE, amountOld: PRICE_OLD,
      plan: { img: null, name: "示例房源 · 待支付演示", area: 89, door: "巽", facing: "坐东南朝西北",
              birthYear: null, gender: "男", note: "" } });
    lsSet(LS_ORDERS, os);
  }
  return true;
}

root.YC = { PRICE: PRICE, PRICE_OLD: PRICE_OLD, TITLE: TITLE,
  user: user, logout: logout, loginMobile: loginMobile, loginWechatMock: loginWechatMock,
  loginQRStart: loginQRStart, loginQRPoll: loginQRPoll, loginQRMockConfirm: loginQRMockConfirm,
  listOrders: listOrders, getOrder: getOrder, createOrder: createOrder, updateOrder: updateOrder, payOrder: payOrder,
  createPrepay: createPrepay, drawQR: drawQR,
  getReport: getReport, localReport: localReport, yiji: yiji, serverHealth: serverHealth,
  openLoginModal: openLoginModal, closeLoginModal: closeLoginModal, requireAuth: requireAuth,
  renderNav: renderNav, devBootstrap: devBootstrap, fmtTime: fmtTime, isMobile: isMobile,
  pseudoQR: pseudoQR, remote: remote, saveImg: saveImg, getImg: getImg,
  ocrFloorplan: ocrFloorplan, doorHintGong: doorHintGong, roomGong: roomGong,
  houseBoxOf: houseBoxOf, renderOcrOverlay: renderOcrOverlay };
})(typeof window !== "undefined" ? window : globalThis);
