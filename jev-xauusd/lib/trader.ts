import {config} from "./config";
import {calculateXauusdFeatures,type Candle,type FeatureState,type XauTick} from "./features";

export type Action="buy"|"sell"|"hold";
export interface Decision{action:Action;probabilities:{buy:number;sell:number;hold:number};reason:string}
export interface TraderSnapshot{
  timestamp:string;
  symbol:string;
  mode:"DRY_RUN"|"LIVE";
  price:{bid:number;ask:number;mid:number;spread:number};
  features:FeatureState;
  decision:Decision;
  risk:{allowed:boolean;reason:string};
  account:{login:number;balance:number;equity:number;profit:number;margin:number;freeMargin:number;currency:string};
  positions:[];
  execution?:{success:boolean;side?:"buy"|"sell";volume?:number;price?:number;sl?:number;tp?:number;error?:string};
}

const DATA_API="https://api.twelvedata.com/time_series";
const DATA_SYMBOL="XAU/USD";
const DATA_INTERVAL="5min";
const DATA_CACHE_SECONDS=120;

interface TwelveDataRow{
  datetime:string;
  open:string;
  high:string;
  low:string;
  close:string;
  volume?:string;
}
interface TwelveDataResponse{
  status?:string;
  message?:string;
  values?:TwelveDataRow[];
}

function number(v:string|number|undefined,fallback=0){
  const n=Number(v);
  return Number.isFinite(n)?n:fallback;
}

async function getMarketData():Promise<{candles:Candle[];tick:XauTick}>{
  const apiKey=process.env.TWELVE_DATA_API_KEY;
  if(!apiKey)throw new Error("TWELVE_DATA_API_KEY is not configured");

  const url=new URL(DATA_API);
  url.searchParams.set("symbol",DATA_SYMBOL);
  url.searchParams.set("interval",DATA_INTERVAL);
  url.searchParams.set("outputsize",String(Math.max(config.candles,250)));
  url.searchParams.set("apikey",apiKey);

  const response=await fetch(url.toString(),{
    cache:"force-cache",
    next:{revalidate:DATA_CACHE_SECONDS,tags:["xauusd-market-data"]}
  });
  const body:TwelveDataResponse=await response.json();
  if(!response.ok||body.status==="error"||!body.values?.length){
    throw new Error(body.message??"Twelve Data XAU/USD request failed");
  }

  const rows=[...body.values].reverse();
  const candles:Candle[]=rows.map((x)=>({
    time:Math.floor(new Date(x.datetime+"Z").getTime()/1000),
    open:number(x.open),
    high:number(x.high),
    low:number(x.low),
    close:number(x.close),
    tickVolume:number(x.volume,0)
  })).filter((x)=>x.open>0&&x.high>0&&x.low>0&&x.close>0);

  if(candles.length<50)throw new Error("Twelve Data returned too few XAU/USD candles");

  const latest=candles[candles.length-1];
  const previous=candles[candles.length-2]??latest;
  const mid=latest.close;
  const previousMid=previous.close;
  const spread=Math.max(Math.abs(mid-previousMid),0);

  return {
    candles,
    tick:{time:latest.time,bid:mid-spread/2,ask:mid+spread/2,last:mid,volume:latest.tickVolume}
  };
}

export async function jevDecision(f:FeatureState):Promise<Decision>{
  if(!config.jevApiKey)return mockDecision(f);

  const state={
    instrument:"XAUUSD",
    horizonMinutes:config.horizonMinutes,
    price:{bid:f.bid,ask:f.ask,mid:f.mid,spread:f.spread,spreadBps:f.spreadBps},
    returnsBps:f.returnsBps,
    technical:f.technical,
    market:f.market,
    volume:f.volume,
    recentPrices:f.recentPrices,
    source:"Twelve Data XAU/USD"
  };

  const r=await fetch(config.jevEndpoint,{
    method:"POST",
    headers:{"Authorization":`Bearer ${config.jevApiKey}`,"Content-Type":"application/json"},
    body:JSON.stringify({
      model:config.jevModelId,
      state,
      questions:{
        direction:{
          type:"choice",
          instructions:"For XAUUSD, choose the strongest action over the configured horizon using the supplied real-time market state. Account for momentum, trend, RSI, EMA structure, ATR, volume, session, volatility and estimated spread. Do not force a trade when evidence is weak.",
          criteria:{
            buy:"XAUUSD is more likely to rise enough to justify a long entry after estimated spread.",
            sell:"XAUUSD is more likely to fall enough to justify a short entry after estimated spread.",
            hold:"Evidence is insufficient, conflicting, or the market is unattractive."
          }
        }
      }
    }),
    cache:"no-store"
  });

  const j:any=await r.json();
  if(!r.ok)throw new Error(j?.error?.message??"Jev API request failed");

  const a=j?.answers?.direction;
  const pr=a?.probabilities??{};
  const buy=Math.max(0,Math.min(1,Number(pr.buy??0)));
  const sell=Math.max(0,Math.min(1,Number(pr.sell??0)));
  const hold=Math.max(0,Math.min(1,Number(pr.hold??Math.max(0,1-buy-sell))));
  const action:Action=a?.choice==="buy"?"buy":a?.choice==="sell"?"sell":"hold";

  return {
    action,
    probabilities:{buy,sell,hold},
    reason:`Jev ${j?.model??config.jevModelId}: ${action}`
  };
}

function mockDecision(f:FeatureState):Decision{
  const trend=f.market.trend==="up"?.1:f.market.trend==="down"?-.1:0;
  const momentum=Math.tanh(f.returnsBps.last15m/10)*.2;
  const rsiSignal=f.technical.rsi14>70?-.08:f.technical.rsi14<30?.08:0;
  const signal=trend+momentum+rsiSignal;
  const buy=1/(1+Math.exp(-signal*4));
  const sell=1-buy;
  const action:Action=
    buy>=config.minProbability&&buy-sell>=config.minProbabilityEdge?"buy":
    sell>=config.minProbability&&sell-buy>=config.minProbabilityEdge?"sell":"hold";
  return{
    action,
    probabilities:{buy,sell,hold:Math.max(0,1-Math.max(buy,sell))},
    reason:`trend=${f.market.trend}, RSI=${f.technical.rsi14.toFixed(1)}, 15m=${f.returnsBps.last15m.toFixed(2)}bps`
  };
}

function riskCheck(f:FeatureState,d:Decision){
  if(d.action==="hold")return{allowed:false,reason:"HOLD signal"};
  if(d.probabilities[d.action]<config.minProbability)return{allowed:false,reason:"Probability threshold not met"};
  if(Math.abs(d.probabilities.buy-d.probabilities.sell)<config.minProbabilityEdge)return{allowed:false,reason:"Probability edge not met"};
  if(!f.technical.atr5m)return{allowed:false,reason:"ATR unavailable"};
  return{allowed:true,reason:"Analysis checks passed; execution disabled without a broker API"};
}

export async function getXauusdSnapshot():Promise<TraderSnapshot>{
  const {candles,tick}=await getMarketData();
  const features=calculateXauusdFeatures(candles,tick);
  const decision=config.model==="jev"?await jevDecision(features):mockDecision(features);
  const risk=riskCheck(features,decision);

  return{
    timestamp:new Date().toISOString(),
    symbol:"XAUUSD",
    mode:"DRY_RUN",
    price:{bid:tick.bid,ask:tick.ask,mid:tick.last??(tick.bid+tick.ask)/2,spread:tick.ask-tick.bid},
    features,
    decision,
    risk,
    account:{login:0,balance:0,equity:0,profit:0,margin:0,freeMargin:0,currency:"USD"},
    positions:[]
  };
}
