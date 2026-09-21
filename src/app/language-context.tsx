"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Language = "en"|"hi"|"mr"|"es"|"fr"|"de"|"ja"|"zh"|"ko"|"ar";

export const languages: {code: Language; label: string}[] = [
  {code:"en",label:"English"},{code:"hi",label:"हिन्दी"},{code:"mr",label:"मराठी"},
  {code:"es",label:"Español"},{code:"fr",label:"Français"},{code:"de",label:"Deutsch"},
  {code:"ja",label:"日本語"},{code:"zh",label:"中文"},{code:"ko",label:"한국어"},{code:"ar",label:"العربية"}
];

const LanguageContext=createContext<{language:Language;setLanguage:(language:Language)=>void}>({language:"en",setLanguage:()=>{}});

export function LanguageProvider({children}:{children:ReactNode}){
  const [language,setLanguageState]=useState<Language>("en");
  useEffect(()=>{
    const saved=window.localStorage.getItem("tradebox-language") as Language|null;
    if(saved && languages.some(x=>x.code===saved)) setLanguageState(saved);
  },[]);
  const setLanguage=(next:Language)=>{
    setLanguageState(next);
    window.localStorage.setItem("tradebox-language",next);
  };
  return <LanguageContext.Provider value={{language,setLanguage}}>{children}</LanguageContext.Provider>;
}
export function useLanguage(){ return useContext(LanguageContext); }
