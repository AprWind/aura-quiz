// node test/scoring.test.js [--calibrate]
const D=require("../data.js"), S=require("../scoring.js");
function rnd(){return D.Q.map(()=>Math.floor(Math.random()*4));}
function dist(bias,n){const c={};D.ARCH.forEach(a=>c[a.id]=0);for(let i=0;i<n;i++)c[S.score(D,rnd(),"female",bias).arch.id]++;return c;}
if(process.argv.includes("--calibrate")){
  const b={...D.BIAS};
  for(let it=0;it<60;it++){const c=dist(b,20000);for(const k in c)b[k]+=0.25*Math.log((20000/6)/Math.max(c[k],1));}
  for(const k in b)b[k]=+b[k].toFixed(2);console.log(JSON.stringify(b));process.exit(0);
}
const N=60000,c=dist(D.BIAS,N);let ok=true;
console.log("Random-answer distribution (N="+N+"):");
for(const k in c){const p=c[k]/N*100;console.log(k.padEnd(7),p.toFixed(1)+"%");if(p<12||p>21)ok=false;}
// reachability: per gender, every type reachable via a deterministic "pure" answer pattern search
const reach=new Set();
for(const g of["male","female"]){for(let i=0;i<20000;i++)reach.add(S.score(D,rnd(),g).typeId);
  D.ARCH.forEach(a=>{ // greedy: pick per question the option closest to centroid direction
    const ans=D.Q.map(q=>{let bi=0,bv=-1e9;q.o.forEach((o,j)=>{const v=o.slice(1).reduce((s,x,k)=>s+x*a.c[k],0);if(v>bv){bv=v;bi=j;}});return bi;});
    const r=S.score(D,ans,g); console.log(g, a.id, "-> greedy", r.typeId, r.scores.join("/")); reach.add(r.typeId);});}
console.log("reachable types:",reach.size,"/12");
for(const id of reach) if(!D.TYPES[id]) ok=false;
if(reach.size!==12) ok=false;
console.log(ok?"PASS":"FAIL"); process.exit(ok?0:1);
