"use client";

import { useState } from "react";
import TradingViewXauusdChart from "./tradingview-xauusd-chart";
import XauusdDecisionPanel from "./xauusd-decision-panel";
import { LanguageProvider, languages, useLanguage, type Language } from "./language-context";

const pageText: Record<Language,{search:string;description:string;button:string;placeholder:string;language:string}> = {
  en:{search:"MARKET SEARCH",description:"Search a symbol here to keep the TradingView chart and intelligence panel synchronized.",button:"SEARCH",placeholder:"XAUUSD, EURUSD, AAPL...",language:"LANGUAGE"},
  hi:{search:"मार्केट सर्च",description:"TradingView चार्ट और इंटेलिजेंस पैनल को सिंक्रोनाइज़ रखने के लिए यहाँ सिंबल खोजें।",button:"खोजें",placeholder:"XAUUSD, EURUSD, AAPL...",language:"भाषा"},
  mr:{search:"मार्केट शोध",description:"TradingView चार्ट आणि इंटेलिजन्स पॅनेल समक्रमित ठेवण्यासाठी येथे सिंबल शोधा.",button:"शोधा",placeholder:"XAUUSD, EURUSD, AAPL...",language:"भाषा"},
  es:{search:"BÚSQUEDA DE MERCADO",description:"Busca un símbolo aquí para mantener sincronizados el gráfico de TradingView y el panel de inteligencia.",button:"BUSCAR",placeholder:"XAUUSD, EURUSD, AAPL...",language:"IDIOMA"},
  fr:{search:"RECHERCHE DE MARCHÉ",description:"Recherchez un symbole ici pour synchroniser le graphique TradingView et le panneau d’intelligence.",button:"RECHERCHER",placeholder:"XAUUSD, EURUSD, AAPL...",language:"LANGUE"},
  de:{search:"MARKTSUCHE",description:"Suchen Sie hier nach einem Symbol, um TradingView-Chart und Intelligence-Panel zu synchronisieren.",button:"SUCHEN",placeholder:"XAUUSD, EURUSD, AAPL...",language:"SPRACHE"},
  ja:{search:"マーケット検索",description:"ここでシンボルを検索すると、TradingViewチャートとインテリジェンスパネルが同期します。",button:"検索",placeholder:"XAUUSD, EURUSD, AAPL...",language:"言語"},
  zh:{search:"市场搜索",description:"在此搜索交易品种，以保持 TradingView 图表与智能面板同步。",button:"搜索",placeholder:"XAUUSD, EURUSD, AAPL...",language:"语言"},
  ko:{search:"시장 검색",description:"여기에서 심볼을 검색하면 TradingView 차트와 인텔리전스 패널이 동기화됩니다.",button:"검색",placeholder:"XAUUSD, EURUSD, AAPL...",language:"언어"},
  ar:{search:"بحث السوق",description:"ابحث عن رمز هنا للحفاظ على مزامنة مخطط TradingView ولوحة المعلومات.",button:"بحث",placeholder:"XAUUSD, EURUSD, AAPL...",language:"اللغة"}
};

function HomeContent() {
  const [symbol, setSymbol] = useState("XAUUSD");
  const {language,setLanguage}=useLanguage();
  const t=pageText[language];
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
              <form className="flex w-full max-w-md gap-2" onSubmit={(event)=>{event.preventDefault();const value=new FormData(event.currentTarget).get("symbol");if(typeof value==="string"&&value.trim())setSymbol(value.trim().toUpperCase());}}>
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
