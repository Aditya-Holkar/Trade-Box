export interface Candle { time:number; open:number; high:number; low:number; close:number; tickVolume:number; spread?:number; }
export interface XauTick { time:number; bid:number; ask:number; last?:number; volume?:number; }
export type Trend = "up"|"down"|"sideways";
export type Volatility = "low"|"normal"|"high";
export type Session = "asia"|"london"|"overlap"|"new_york"|"off_hours";

export interface FeatureState {
  timestamp:string; bid:number; ask:number; mid:number; spread:number; spreadBps:number;
  returnsBps:{last1m:number;last5m:number;last15m:number;last30m:number;last1h:number};
  technical:{rsi14:number;ema20:number;ema50:number;ema200:number;atr5m:number;atr15m:number;atr1h:number};
  market:{trend:Trend;volatility:Volatility;session:Session};
  volume:{tickVolume5m:number;tickVolume15m:number;relativeVolume:number};
  recentPrices:string;
}
export function ema(v:number[],period:number){if(!v.length)return 0;const p=Math.min(period,v.length),k=2/(p+1);let r=v.slice(0,p).reduce((a,b)=>a+b,0)/p;for(let i=p;i<v.length;i++)r=(v[i]-r)*k+r;return r;}
export function rsi(v:number[],period=14){if(v.length<2)return 50;const c=v.slice(1).map((x,i)=>x-v[i]);const p=Math.min(period,c.length);let g=0,l=0;for(const x of c.slice(-p)){if(x>=0)g+=x;else l+=Math.abs(x);}if(l===0)return 100;return Math.max(0,Math.min(100,100-100/(1+(g/p)/(l/p))));}
function atr(c:Candle[],period=14){const rs=c.map((x,i)=>i===0?x.high-x.low:Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)));const r=rs.slice(-Math.min(period,c.length));return r.length?r.reduce((a,b)=>a+b,0)/r.length:0;}
function bps(c:number[],bars:number){if(c.length<=bars)return 0;const cur=c[c.length-1],prev=c[c.length-bars-1];return prev?((cur-prev)/prev)*10000:0;}
function session():Session{const h=new Date().getUTCHours();if(h<7)return"asia";if(h<12)return"london";if(h<16)return"overlap";if(h<21)return"new_york";return"off_hours";}
function trend(m:number,e20:number,e50:number,e200:number,r15:number):Trend{if(m>e20&&e20>e50&&e50>e200&&r15>0)return"up";if(m<e20&&e20<e50&&e50<e200&&r15<0)return"down";return"sideways";}
function vol(c:Candle[],a:number):Volatility{const x=c.slice(-20);if(!x.length)return"normal";const avg=x.reduce((s,z)=>s+z.high-z.low,0)/x.length;if(!avg)return"normal";const q=a/avg;return q>1.5?"high":q<.65?"low":"normal";}
export function calculateXauusdFeatures(c:Candle[],t:XauTick):FeatureState{
 if(!c.length)throw new Error("No XAUUSD candles supplied");const closes=c.map(x=>x.close),mid=(t.bid+t.ask)/2,spread=t.ask-t.bid,e20=ema(closes,20),e50=ema(closes,50),e200=ema(closes,200),a5=atr(c,14),a15=atr(c,42),a1=atr(c,168),r15=bps(closes,3),base=c.slice(-30).reduce((s,x)=>s+x.tickVolume,0)/Math.min(30,c.length),v15=c.slice(-3).reduce((s,x)=>s+x.tickVolume,0);
 return {timestamp:new Date().toISOString(),bid:t.bid,ask:t.ask,mid,spread,spreadBps:mid?spread/mid*10000:0,
 returnsBps:{last1m:bps(closes,1)/5,last5m:bps(closes,1),last15m:r15,last30m:bps(closes,6),last1h:bps(closes,12)},
 technical:{rsi14:rsi(closes),ema20:e20,ema50:e50,ema200:e200,atr5m:a5,atr15m:a15,atr1h:a1},
 market:{trend:trend(mid,e20,e50,e200,r15),volatility:vol(c,a5),session:session()},
 volume:{tickVolume5m:c[c.length-1]?.tickVolume??0,tickVolume15m:v15,relativeVolume:base>0?v15/(base*3):1},
 recentPrices:c.slice(-30).map(x=>x.close.toFixed(2)).join(" ")};
}
