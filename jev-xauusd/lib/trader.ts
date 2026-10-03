import {config} from "./config";
import {calculateXauusdFeatures,type Candle,type FeatureState,type XauTick} from "./features";

export type Action="buy"|"sell"|"hold";
export type Timeframe="5m"|"15m"|"30m"|"1h"|"1d"|"1w"|"1M";
export const TIMEFRAMES:Timeframe[]=["5m","15m","30m","1h","1d","1w","1M"];

export interface Decision{action:Action;probabilities:{buy:number;sell:number;hold:number};reason:string}
export interface TimeframeSnapshot{timeframe:Timeframe;features:FeatureState;decision:Decision}
export interface TraderSnapshot{
  timestamp:string;
  symbol:string;
  mode:"DRY_RUN"|"LIVE";
  price:{bid:number;ask:number;mid:number;spread:number};
  features:FeatureState;
  decision:Decision;
  timeframes:Record<Timeframe,TimeframeSnapshot>;
  risk:{allowed:boolean;reason:string};
  account:{login:number;balance:number;equity:number;profit:number;margin:number;freeMargin:number;currency:string};
  positions:[];
}

const DATA_API="https://api.twelvedata.com/time_series";
const DATA_SYMBOL="XAU/USD";
const DATA_CACHE_SECONDS=120;
const intervalMap:Record<Timeframe,string>={"5m":"5min","15m":"15min","30m":"30min","1h":"1h","1d":"1day","1w":"1week","1M":"1month"};

interface TwelveDataRow{datetime:string;open:string;high:string;low:string;close:string;volume?:string}
interface TwelveDataResponse{status?:string;message?:string;values?:TwelveDataRow[]}
function number(v:string|number|undefined,fallback=0){const n=Number(v);return Number.isFinite(n)?n:fallback}

async function getMarketData(timeframe:Timeframe):Promise<{candles:Candle[];tick:XauTick}>{
  const apiKey=process.env.TWELVE_DATA_API_KEY;
  if(!apiKey)throw new Error("TWELVE_DATA_API_KEY is not configured");
  const url=new URL(DATA_API);
  url.searchParams.set("symbol",DATA_SYMBOL);url.searchParams.set("interval",intervalMap[timeframe]);
  url.searchParams.set("outputsize",String(Math.max(config.candles,250)));url.searchParams.set("apikey",apiKey);
  const response=await fetch(url.toString(),{cache:"force-cache",next:{revalidate:DATA_CACHE_SECONDS,tags:["xauusd-market-data",`xauusd-${timeframe}`]}});
  const body:TwelveDataResponse=await response.json();
  if(!response.ok||body.status==="error"||!body.values?.length)throw new Error(body.message??`Twelve Data XAU/USD ${timeframe} request failed`);
  const candles:Candle[]=[...body.values].reverse().map(x=>({time:Math.floor(new Date(x.datetime+"Z").getTime()/1000),open:number(x.open),high:number(x.high),low:number(x.low),close:number(x.close),tickVolume:number(x.volume,0)})).filter(x=>x.open>0&&x.high>0&&x.low>0&&x.close>0);
  if(candles.length<50)throw new Error(`Twelve Data returned too few XAU/USD ${timeframe} candles`);
  const latest=candles[candles.length-1],previous=candles[candles.length-2]??latest,mid=latest.close,spread=Math.max(Math.abs(mid-previous.close),0);
  return{candles,tick:{time:latest.time,bid:mid-spread/2,ask:mid+spread/2,last:mid,volume:latest.tickVolume}};
}

export async function jevDecisionSet(timeframes:Record<Timeframe,TimeframeSnapshot>):Promise<Record<Timeframe,Decision>>{
  if(!config.jevApiKey)return Object.fromEntries(TIMEFRAMES.map(tf=>[tf,mockDecision(timeframes[tf].features)])) as Record<Timeframe,Decision>;
  const state={instrument:"XAUUSD",source:"Twelve Data XAU/USD",timeframes:Object.fromEntries(TIMEFRAMES.map(tf=>[tf,{timeframe:tf,price:timeframes[tf].features.mid,spread:timeframes[tf].features.spread,spreadBps:timeframes[tf].features.spreadBps,returnsBps:timeframes[tf].features.returnsBps,technical:timeframes[tf].features.technical,market:timeframes[tf].features.market,volume:timeframes[tf].features.volume,recentPrices:timeframes[tf].features.recentPrices}]))};
  const questions=Object.fromEntries(TIMEFRAMES.map(tf=>[tf,{type:"choice",instructions:`For XAUUSD on the ${tf} timeframe, choose the strongest action for this timeframe using the supplied market state. Account for momentum, trend, RSI, EMA structure, ATR, volume, session, volatility and estimated spread. Do not force a trade when evidence is weak.`,criteria:{buy:"XAUUSD is more likely to rise enough to justify a long entry on this timeframe.",sell:"XAUUSD is more likely to fall enough to justify a short entry on this timeframe.",hold:"Evidence is insufficient, conflicting, or the market is unattractive on this timeframe."}}]));
  const r=await fetch(config.jevEndpoint,{method:"POST",headers:{"Authorization":`Bearer ${config.jevApiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:config.jevModelId,state,questions}),cache:"no-store"});
  const j:any=await r.json();if(!r.ok)throw new Error(j?.error?.message??"Jev API request failed");
  return Object.fromEntries(TIMEFRAMES.map(tf=>{const a=j?.answers?.[tf],pr=a?.probabilities??{},buy=Math.max(0,Math.min(1,Number(pr.buy??0))),sell=Math.max(0,Math.min(1,Number(pr.sell??0))),hold=Math.max(0,Math.min(1,Number(pr.hold??Math.max(0,1-buy-sell)))),action:Action=a?.choice==="buy"?"buy":a?.choice==="sell"?"sell":"hold";return[tf,{action,probabilities:{buy,sell,hold},reason:`Jev ${j?.model??config.jevModelId}: ${action} on ${tf}`}]})) as Record<Timeframe,Decision>;
}

function mockDecision(f:FeatureState):Decision{
  const trend=f.market.trend==="up"?.1:f.market.trend==="down"?-.1:0,momentum=Math.tanh(f.returnsBps.last15m/10)*.2,rsiSignal=f.technical.rsi14>70?-.08:f.technical.rsi14<30?.08:0,signal=trend+momentum+rsiSignal,buy=1/(1+Math.exp(-signal*4)),sell=1-buy;
  const action:Action=buy>=config.minProbability&&buy-sell>=config.minProbabilityEdge?"buy":sell>=config.minProbability&&sell-buy>=config.minProbabilityEdge?"sell":"hold";
  return{action,probabilities:{buy,sell,hold:Math.max(0,1-Math.max(buy,sell))},reason:`trend=${f.market.trend}, RSI=${f.technical.rsi14.toFixed(1)}, 15m=${f.returnsBps.last15m.toFixed(2)}bps`};
}
function riskCheck(f:FeatureState,d:Decision){if(d.action==="hold")return{allowed:false,reason:"HOLD signal"};if(d.probabilities[d.action]<config.minProbability)return{allowed:false,reason:"Probability threshold not met"};if(Math.abs(d.probabilities.buy-d.probabilities.sell)<config.minProbabilityEdge)return{allowed:false,reason:"Probability edge not met"};if(!f.technical.atr5m)return{allowed:false,reason:"ATR unavailable"};return{allowed:true,reason:"Analysis checks passed; execution disabled without a broker API"}}

export async function getXauusdSnapshot():Promise<TraderSnapshot>{
  const entries=await Promise.all(TIMEFRAMES.map(async timeframe=>{const{candles,tick}=await getMarketData(timeframe);const features=calculateXauusdFeatures(candles,tick);return[timeframe,{timeframe,features,decision:mockDecision(features)}] as const}));
  const timeframes=Object.fromEntries(entries) as Record<Timeframe,TimeframeSnapshot>;
  const decisions=await jevDecisionSet(timeframes);for(const tf of TIMEFRAMES)timeframes[tf].decision=decisions[tf];
  const base=timeframes["5m"],risk=riskCheck(base.features,base.decision);
  return{timestamp:new Date().toISOString(),symbol:"XAUUSD",mode:"DRY_RUN",price:{bid:base.features.bid,ask:base.features.ask,mid:base.features.mid,spread:base.features.spread},features:base.features,decision:base.decision,timeframes,risk,account:{login:0,balance:0,equity:0,profit:0,margin:0,freeMargin:0,currency:"USD"},positions:[]};
}
