(function(){
"use strict";
var CFG=window.AURA_CONFIG||{}, D=window.AURA_DATA, S=window.AURA_SCORE;
/* 模式：只有 config.MODE !== "live" 时才可能是 mock；live 下 ?mock=1 被忽略，无法绕过付费 */
var MOCK = CFG.MODE !== "live";
var KEY="aura_v2_state", MOCK_SHARES="aura_v2_mock_shares";
var $=function(id){return document.getElementById(id);};
var ART={cool:["#a8b8c8","#e8eef4","#d4dde8"],lazy:["#d4b89a","#f5ebe0","#e8d0b4"],danger:["#d4a0a0","#f8e8e4","#e8c0b8"],
         gentle:["#b8c8b0","#eef4ea","#d4e0cc"],pure:["#c8b0c8","#f4eaf4","#e4d0e4"],free:["#d8c090","#f7f0e0","#ead8a8"]};
var st=load();
if(!MOCK&&st&&st.session_token&&/^mock-/.test(st.session_token))st=null;
var gender=null, busy=false;

function load(){try{return JSON.parse(localStorage.getItem(KEY))||null;}catch(e){return null;}}
function save(){try{if(st)localStorage.setItem(KEY,JSON.stringify(st));else localStorage.removeItem(KEY);}catch(e){}}
function show(id){["s-gate","s-quiz","s-loading","s-result"].forEach(function(s){$(s).hidden=s!==id;});window.scrollTo(0,0);}
function uuid(){if(crypto.randomUUID)return crypto.randomUUID();var b=crypto.getRandomValues(new Uint8Array(16));return Array.from(b,function(x){return x.toString(16).padStart(2,"0");}).join("");}
function rndTok(n){return Array.from(crypto.getRandomValues(new Uint8Array(n)),function(x){return x.toString(16).padStart(2,"0");}).join("");}

function rpc(name,body){
  var ctrl=typeof AbortController!=="undefined"?new AbortController():null;
  var to=ctrl?setTimeout(function(){ctrl.abort();},15000):null;
  var base=(CFG.API_BASE||"").replace(/\/+$/,"");
  var useProxy=!!base;
  var useDirect=!useProxy&&!!CFG.USE_DIRECT_SUPABASE;
  if(!useProxy&&!useDirect){
    return Promise.reject((function(){var e=new Error("api_not_configured");e.kind="config";return e;})());
  }
  var url=useProxy?(base+"/rpc/"+name):(CFG.SUPABASE_URL+"/rest/v1/rpc/"+name);
  var headers={"Content-Type":"application/json"};
  if(useDirect){headers.apikey=CFG.SUPABASE_ANON_KEY;headers.Authorization="Bearer "+CFG.SUPABASE_ANON_KEY;}
  return fetch(url,{method:"POST",headers:headers,body:JSON.stringify(body),signal:ctrl?ctrl.signal:undefined})
   .then(function(r){
     return r.text().then(function(t){
       var data=null; try{data=t?JSON.parse(t):null;}catch(e){var pe=new Error("bad_json");pe.kind="bad_json";pe.status=r.status;throw pe;}
       if(!r.ok){var he=new Error("http_"+r.status);he.kind="http";he.status=r.status;he.data=data;throw he;}
       return data;
     });
   })
   .finally(function(){if(to)clearTimeout(to);});
}
function netErrText(err){
  if(!err)return "网络异常，请重试（重试不会重复计次）";
  if(err.kind==="config")return "服务暂未配置完成，请稍后再试";
  if(err.name==="AbortError"||(err.kind==="http"&&err.status===0))return "连接超时，请检查网络后重试（可换网络/系统浏览器后再试；重试不会重复计次）";
  if(err.message==="Failed to fetch"||err.name==="TypeError")return "无法连接服务器（网络异常）。请用系统浏览器打开或稍后再试（重试不会重复计次）";
  if(err.kind==="http")return "服务器响应异常（"+err.status+"），请稍后重试（重试不会重复计次）";
  if(err.kind==="bad_json")return "服务器返回异常，请稍后重试（重试不会重复计次）";
  return "网络异常，请重试（重试不会重复计次）";
}
var api = MOCK ? {
  start:function(code,crid,g){return new Promise(function(res){setTimeout(function(){res(code.length>=4?{ok:true,session_token:"mock-"+rndTok(12),remaining:2,replay:false}:{ok:false,error:"invalid_or_exhausted"});},300);});},
  complete:function(tok,typeId,g,scores){var m=JSON.parse(localStorage.getItem(MOCK_SHARES)||"{}");var t="m"+rndTok(16);
    m[t]={type_id:typeId,gender:g,scores:scores,created_at:new Date().toISOString()};localStorage.setItem(MOCK_SHARES,JSON.stringify(m));return Promise.resolve({ok:true,share_token:t});},
  share:function(t){var m=JSON.parse(localStorage.getItem(MOCK_SHARES)||"{}");return Promise.resolve(m[t]||null);}
} : {
  start:function(code,crid,g){return rpc("start_session",{p_code:code,p_client_request_id:crid,p_gender:g});},
  complete:function(tok,typeId,g,scores){return rpc("complete_session",{p_session_token:tok,p_type_id:typeId,p_gender:g,p_scores:scores});},
  share:function(t){return rpc("get_share",{p_token:t});}
};

/* ---------- gate ---------- */
document.querySelectorAll(".gbtn").forEach(function(b){b.onclick=function(){gender=b.dataset.g;
  document.querySelectorAll(".gbtn").forEach(function(x){x.classList.toggle("on",x===b);});};});
$("start").onclick=function(){
  var code=$("code").value.trim().toUpperCase(), msg=$("gate-msg");
  if(!gender){msg.textContent="请先选择报告类型";return;}
  if(!code){msg.textContent="请输入访问码";return;}
  if(busy)return; busy=true; $("start").disabled=true; msg.textContent="";
  // pending 只存 client_request_id 与性别，不存访问码；重试同一 crid 由后端保证不重复扣次
  if(!st||!st.pending||st.pending.gender!==gender) st={pending:{crid:uuid(),gender:gender}};
  save();
  api.start(code,st.pending.crid,gender).then(function(r){
    if(!r||!r.ok){msg.textContent=r&&r.error==="bad_request"?"请求异常，请刷新重试":"访问码无效或次数已用完";st=null;save();return;}
    st={session_token:r.session_token,gender:gender,answers:[],idx:0,remaining:r.remaining};save();
    $("code").value=""; renderQ(); show("s-quiz");
  }).catch(function(err){msg.textContent=netErrText(err);})
  .finally(function(){busy=false;$("start").disabled=false;});
};

/* ---------- quiz ---------- */
function renderQ(){
  var i=st.idx,q=D.Q[i];
  $("qcount").textContent=String(i+1).padStart(2,"0")+" / "+D.Q.length;
  $("qbar").style.width=(i/D.Q.length*100)+"%";
  $("qdim").textContent=D.DIMS[q.d].name+" · "+D.DIMS[q.d].en;
  $("qtext").textContent=q.q;
  $("prev").style.visibility=i>0?"visible":"hidden";
  var box=$("opts");box.innerHTML="";
  q.o.forEach(function(o,j){var b=document.createElement("button");b.className="opt"+(st.answers[i]===j?" on":"");
    b.innerHTML="<em>"+"ABCD"[j]+"</em><span></span>";b.lastChild.textContent=o[0];
    b.onclick=function(){pick(j);};box.appendChild(b);});
}
function pick(j){
  if(busy)return; st.answers[st.idx]=j;
  if(st.idx<D.Q.length-1){st.idx++;save();renderQ();}
  else{save();finish();}
}
$("prev").onclick=function(){if(st&&st.idx>0){st.idx--;save();renderQ();}};

function finish(){
  show("s-loading");
  var r=S.score(D,st.answers,st.gender), scores={};
  D.DIMS.forEach(function(d,k){scores[d.name]=r.scores[k];});
  st.result={type_id:r.typeId,gender:st.gender,scores:scores};save();
  submit();
}
function submit(){
  busy=true;
  var p=st.share_token?Promise.resolve({ok:true,share_token:st.share_token}):api.complete(st.session_token,st.result.type_id,st.gender,st.result.scores);
  Promise.all([p,new Promise(function(r){setTimeout(r,1200);})]).then(function(a){
    var r=a[0]; if(r&&r.ok){st.share_token=r.share_token;delete st.answers;st.done=true;save();}
    renderResult(st.result,false);
  }).catch(function(err){renderResult(st.result,false);$("res-msg").textContent="报告已生成，分享链接暂未就绪（"+((err&&(err.message==="Failed to fetch"||err.name==="TypeError"||err.name==="AbortError"))?"无法连接服务器，国内网络可能需加速":"网络异常")+"），稍后点击分享会自动重试";})
  .finally(function(){busy=false;});
}

/* ---------- result ---------- */
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
function renderResult(res,isShare){
  var t=D.TYPES[res.type_id]; if(!t){show("s-gate");return;}
  var aid=res.type_id.split("-")[1], a=D.ARCH.filter(function(x){return x.id===aid;})[0], c=ART[aid];
  var bars=D.DIMS.map(function(d){var v=res.scores[d.name]||0;return '<div class="srow"><span>'+d.name+'</span><span class="t"><i style="width:'+v+'%"></i></span><b>'+v+'</b></div>';}).join("");
  var h='<div class="art" style="background:radial-gradient(90% 80% at 50% 20%,'+c[0]+','+c[1]+')"><div class="fig" style="background:linear-gradient(180deg,'+c[2]+',transparent)"></div><img class="pimg" src="img/types/'+res.type_id+'.webp" alt="" onerror="this.remove()"><span class="tag">'+esc(a.name)+' · '+(res.gender==="male"?"他":"她")+'</span></div>'+
    '<div class="cbody"><div class="ctop">AURA · 个人气场诊断报告</div><div class="tname">'+esc(t.name)+'</div><div class="ten">'+t.en+'</div>'+
    '<div class="quote">'+esc(t.quote)+'</div><div class="kws">'+t.kw.map(function(k){return"<span>"+esc(k)+"</span>";}).join("")+'</div>'+
    '<div class="scores">'+bars+'</div>';
  if(!isShare) h+='<div class="sec"><h3>气场解析</h3><p>'+esc(t.desc)+'</p></div><div class="sec"><h3>你的优势</h3><ul>'+t.pros.map(function(x){return"<li>"+esc(x)+"</li>";}).join("")+'</ul></div><div class="sec"><h3>魅力进阶</h3><ul>'+t.tips.map(function(x){return"<li>"+esc(x)+"</li>";}).join("")+'</ul></div>';
  h+='<div class="cfoot">仅供娱乐参考，非心理诊断'+(MOCK?' · 演示模式':'')+'</div></div>';
  $("card").innerHTML=h; $("res-msg").textContent="";
  $("share").hidden=isShare; $("again").textContent=isShare?"我也要测":"再测一次";
  $("save").onclick=function(){exportPng(res,t,a,c);};
  show("s-result");
}
$("share").onclick=function(){
  var m=$("res-msg");
  if(!st||!st.share_token){ if(st&&st.result&&!busy){m.textContent="正在生成分享链接…";submit();} return; }
  var url=location.origin+location.pathname+"#s="+st.share_token;
  (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(function(){m.textContent="分享链接已复制（90 天内有效，仅展示结果摘要）";})
   .catch(function(){prompt("复制下面的链接",url);});
};
$("again").onclick=function(){st=null;save();history.replaceState(null,"",location.pathname+location.search);show("s-gate");};

/* ---------- PNG（Canvas 自绘，无外部依赖） ---------- */
function exportPng(res,t,a,c){
  var W=1080,H=1600,cv=document.createElement("canvas");cv.width=W;cv.height=H;var x=cv.getContext("2d");
  var F='"PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif';
  x.fillStyle="#f6f0e6";x.fillRect(0,0,W,H);
  var g=x.createRadialGradient(W/2,280,40,W/2,280,720);g.addColorStop(0,c[0]);g.addColorStop(1,"#f6f0e6");x.fillStyle=g;x.fillRect(0,0,W,760);
  var soft=x.createLinearGradient(0,0,0,760);soft.addColorStop(0,c[1]);soft.addColorStop(1,"#fffaf3");x.fillStyle=soft;x.globalAlpha=.55;x.fillRect(0,0,W,760);x.globalAlpha=1;
  var f=x.createLinearGradient(0,120,0,640);f.addColorStop(0,c[2]);f.addColorStop(1,"rgba(246,240,230,0)");x.fillStyle=f;
  x.beginPath();x.moveTo(W/2-160,640);x.lineTo(W/2-160,280);x.arc(W/2,280,160,Math.PI,0);x.lineTo(W/2+160,640);x.fill();
  var pi=new Image(),fin=false;
  function go(ok){if(fin)return;fin=true;
    if(ok){var ph=Math.min(760,W*pi.height/pi.width),sy=pi.height*Math.min(1,760/(W*pi.height/pi.width));x.drawImage(pi,0,0,pi.width,sy,0,0,W,ph);
      var fg=x.createLinearGradient(0,ph-260,0,ph);fg.addColorStop(0,"rgba(246,240,230,0)");fg.addColorStop(1,"#f6f0e6");x.fillStyle=fg;x.fillRect(0,ph-260,W,262);
      var tg=x.createLinearGradient(0,0,0,170);tg.addColorStop(0,"rgba(246,240,230,.9)");tg.addColorStop(1,"rgba(246,240,230,0)");x.fillStyle=tg;x.fillRect(0,0,W,170);}
    rest();}
  pi.onload=function(){go(true);};pi.onerror=function(){go(false);};setTimeout(function(){go(false);},4000);
  pi.src="img/types/"+res.type_id+".webp";
  function rest(){
  x.textAlign="left";x.fillStyle="#b8924e";x.font="30px Georgia,serif";x.fillText("A U R A",80,100);
  x.fillStyle="#8a7d6e";x.font="26px "+F;x.fillText("个人气场诊断报告",250,100);
  x.fillStyle="rgba(47,41,34,.72)";x.font="28px "+F;x.fillText(a.name+" · "+(res.gender==="male"?"他":"她"),80,720);
  x.fillStyle="#7a5c28";x.font="84px "+F;x.fillText(t.name,80,830);
  x.fillStyle="#8a7d6e";x.font="28px Georgia,serif";x.fillText(t.en,84,880);
  x.fillStyle="#c9a86a";x.fillRect(80,930,4,50);x.fillStyle="#3a3228";x.font="36px "+F;x.fillText(t.quote,104,968);
  var kx=80;x.font="28px "+F;t.kw.forEach(function(k){var w=x.measureText(k).width+48;x.fillStyle="rgba(201,168,106,.18)";rr(x,kx,1020,w,56,28);x.fill();x.fillStyle="#8a6a35";x.fillText(k,kx+24,1058);kx+=w+16;});
  D.DIMS.forEach(function(d,i){var y=1160+i*80,v=res.scores[d.name]||0;x.fillStyle="#3a3228";x.font="30px "+F;x.fillText(d.name,80,y+10);
    x.fillStyle="rgba(140,110,70,.14)";rr(x,260,y-8,620,14,7);x.fill();var gg=x.createLinearGradient(260,0,880,0);gg.addColorStop(0,"#b8924e");gg.addColorStop(1,"#c4877a");
    x.fillStyle=gg;rr(x,260,y-8,620*v/100,14,7);x.fill();x.fillStyle="#b8924e";x.font="34px Georgia,serif";x.textAlign="right";x.fillText(v,1000,y+12);x.textAlign="left";});
  x.fillStyle="#8a7d6e";x.font="24px "+F;x.textAlign="center";x.fillText("仅供娱乐参考，非心理诊断"+(MOCK?" · 演示模式":""),W/2,1540);
  var url=cv.toDataURL("image/png");
  $("modal-img").src=url;$("modal").hidden=false;
  var l=document.createElement("a");l.href=url;l.download="AURA-"+t.name+".png";document.body.appendChild(l);l.click();l.remove();
  }
}
function rr(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();}
$("modal-close").onclick=function(){$("modal").hidden=true;};

/* ---------- boot ---------- */
if(MOCK)$("mockbar").hidden=false;
var m=location.hash.match(/^#s=([A-Za-z0-9]{8,64})$/);
if(m){show("s-loading");$("load-msg").textContent="正在打开分享报告…";
  api.share(m[1]).then(function(r){if(r&&r.type_id&&D.TYPES[r.type_id])renderResult(r,true);else{show("s-gate");$("gate-msg").textContent="分享链接已失效或不存在";}})
   .catch(function(err){show("s-gate");$("gate-msg").textContent=(err&&(err.message==="Failed to fetch"||err.name==="TypeError"||err.name==="AbortError"))?"分享报告加载失败（无法连接服务器，国内网络可能需加速）":"分享报告加载失败";});
}else if(st&&st.done&&st.result){renderResult(st.result,false);}
else if(st&&st.result&&st.session_token){submit();show("s-loading");}
else if(st&&st.session_token&&st.answers){renderQ();show("s-quiz");}
else{ if(st&&st.pending){gender=st.pending.gender;document.querySelector('.gbtn[data-g="'+gender+'"]').classList.add("on");$("gate-msg").textContent="上次开始未完成，请重新输入访问码继续（不会重复计次）";} show("s-gate");}
})();
