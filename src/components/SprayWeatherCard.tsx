"use client";

import { useState, useEffect } from "react";
import {
  CloudRain,
  Wind,
  Sun,
  MapPin,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Thermometer,
  Calendar,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  WeatherData,
  fetchWeatherByCoords,
  searchCityAndFetchWeather,
} from "@/lib/weather";

const STORAGE_KEY = "cropscan_weather_data";

export default function SprayWeatherCard() {
  const { language, t } = useLanguage();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cityInput, setCityInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // Load cached weather on initial mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.daily) && parsed.daily.length > 0) {
            setWeather(parsed);
          }
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const saveWeatherToSession = (data: WeatherData) => {
    setWeather(data);
    setErrorMsg(null);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // ignore
      }
    }
  };

  const handleRequestLocation = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setShowManualInput(true);
      setErrorMsg(t("weather_loc_denied"));
      return;
    }

    setLocating(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          setLoading(true);
          const data = await fetchWeatherByCoords(
            pos.coords.latitude,
            pos.coords.longitude
          );
          saveWeatherToSession(data);
        } catch (err) {
          console.error("Failed to fetch weather by location:", err);
          setShowManualInput(true);
          setErrorMsg(t("weather_loc_denied"));
        } finally {
          setLoading(false);
          setLocating(false);
        }
      },
      (err) => {
        console.warn("Geolocation permission error:", err.message);
        setLocating(false);
        setShowManualInput(true);
        setErrorMsg(t("weather_loc_denied"));
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleCitySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = cityInput.trim();
    if (!query) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await searchCityAndFetchWeather(query);
      saveWeatherToSession(data);
      setCityInput("");
      setShowManualInput(false);
    } catch (err: unknown) {
      console.warn("City search error:", err);
      setErrorMsg(t("weather_city_not_found"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetLocation = () => {
    setShowManualInput(true);
    setCityInput("");
    setErrorMsg(null);
  };

  const getDayLabel = (idx: number) => {
    if (idx === 0) return t("weather_day_today");
    if (idx === 1) return t("weather_day_tomorrow");
    if (idx === 2) return t("weather_day_after");
    return "";
  };

  return (
    <div className="bg-white rounded-[6px] p-5 border border-[#2B2118]/25 space-y-4 text-left">
      {/* Header (No icon next to heading) */}
      <div className="border-b border-[#2B2118]/15 pb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-lg font-bold text-[#2B2118]">
          {t("weather_card_title")}
        </h3>

        {weather && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#2B2118]/70 max-w-[150px] truncate" title={weather.locationName}>
              {weather.locationName}
            </span>
            <button
              type="button"
              onClick={handleResetLocation}
              className="text-[11px] font-bold text-[#2F5D3A] hover:underline cursor-pointer"
            >
              {t("weather_change_loc")}
            </button>
          </div>
        )}
      </div>

      {/* Permission / Location Prompt (Shown if weather not yet loaded) */}
      {!weather && (
        <div className="space-y-4 pt-1">
          <p className="text-sm text-[#2B2118]/85 leading-relaxed">
            {t("weather_card_desc")}
          </p>

          {!showManualInput ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleRequestLocation}
                disabled={locating || loading}
                className="w-full min-h-[48px] h-12 flex items-center justify-center gap-2.5 bg-transparent hover:bg-[#2B2118]/5 text-[#2B2118] border border-[#2B2118]/25 font-bold text-base px-6 rounded-[6px] transition-colors cursor-pointer disabled:opacity-60"
              >
                {locating || loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t("weather_loading")}</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-5 h-5" />
                    <span>{t("weather_btn_location")}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowManualInput(true)}
                className="text-xs font-bold text-[#2B2118]/70 hover:text-[#2B2118] text-center underline cursor-pointer py-1"
              >
                {t("weather_btn_manual")} &rarr;
              </button>
            </div>
          ) : (
            /* City input form if permission denied or manual choice */
            <form onSubmit={handleCitySearch} className="space-y-3">
              {errorMsg && (
                <p className="text-xs font-bold text-[#B5412F] leading-tight">
                  {errorMsg}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder={t("weather_search_placeholder")}
                  disabled={loading}
                  className="flex-1 bg-transparent hover:bg-white focus:bg-white text-[#2B2118] text-sm py-2.5 px-3 rounded-[6px] border border-[#2B2118]/25 focus:border-[#2F5D3A] outline-hidden min-h-[44px]"
                />
                <button
                  type="submit"
                  disabled={loading || !cityInput.trim()}
                  className="min-h-[44px] px-5 bg-transparent hover:bg-[#2B2118]/5 text-[#2B2118] border border-[#2B2118]/25 font-bold text-sm rounded-[6px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>{t("weather_btn_search")}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Weather & Spray Advice Output */}
      {weather && (
        <div className="space-y-4">
          {/* Manual Location Switch Form if opened */}
          {showManualInput && (
            <form onSubmit={handleCitySearch} className="bg-[#FAF6EF] p-3 rounded-[8px] border border-[#2B2118]/15 space-y-2">
              <label className="block text-xs font-bold text-[#2B2118]">
                {t("weather_btn_manual")}:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder={t("weather_search_placeholder")}
                  disabled={loading}
                  className="flex-1 bg-white text-[#2B2118] text-xs py-2 px-3 rounded-[6px] border border-[#2B2118]/25 outline-hidden min-h-[40px]"
                />
                <button
                  type="submit"
                  disabled={loading || !cityInput.trim()}
                  className="min-h-[40px] px-4 bg-transparent hover:bg-[#2B2118]/5 text-[#2B2118] border border-[#2B2118]/25 font-bold text-xs rounded-[6px] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>{t("weather_btn_search")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualInput(false)}
                  className="min-h-[40px] px-3 text-xs text-[#2B2118]/70 hover:text-[#2B2118]"
                >
                  {language === "en" ? "Cancel" : "रद्द करें"}
                </button>
              </div>
              {errorMsg && (
                <p className="text-[11px] font-bold text-[#B5412F]">{errorMsg}</p>
              )}
            </form>
          )}

          {/* SPRAY ADVICE STATE CARD (State card: disease / warning / good) */}
          {weather.sprayAdvice.status === "rain" ? (
            /* Rain Alert: High rain probability > 50% */
            <div className="bg-[#B5412F]/10 border border-[#B5412F]/40 text-[#B5412F] rounded-[6px] p-4 flex items-start gap-3 text-left">
              <CloudRain className="w-5 h-5 shrink-0 mt-0.5 text-[#B5412F]" />
              <div className="space-y-1">
                <p className="font-heading font-bold text-base leading-snug">
                  {t("weather_advice_rain")}
                </p>
                <p className="text-xs text-[#2B2118]/85 leading-relaxed">
                  {t("weather_advice_rain_sub")}
                </p>
                <div className="pt-1 flex items-center gap-2 text-xs font-bold text-[#B5412F]">
                  <span>{t("weather_rain")}: {weather.sprayAdvice.rainChance}%</span>
                  <span>&middot;</span>
                  <span>{t("weather_wind")}: {weather.sprayAdvice.windSpeed} km/h</span>
                </div>
              </div>
            </div>
          ) : weather.sprayAdvice.status === "wind" ? (
            /* High Wind Alert > 15 km/h */
            <div className="bg-[#E0A526]/15 border border-[#E0A526]/50 text-[#2B2118] rounded-[6px] p-4 flex items-start gap-3 text-left">
              <Wind className="w-5 h-5 shrink-0 mt-0.5 text-[#E0A526]" />
              <div className="space-y-1">
                <p className="font-heading font-bold text-base text-[#2B2118] leading-snug">
                  {t("weather_advice_wind")}
                </p>
                <p className="text-xs text-[#2B2118]/85 leading-relaxed">
                  {t("weather_advice_wind_sub")}
                </p>
                <div className="pt-1 flex items-center gap-2 text-xs font-bold text-[#2B2118]/80">
                  <span>{t("weather_wind")}: {weather.sprayAdvice.windSpeed} km/h</span>
                  <span>&middot;</span>
                  <span>{t("weather_rain")}: {weather.sprayAdvice.rainChance}%</span>
                </div>
              </div>
            </div>
          ) : (
            /* Optimal Spraying Conditions */
            <div className="bg-[#2F5D3A]/10 border border-[#2F5D3A]/30 text-[#2F5D3A] rounded-[6px] p-4 flex items-start gap-3 text-left">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-[#2F5D3A]" />
              <div className="space-y-1">
                <p className="font-heading font-bold text-base leading-snug">
                  {t("weather_advice_good")}
                </p>
                <p className="text-xs text-[#2B2118]/85 leading-relaxed">
                  {t("weather_advice_good_sub")}
                </p>
                <div className="pt-1 flex items-center gap-2 text-xs font-bold text-[#2F5D3A]">
                  <span>{t("weather_rain")}: {weather.sprayAdvice.rainChance}%</span>
                  <span>&middot;</span>
                  <span>{t("weather_wind")}: {weather.sprayAdvice.windSpeed} km/h</span>
                </div>
              </div>
            </div>
          )}

          {/* 3-DAY WEATHER FORECAST GRID */}
          <div className="space-y-2 pt-1 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2B2118]/70">
              {t("weather_forecast_3days")}
            </span>

            <div className="grid grid-cols-3 gap-2">
              {weather.daily.map((day, idx) => (
                <div
                  key={day.date}
                  className="p-2 sm:p-3 rounded-[6px] border border-[#2B2118]/20 bg-white text-left flex flex-col gap-1.5 min-w-0"
                >
                  <div className="flex items-center justify-between border-b border-[#2B2118]/10 pb-1">
                    <span className="font-heading font-bold text-xs text-[#2B2118] truncate">
                      {getDayLabel(idx)}
                    </span>
                    <span className="text-[10px] text-[#2B2118]/60 font-semibold hidden xs:inline">
                      {day.date.slice(5)}
                    </span>
                  </div>

                  {/* Temperature */}
                  <div className="text-[11px] sm:text-xs text-[#2B2118] font-bold">
                    <span>{day.tempMin}° - {day.tempMax}°</span>
                  </div>

                  {/* Rain Probability */}
                  <div
                    className={`text-[11px] sm:text-xs font-bold ${day.rainProbMax > 50 ? "text-[#B5412F]" : "text-[#2B2118]/80"
                      }`}
                  >
                    <span>{day.rainProbMax}% rain</span>
                  </div>

                  {/* Wind Speed */}
                  <div className="text-[10px] sm:text-[11px] text-[#2B2118]/75">
                    <span>{day.windSpeedMax} km/h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

