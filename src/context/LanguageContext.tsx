"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { LanguageCode, LANGUAGES, LanguageOption, getTranslation } from "@/lib/translations";

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  currentLanguage: LanguageOption;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "cropscan_language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("hi");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode;
        if (saved && LANGUAGES.some((l) => l.code === saved)) {
          setLanguageState(saved);
        }
      } catch (err) {
        console.error("Failed to load language from localStorage:", err);
      }
    }
  }, []);

  const setLanguage = (newLang: LanguageCode) => {
    setLanguageState(newLang);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, newLang);
      } catch (err) {
        console.error("Failed to save language to localStorage:", err);
      }
    }
  };

  const currentLanguage =
    LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const t = (key: string) => getTranslation(language, key);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        currentLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

