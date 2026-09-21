"use client";

import { useState } from "react";
import TradingViewXauusdChart from "./tradingview-xauusd-chart";
import XauusdDecisionPanel from "./xauusd-decision-panel";
import { LanguageProvider, languages, useLanguage, type Language } from "./language-context";

const pageText: Record<Language,{search:string;description:string;button:string;placeholder:string;language:string}> = {
  en:{search:"MARKET SYMBOL SEARCH",description:"Search a symbol here to load it directly into the TradingView chart. The chart also has its own full symbol search for stocks, forex pairs, crypto, indices and commodities.",button:"SEARCH",placeholder:"AAPL, EURUSD, BTCUSD, XAUUSD...",language:"LANGUAGE"},
  hi:{search:"ट्रेडिंगव्यू सिंबल सर्च",description:"यहाँ सिंबल खोजें और उसे सीधे TradingView चार्ट में लोड करें। चार्ट का अपना पूरा सिंबल सर्च भी उपलब्ध है।",button:"खोजें",placeholder:"AAPL, EURUSD, BTCUSD, XAUUSD...",language:"भाषा"},
  mr:{search:"ट्रेडिंगव्यू सिंबल शोध",description:"येथे सिंबल शोधा आणि तो थेट TradingView चार्टमध्ये लोड करा. चार्टमध्ये पूर्ण सिंबल शोध देखील उपलब्ध आहे.",button:"शोधा",placeholder:"AAPL, EURUSD, BTCUSD, XAUUSD...",language:"भाषा"},
  es:{search:"BÚSQUEDA DE SÍMBOLOS TRADINGVIEW",description:"Busca un símbolo aquí para cargarlo directamente en el gráfico de TradingView. El gráfico también incluye su propio buscador completo.",button:"BUSCAR",placeholder:"AAPL, EURUSD, BTCUSD, XAUUSD...",language:"IDIOMA"},
  fr:{search:"RECHERCHE DE SYMBOLES TRADINGVIEW",description:"Recherchez un symbole ici pour le charger directement dans le graphique TradingView. Le graphique dispose aussi de sa propre recherche complète.",button:"RECHERCHER",placeholder:"AAPL, EURUSD, BTCUSD, XAUUSD...",language:"LANGUE"},
  de:{search:"TRADINGVIEW-SYMBOLSUCHE",description:"Suchen Sie hier ein Symbol und laden Sie es direkt in den TradingView-Chart. Der Chart verfügt auch über eine vollständige eigene Symbols­uche.",button:"SUCHEN",placeholder:"AAPL, EURUSD, BTCUSD, XAUUSD...",language:"SPRACHE"},
  ja:{search:"TRADINGVIEW シンボル検索",description:"ここでシンボルを検索すると、TradingViewチャートに直接読み込まれます。チャート内にも完全なシンボル検索があります。",button:"検索",placeholder:"AAPL, EURUSD, BTCUSD, XAUUSD...",language:"言語"},
  zh:{search:"TRADINGVIEW 品种搜索",description:"在这里搜索品种并直接加载到 TradingView 图表。图表本身也提供完整的品种搜索。",button:"搜索",placeholder:"AAPL, EURUSD, BTCUSD, XAUUSD...",language:"语言"},
  ko:{search:"TRADINGVIEW 심볼 검색",description:"여기에서 심볼을 검색하면 TradingView 차트에 직접 로드됩니다. 차트 자체에도 전체 심볼 검색 기능이 있습니다.",button:"검색",placeholder:"AAPL, EURUSD, BTCUSD, XAUUSD...",language:"언어"},
  ar:{search:"بحث السوق",description:"ابحث عن رمز هنا للحفاظ على مزامنة مخطط TradingView ولوحة المعلومات.",button:"بحث",placeholder:"XAUUSD, EURUSD, AAPL...",language:"اللغة"}
};

function HomeContent() {
  const [symbol, setSymbol] = useState("XAUUSD");
  const {language,setLanguage}=useLanguage();
  const t=pageText[language];
  const normalizeSymbol=(input:string)=>{const raw=input.trim().toUpperCase();if(!raw)return "OANDA:XAUUSD";if(raw.includes(":"))return raw;const aliases:Record<string,string>={APPLE:"AAPL",MICROSOFT:"MSFT",TESLA:"TSLA",NVIDIA:"NVDA",GOOGLE:"GOOGL",AMAZON:"AMZN",META:"META"};const resolved=aliases[raw]??raw;const fx=["EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","USDCAD","NZDUSD","EURGBP","EURJPY","GBPJPY","AUDJPY"];if(fx.includes(resolved))return "OANDA:"+resolved;if(["XAUUSD","XAGUSD"].includes(resolved))return "OANDA:"+resolved;if(["BTCUSD","ETHUSD"].includes(resolved))return "COINBASE:"+resolved;return "NASDAQ:"+resolved;};
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
              <form className="flex w-full max-w-md gap-2" onSubmit={(event)=>{event.preventDefault();const value=new FormData(event.currentTarget).get("symbol");if(typeof value==="string"&&value.trim())setSymbol(normalizeSymbol(value));}}>
                <input name="symbol" aria-label="Search market symbol" defaultValue="XAUUSD" placeholder={t.placeholder} className="min-w-0 flex-1 rounded border border-[#263444] bg-[#080d13] px-3 py-2 text-sm font-mono text-[#e5edf5] outline-none placeholder:text-[#536174] focus:border-[#5eead4]" />
                <button type="submit" className="rounded border border-[#23413d] bg-[#0c1516] px-4 py-2 text-[10px] font-bold tracking-wider text-[#5eead4] hover:border-[#5eead4]">{t.button}</button>
              </form>
            </div>
          </div>
        </div>
        <TradingViewXauusdChart symbol={symbol} />
        <XauusdDecisionPanel symbol={symbol} />
      </div>
    </main>
  );
}
export default function Home(){ return <LanguageProvider><HomeContent /></LanguageProvider>; }
