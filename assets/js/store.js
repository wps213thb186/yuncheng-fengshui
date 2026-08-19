/* 运乘风水 · 数据与服务层（内测 mock 版）
 * 当前全部走 localStorage 模拟，接口形态与正式后端一一对应，上线时逐函数替换为真实请求：
 *   loginWechatMock  → GET /api/auth/wechat/qrcode + GET /api/auth/wechat/status（轮询扫码）
 *   createOrder      → POST /api/orders
 *   listOrders       → GET  /api/orders
 *   getOrder         → GET  /api/orders/:id
 *   payOrder         → POST /api/pay/wechat（Native 扫码 / JSAPI），以支付回调为准
 * 注意：真实实现中订单状态以后端为准，前端不可自行置 paid。
 */
(function(root){
var LS_USER = "yc_user_v1", LS_ORDERS = "yc_orders_v1";
var PRICE = 9.9, PRICE_OLD = 99, TITLE = "户型居住环境分析报告";

function lsGet(k, d){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } }
function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }
function uid(p){ return p + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase(); }
function fmtTime(ts){ var d=new Date(ts); function p(n){return (n<10?"0":"")+n;} return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+" "+p(d.getHours())+":"+p(d.getMinutes()); }
function isMobile(){ return /iPhone|Android|Mobile/i.test(navigator.userAgent) || (root.matchMedia && root.matchMedia("(max-width:760px)").matches); }

/* ---------- 登录态 ---------- */
function user(){ return lsGet(LS_USER, null); }
function loginWechatMock(){
  // TODO 正式版：请求后端生成微信扫码链接，轮询扫码状态后换取会话
  var u = { openid: "mock_" + Math.random().toString(36).slice(2,10),
            nick: "微信用户" + Math.floor(1000+Math.random()*9000),
            loginAt: Date.now() };
  lsSet(LS_USER, u); return Promise.resolve(u);
}
function logout(){ try{ localStorage.removeItem(LS_USER); }catch(e){} }

/* ---------- 订单 ---------- */
function listOrders(){ return lsGet(LS_ORDERS, []); }
function getOrder(id){ var os=listOrders(); for(var i=0;i<os.length;i++) if(os[i].id===id) return os[i]; return null; }
function saveOrders(os){ return lsSet(LS_ORDERS, os); }
function createOrder(draft){
  var o = { id: uid("YC"), createdAt: Date.now(), status: "pending_payment",
            title: TITLE, amount: PRICE, amountOld: PRICE_OLD, plan: draft };
  var os = listOrders(); os.unshift(o);
  if(!saveOrders(os)){ // localStorage 超容量：去掉户型图再试
    o.plan.img = null; o.plan.imgDropped = true; saveOrders(os);
  }
  return Promise.resolve(o);
}
function updateOrder(id, patch){
  var os = listOrders();
  for(var i=0;i<os.length;i++) if(os[i].id===id){ for(var k in patch) os[i][k]=patch[k]; saveOrders(os); return os[i]; }
  return null;
}
function payOrder(id){
  // TODO 正式版：调起微信支付，成功以后端异步回调（pay notify）更新订单为准
  return Promise.resolve(updateOrder(id, { status:"paid", paidAt: Date.now(), reportReady: true }));
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
function openLoginModal(onOk){
  if(typeof document==="undefined") return;
  closeLoginModal();
  var mobile = isMobile();
  var mask = document.createElement("div"); mask.className="mask"; mask.id="ycLoginMask";
  mask.innerHTML =
    '<div class="modal">'+
      '<button class="m-close" id="ycLoginClose">×</button>'+
      '<h3>微信一键登录</h3>'+
      '<div class="m-sub">登录后可上传户型图、保存订单与报告<span class="mock-tag">内测模拟</span></div>'+
      (mobile
        ? '<div style="padding:18px 0 4px"><button class="btn btn-wechat btn-block" id="ycDoLogin" disabled>微信一键登录（模拟）</button></div>'
        : '<div class="qr"><canvas id="ycQR" width="200" height="200"></canvas></div>'+
          '<div class="m-sub" style="margin-bottom:4px">请使用微信扫码授权登录</div>'+
          '<div style="margin-top:10px"><button class="btn btn-wechat" id="ycDoLogin" disabled>模拟：我已在微信中确认</button></div>')+
      '<label class="agree"><input type="checkbox" id="ycAgree"><span>我已阅读并同意《用户协议》与《隐私政策》，授权获取微信昵称与手机号用于订单服务</span></label>'+
    '</div>';
  document.body.appendChild(mask);
  if(!mobile){ var c=document.getElementById("ycQR"); if(c) pseudoQR(c, String(Date.now())); }
  var btn=document.getElementById("ycDoLogin"), chk=document.getElementById("ycAgree");
  chk.onchange=function(){ btn.disabled=!chk.checked; };
  document.getElementById("ycLoginClose").onclick=function(){ closeLoginModal(); };
  mask.onclick=function(e){ if(e.target===mask) closeLoginModal(); };
  btn.onclick=function(){
    btn.disabled=true; btn.textContent="登录中…";
    loginWechatMock().then(function(){ closeLoginModal(); if(onOk) onOk(user()); });
  };
}
function closeLoginModal(){ var m=document.getElementById("ycLoginMask"); if(m) m.remove(); }
function requireAuth(onOk){
  if(user()){ if(onOk) onOk(user()); return true; }
  openLoginModal(onOk); return false;
}

/* ---------- 顶栏登录态 ---------- */
function renderNav(){
  if(typeof document==="undefined") return;
  var nav=document.querySelector(".nav"); if(!nav) return;
  var u=user();
  var html="";
  if(u){
    html='<a class="keep" href="orders.html">我的订单</a>'+
         '<span class="nav-user">'+u.nick+'</span>'+
         '<a class="keep" id="ycLogout" href="#">退出</a>';
  }else{
    html='<a class="keep" id="ycLoginLink" href="#">微信登录</a>';
  }
  nav.insertAdjacentHTML("afterbegin", html);
  var lo=document.getElementById("ycLogout");
  if(lo) lo.onclick=function(e){ e.preventDefault(); logout(); location.href="index.html"; };
  var li=document.getElementById("ycLoginLink");
  if(li) li.onclick=function(e){ e.preventDefault(); openLoginModal(function(){ location.reload(); }); };
}

/* ---------- 开发/演示引导（?dev=1 自动登录 + 示例订单） ---------- */
function devBootstrap(){
  if(typeof location==="undefined") return false;
  if(location.search.indexOf("dev=1")<0) return false;
  if(!user()) lsSet(LS_USER, {openid:"mock_dev", nick:"内测体验员", loginAt:Date.now()});
  if(!getOrder("demo")){
    var os=listOrders();
    os.unshift({ id:"demo", createdAt:Date.now()-86400000, status:"paid", title:TITLE,
      amount:PRICE, amountOld:PRICE_OLD, paidAt:Date.now()-86000000, reportReady:true,
      plan:{ img:null, name:"示例房源 · 三房两厅", area:108, door:"兑", facing:"坐北朝南",
             birthYear:1990, gender:"男", note:"演示订单：门开正西（兑门伏位）" } });
    saveOrders(os);
  }
  if(!getOrder("demo-pending")){
    var os2=listOrders();
    os2.unshift({ id:"demo-pending", createdAt:Date.now()-3600000, status:"pending_payment", title:TITLE,
      amount:PRICE, amountOld:PRICE_OLD,
      plan:{ img:null, name:"示例房源 · 待支付演示", area:89, door:"巽", facing:"坐东南朝西北",
             birthYear:null, gender:"男", note:"" } });
    saveOrders(os2);
  }
  return true;
}

root.YC = { PRICE:PRICE, PRICE_OLD:PRICE_OLD, TITLE:TITLE,
  user:user, loginWechatMock:loginWechatMock, logout:logout,
  listOrders:listOrders, getOrder:getOrder, createOrder:createOrder, updateOrder:updateOrder, payOrder:payOrder,
  openLoginModal:openLoginModal, closeLoginModal:closeLoginModal, requireAuth:requireAuth,
  renderNav:renderNav, devBootstrap:devBootstrap, fmtTime:fmtTime, isMobile:isMobile, pseudoQR:pseudoQR };
})(typeof window!=="undefined"?window:globalThis);
