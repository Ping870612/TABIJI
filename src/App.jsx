import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Calendar,
  CreditCard,
  Car,
  Plus,
  Trash2,
  LogOut,
  Navigation,
  CheckCircle,
  Copy,
  FileSpreadsheet,
  Image as ImageIcon,
  Download,
  Edit,
  Sparkles,
  Loader2,
  Utensils,
  Camera,
  Train,
  CloudSun,
  BookOpen,
  Info,
  ChevronRight,
  Sun,
  CloudRain,
  Wind,
  Map,
  Search,
  History,
  Plane,
  XCircle,
  ArrowRight,
  Share2,
  Users,
  User,
  FileText,
  Upload,
  X,
  Calculator,
  Route,
  CheckSquare,
  Square,
  AlertTriangle,
  Home,
  ShoppingBag,
  MoreHorizontal,
  ArrowRightLeft,
} from "lucide-react";

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  getDoc,
  collection,
  deleteDoc,
} from "firebase/firestore";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyBCfZdkNZMyoutYmUUQw7D0qmxXDDsMA9U",
  authDomain: "test-5523e.firebaseapp.com",
  projectId: "test-5523e",
  storageBucket: "test-5523e.firebasestorage.app",
  messagingSenderId: "796089891248",
  appId: "1:796089891248:web:dffeabad1c216aa935be75",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== "undefined" ? __app_id : "travel-app-sandbox-v1";

// --- AI Functions ---
async function callGeminiAPI(parts) {
  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parts }),
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "";
  }
}

async function callImagenAPI(imagePrompt) {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || firebaseConfig.apiKey;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: imagePrompt }],
        parameters: { sampleCount: 1, aspectRatio: "3:4", personGeneration: "allow_adult" },
      }),
    });
    const data = await response.json();
    const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
    return base64Image ? `data:image/png;base64,${base64Image}` : null;
  } catch (error) {
    return null;
  }
}

// --- UI Components ---
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-xl flex items-center gap-3 text-white text-sm font-medium z-[100] animate-in fade-in slide-in-from-top-5 duration-300 ${type === "error" ? "bg-red-500" : "bg-stone-800"}`}>
      {type === "error" ? <Info size={16} /> : <CheckCircle size={16} />} {message}
    </div>
  );
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "確認", cancelText = "取消", isDangerous = false }) => {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-[60] bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-[#FDFCF8] w-full max-w-xs rounded-2xl p-6 shadow-2xl border border-stone-100">
        <h3 className="text-lg font-bold mb-2 text-stone-800">{title}</h3>
        <p className="text-stone-500 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-600 text-sm">{cancelText}</button>
          <button onClick={onConfirm} className={`flex-1 py-3 rounded-xl text-white text-sm shadow-md ${isDangerous ? "bg-red-500" : "bg-stone-800"}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

const UserBadge = ({ nickname, emoji, color, size = "sm" }) => {
  const sizeClass = size === "sm" ? "w-6 h-6 text-xs" : "w-10 h-10 text-lg";
  return (
    <div className={`${sizeClass} rounded-full ${emoji ? "bg-stone-100" : (color || "bg-stone-200")} text-stone-800 flex items-center justify-center font-bold shadow-sm border border-white ring-2 ring-white`} title={nickname}>
      {emoji || (nickname ? nickname[0].toUpperCase() : "?")}
    </div>
  );
};

const WeatherBadge = ({ date, weatherData }) => {
  if (!date || !weatherData || !weatherData[date]) return null;
  const info = weatherData[date];
  let Icon = Sun;
  if (info.condition.includes("雨")) Icon = CloudRain;
  else if (info.condition.includes("雲")) Icon = CloudSun;
  return (
    <div className="flex items-center gap-2 text-xs text-stone-500 bg-white/50 px-3 py-1.5 rounded-full border border-stone-100 backdrop-blur-sm">
      <Icon size={14} className="text-orange-400" />
      <span>{info.temp} {info.condition}</span>
    </div>
  );
};

const DayNavigation = ({ days, tripData, onScrollToDay }) => {
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return (
    <div className="sticky top-0 z-50 bg-[#FDFCF8]/60 backdrop-blur-md pb-4 pt-2 px-4 -mx-4 mb-4 border-b border-stone-100/50 shadow-sm">
      <div className="flex gap-3 overflow-x-auto py-2 custom-scrollbar justify-start md:justify-center">
        {days.map((day) => {
          const baseDate = new Date(tripData.startDate);
          baseDate.setHours(12, 0, 0, 0); // 避免時區跳日
          const dateObj = new Date(baseDate);
          dateObj.setDate(dateObj.getDate() + (parseInt(day) - 1));
          
          const formattedDate = dateObj.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
          const dayOfWeek = weekdays[dateObj.getDay()];
          const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
          const weather = tripData.weather?.[dateKey];

          return (
            <button key={day} onClick={() => onScrollToDay(day)} className="flex-shrink-0 w-24 bg-white/80 border border-stone-100 rounded-2xl p-3 shadow-sm active:scale-95 text-left group hover:border-stone-400 transition-all">
              <div className="text-[10px] text-stone-400 font-bold mb-1">{formattedDate} ({dayOfWeek})</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-stone-800">{day}</span>
                <span className="text-[10px] text-stone-500 font-bold">DAY</span>
              </div>
              {weather ? (
                <div className="mt-2 flex items-center gap-1 text-[9px] text-orange-500 font-bold">
                  <Sun size={10} /> <span className="truncate">{weather.temp}</span>
                </div>
              ) : <div className="mt-2 text-[9px] text-stone-200 italic">無天氣</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const LocationInput = ({ value, onChange, placeholder }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);
  const debounceTimeout = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowSuggestions(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (query) => {
    onChange(query);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    if (query.length < 2) { setSuggestions([]); return; }
    debounceTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (e) { setSuggestions([]); }
    }, 200);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input type="text" placeholder={placeholder} value={value} onChange={(e) => handleSearch(e.target.value)} className="w-full bg-white border border-stone-200 rounded-xl p-3 pl-10 outline-none focus:border-stone-400 transition-colors" />
        <Search className="absolute left-3 top-3.5 text-stone-400" size={16} />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-stone-100 rounded-xl mt-1 shadow-xl max-h-48 overflow-y-auto">
          {suggestions.map((place) => (
            <li key={place.place_id} onClick={() => { onChange(place.display_name.split(",")[0]); setShowSuggestions(false); }} className="p-3 hover:bg-stone-50 cursor-pointer text-sm text-stone-600 border-b border-stone-50 last:border-0 truncate">
              <span className="font-bold text-stone-800">{place.display_name.split(",")[0]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const Tag = ({ type, text }) => {
  const styles = {
    mustEat: "bg-orange-50 text-orange-700 border-orange-200",
    mustBuy: "bg-emerald-50 text-emerald-700 border-emerald-200",
    reservation: "bg-red-50 text-red-700 border-red-200",
    story: "bg-indigo-50 text-indigo-700 border-indigo-200",
    default: "bg-stone-100 text-stone-600 border-stone-200",
  };
  return <span className={`text-[10px] px-2 py-1 rounded-md border ${styles[type] || styles.default} font-medium inline-block mr-1 mb-1`}>{text}</span>;
};

const ItineraryCard = ({ item, onSelect, onEdit, onDelete, onMap, members }) => {
  const typeConfig = {
    sightseeing: { icon: <Camera size={15} />, cardStyle: "bg-indigo-50/60 border-indigo-200", color: "text-indigo-500" },
    food: { icon: <Utensils size={15} />, cardStyle: "bg-orange-50/60 border-orange-200", color: "text-orange-500" },
    transport: { icon: <Train size={15} />, cardStyle: "bg-emerald-50/60 border-emerald-200", color: "text-emerald-500" },
    flight: { icon: <Plane size={15} />, cardStyle: "bg-sky-50/60 border-sky-200", color: "text-sky-500" },
    accommodation: { icon: <Home size={15} />, cardStyle: "bg-rose-50/60 border-rose-200", color: "text-rose-500" },
    activity: { icon: <MapPin size={15} />, cardStyle: "bg-stone-100/60 border-stone-200", color: "text-stone-500" },
  };
  const config = typeConfig[item.category] || typeConfig.activity;
  const author = members?.[item.createdBy] || {};

  return (
    <div onClick={() => onSelect(item)} className={`rounded-xl p-3 border mb-2 relative group transition-all active:scale-[0.99] cursor-pointer shadow-sm ${config.cardStyle}`}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col items-center mr-3 pt-1 min-w-[3rem]">
          <span className="text-sm font-bold text-stone-600 font-mono">{item.time}</span>
          <div className="h-full w-[1px] bg-stone-400/20 my-1"></div>
        </div>
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`${config.color} shrink-0 opacity-80`}>{config.icon}</span>
            <h3 className="font-bold text-stone-800 truncate">{item.location}</h3>
          </div>
          <div className="flex flex-wrap gap-1 mb-1">{(item.tags || []).map((t, i) => <Tag key={i} type={t.type} text={t.text} />)}</div>
          {item.guideInfo && <div className="text-xs text-stone-600 bg-white/60 p-2 rounded-lg border border-stone-100/50 flex gap-2"><BookOpen size={14} className="shrink-0 mt-0.5" />{item.guideInfo}</div>}
        </div>
      </div>
      <div className="absolute top-2 right-2 flex gap-0.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-white/60 backdrop-blur-sm rounded-lg p-0.5 shadow-sm">
        <button onClick={(e) => { e.stopPropagation(); onMap(item.location); }} className="p-1.5 text-stone-400 hover:text-blue-500"><Navigation size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-1.5 text-stone-400 hover:text-stone-600"><Edit size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(item); }} className="p-1.5 text-stone-400 hover:text-red-400"><Trash2 size={14} /></button>
      </div>
    </div>
  );
};

// --- App Component ---
const App = () => {
  // --- States ---
  const [user, setUser] = useState(null);
  const [tripId, setTripId] = useState(null);
  const [tripData, setTripData] = useState(null);
  const [localTripName, setLocalTripName] = useState("");
  const [activeTab, setActiveTab] = useState("itinerary");
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [toast, setToast] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemData, setItemData] = useState({});
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
  const [selectedItem, setSelectedItem] = useState(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [firebaseError, setFirebaseError] = useState(null);
  const [posterTheme, setPosterTheme] = useState(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState({ isOpen: false, title: "", content: "", isDebtAnalysis: false, isLoading: false });

  const showToast = (message, type = "success") => setToast({ message, type });

  // --- Effects ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTripId = params.get("trip");
    if (urlTripId) { setTripId(urlTripId); window.history.replaceState({}, "", window.location.pathname); }
  }, []);

  useEffect(() => { if (tripData?.name) setLocalTripName(tripData.name); }, [tripData?.name]);

  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (e) { setFirebaseError(e); }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user || !tripId) return;
    const unsub = onSnapshot(doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTripData(data);
        if (!data.members?.[user.uid]) {
          if (data.members && Object.keys(data.members).length > 0) setShowMemberSelect(true);
          else setShowProfileSetup(true);
        } else { setShowMemberSelect(false); setShowProfileSetup(false); }
      } else { setTripId(null); }
    });
    return () => unsub();
  }, [user, tripId]);

  // --- Handlers ---
  const scrollToDay = (day) => {
    const el = document.getElementById(`day-section-${day}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSaveName = async () => {
    if (!tripId || localTripName === tripData?.name) return;
    await updateDoc(doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId), { name: localTripName });
    showToast("旅程名稱已更新");
  };

  const createTrip = async ({ destination, startDate, endDate }) => {
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const data = { id: newId, name: `${destination} 之旅`, destination, startDate, endDate, itinerary: [], expenses: [], createdBy: user.uid, weather: {}, members: {} };
    await setDoc(doc(db, "artifacts", appId, "public", "data", "travel_trips", newId), data);
    setTripId(newId);
    fetchWeather(newId, destination, startDate);
  };

  const fetchWeather = async (id, dest, start) => {
    const res = await callGeminiAPI([{ text: `預測 ${dest} ${start} 起 7 天天氣。回傳 JSON: [{"date": "YYYY-MM-DD", "temp": "25°C", "condition": "晴"}]` }]);
    if (res) {
      const map = {};
      JSON.parse(res.replace(/```json|```/g, "")).forEach(d => map[d.date] = d);
      await updateDoc(doc(db, "artifacts", appId, "public", "data", "travel_trips", id), { weather: map });
    }
  };

  const handleAIAnalyze = async () => {
    if (!tripData?.itinerary?.length) return;
    setIsAnalyzing(true);
    try {
      const res = await callGeminiAPI([{ text: `分析行程 JSON: ${JSON.stringify(tripData.itinerary.map(i => ({ id: i.id, location: i.location })))}。回傳 JSON Array: [{"id": "原本id", "guideInfo": "30字介紹", "tags": [{"type":"mustEat", "text":"標籤"}]}]` }]);
      const enriched = JSON.parse(res.replace(/```json|```/g, ""));
      const newItin = tripData.itinerary.map(i => { const e = enriched.find(x => x.id === i.id); return e ? { ...i, ...e } : i; });
      await updateDoc(doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId), { itinerary: newItin });
      showToast("分析完成！");
    } finally { setIsAnalyzing(false); }
  };

  const handleSaveItem = async () => {
    const tripRef = doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId);
    const newItem = { ...itemData, id: isEditMode ? editingId : Date.now().toString(), createdBy: user.uid };
    const list = activeTab === "itinerary" ? tripData.itinerary : tripData.expenses;
    if (isEditMode) await updateDoc(tripRef, { [activeTab]: list.map(i => i.id === editingId ? newItem : i) });
    else await updateDoc(tripRef, { [activeTab]: arrayUnion(newItem) });
    setIsModalOpen(false); showToast("儲存成功");
  };

  const deleteItem = async (col, item) => {
    const tripRef = doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId);
    await updateDoc(tripRef, { [col]: tripData[col].filter(i => i.id !== item.id) });
    setConfirmConfig({ isOpen: false }); showToast("已刪除");
  };

  const groupedItinerary = (tripData?.itinerary || []).reduce((acc, item) => {
    const day = item.day || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(item);
    return acc;
  }, {});

  if (!user || !tripId || !tripData) return (
    <div className="h-screen bg-[#FDFCF8] flex items-center justify-center">
      {!user ? <Loader2 className="animate-spin text-stone-300" /> : <WelcomeScreen onCreate={createTrip} onJoin={setTripId} showToast={showToast} />}
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#FDFCF8] font-sans max-w-md mx-auto shadow-2xl relative">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <ConfirmModal {...confirmConfig} />
      
      {/* --- Header --- */}
      <header className="bg-[#FDFCF8]/90 backdrop-blur-md px-6 py-5 sticky top-0 z-30 border-b border-stone-100">
        <div className="flex justify-between items-start">
          <div className="flex-1 mr-4">
            <input className="text-xl font-bold bg-transparent border-b-2 border-transparent focus:border-stone-800 p-1 w-full outline-none" value={localTripName} onChange={(e) => setLocalTripName(e.target.value)} onBlur={handleSaveName} />
            <div className="text-xs text-stone-400 mt-1 flex gap-2 font-mono"><Calendar size={10} /> {tripData.startDate} <ArrowRight size={10} /> {tripData.endDate}</div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setIsShareOpen(true)} className="p-2 bg-indigo-50 rounded-full text-indigo-500"><Share2 size={18} /></button>
            <button onClick={() => setTripId(null)} className="p-2 bg-stone-100 rounded-full text-stone-500"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="flex-1 overflow-y-auto pb-32 px-4 pt-0 relative scroll-smooth">
        {activeTab === "itinerary" && (
          <>
            <DayNavigation days={Object.keys(groupedItinerary).sort((a,b)=>a-b)} tripData={tripData} onScrollToDay={scrollToDay} />
            {Object.keys(groupedItinerary).sort((a,b)=>a-b).map(day => (
              <div key={day} id={`day-section-${day}`} className="mb-8 pt-4 scroll-mt-32">
                <div className="flex justify-between items-end mb-4 px-2">
                  <div className="flex flex-col"><span className="text-4xl font-bold text-stone-200 font-mono">{String(day).padStart(2,"0")}</span><span className="text-sm font-bold text-stone-600">Day {day}</span></div>
                  <WeatherBadge date={`${new Date(tripData.startDate).getFullYear()}-${String(new Date(tripData.startDate).getMonth()+1).padStart(2,'0')}-${String(new Date(tripData.startDate).getDate() + parseInt(day)-1).padStart(2,'0')}`} weatherData={tripData.weather} />
                </div>
                <div className="pl-2 border-l-2 border-stone-100 ml-4">
                  {groupedItinerary[day].sort((a,b)=>a.time.localeCompare(b.time)).map(item => (
                    <ItineraryCard key={item.id} item={item} members={tripData.members} onSelect={setSelectedItem} onEdit={i=>{setEditingId(i.id); setItemData(i); setIsEditMode(true); setIsModalOpen(true);}} onDelete={i=>setConfirmConfig({isOpen:true, title:"刪除", message:"確刪除嗎?", onConfirm:()=>deleteItem("itinerary", i), onCancel:()=>setConfirmConfig({isOpen:false}), isDangerous:true})} onMap={loc=>window.open(`https://www.google.com/maps/search/${encodeURIComponent(loc)}`)} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </main>

      {/* --- Floating Buttons --- */}
      {/* 左下角 AI 魔法球 */}
      <div className="fixed bottom-28 left-6 z-[60] flex flex-col-reverse items-start gap-3">
        <button onClick={() => setShowAIMenu(!showAIMenu)} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${showAIMenu ? "bg-stone-800 rotate-45" : "bg-indigo-600"}`}>
          {isAnalyzing || isImportLoading ? <Loader2 className="animate-spin text-white" size={24} /> : <Sparkles className="text-white" size={24} />}
          {!showAIMenu && <span className="absolute inset-0 rounded-full bg-indigo-500 animate-ping opacity-20"></span>}
        </button>
        {showAIMenu && (
          <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-5">
            <div className="px-2 text-[10px] font-black text-indigo-400 uppercase">Tools</div>
            <button onClick={()=>{handleAIAnalyze(); setShowAIMenu(false);}} className="flex items-center gap-3 bg-white border px-4 py-3 rounded-2xl shadow-xl w-48"><Sparkles className="text-indigo-600" size={16} /><span className="text-sm font-bold">智能導遊分析</span></button>
            <button onClick={()=>{setIsImportOpen(true); setShowAIMenu(false);}} className="flex items-center gap-3 bg-white border px-4 py-3 rounded-2xl shadow-xl w-48"><Upload className="text-amber-600" size={16} /><span className="text-sm font-bold">匯入行程檔案</span></button>
          </div>
        )}
      </div>

      {/* 右下角 新增按鈕 */}
      <button onClick={() => { setIsEditMode(false); setItemData(activeTab === "itinerary" ? { day: 1, time: "10:00", category: "sightseeing" } : { payer: user.uid, date: new Date().toISOString().split("T")[0], category: "food" }); setIsModalOpen(true); }} className="absolute bottom-28 right-6 bg-stone-800 text-white p-4 rounded-full shadow-lg z-40"><Plus size={24} /></button>

      {/* 底端導航 */}
      <nav className="absolute bottom-6 left-6 right-6 bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-2 flex justify-around items-center z-40">
        <button onClick={() => setActiveTab("itinerary")} className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 ${activeTab === "itinerary" ? "text-stone-800 bg-stone-100" : "text-stone-400"}`}><Calendar size={20} /><span className="text-[10px]">行程</span></button>
        <button onClick={() => setActiveTab("expenses")} className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 ${activeTab === "expenses" ? "text-stone-800 bg-stone-100" : "text-stone-400"}`}><CreditCard size={20} /><span className="text-[10px]">記帳</span></button>
      </nav>

      {/* --- Modals (已簡化) --- */}
      {isModalOpen && (
        <div className="absolute inset-0 z-[100] bg-stone-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#FDFCF8] w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col">
            <h3 className="text-lg font-bold mb-6 text-center">{isEditMode ? "編輯" : "新增"}</h3>
            <div className="space-y-4">
              {activeTab === "itinerary" ? (
                <>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Day" className="w-1/2 p-3 border rounded-xl" value={itemData.day} onChange={e=>setItemData({...itemData, day:e.target.value})} />
                    <input type="time" className="w-1/2 p-3 border rounded-xl" value={itemData.time} onChange={e=>setItemData({...itemData, time:e.target.value})} />
                  </div>
                  <LocationInput placeholder="搜尋地點" value={itemData.location || ""} onChange={val=>setItemData({...itemData, location:val})} />
                </>
              ) : (
                <input type="number" placeholder="金額" className="w-full p-3 border rounded-xl" value={itemData.amount} onChange={e=>setItemData({...itemData, amount:e.target.value})} />
              )}
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={()=>setIsModalOpen(false)} className="flex-1 py-3 bg-stone-100 rounded-xl">取消</button>
              <button onClick={handleSaveItem} className="flex-1 py-3 bg-stone-800 text-white rounded-xl">確認</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
