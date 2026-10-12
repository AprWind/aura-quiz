/* 计分：各维原始分 → 标准分(z，基于随机作答的理论均值/方差) → 本性别 6 型中按 (距离² − bias) 最近中心判型。
   展示分 = 50 + 15·z，夹在 [40, 99]。 */
(function (root) {
function stats(D){
  var mu=[0,0,0,0], v=[0,0,0,0];
  D.Q.forEach(function(q){ for(var k=0;k<4;k++){ var xs=q.o.map(function(o){return o[k+1];});
    var m=xs.reduce(function(a,b){return a+b;},0)/xs.length; mu[k]+=m;
    v[k]+=xs.reduce(function(a,b){return a+(b-m)*(b-m);},0)/xs.length; } });
  return {mu:mu, sd:v.map(Math.sqrt)};
}
function score(D, answers, gender, biasOverride){
  var raw=[0,0,0,0];
  answers.forEach(function(a,i){ var o=D.Q[i].o[a]; for(var k=0;k<4;k++) raw[k]+=o[k+1]; });
  var s=stats(D), z=raw.map(function(r,k){return (r-s.mu[k])/s.sd[k];});
  var bias=biasOverride||D.BIAS, best=null, bd=Infinity;
  D.ARCH.forEach(function(a){ var d=0; for(var k=0;k<4;k++) d+=(z[k]-a.c[k])*(z[k]-a.c[k]); d-=bias[a.id]||0;
    if(d<bd){bd=d;best=a;} });
  var pts=z.map(function(x){return Math.max(40,Math.min(99,Math.round(50+15*x)));});
  var g=gender==="male"?"m":"f";
  return {typeId:g+"-"+best.id, arch:best, raw:raw, z:z, scores:pts};
}
root.AURA_SCORE = {stats:stats, score:score};
if (typeof module !== "undefined") module.exports = root.AURA_SCORE;
})(typeof window !== "undefined" ? window : globalThis);
