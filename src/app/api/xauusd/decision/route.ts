import { NextResponse } from "next/server";
import { getHistory, getQuote } from "@/lib/market-data";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
type Bias = "BUY" | "SELL" | "WAIT";
type Horizon = { horizon: string; bias: Bias; score: number; confidence: number; trigger: string; entry: string; stop: string; targets: string; rationale: string[] };

const POS = ["rises","rise","surge","surges","bullish","buy","buys","inflow","easing","dovish","support","strong","gain","gains","record"];
const NEG = ["falls","fall","drop","drops","bearish","sell","sells","outflow","hawkish","warning","weak","loss","losses","decline","higher yields","strong dollar"];

function sentiment(text: string) {
  const t = text.toLowerCase();
  const p = POS.filter(x => t.includes(x)).length;
  const n = NEG.filter(x => t.includes(x)).length;
  return p > n ? "positive" : n > p ? "negative" : "neutral";
}
function ema(v: number[], p: number) {
  if (!v.length) return 0; const k = 2 / (p + 1); let e = v[0];
  for (let i = 1; i < v.length; i++) e = v[i] * k + e * (1-k); return e;
}
function rsi(v: number[], p=14) {
  if (v.length <= p) return 50; let g=0,l=0;
  for(let i=1;i<=p;i++){const d=v[i]-v[i-1];if(d>=0)g+=d;else l-=d;}
  let ag=g/p,al=l/p;
  for(let i=p+1;i<v.length;i++){const d=v[i]-v[i-1];ag=(ag*(p-1)+Math.max(d,0))/p;al=(al*(p-1)+Math.max(-d,0))/p;}
  return al===0?100:100-100/(1+ag/al);
}
function atr(c:Candle[],p=14) {
  if(c.length<p+1)return 0;
  const tr=c.slice(1).map((x,i)=>Math.max(x.high-x.low,Math.abs(x.high-c[i].close),Math.abs(x.low-c[i].close)));
  return tr.slice(-p).reduce((a,b)=>a+b,0)/p;
}
function macd(v:number[]) { return ema(v.slice(-80),12)-ema(v.slice(-80),26); }
function adx(c:Candle[],p=14) {
  if(c.length<p+2)return 20; const tr:number[]=[],plus:number[]=[],minus:number[]=[];
  for(let i=1;i<c.length;i++){const x=c[i],q=c[i-1];tr.push(Math.max(x.high-x.low,Math.abs(x.high-q.close),Math.abs(x.low-q.close)));const up=x.high-q.high,down=q.low-x.low;plus.push(up>down&&up>0?up:0);minus.push(down>up&&down>0?down:0);}
  const T=tr.slice(-p).reduce((a,b)=>a+b,0)/p,P=plus.slice(-p).reduce((a,b)=>a+b,0)/p,M=minus.slice(-p).reduce((a,b)=>a+b,0)/p;
  if(!T)return 0;const dp=100*P/T,dm=100*M/T;return 100*Math.abs(dp-dm)/Math.max(dp+dm,1);
}
function resample(c:Candle[],n:number){const out:Candle[]=[];for(let i=0;i+n<=c.length;i+=n){const g=c.slice(i,i+n);out.push({time:g[0].time,open:g[0].open,high:Math.max(...g.map(x=>x.high)),low:Math.min(...g.map(x=>x.low)),close:g[g.length-1].close,volume:g.reduce((s,x)=>s+x.volume,0)});}return out;}
function frame(c:Candle[],label:string){
  if(c.length<55)return {score:0,price:c[c.length-1]?.close??0,atr:0,rsi:50,ema20:0,ema50:0,support:0,resistance:0,details:["Insufficient bars"]};
  const v=c.map(x=>x.close),price=v[v.length-1],e20=ema(v.slice(-140),20),e50=ema(v.slice(-180),50),r=rsi(v.slice(-120)),a=atr(c.slice(-100)),m=macd(v),d=adx(c.slice(-120)),recent=c.slice(-30,-1),support=Math.min(...recent.map(x=>x.low)),resistance=Math.max(...recent.map(x=>x.high));
  let s=0;const details:string[]=[];
  if(e20>e50){s+=2;details.push(label+" EMA trend bullish");}else{s-=2;details.push(label+" EMA trend bearish");}
  if(price>e20){s+=1;details.push(label+" price above EMA20");}else{s-=1;details.push(label+" price below EMA20");}
  if(r>55&&r<70){s+=1;details.push(label+" RSI bullish");}else if(r<45&&r>30){s-=1;details.push(label+" RSI bearish");}
  if(m>0){s+=1;details.push(label+" MACD positive");}else{s-=1;details.push(label+" MACD negative");}
  if(d>25){s+=e20>e50?1:-1;details.push(label+" ADX confirms directional regime");}
  return {score:s,price,atr:a,rsi:r,ema20:e20,ema50:e50,support,resistance,details};
}
function makeHorizon(h:string,f:any,macro:number,news:number):Horizon{
  const score=Math.max(-100,Math.min(100,f.score*8+macro*4+news*3)),bias:Bias=score>=28?"BUY":score<=-28?"SELL":"WAIT",confidence=Math.min(96,Math.max(50,50+Math.abs(score)*0.45)),p=f.price,a=Math.max(f.atr,p*0.002);
  if(bias==="BUY")return {horizon:h,bias,score,confidence,trigger:"Confirm close above "+f.resistance.toFixed(2)+" with momentum and no high-impact USD event in the next window.",entry:p.toFixed(2)+" ± "+(a*0.25).toFixed(2),stop:(p-a).toFixed(2),targets:(p+a*1.2).toFixed(2)+" / "+(p+a*2).toFixed(2),rationale:f.details.slice(0,4)};
  if(bias==="SELL")return {horizon:h,bias,score,confidence,trigger:"Confirm rejection below "+f.support.toFixed(2)+" or a bearish structure break; avoid entries immediately before high-impact USD news.",entry:p.toFixed(2)+" ± "+(a*0.25).toFixed(2),stop:(p+a).toFixed(2),targets:(p-a*1.2).toFixed(2)+" / "+(p-a*2).toFixed(2),rationale:f.details.slice(0,4)};
  return {horizon:h,bias,score,confidence,trigger:"WAIT for a confirmed break/retest with momentum alignment and a clean macro/news window.",entry:"No entry",stop:"—",targets:"—",rationale:f.details.slice(0,4)};
}
async function rssNews(){
  try{
    const r=await fetch("https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC=F&region=US&lang=en-US",{headers:{"User-Agent":"Trade-Box/1.0"},next:{revalidate:300}});
    if(!r.ok)return [];const x=await r.text();
    return [...x.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0,8).map(m=>{const b=m[1],g=(t:string)=>b.match(new RegExp("<"+t+">([\\s\\S]*?)</"+t+">","i"))?.[1]?.replace(/<!\[CDATA\[|\]\]>/g,"").trim()??"",title=g("title");return {title,link:g("link"),publishedAt:g("pubDate"),sentiment:sentiment(title)}}).filter(x=>x.title);
  }catch{return []}
}
async function sourceSnapshot(url:string,kind:"ff"|"capitol"){
  try{
    const r=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0 Trade-Box research terminal"},next:{revalidate:300}});
    if(!r.ok)return {available:false,headline:"Source unavailable",sentiment:"neutral",url};
    const html=await r.text(),text=html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
    const key=kind==="ff"?/Gold\/USD|USD|High Impact|Federal Funds Rate|CPI|NFP|FOMC/gi:/trade|politic|congress|senat|house|tariff|energy|defense/gi;
    const hits=text.match(key)?.slice(0,8)??[];
    return {available:true,headline:hits.length?hits.join(" · "):text.slice(0,220),sentiment:sentiment(text.slice(0,3000)),url};
  }catch{return {available:false,headline:"Source unavailable",sentiment:"neutral",url};}
}

async function yahooChange(symbol:string){
  try{
    const url="https://query1.finance.yahoo.com/v8/finance/chart/"+encodeURIComponent(symbol)+"?range=5d&interval=1d";
    const r=await fetch(url,{headers:{"User-Agent":"Trade-Box/1.0"},next:{revalidate:300}});
    if(!r.ok)return null;
    const b=await r.json() as {chart?:{result?:Array<{indicators?:{quote?:Array<{close?:Array<number|null>}>}}>}};
    const closes=b.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter((x):x is number=>typeof x==="number")??[];
    if(closes.length<2)return null;
    return {value:closes[closes.length-1],changePct:(closes[closes.length-1]/closes[0]-1)*100};
  }catch{return null}
}

export async function GET(){
  try{
    const [quote,m15,daily,news,ff,capitol,dxy,us10y,oil]=await Promise.all([
      getQuote("XAUUSD"),getHistory("XAUUSD","5d","15m"),getHistory("XAUUSD","1y","1d"),rssNews(),
      sourceSnapshot("https://www.forexfactory.com/?page=calendar","ff"),
      sourceSnapshot("https://www.capitoltrades.com/","capitol"),
      yahooChange("DX-Y.NYB"),yahooChange("^TNX"),yahooChange("CL=F")
    ]);
    const f5=frame(m15,"M15"),f30=frame(resample(m15,2),"30M"),f1=frame(resample(m15,4),"1H"),fw=frame(resample(daily,5),"1W"),fm=frame(resample(daily,20),"1M");
    const ns=news.filter((x:any)=>x.sentiment==="positive").length-news.filter((x:any)=>x.sentiment==="negative").length;
    const macro=(ff.sentiment==="positive"?1:ff.sentiment==="negative"?-1:0)+(dxy&&dxy.changePct>0.5?-1:dxy&&dxy.changePct<-0.5?1:0)+(us10y&&us10y.changePct>0.75?-1:us10y&&us10y.changePct<-0.75?1:0)+(capitol.sentiment==="positive"?0.25:capitol.sentiment==="negative"?-0.25:0);
    const fundamentals={dollarIndex:dxy,us10y,oil,centralBankContext:ff.headline,policyFlowContext:capitol.headline};
    const horizons=[makeHorizon("5 MIN",f5,macro,ns),makeHorizon("30 MIN",f30,macro,ns),makeHorizon("1 HOUR",f1,macro,ns),makeHorizon("1 WEEK",fw,macro,ns),makeHorizon("1 MONTH",fm,macro,ns)];
    return NextResponse.json({quote,horizons,technicals:{m15:f5,m30:f30,h1:f1,w1:fw,m1:fm},news,marketSentiment:{score:ns,label:ns>=2?"BULLISH":ns<=-2?"BEARISH":"MIXED"},macro:{score:macro,label:macro>1?"SUPPORTIVE":macro<-1?"HEADWIND":"MIXED"},fundamentals,sources:{forexFactory:ff,capitolTrades:capitol},generatedAt:Date.now(),warnings:["Confidence is a confluence estimate, not a probability of profit.","CapitolTrades is indirect political/policy-flow context, not a direct XAUUSD positioning feed.","For execution-grade accuracy, use a dedicated real-time XAUUSD spot feed and a structured economic-calendar API."]});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"XAUUSD intelligence unavailable"},{status:502})}
}
