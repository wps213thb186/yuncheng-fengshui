/* 运乘 · 官方站交互（无依赖）：移动端导航抽屉 / 当前页高亮 / 滚动进场 */
(function(){
  "use strict";

  /* --- 移动端导航抽屉 --- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");
  if(toggle && nav){
    toggle.addEventListener("click", function(){
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
    });
    nav.addEventListener("click", function(e){
      if(e.target.tagName === "A" && nav.classList.contains("open")){
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function(e){
      if(e.key === "Escape" && nav.classList.contains("open")){
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* --- 当前页高亮 --- */
  var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  Array.prototype.forEach.call(document.querySelectorAll(".nav a[href]"), function(a){
    var href = (a.getAttribute("href") || "").split("#")[0].toLowerCase();
    if(href && href === here && !a.classList.contains("btn")){
      a.classList.add("on");
      a.setAttribute("aria-current", "page");
    }
  });

  /* --- 滚动进场（尊重 prefers-reduced-motion） --- */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var items = document.querySelectorAll(".reveal");
  if(!items.length) return;
  if(reduce || !("IntersectionObserver" in window)){
    Array.prototype.forEach.call(items, function(el){ el.classList.add("in"); });
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      en.target.classList.add("in");
      io.unobserve(en.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  Array.prototype.forEach.call(items, function(el, i){
    // 同一父容器内的兄弟节点做轻微错峰
    var sibs = el.parentNode ? el.parentNode.querySelectorAll(":scope > .reveal") : null;
    if(sibs && sibs.length > 1){
      var idx = Array.prototype.indexOf.call(sibs, el);
      el.style.setProperty("--d", Math.min(idx, 5) * 0.07 + "s");
    }
    io.observe(el);
  });
})();
