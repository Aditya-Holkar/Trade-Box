"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./language-context";
type Horizon = {
  horizon: string; bias: "BUY" | "SELL" | "WAIT"; score: number; confidence: number;
  trigger: string; entry: string; stop: string; targets: string; rationale: string[];
};
type Report = {
  quote: { price: number; bid?: number; ask?: number; timestamp?: number; provider?: string };
  horizons: Horizon[];
  technicals: Record<string, {score:number;price:number;atr:number;rsi:number;ema20:number;ema50:number;support:number;resistance:number;details:string[]}>;
  news: {title:string;link:string;publishedAt:string;sentiment:string}[];
  marketSentiment: {score:number;label:string};
  macro: {score:number;label:string};
  fundamentals: {dollarIndex:{value:number;changePct:number}|null;us10y:{value:number;changePct:number}|null;oil:{value:number;changePct:number}|null;centralBankContext:string;policyFlowContext:string;drivers:{label:string;value:{value:number;changePct:number}|null}[]};
  sources: {forexFactory:{available:boolean;headline:string;sentiment:string;url:string};capitolTrades:{available:boolean;headline:string;sentiment:string;url:string}};
  generatedAt: number;
  warnings: string[];
};

const fmt=(n:number|undefined)=>typeof n==="number"&&Number.isFinite(n)?n.toFixed(2):"—";

type Language = "en"|"hi"|"mr"|"es"|"fr"|"de"|"ja"|"zh"|"ko"|"ar";

const translations: Record<Language, Record<string,string>> = {
  en:{intelligence:"MULTI-HORIZON TRADE INTELLIGENCE",subtitle:"News + sentiment + technicals + macro + policy context",refresh:"REFRESH",analyzing:"ANALYZING…",live:"LIVE MARKET",bid:"Bid",ask:"Ask",spot:"LIVE SPOT",marketSentiment:"MARKET SENTIMENT",newsFlow:"News-flow composite",macro:"MACRO / POLICY",engine:"ENGINE MODE",confirmation:"CONFIRMATION",noOutcomes:"No guaranteed outcomes",horizon:"HORIZON",recommendation:"RECOMMENDATION",confidence:"CONFIDENCE",entry:"ENTRY",stop:"STOP",targets:"TARGETS",trigger:"TRIGGER",fundamentals:"FUNDAMENTALS / MACRO",technical:"TECHNICAL CONFLUENCE",news:"NEWS ANALYSIS",external:"EXTERNAL SOURCES",quality:"ACCURACY / DATA QUALITY GATES",unavailable:"Unavailable",analysisUpdated:"Analysis updated",liveRefreshed:"Live price is refreshed independently every 15s",research:"Research/simulation only · The engine does not place orders.",language:"LANGUAGE",sourceCoverage:"Live external-source coverage",forex:"Forex Factory",capitol:"Capitol Trades",sourceStatus:"Source status"},
  hi:{intelligence:"बहु-अवधि ट्रेड इंटेलिजेंस",subtitle:"समाचार + भावना + तकनीकी + मैक्रो + नीति संदर्भ",refresh:"रिफ्रेश",analyzing:"विश्लेषण…",live:"लाइव मार्केट",bid:"बिड",ask:"आस्क",spot:"लाइव स्पॉट",marketSentiment:"मार्केट सेंटीमेंट",newsFlow:"न्यूज़-फ्लो मिश्रित स्कोर",macro:"मैक्रो / नीति",engine:"इंजन मोड",confirmation:"कन्फर्मेशन",noOutcomes:"परिणाम की गारंटी नहीं",horizon:"अवधि",recommendation:"सिफारिश",confidence:"विश्वास",entry:"एंट्री",stop:"स्टॉप",targets:"टार्गेट",trigger:"ट्रिगर",fundamentals:"फंडामेंटल / मैक्रो",technical:"तकनीकी संगम",news:"समाचार विश्लेषण",external:"बाहरी स्रोत",quality:"सटीकता / डेटा गुणवत्ता",unavailable:"उपलब्ध नहीं",analysisUpdated:"विश्लेषण अपडेट",liveRefreshed:"लाइव कीमत हर 15 सेकंड में स्वतंत्र रूप से अपडेट होती है",research:"रिसर्च/सिमुलेशन केवल · इंजन ऑर्डर नहीं लगाता।",language:"भाषा",sourceCoverage:"लाइव बाहरी-स्रोत कवरेज",forex:"Forex Factory",capitol:"Capitol Trades",sourceStatus:"स्रोत स्थिति"},
  mr:{intelligence:"बहु-अवधी ट्रेड इंटेलिजन्स",subtitle:"बातम्या + भावना + तांत्रिक + मॅक्रो + धोरण संदर्भ",refresh:"रिफ्रेश",analyzing:"विश्लेषण…",live:"लाइव्ह मार्केट",bid:"बिड",ask:"आस्क",spot:"लाइव्ह स्पॉट",marketSentiment:"मार्केट सेंटीमेंट",newsFlow:"न्यूज़-फ्लो मिश्रित स्कोअर",macro:"मॅक्रो / धोरण",engine:"इंजिन मोड",confirmation:"कन्फर्मेशन",noOutcomes:"परिणामाची हमी नाही",horizon:"कालावधी",recommendation:"शिफारस",confidence:"विश्वास",entry:"एंट्री",stop:"स्टॉप",targets:"टार्गेट",trigger:"ट्रिगर",fundamentals:"फंडामेंटल / मॅक्रो",technical:"तांत्रिक संगम",news:"बातमी विश्लेषण",external:"बाह्य स्रोत",quality:"अचूकता / डेटा गुणवत्ता",unavailable:"उपलब्ध नाही",analysisUpdated:"विश्लेषण अपडेट",liveRefreshed:"लाइव्ह किंमत स्वतंत्रपणे दर 15 सेकंदांनी अपडेट होते",research:"रिसर्च/सिम्युलेशन फक्त · इंजिन ऑर्डर देत नाही.",language:"भाषा",sourceCoverage:"लाइव्ह बाह्य-स्रोत कव्हरेज",forex:"Forex Factory",capitol:"Capitol Trades",sourceStatus:"स्रोत स्थिती"},
  es:{intelligence:"INTELIGENCIA DE TRADING MULTIHORIZONTE",subtitle:"Noticias + sentimiento + técnicos + macro + política",refresh:"ACTUALIZAR",analyzing:"ANALIZANDO…",live:"MERCADO EN VIVO",bid:"Bid",ask:"Ask",spot:"SPOT EN VIVO",marketSentiment:"SENTIMIENTO DEL MERCADO",newsFlow:"Composición del flujo de noticias",macro:"MACRO / POLÍTICA",engine:"MODO DEL MOTOR",confirmation:"CONFIRMACIÓN",noOutcomes:"Sin resultados garantizados",horizon:"HORIZONTE",recommendation:"RECOMENDACIÓN",confidence:"CONFIANZA",entry:"ENTRADA",stop:"STOP",targets:"OBJETIVOS",trigger:"ACTIVADOR",fundamentals:"FUNDAMENTALES / MACRO",technical:"CONFLUENCIA TÉCNICA",news:"ANÁLISIS DE NOTICIAS",external:"FUENTES EXTERNAS",quality:"PRECISIÓN / CALIDAD DE DATOS",unavailable:"No disponible",analysisUpdated:"Análisis actualizado",liveRefreshed:"El precio en vivo se actualiza independientemente cada 15 s",research:"Solo investigación/simulación · El motor no ejecuta órdenes.",language:"IDIOMA",sourceCoverage:"Cobertura de fuentes externas en vivo",forex:"Forex Factory",capitol:"Capitol Trades",sourceStatus:"Estado de la fuente"},
  fr:{intelligence:"INTELLIGENCE DE TRADING MULTI-HORIZON",subtitle:"Actualités + sentiment + technique + macro + politique",refresh:"ACTUALISER",analyzing:"ANALYSE…",live:"MARCHÉ EN DIRECT",bid:"Bid",ask:"Ask",spot:"SPOT EN DIRECT",marketSentiment:"SENTIMENT DU MARCHÉ",newsFlow:"Composite du flux d’actualités",macro:"MACRO / POLITIQUE",engine:"MODE DU MOTEUR",confirmation:"CONFIRMATION",noOutcomes:"Aucun résultat garanti",horizon:"HORIZON",recommendation:"RECOMMANDATION",confidence:"CONFIANCE",entry:"ENTRÉE",stop:"STOP",targets:"OBJECTIFS",trigger:"DÉCLENCHEUR",fundamentals:"FONDAMENTAUX / MACRO",technical:"CONFLUENCE TECHNIQUE",news:"ANALYSE DES ACTUALITÉS",external:"SOURCES EXTERNES",quality:"PRÉCISION / QUALITÉ DES DONNÉES",unavailable:"Indisponible",analysisUpdated:"Analyse mise à jour",liveRefreshed:"Le prix en direct est actualisé indépendamment toutes les 15 s",research:"Recherche/simulation uniquement · Le moteur ne passe pas d’ordres.",language:"LANGUE",sourceCoverage:"Couverture des sources externes en direct",forex:"Forex Factory",capitol:"Capitol Trades",sourceStatus:"État de la source"},
  de:{intelligence:"MULTI-HORIZONT TRADING-INTELLIGENZ",subtitle:"Nachrichten + Sentiment + Technik + Makro + Politik",refresh:"AKTUALISIEREN",analyzing:"ANALYSE…",live:"LIVE-MARKT",bid:"Bid",ask:"Ask",spot:"LIVE-SPOT",marketSentiment:"MARKT-SENTIMENT",newsFlow:"Nachrichtenfluss-Komposit",macro:"MAKRO / POLITIK",engine:"ENGINE-MODUS",confirmation:"BESTÄTIGUNG",noOutcomes:"Keine garantierten Ergebnisse",horizon:"HORIZONT",recommendation:"EMPFEHLUNG",confidence:"KONFIDENZ",entry:"EINSTIEG",stop:"STOPP",targets:"ZIELE",trigger:"TRIGGER",fundamentals:"FUNDAMENTAL / MAKRO",technical:"TECHNISCHE KONFLUENZ",news:"NACHRICHTENANALYSE",external:"EXTERNE QUELLEN",quality:"GENAUIGKEIT / DATENQUALITÄT",unavailable:"Nicht verfügbar",analysisUpdated:"Analyse aktualisiert",liveRefreshed:"Der Live-Preis wird unabhängig alle 15 s aktualisiert",research:"Nur Forschung/Simulation · Die Engine platziert keine Orders.",language:"SPRACHE",sourceCoverage:"Live-Abdeckung externer Quellen",forex:"Forex Factory",capitol:"Capitol Trades",sourceStatus:"Quellenstatus"},
  ja:{intelligence:"マルチホライズン取引インテリジェンス",subtitle:"ニュース + センチメント + テクニカル + マクロ + 政策",refresh:"更新",analyzing:"分析中…",live:"ライブ市場",bid:"Bid",ask:"Ask",spot:"ライブスポット",marketSentiment:"市場センチメント",newsFlow:"ニュースフロー総合",macro:"マクロ / 政策",engine:"エンジンモード",confirmation:"確認",noOutcomes:"結果は保証されません",horizon:"期間",recommendation:"推奨",confidence:"信頼度",entry:"エントリー",stop:"ストップ",targets:"ターゲット",trigger:"トリガー",fundamentals:"ファンダメンタル / マクロ",technical:"テクニカル・コンフルエンス",news:"ニュース分析",external:"外部ソース",quality:"精度 / データ品質",unavailable:"利用不可",analysisUpdated:"分析更新",liveRefreshed:"ライブ価格は15秒ごとに独立更新",research:"調査/シミュレーションのみ · 注文は実行しません。",language:"言語",sourceCoverage:"ライブ外部ソースカバレッジ",forex:"Forex Factory",capitol:"Capitol Trades",sourceStatus:"ソース状態"},
  zh:{intelligence:"多周期交易智能",subtitle:"新闻 + 情绪 + 技术 + 宏观 + 政策背景",refresh:"刷新",analyzing:"分析中…",live:"实时市场",bid:"买价",ask:"卖价",spot:"实时现货",marketSentiment:"市场情绪",newsFlow:"新闻流综合",macro:"宏观 / 政策",engine:"引擎模式",confirmation:"确认",noOutcomes:"不保证结果",horizon:"周期",recommendation:"建议",confidence:"置信度",entry:"入场",stop:"止损",targets:"目标",trigger:"触发条件",fundamentals:"基本面 / 宏观",technical:"技术共振",news:"新闻分析",external:"外部来源",quality:"准确度 / 数据质量",unavailable:"不可用",analysisUpdated:"分析更新时间",liveRefreshed:"实时价格每15秒独立刷新",research:"仅供研究/模拟 · 引擎不会下单。",language:"语言",sourceCoverage:"实时外部来源覆盖",forex:"Forex Factory",capitol:"Capitol Trades",sourceStatus:"来源状态"},
  ko:{intelligence:"멀티 호라이즌 트레이딩 인텔리전스",subtitle:"뉴스 + 심리 + 기술 + 거시 + 정책",refresh:"새로고침",analyzing:"분석 중…",live:"실시간 시장",bid:"매수",ask:"매도",spot:"실시간 현물",marketSentiment:"시장 심리",newsFlow:"뉴스 흐름 종합",macro:"거시 / 정책",engine:"엔진 모드",confirmation:"확인",noOutcomes:"결과를 보장하지 않습니다",horizon:"기간",recommendation:"추천",confidence:"신뢰도",entry:"진입",stop:"손절",targets:"목표",trigger:"트리거",fundamentals:"펀더멘털 / 거시",technical:"기술적 컨플루언스",news:"뉴스 분석",external:"외부 소스",quality:"정확도 / 데이터 품질",unavailable:"사용 불가",analysisUpdated:"분석 업데이트",liveRefreshed:"실시간 가격은 15초마다 독립적으로 갱신됩니다",research:"연구/시뮬레이션 전용 · 엔진은 주문을 실행하지 않습니다.",language:"언어",sourceCoverage:"실시간 외부 소스 범위",forex:"Forex Factory",capitol:"Capitol Trades",sourceStatus:"소스 상태"},
  ar:{intelligence:"ذكاء التداول متعدد الآفاق",subtitle:"الأخبار + المعنويات + الفنيات + الاقتصاد الكلي + السياسة",refresh:"تحديث",analyzing:"جارٍ التحليل…",live:"السوق المباشر",bid:"شراء",ask:"بيع",spot:"السعر الفوري المباشر",marketSentiment:"معنويات السوق",newsFlow:"مؤشر تدفق الأخبار",macro:"الاقتصاد الكلي / السياسة",engine:"وضع المحرك",confirmation:"تأكيد",noOutcomes:"لا توجد نتائج مضمونة",horizon:"الأفق",recommendation:"التوصية",confidence:"الثقة",entry:"الدخول",stop:"وقف الخسارة",targets:"الأهداف",trigger:"المحفز",fundamentals:"الأساسيات / الاقتصاد الكلي",technical:"التوافق الفني",news:"تحليل الأخبار",external:"المصادر الخارجية",quality:"الدقة / جودة البيانات",unavailable:"غير متاح",analysisUpdated:"تحديث التحليل",liveRefreshed:"يتم تحديث السعر المباشر بشكل مستقل كل 15 ثانية",research:"للبحث/المحاكاة فقط · المحرك لا ينفذ أوامر.",language:"اللغة",sourceCoverage:"تغطية المصادر الخارجية المباشرة",forex:"Forex Factory",capitol:"Capitol Trades",sourceStatus:"حالة المصدر"}
};

export default function MarketDecisionPanel({ symbol }: { symbol: string }){
  const [report,setReport]=useState<Report|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [liveUpdatedAt,setLiveUpdatedAt]=useState<number|null>(null);
  const { language } = useLanguage();
  const t=translations[language];
  const requestRef=useRef(0);

  async function loadAnalysis(){
    const normalized=symbol.trim().toUpperCase()||"XAUUSD";
    const id=++requestRef.current;
    setLoading(true);setError(null);
    try{
      const r=await fetch("/api/xauusd/decision?symbol="+encodeURIComponent(normalized),{cache:"no-store"});
      const b=await r.json();
      if(!r.ok)throw new Error(b.error??"Market intelligence unavailable");
      if(id===requestRef.current)setReport(b);
    }catch(e){
      if(id===requestRef.current)setError(e instanceof Error?e.message:"Market intelligence unavailable");
    }finally{
      if(id===requestRef.current)setLoading(false);
    }
  }
  async function loadLive(){
    const normalized=symbol.trim().toUpperCase()||"XAUUSD";
    try{
      const r=await fetch("/api/xauusd/live?symbol="+encodeURIComponent(normalized),{cache:"no-store"});
      const b=await r.json();
      if(!r.ok)throw new Error(b.error??"Live market unavailable");
      setReport(prev=>{
        if(!prev)return prev;
        const price=Number(b.quote?.price);
        if(!Number.isFinite(price))return prev;
        const horizons=prev.horizons.map(h=>{
          const key=h.horizon==="5 MIN"?"m15":h.horizon==="30 MIN"?"m30":h.horizon==="1 HOUR"?"h1":h.horizon==="1 WEEK"?"w1":"m1";
          const tech=prev.technicals[key];
          const atr=Math.max(Number(tech?.atr)||0,price*0.002);
          if(h.bias==="BUY"){
            return {...h,entry:price.toFixed(2)+" ± "+(atr*0.25).toFixed(2),stop:(price-atr).toFixed(2),targets:(price+atr*1.2).toFixed(2)+" / "+(price+atr*2).toFixed(2)};
          }
          if(h.bias==="SELL"){
            return {...h,entry:price.toFixed(2)+" ± "+(atr*0.25).toFixed(2),stop:(price+atr).toFixed(2),targets:(price-atr*1.2).toFixed(2)+" / "+(price-atr*2).toFixed(2)};
          }
          return {...h,entry:"No entry",stop:"—",targets:"—"};
        });
        return {...prev,quote:b.quote,horizons};
      });
      setLiveUpdatedAt(b.generatedAt);
    }catch(e){
      if(!report)setError(e instanceof Error?e.message:"Live market unavailable");
    }
  }
  useEffect(()=>{
    void loadAnalysis();
    void loadLive();
    const liveTimer=window.setInterval(()=>void loadLive(),15000);
    const analysisTimer=window.setInterval(()=>void loadAnalysis(),7000);
    return ()=>{window.clearInterval(liveTimer);window.clearInterval(analysisTimer);};
  },[symbol]);

  return <section dir={language==="ar"?"rtl":"ltr"} className="mt-4 overflow-hidden rounded border border-[#1b2532] bg-[#0b1017]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2532] px-4 py-4">
      <div>
        <div className="text-xs font-bold tracking-[.18em] text-[#5eead4]">{symbol.trim().toUpperCase()||"XAUUSD"} · {t.intelligence}</div>
        <div className="mt-1 text-lg font-semibold">{t.subtitle}</div>
      </div>
      <button onClick={()=>void loadAnalysis()} disabled={loading} className="rounded border border-[#263444] px-3 py-2 text-[10px] font-bold tracking-wider text-[#9aa8ba] hover:border-[#5eead4] hover:text-[#5eead4]">{loading?t.analyzing:t.refresh}</button>
    </div>

    {error&&<div className="m-4 rounded border border-[#5b2932] bg-[#1a1014] p-3 text-xs text-[#f08a9a]">{error}</div>}
    {loading&&!report&&<div className="p-10 text-center text-sm text-[#718096]">Building the market evidence stack…</div>}

    {report&&<div className="space-y-4 p-4">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div className="rounded border border-[#23413d] bg-[#0c1516] p-4">
          <div className="text-[10px] tracking-widest text-[#7f8da1]">{t.live}</div>
          <div className="mt-2 font-mono text-3xl font-black">{fmt(report.quote.price)}</div>
          <div className="mt-2 text-xs text-[#7f8da1]">{t.bid} {fmt(report.quote.bid)} · {t.ask} {fmt(report.quote.ask)}</div><div className="mt-1 text-[10px] text-[#5eead4]">{t.spot} · price refresh 15s · analysis refresh 7s · {symbol.trim().toUpperCase()||"XAUUSD"}</div><div className="mt-1 text-[10px] text-[#617086]">Feed {report.quote.provider??"live"} · updated {liveUpdatedAt?new Date(liveUpdatedAt).toLocaleTimeString():"—"}</div>
        </div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4"><div className="text-[10px] tracking-widest text-[#7f8da1]">{t.marketSentiment}</div><div className="mt-2 text-xl font-black">{report.marketSentiment.label}</div><div className="mt-1 text-xs text-[#7f8da1]">{t.newsFlow}: {report.marketSentiment.score > 0 ? "+" : ""}{report.marketSentiment.score}</div></div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4"><div className="text-[10px] tracking-widest text-[#7f8da1]">{t.macro}</div><div className="mt-2 text-xl font-black">{report.macro.label}</div><div className="mt-1 text-xs text-[#7f8da1]">Global macro + policy context</div></div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4"><div className="text-[10px] tracking-widest text-[#7f8da1]">{t.engine}</div><div className="mt-2 text-xl font-black text-[#f5c16c]">{t.confirmation}</div><div className="mt-1 text-xs text-[#7f8da1]">{t.noOutcomes}</div></div>
      </div>

      <div className="overflow-x-auto rounded border border-[#1b2532]">
        <table className="w-full min-w-[1050px] text-left text-xs">
          <thead className="bg-[#101722] text-[10px] tracking-widest text-[#7f8da1]"><tr><th className="p-3">{t.horizon}</th><th>{t.recommendation}</th><th>{t.confidence}</th><th>{t.entry}</th><th>{t.stop}</th><th>{t.targets}</th><th>{t.trigger}</th></tr></thead>
          <tbody>{report.horizons.map(h=><tr key={h.horizon} className="border-t border-[#1b2532]"><td className="p-3 font-bold">{h.horizon}</td><td className={h.bias==="BUY"?"text-[#5eead4]":h.bias==="SELL"?"text-[#f08a9a]":"text-[#f5c16c]"}><b>{h.bias}</b><div className="text-[10px] text-[#617086]">Score {h.score>0?"+":""}{h.score}</div></td><td>{h.confidence.toFixed(0)}%</td><td>{h.entry}</td><td>{h.stop}</td><td>{h.targets}</td><td className="max-w-[320px] pr-3 text-[#9aa8ba]">{h.trigger}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4">
          <div className="text-[10px] tracking-widest text-[#7f8da1]">{t.fundamentals}</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            {report.fundamentals.drivers.map((d)=> <div key={d.label} className="rounded border border-[#1b2532] p-2"><div className="text-[#9aa8ba]">{d.label}</div><b>{d.value?d.value.value.toFixed(2):"—"}</b><div className="text-[#617086]">{d.value?d.value.changePct.toFixed(2)+"% 5D":"—"}</div></div>)}
          </div>
          <div className="mt-3 text-[10px] leading-4 text-[#617086]">Drivers are selected for {symbol.trim().toUpperCase()||"XAUUSD"} using its asset class plus relevant market, rates, currency and volatility context.</div>
        </div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4">
          <div className="text-[10px] tracking-widest text-[#7f8da1]">{t.technical}</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            {([["M15","m15"],["30M","m30"],["1H","h1"],["1W","w1"],["1M","m1"]] as const).map(([label,key])=>{const x=report.technicals[key];return <div key={key} className="rounded border border-[#1b2532] p-3"><div className="font-bold">{label}</div><div className="mt-1 text-[#9aa8ba]">EMA {x.score>0?"bullish":"bearish"} · RSI {fmt(x.rsi)}</div><div className="text-[#617086]">S {fmt(x.support)} · R {fmt(x.resistance)}</div></div>})}
          </div>
        </div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4">
          <div className="text-[10px] tracking-widest text-[#7f8da1]">{t.news}</div>
          <div className="mt-3 space-y-2">{report.news.length?report.news.slice(0,5).map((n,i)=><div key={i} className="border-b border-[#1b2532] pb-2 text-xs"><div>{n.title}</div><div className="mt-1 text-[10px] text-[#617086]">{n.sentiment.toUpperCase()} · {n.publishedAt}</div></div>):<div className="text-xs text-[#617086]">No recent headlines returned.</div>}</div>
        </div>
        <div className="rounded border border-[#1b2532] bg-[#101722] p-4">
          <div className="text-[10px] tracking-widest text-[#7f8da1]">EXTERNAL SOURCES</div>
          <div className="mt-3 space-y-3 text-xs">
            <div><b>Forex Factory</b><div className="mt-1 text-[#9aa8ba]">{report.sources.forexFactory.available?report.sources.forexFactory.headline:"Unavailable"}</div></div>
            <div><b>Capitol Trades</b><div className="mt-1 text-[#9aa8ba]">{report.sources.capitolTrades.available?report.sources.capitolTrades.headline:"Unavailable"}</div></div>
          </div>
        </div>
      </div>

      <div className="rounded border border-[#263444] bg-[#0c1118] p-4">
        <div className="text-[10px] tracking-widest text-[#f5c16c]">{t.quality}</div>
        <div className="mt-2 grid gap-2 text-xs text-[#9aa8ba] md:grid-cols-3">{report.warnings.map((w,i)=><div key={i}>• {w}</div>)}</div>
      </div>
      <div className="text-[10px] text-[#617086]">{t.analysisUpdated} {new Date(report.generatedAt).toLocaleTimeString()} · {t.liveRefreshed} · {t.research}</div>
    </div>}
  </section>;
}
