import { useEffect, useRef, useState } from "react";
import XauusdDecisionPanel from "./xauusd-decision-panel";
import { LanguageProvider, languages, useLanguage, type Language } from "./language-context";

const pageText: Record<Language,{search:string;description:string;button:string;placeholder:string;language:string}> = {
  en:{search:"MARKET SYMBOL SEARCH",description:"Search a market symbol here to load its analysis. Stocks, forex pairs, crypto, indices and commodities are supported when market data is available.",button:"SEARCH",placeholder:"AAPL, VEDL, EURUSD, BTCUSD, XAUUSD...",language:"LANGUAGE"},
  hi:{search:"मार्केट सिंबल सर्च",description:"यहाँ मार्केट सिंबल खोजें और उसका विश्लेषण लोड करें। उपलब्ध मार्केट डेटा के अनुसार स्टॉक, फॉरेक्स, क्रिप्टो, इंडेक्स और कमोडिटी समर्थित हैं।",button:"खोजें",placeholder:"AAPL, VEDL, EURUSD, BTCUSD, XAUUSD...",language:"भाषा"},
  mr:{search:"मार्केट सिंबल शोध",description:"येथे मार्केट सिंबल शोधा आणि त्याचे विश्लेषण लोड करा. उपलब्ध मार्केट डेटानुसार स्टॉक, फॉरेक्स, क्रिप्टो, इंडेक्स आणि कमोडिटी समर्थित आहेत.",button:"शोधा",placeholder:"AAPL, VEDL, EURUSD, BTCUSD, XAUUSD...",language:"भाषा"},
  es:{search:"BÚSQUEDA DE SÍMBOLOS",description:"Busca un símbolo de mercado aquí para cargar su análisis. Se admiten acciones, forex, cripto, índices y materias primas cuando hay datos disponibles.",button:"BUSCAR",placeholder:"AAPL, VEDL, EURUSD, BTCUSD, XAUUSD...",language:"IDIOMA"},
  fr:{search:"RECHERCHE DE SYMBOLES",description:"Recherchez un symbole de marché pour charger son analyse. Actions, forex, crypto, indices et matières premières sont pris en charge lorsque les données sont disponibles.",button:"RECHERCHER",placeholder:"AAPL, VEDL, EURUSD, BTCUSD, XAUUSD...",language:"LANGUE"},
  de:{search:"MARKT-SYMBOLSUCHE",description:"Suchen Sie ein Marktsymbol, um dessen Analyse zu laden. Aktien, Forex, Krypto, Indizes und Rohstoffe werden unterstützt, wenn Marktdaten verfügbar sind.",button:"SUCHEN",placeholder:"AAPL, VEDL, EURUSD, BTCUSD, XAUUSD...",language:"SPRACHE"},
  ja:{search:"マーケットシンボル検索",description:"マーケットシンボルを検索して分析を読み込みます。データが利用可能な株式、FX、暗号資産、指数、商品に対応しています。",button:"検索",placeholder:"AAPL, VEDL, EURUSD, BTCUSD, XAUUSD...",language:"言語"},
  zh:{search:"市场品种搜索",description:"搜索市场品种并加载分析。只要有市场数据，即可支持股票、外汇、加密资产、指数和商品。",button:"搜索",placeholder:"AAPL, VEDL, EURUSD, BTCUSD, XAUUSD...",language:"语言"},
  ko:{search:"시장 심볼 검색",description:"시장 심볼을 검색해 분석을 불러옵니다. 시장 데이터가 제공되는 주식, 외환, 암호화폐, 지수 및 상품을 지원합니다.",button:"검색",placeholder:"AAPL, VEDL, EURUSD, BTCUSD, XAUUSD...",language:"언어"},
  ar:{search:"بحث رمز السوق",description:"ابحث عن رمز سوق لتحميل تحليله. يتم دعم الأسهم والفوركس والعملات المشفرة والمؤشرات والسلع عند توفر بيانات السوق.",button:"بحث",placeholder:"AAPL, VEDL, EURUSD, BTCUSD, XAUUSD...",language:"اللغة"}
};

function HomeContent() {
  const [symbol, setSymbol] = useState("XAUUSD");
  const [searchInput, setSearchInput] = useState("XAUUSD");
  const [suggestions, setSuggestions] = useState<Array<{symbol:string;name:string;exchange:string;type:string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{ const q=searchInput.trim(); if(!q){setSuggestions([]);return;} const timer=setTimeout(async()=>{try{const r=await fetch(`/api/symbols?q=${encodeURIComponent(q)}`);const data=await r.json();setSuggestions(data.results??[]);}catch{setSuggestions([]);}},220); return()=>clearTimeout(timer); },[searchInput]);
  useEffect(()=>{ const close=(e:MouseEvent)=>{if(searchBoxRef.current&&!searchBoxRef.current.contains(e.target as Node))setShowSuggestions(false)}; document.addEventListener("mousedown",close); return()=>document.removeEventListener("mousedown",close); },[]);
  const selectSymbol=(value:string)=>{setSearchInput(value);setSymbol(value);setShowSuggestions(false);};
  const {language,setLanguage}=useLanguage();
  const t=pageText[language];
  const normalizeSymbol=(input:string)=>{
    const raw=input.trim().toUpperCase();
    if(!raw)return "XAUUSD";
    if(raw.includes(":"))return raw;
    const aliases:Record<string,string>={
      APPLE:"AAPL",MICROSOFT:"MSFT",TESLA:"TSLA",NVIDIA:"NVDA",GOOGLE:"GOOGL",AMAZON:"AMZN",META:"META",
      VEDL:"VEDL.NS",EURUSD:"EURUSD=X",GBPUSD:"GBPUSD=X",USDJPY:"USDJPY=X",USDINR:"USDINR=X",BTCUSD:"BTC-USD",ETHUSD:"ETH-USD",XRPUSD:"XRP-USD",SOLUSD:"SOL-USD"
    };
    const resolved=aliases[raw]??raw;
    const fx=["EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","USDCAD","NZDUSD","EURGBP","EURJPY","GBPJPY","AUDJPY"];
    if(fx.includes(resolved))return "OANDA:"+resolved;
    if(["XAUUSD","XAGUSD"].includes(resolved))return "OANDA:"+resolved;
    if(["BTCUSD","ETHUSD"].includes(resolved))return "COINBASE:"+resolved;
    if(resolved.startsWith("NSE:"))return resolved;
    return "NASDAQ:"+resolved;
  };
  return (
    <main dir={language==="ar"?"rtl":"ltr"} className="min-h-screen bg-[#070b10] p-3 md:p-5">
      <div className="mx-auto max-w-[1700px]">
        <div className="mt-4 rounded border border-[#1b2532] bg-[#0c1118] p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="text-[10px] font-bold tracking-[0.16em] text-[#5eead4]">{t.search}</div><div className="mt-1 text-xs text-[#7f8da1]">{t.description}</div></div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[10px] font-bold tracking-wider text-[#7f8da1]">{t.language}</label>
              <select value={language} onChange={e=>setLanguage(e.target.value as Language)} aria-label={t.language} className="rounded border border-[#263444] bg-[#080d13] px-3 py-2 text-xs text-[#e5edf5] outline-none focus:border-[#5eead4]">
                {languages.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
              <form className="relative flex w-full max-w-md gap-2" onSubmit={(event)=>{event.preventDefault();const value=new FormData(event.currentTarget).get("symbol");if(typeof value==="string"&&value.trim()){selectSymbol(normalizeSymbol(value));}}} ref={searchBoxRef}>
                <input name="symbol" aria-label="Search market symbol" value={searchInput} autoComplete="off" onFocus={()=>setShowSuggestions(true)} onChange={e=>{setSearchInput(e.target.value);setShowSuggestions(true)}} placeholder={t.placeholder} className="min-w-0 flex-1 rounded border border-[#263444] bg-[#080d13] px-3 py-2 text-sm font-mono text-[#e5edf5] outline-none placeholder:text-[#536174] focus:border-[#5eead4]" />
                <button type="submit" className="rounded border border-[#23413d] bg-[#0c1516] px-4 py-2 text-[10px] font-bold tracking-wider text-[#5eead4] hover:border-[#5eead4]">{t.button}</button>
                {showSuggestions && suggestions.length>0 && <div className="absolute left-0 right-[72px] top-full z-50 mt-1 max-h-80 overflow-auto rounded border border-[#263444] bg-[#0a1017] shadow-2xl">
                  {suggestions.map(item=><button type="button" key={item.symbol+"-"+item.exchange} onClick={()=>selectSymbol(item.symbol)} className="flex w-full items-center justify-between gap-3 border-b border-[#182330] px-3 py-2 text-left hover:bg-[#111b25]">
                    <span className="min-w-0"><span className="block truncate text-xs font-bold font-mono text-[#e5edf5]">{item.symbol}</span><span className="block truncate text-[10px] text-[#7f8da1]">{item.name}</span></span><span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-[#5eead4]">{item.exchange} · {item.type}</span>
                  </button>)}
                </div>}
              </form>
            </div>
          </div>
        </div>
        <XauusdDecisionPanel symbol={symbol} />
      </div>
    </main>
  );
}
export default function Home(){ return <LanguageProvider><HomeContent /></LanguageProvider>; }
