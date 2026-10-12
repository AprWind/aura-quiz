(function () {
  "use strict";

  var CFG = window.AURA_CONFIG || {};
  var DIMS = [
    { key: "P", name: "在场感" },
    { key: "E", name: "表达" },
    { key: "B", name: "边界感" },
    { key: "A", name: "情绪感染力" },
    { key: "R", name: "互动节奏" }
  ];
  var TIE = ["B", "R", "P", "E", "A"];
  var H2C_SRC = [
    "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
    "https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js"
  ];
  var CODE_KEY = "aura_last_code";

  var DATA = null, QUESTIONS = [], RESULTS = [], MAX = {};
  var state = {
    step: 0,
    answers: [],
    remaining: null,   // 当前访问码剩余次数（核销后）
    current: null,     // { id, dims, total }
    shared: false
  };

  function $(id) { return document.getElementById(id); }
  function show(id) {
    ["screen-gate", "screen-quiz", "screen-result"].forEach(function (s) {
      $(s).classList.toggle("hidden", s !== id);
    });
    window.scrollTo(0, 0);
  }
  function setMsg(text, kind) {
    var m = $("result-msg");
    m.textContent = text || "";
    m.className = "msg" + (kind ? " " + kind : "");
  }
  function storeGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function storeSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  /* ---------- 计分 ---------- */
  function topDims(norm) {
    return Object.keys(norm).sort(function (a, b) {
      if (norm[b] !== norm[a]) return norm[b] - norm[a];
      return TIE.indexOf(a) - TIE.indexOf(b);
    });
  }
  function byId(id) {
    for (var i = 0; i < RESULTS.length; i++) if (RESULTS[i].id === id) return RESULTS[i];
    return null;
  }
  function pickResultId(total, norm) {
    var top = topDims(norm)[0];
    if (total >= 80) return "R7";
    if (total >= 65) return "R6";
    if (total >= 55 && total < 70 && top === "B") return "R5";
    if (total >= 55 && total < 65 && (top === "E" || top === "R")) return "R4";
    if (total >= 55 && total < 65) return total >= 60 ? "R5" : "R4";
    if (total >= 45) return "R3";
    if (total >= 35) return "R2";
    return "R1";
  }
  function totalOf(dims) {
    return Math.round((dims.P + dims.E + dims.B + dims.A + dims.R) / 5);
  }
  function computeScore() {
    var sum = { P: 0, E: 0, B: 0, A: 0, R: 0 };
    state.answers.forEach(function (idx, qi) {
      var v = QUESTIONS[qi].options[idx].v;
      DIMS.forEach(function (d) { sum[d.key] += v[d.key]; });
    });
    var dims = {};
    DIMS.forEach(function (d) { dims[d.key] = Math.round(sum[d.key] / MAX[d.key] * 100); });
    var total = totalOf(dims);
    return { id: pickResultId(total, dims), dims: dims, total: total };
  }

  /* ---------- 分享链接编码：#r=R6-80-70-65-75-70（类型 + P E B A R） ---------- */
  function encodeResult(r) {
    return "r=" + [r.id].concat(DIMS.map(function (d) { return r.dims[d.key]; })).join("-");
  }
  function decodeResult(hash) {
    var m = /(?:^|[#&])r=(R[1-7])-(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})(?:$|&)/.exec(hash || "");
    if (!m || !byId(m[1])) return null;
    var dims = {}, ok = true;
    DIMS.forEach(function (d, i) {
      var n = parseInt(m[i + 2], 10);
      if (!(n >= 0 && n <= 100)) ok = false;
      dims[d.key] = n;
    });
    if (!ok) return null;
    return { id: m[1], dims: dims, total: totalOf(dims) };
  }
  function shareUrl(r) {
    return location.origin + location.pathname + "#" + encodeResult(r);
  }

  /* ---------- 渲染结果 ---------- */
  function reportNo(r) {
    var s = encodeResult(r), h = 7;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
    return "No. " + ("0000" + h).slice(-5);
  }
  function renderResult(r, shared) {
    var res = byId(r.id);
    var ranked = topDims(r.dims);
    var title = res.title;
    if (r.id === "R6" && ranked[0] === "A") title += " · 情绪带节奏";

    $("score-num").textContent = String(r.total);
    $("result-title").textContent = title;
    $("result-line").textContent = res.line;
    $("result-body").textContent = res.body;
    $("result-tip").textContent = res.tip;
    $("result-extra").textContent = (ranked[0] === "P" && r.dims.B < 40)
      ? "温柔提醒：被看见很好，记得看别人是否舒服。" : "";
    $("report-no").textContent = reportNo(r);
    var d = new Date();
    $("report-date").textContent = shared ? "好友分享" :
      d.getFullYear() + "." + (d.getMonth() + 1) + "." + d.getDate();

    var bars = $("bars");
    bars.innerHTML = "";
    DIMS.forEach(function (dim) {
      var v = r.dims[dim.key];
      var row = document.createElement("div");
      row.className = "bar-row";
      row.innerHTML = '<div class="bar-top"><span></span><b></b></div><div class="bar-track"><i></i></div>';
      row.querySelector("span").textContent = dim.name;
      row.querySelector("b").textContent = String(v);
      row.querySelector("i").style.width = Math.max(2, Math.min(100, v)) + "%";
      bars.appendChild(row);
    });
    var nameOf = function (k) { for (var i = 0; i < DIMS.length; i++) if (DIMS[i].key === k) return DIMS[i].name; };
    $("top-dim").textContent = "最突出：" + nameOf(ranked[0]) + " · 次突出：" + nameOf(ranked[1]);

    state.shared = !!shared;
    $("share-banner").classList.toggle("hidden", !shared);
    $("share-actions").classList.toggle("hidden", !shared);
    $("owner-actions").classList.toggle("hidden", !!shared);
    $("uses-left").textContent = (!shared && state.remaining !== null)
      ? "本访问码剩余 " + state.remaining + " 次" : "";
    $("copy-fallback").classList.add("hidden");
    setMsg("");
    show("screen-result");
    preloadH2C();
  }

  /* ---------- 访问码 ---------- */
  function redeem(code) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    return fetch(CFG.SUPABASE_URL + "/rest/v1/rpc/redeem_code", {
      method: "POST",
      headers: {
        "apikey": CFG.SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + CFG.SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ p_code: code }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) { var e = new Error("http " + res.status); e.kind = "server"; throw e; }
      return res.json();
    }).then(function (n) {
      n = Number(n);
      if (!isFinite(n)) { var e = new Error("bad payload"); e.kind = "server"; throw e; }
      return n;
    }, function (err) {
      clearTimeout(timer);
      if (!err.kind) err.kind = "network";
      throw err;
    });
  }

  function showGate(hint) {
    $("gate-err").textContent = "";
    var h = $("gate-hint");
    h.textContent = hint || "";
    h.classList.toggle("hidden", !hint);
    show("screen-gate");
  }

  var busy = false;
  function onStart() {
    if (busy || !DATA) return;
    var code = $("code").value.trim().toUpperCase();
    var err = $("gate-err");
    if (!code) { err.textContent = "请先输入访问码"; return; }
    busy = true;
    var btn = $("btn-start");
    btn.disabled = true;
    btn.textContent = "验证中…";
    err.textContent = "";
    redeem(code).then(function (n) {
      if (n < 0) {
        err.textContent = "访问码无效或次数已用完，请检查后重新输入";
        return;
      }
      state.remaining = n;
      storeSet(CODE_KEY, code);
      startQuiz();
    }).catch(function (e) {
      err.textContent = e.kind === "server"
        ? "服务暂时繁忙，请稍后再试"
        : "网络连接失败，请检查网络后重试";
    }).then(function () {
      busy = false;
      btn.disabled = false;
      btn.textContent = "开始测试";
    });
  }

  /* ---------- 答题 ---------- */
  function startQuiz() {
    state.step = 0;
    state.answers = [];
    state.current = null;
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    $("q-uses").textContent = state.remaining !== null ? "访问码已验证 · 剩余 " + state.remaining + " 次" : "";
    show("screen-quiz");
    renderQuestion();
  }
  function renderQuestion() {
    var q = QUESTIONS[state.step];
    var total = QUESTIONS.length;
    var pad = function (n) { return n < 10 ? "0" + n : String(n); };
    $("q-count").textContent = pad(state.step + 1) + " / " + pad(total);
    $("q-title").textContent = q.title;
    $("prog").style.width = (state.step / total * 100) + "%";
    var box = $("q-options");
    box.innerHTML = "";
    q.options.forEach(function (opt, idx) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "opt" + (state.answers[state.step] === idx ? " selected" : "");
      var k = document.createElement("span");
      k.className = "k";
      k.textContent = String.fromCharCode(65 + idx);
      var t = document.createElement("span");
      t.textContent = opt.text;
      b.appendChild(k); b.appendChild(t);
      b.addEventListener("click", function () { choose(idx, b); });
      box.appendChild(b);
    });
    $("btn-prev").classList.toggle("hidden", state.step === 0);
  }
  var advancing = false;
  function choose(idx, el) {
    if (advancing) return;
    advancing = true;
    state.answers[state.step] = idx;
    Array.prototype.forEach.call($("q-options").children, function (c) { c.classList.remove("selected"); });
    el.classList.add("selected");
    setTimeout(function () {
      advancing = false;
      if (state.step < QUESTIONS.length - 1) {
        state.step += 1;
        renderQuestion();
        window.scrollTo(0, 0);
      } else {
        $("prog").style.width = "100%";
        state.current = computeScore();
        renderResult(state.current, false);
      }
    }, 160);
  }

  /* ---------- 保存长图 ---------- */
  var h2cPromise = null;
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = function () { window.html2canvas ? resolve(window.html2canvas) : reject(new Error("no h2c")); };
      s.onerror = function () { s.remove(); reject(new Error("load fail")); };
      document.head.appendChild(s);
    });
  }
  function preloadH2C() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (!h2cPromise) {
      h2cPromise = loadScript(H2C_SRC[0]).catch(function () { return loadScript(H2C_SRC[1]); });
      h2cPromise.catch(function () { h2cPromise = null; });
    }
    return h2cPromise;
  }
  function isTouch() {
    return ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
  }
  var saving = false;
  function onSave() {
    if (saving) return;
    saving = true;
    setMsg("正在生成长图…");
    var card = $("result-card");
    preloadH2C().then(function (h2c) {
      card.classList.add("capturing");
      return h2c(card, {
        backgroundColor: "#fbfaf7",
        scale: Math.min(3, Math.max(2, window.devicePixelRatio || 2)),
        useCORS: true,
        logging: false,
        windowWidth: document.documentElement.clientWidth
      });
    }).then(function (canvas) {
      card.classList.remove("capturing");
      var url = canvas.toDataURL("image/png");
      $("modal-img").src = url;
      var touch = isTouch();
      $("modal-tip").textContent = touch ? "长按图片，选择「保存图片」到相册" : "右键图片另存，或点击下方下载";
      var dl = $("btn-download");
      dl.href = url;
      dl.classList.toggle("hidden", touch);
      $("img-modal").classList.remove("hidden");
      setMsg("");
    }).catch(function () {
      card.classList.remove("capturing");
      setMsg("长图生成失败，可直接长按或截图保存上方报告～", "bad");
    }).then(function () { saving = false; });
  }

  /* ---------- 复制链接 ---------- */
  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed"; ta.style.top = "-1000px"; ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, text.length);
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) {}
    ta.remove();
    return ok;
  }
  function onCopy() {
    if (!state.current) return;
    var url = shareUrl(state.current);
    var done = function () {
      $("copy-fallback").classList.add("hidden");
      setMsg("结果链接已复制，发给朋友即可查看你的报告", "ok");
    };
    var fail = function () {
      if (legacyCopy(url)) return done();
      $("copy-input").value = url;
      $("copy-fallback").classList.remove("hidden");
      setMsg("");
      $("copy-input").focus(); $("copy-input").select();
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(done, fail);
    } else { fail(); }
  }

  /* ---------- 再测 / 分享页入口 ---------- */
  function onRetry() {
    var last = storeGet(CODE_KEY) || "";
    if (state.remaining !== null && state.remaining > 0) {
      $("code").value = last;
      showGate("再测一次会再使用 1 次访问码（当前剩余 " + state.remaining + " 次），确认后点击开始。");
    } else {
      $("code").value = "";
      showGate("当前访问码次数已用完，如需再测请输入新的访问码。");
    }
  }
  function onTry() {
    history.replaceState(null, "", location.pathname + location.search);
    state.current = null;
    showGate("输入访问码，测测你自己的气场指数。");
  }

  function route() {
    if (!DATA) return;
    var r = decodeResult(location.hash);
    if (r) { renderResult(r, true); return true; }
    return false;
  }

  /* ---------- 启动 ---------- */
  function boot() {
    $("btn-start").addEventListener("click", onStart);
    $("code").addEventListener("keydown", function (e) { if (e.key === "Enter") onStart(); });
    $("btn-prev").addEventListener("click", function () {
      if (state.step > 0) { state.step -= 1; renderQuestion(); }
    });
    $("btn-save").addEventListener("click", onSave);
    $("btn-save2").addEventListener("click", onSave);
    $("btn-copy").addEventListener("click", onCopy);
    $("btn-retry").addEventListener("click", onRetry);
    $("btn-try").addEventListener("click", onTry);
    $("btn-close-modal").addEventListener("click", function () { $("img-modal").classList.add("hidden"); });
    $("img-modal").addEventListener("click", function (e) { if (e.target === this) this.classList.add("hidden"); });
    window.addEventListener("hashchange", function () {
      if (!route() && state.shared) showGate();
    });

    fetch("data.json", { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error("http " + res.status);
      return res.json();
    }).then(function (d) {
      DATA = d; QUESTIONS = d.questions; RESULTS = d.results; MAX = d.maxByDim;
      var btn = $("btn-start");
      btn.disabled = false;
      btn.textContent = "开始测试";
      route();
    }).catch(function () {
      $("btn-start").textContent = "加载失败";
      $("gate-err").textContent = "题目内容加载失败，请检查网络后刷新页面";
    });
  }
  boot();
})();
