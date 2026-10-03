import {config} from "./config";
import type {Candle,XauTick} from "./features";
export interface Mt5Account{login:number;balance:number;equity:number;profit:number;margin:number;freeMargin:number;currency:string}
export interface Mt5Position{ticket:number;symbol:string;type:"buy"|"sell";volume:number;priceOpen:number;priceCurrent:number;profit:number;sl:number;tp:number}
export interface Mt5OrderResult{success:boolean;retcode?:number;order?:number;deal?:number;price?:number;volume?:number;comment?:string;error?:string}
export class Mt5Bridge{
 private baseUrl=config.mt5BridgeUrl.replace(/\/$/,"");
 private async request<T>(path:string,init?:RequestInit):Promise<T>{
  const c=new AbortController(),t=setTimeout(()=>c.abort(),config.mt5RequestTimeoutMs);
  try{
   const headers:Record<string,string>={"Content-Type":"application/json"};
   if(config.mt5BridgeToken) headers["X-MT5-Bridge-Token"]=config.mt5BridgeToken;
   const r=await fetch(this.baseUrl+path,{...init,signal:c.signal,headers:{...headers,...(init?.headers??{})},cache:"no-store"});
   const s=await r.text();let b:any={};try{b=s?JSON.parse(s):{}}catch{b={raw:s}}
   if(!r.ok)throw new Error(b?.detail??b?.error??`MT5 bridge HTTP ${r.status}`);
   return b as T;
  }finally{clearTimeout(t)}
 }
 getTick(s=config.symbol){return this.request<XauTick>(`/tick/${encodeURIComponent(s)}`)}
 getCandles(s=config.symbol,tf=config.timeframe,n=config.candles){return this.request<{candles:Candle[]}>(`/candles/${encodeURIComponent(s)}?timeframe=${encodeURIComponent(tf)}&count=${n}`)}
 getAccount(){return this.request<Mt5Account>("/account")}
 getPositions(s=config.symbol){return this.request<{positions:Mt5Position[]}>(`/positions?symbol=${encodeURIComponent(s)}`)}
 order(p:{symbol:string;side:"buy"|"sell";volume:number;sl?:number;tp?:number;deviation?:number;comment?:string}){return this.request<Mt5OrderResult>("/order",{method:"POST",body:JSON.stringify(p)})}
}
