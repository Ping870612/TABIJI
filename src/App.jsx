import React, { useState, useEffect, useRef } from "react";
import { useJsApiLoader, Autocomplete, GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import {
  MapPin,
  Calendar,
  CreditCard,
  Car,
  Plus,
  Trash2,
  LogOut,
  Pin,
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
  Cloud,         
  CloudSnow,     
  CloudLightning,
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

import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// --- Firebase Imports ---
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

// --- 配置區塊 ---

const libraries = ["places"];

// 1. Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBCfZdkNZMyoutYmUUQw7D0qmxXDDsMA9U",
  authDomain: "test-5523e.firebaseapp.com",
  projectId: "test-5523e",
  storageBucket: "test-5523e.firebasestorage.app",
  messagingSenderId: "796089891248",
  appId: "1:796089891248:web:dffeabad1c216aa935be75",
};

// --- 初始化 Firebase ---
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// 設定 App ID
const appId =
  typeof __app_id !== "undefined" ? __app_id : "travel-app-sandbox-v1";

// 🌟 1. 貼上你剛剛複製的 ImgBB API Key
const IMGBB_API_KEY = "787712ddc2bb46a69c1a29f33b847415";

// --- 🌟 1. 幫手機專屬打造的 Base64 轉實體檔案 (Blob) 函式 ---
function base64ToBlob(dataURI) {
  try {
    const splitDataURI = dataURI.split(',');
    const byteString = splitDataURI[0].indexOf('base64') >= 0 
      ? atob(splitDataURI[1]) 
      : decodeURI(splitDataURI[1]);
    // 萃取檔案格式 (例如 image/jpeg)
    const mimeString = splitDataURI[0].split(':')[1].split(';')[0];
    
    // 轉換成二進位數據
    const ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ia], { type: mimeString });
  } catch(e) {
    console.error("檔案轉換失敗", e);
    return null;
  }
}

// --- 🌟 2. 升級版的 ImgBB 上傳函式 (對手機極度友善) ---
async function uploadImageToImgBB(base64Image) {
  if (!base64Image) return null;
  try {
    // 把超長字串還原成輕巧的真實檔案
    const imageBlob = base64ToBlob(base64Image);
    if (!imageBlob) throw new Error("圖片轉換失敗");
    
    const formData = new FormData();
    // 第三個參數給予一個假檔名，讓 ImgBB 把它當作真正的圖片檔案接收
    formData.append("image", imageBlob, "upload.jpg");

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    
    if (data.success) {
      return data.data.url; // 成功回傳短短的網址！
    } else {
      throw new Error(data.error?.message || "ImgBB 上傳失敗");
    }
  } catch (error) {
    console.error("圖片上傳發生錯誤:", error);
    return null;
  }
}

// --- AI 呼叫函式 ---
async function callGeminiAPI(parts) {
  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parts: parts }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "";
  }
}

async function callImagenAPI(imagePrompt) {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || firebaseConfig.apiKey;
    
    if (!apiKey) {
      console.error("未找到 API Key");
      return null;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: imagePrompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "3:4",
            personGeneration: "allow_adult",
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      console.warn("Imagen API 呼叫失敗:", err);
      return null;
    }

    const data = await response.json();
    const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
    
    return base64Image ? `data:image/png;base64,${base64Image}` : null;
  } catch (error) {
    console.error("Imagen Error:", error);
    return null;
  }
}

// --- 匯率抓取函式 (新增在此) ---
async function fetchExchangeRate(baseCurrency) {
  try {
    // 使用 ExchangeRate-API 免費版介面
    const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
    if (!response.ok) throw new Error("API 請求失敗");
    const data = await response.json();
    return data.rates["TWD"] || 1; // 抓取該幣別對台幣的匯率
  } catch (error) {
    console.error("匯率抓取錯誤:", error);
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
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-xl flex items-center gap-3 text-white text-sm font-medium z-[100] animate-in fade-in slide-in-from-top-5 duration-300 ${
        type === "error" ? "bg-red-500" : "bg-[#68577b]"
      }`}
    >
      {type === "error" ? <Info size={16} /> : <CheckCircle size={16} />}
      {message}
    </div>
  );
};

const ConfirmModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "確認",
  cancelText = "取消",
  isDangerous = false,
}) => {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-[60] bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-[#faf9f4] w-full max-w-xs rounded-3xl p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/50">
        <h3 className="text-lg font-serif font-bold mb-2 text-stone-900 tracking-wide">
          {title}
        </h3>
        <p className="text-stone-500 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-white/60 border border-white text-stone-600 font-medium hover:bg-stone-100 transition-colors text-sm shadow-sm"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl text-white font-medium shadow-md transition-colors text-sm ${
              isDangerous
                ? "bg-red-500 hover:bg-red-600"
                : "bg-[#68577b] hover:bg-[#504062]"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const LinkText = ({ text }) => {
  if (!text) return null;

  // 之前的版本：處理 Markdown 格式，並且強制使用 target="_blank"
  const mdRegex = /(\[[^\]]+\]\([a-zA-Z0-9\-]+:\/\/[^\s)]+\))/g;
  const parts = text.split(mdRegex);

  return (
    <span>
      {parts.map((part, i) => {
        const mdMatch = part.match(/^\[([^\]]+)\]\(([a-zA-Z0-9\-]+:\/\/[^\s)]+)\)$/);
        if (mdMatch) {
          const linkText = mdMatch[1]; 
          const url = mdMatch[2];      
          return (
            <a
              key={i}
              href={url}
              target="_blank"           // 🔴 問題出在這裡！這行會強迫手機打開瀏覽器的新分頁
              rel="noopener noreferrer" // 🔴 這是搭配 target="_blank" 的安全屬性
              className="text-[#68577b] font-bold hover:text-stone-900 hover:underline break-all relative inline-flex items-center gap-1 group"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="border-b border-[#b4a0c8] group-hover:border-stone-900 transition-colors pb-0.5">{linkText}</span>
            </a>
          );
        }

        // 如果不是 Markdown 格式，再檢查是否有純網址 (自動超連結)
        const urlParts = part.split(/(https?:\/\/[^\s]+)/g);
        return (
          <span key={i}>
            {urlParts.map((urlPart, k) => {
              if (urlPart.match(/^https?:\/\/[^\s]+$/)) {
                return (
                  <a
                    key={k}
                    href={urlPart}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#68577b] font-bold hover:text-stone-900 hover:underline break-all"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {urlPart}
                  </a>
                );
              }
              // 純文字處理換行
              return (
                <span key={k}>
                  {urlPart.split('\n').map((line, j, arr) => (
                    <React.Fragment key={`${k}-${j}`}>
                      {line}
                      {j < arr.length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
};

const SetupGuide = ({ error }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-[#faf9f4] p-8 text-center font-sans">
    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg border border-stone-100 text-left">
      <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertTriangle size={32} />
      </div>
      <h2 className="text-2xl font-bold text-stone-800 mb-2 text-center">
        需要設定 Firebase
      </h2>
      <p className="text-stone-500 mb-6 leading-relaxed text-center text-sm">
        預設的測試金鑰在外部環境無法使用。請依照以下步驟設定您自己的 Firebase 專案。
      </p>

      <div className="bg-red-50 text-red-600 p-4 rounded-xl text-[10px] font-mono mb-6 overflow-x-auto border border-red-100">
        錯誤訊息: {error?.message || "Unknown Connection Error"}
      </div>

      <ol className="text-sm text-stone-600 space-y-3 list-decimal pl-5 mb-8">
        <li>前往 Firebase Console 並建立新專案。</li>
        <li>建立 Web App 並複製 <code>firebaseConfig</code>。</li>
        <li>回到程式碼，取代 <code>firebaseConfig</code> 變數。</li>
        <li>開啟 <strong>Authentication</strong> (匿名登入) 與 <strong>Firestore</strong> (Test mode)。</li>
      </ol>

      <button
        onClick={() => window.location.reload()}
        className="w-full bg-[#68577b] text-white px-6 py-4 rounded-xl font-bold hover:bg-[#504062] transition-colors shadow-lg"
      >
        已完成設定，重新整理頁面
      </button>
    </div>
  </div>
);

const UserBadge = ({ nickname, emoji, color, size = "sm" }) => {
  const sizeClass = size === "sm" ? "w-6 h-6 text-xs" : "w-10 h-10 text-lg";
  const content = emoji ? emoji : nickname ? nickname[0].toUpperCase() : "?";
  const bgColor = color || "bg-stone-200";

  return (
    <div
      className={`${sizeClass} rounded-full ${
        emoji ? "bg-white" : bgColor
      } text-stone-800 flex items-center justify-center font-bold shadow-sm flex-shrink-0 select-none border border-stone-100 ring-2 ring-white`}
      title={nickname}
    >
      {content}
    </div>
  );
};

const AIAnalysisModal = ({
  isOpen,
  onClose,
  title,
  content,
  isLoading,
  isDebtAnalysis,
  members,
}) => {
  if (!isOpen) return null;

  let debtData = [];
  if (isDebtAnalysis && !isLoading && content) {
    try {
      const jsonMatch = content.match(/\[.*\]/s);
      if (jsonMatch) {
        debtData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse debt JSON", e);
    }
  }

  return (
    <div className="absolute inset-0 z-[70] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[#faf9f4] w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative max-h-[80vh] flex flex-col border border-white">
        <div className="flex items-center gap-2 mb-4 text-stone-900 border-b border-white/50 pb-4">
          <Sparkles className="text-[#68577b]" size={24} />
          <h3 className="text-xl font-serif font-bold">{title}</h3>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[150px] text-stone-700 leading-relaxed scrollbar-hide">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-[#68577b] gap-3">
              <Loader2 className="animate-spin text-[#68577b]" size={32} />
              <p className="text-sm font-medium animate-pulse">
                AI 正在運算中...
              </p>
            </div>
          ) : isDebtAnalysis && debtData.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-stone-500 mb-2">
                建議結算方案 (已四捨五入)：
              </p>
              {debtData.map((debt, idx) => {
                const fromMember = Object.values(members || {}).find(
                  (m) => m.nickname === debt.from
                );
                const toMember = Object.values(members || {}).find(
                  (m) => m.nickname === debt.to
                );

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-white shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <UserBadge
                        nickname={debt.from}
                        emoji={fromMember?.emoji}
                        size="md"
                      />
                      <span className="text-sm font-bold text-stone-700">
                        {debt.from}
                      </span>
                    </div>
                    <div className="flex flex-col items-center text-[#68577b] px-2">
                      <span className="text-[10px] font-bold text-[#68577b] mb-1">
                        ${debt.amount}
                      </span>
                      <ArrowRight size={16} />
                    </div>
                    <div className="flex items-center gap-2 flex-row-reverse">
                      <UserBadge
                        nickname={debt.to}
                        emoji={toMember?.emoji}
                        size="md"
                      />
                      <span className="text-sm font-bold text-stone-700">
                        {debt.to}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="prose prose-sm prose-stone max-w-none whitespace-pre-wrap">
              {content}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl bg-[#68577b] text-white font-medium hover:bg-[#504062] shadow-lg transition-all"
        >
          關閉
        </button>
      </div>
    </div>
  );
};

const ItemDetailModal = ({ isOpen, onClose, item, members }) => {
  if (!isOpen || !item) return null;

  const typeConfig = {
    sightseeing: { icon: <Camera size={24} />, bgIcon: "bg-[#eedbff] text-[#68577b]", label: "景點" },
    food: { icon: <Utensils size={24} />, bgIcon: "bg-orange-100 text-orange-600", label: "餐廳" },
    transport: { icon: <Train size={24} />, bgIcon: "bg-emerald-100 text-emerald-600", label: "交通" },
    flight: { icon: <Plane size={24} />, bgIcon: "bg-sky-100 text-sky-600", label: "航班" },
    accommodation: { icon: <Home size={24} />, bgIcon: "bg-rose-100 text-rose-600", label: "住宿" },
    activity: { icon: <MapPin size={24} />, bgIcon: "bg-stone-100 text-stone-600", label: "活動" },
  };
  
  const config = typeConfig[item.category] || typeConfig.activity;
  const author = members?.[item.createdBy] || {};

  return (
    <div className="absolute inset-0 z-[70] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-[#faf9f4] w-full max-w-sm rounded-[2rem] shadow-2xl relative max-h-[85vh] overflow-hidden flex flex-col border border-white">
        
        {/* 右上角關閉按鈕 - 移動到頂層確保不被圖片蓋住 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-md rounded-full text-stone-400 hover:text-stone-600 z-20 shadow-sm transition-colors"
        >
          <X size={20} />
        </button>

        {/* 🌟 1. 頂部照片區塊 (如果有照片才顯示) */}
        {item.image && (
          <div className="w-full relative shrink-0 overflow-hidden border-b border-white">
            {/* 設定比例為接近 21:9 (使用 aspect-[21/9]) */}
            <div className="w-full aspect-[21/9]">
              <img 
                src={item.image} 
                alt={item.location} 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* 2. 下方內容滾動區 */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 pt-5">
          <div className="flex flex-col gap-5">
            
            {/* 標題與類型 */}
            <div className="flex items-center gap-4 border-b border-white/50 pb-4">
              <div className={`p-4 rounded-2xl ${config.bgIcon} shadow-sm shrink-0`}>
                {config.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#68577b] uppercase tracking-wider mb-1">
                  {config.label} • {item.time}
                </div>
                <h2 className="text-xl font-serif font-bold text-stone-900 leading-tight break-words">
                  {item.location}
                </h2>
              </div>
            </div>

            {/* 地圖按鈕 */}
            <a
  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    item.location
  )}`}
  target="_blank"
  rel="noreferrer"
  className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 font-medium py-3 rounded-xl hover:bg-blue-100 transition-colors"
>
  <MapPin size={18} /> 在 Google Maps 開啟
</a>

            {/* 標籤 */}
            {(item.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white border border-stone-100 text-stone-900 font-medium shadow-sm"
                  >
                    {tag.text}
                  </span>
                ))}
              </div>
            )}

            {/* 導遊介紹 (AI 生成) */}
            {item.guideInfo && (
              <div className="bg-gradient-to-br from-[#eedbff]/30 to-white/60 p-4 rounded-2xl border border-white shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-[#68577b] font-bold text-sm">
                  <Sparkles size={16} /> 導遊介紹
                </div>
                <p className="text-sm text-stone-900 leading-relaxed">
                  {item.guideInfo}
                </p>
              </div>
            )}

            {/* 備註 */}
            {item.notes && (
              <div>
                <h4 className="text-sm font-bold text-stone-900 mb-2">備註</h4>
                <div className="text-sm text-stone-600 bg-white/60 p-4 rounded-2xl border border-white shadow-sm leading-relaxed whitespace-pre-wrap">
                  <LinkText text={item.notes} />
                </div>
              </div>
            )}

            {/* 建立者資訊 */}
            {author.nickname && (
              <div className="flex items-center justify-end gap-2 mt-2 pt-4 border-t border-white/50 text-xs text-stone-400">
                <span>Added by</span>
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center text-xs">
                    {author.emoji || "👤"}
                  </div>
                  <span className="font-bold text-stone-600">
                    {author.nickname}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MemberSelectModal = ({ isOpen, members, onSelect, onCreateNew, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[90] bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-[#faf9f4] w-full max-w-xs rounded-[2rem] p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative border border-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white rounded-full text-stone-400 hover:text-stone-600 transition-colors z-10 shadow-sm"
        >
          <X size={16} />
        </button>

        <div className="text-center mb-6 mt-2">
          <h3 className="text-xl font-serif font-bold text-stone-900 mb-2">
            歡迎回來！
          </h3>
          <p className="text-sm text-stone-500">
            這個行程已經有成員了，請問您是...？
          </p>
        </div>
        
        <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
          {Object.entries(members).map(([uid, member]) => (
            <button
              key={uid}
              onClick={() => onSelect(uid, member)}
              className="w-full flex items-center gap-4 p-4 bg-white hover:bg-[#eadef1]/30 border border-white rounded-2xl shadow-sm transition-all active:scale-95 group"
            >
              <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-xl">
                {member.emoji}
              </div>
              <div className="text-left">
                <div className="font-bold text-stone-800 group-hover:text-[#68577b] transition-colors">
                  我是 {member.nickname}
                </div>
                <div className="text-[10px] text-stone-400">
                  點擊以繼承此身分
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-white/50"></div>
          <span className="flex-shrink mx-4 text-stone-300 text-xs">或是</span>
          <div className="flex-grow border-t border-white/50"></div>
        </div>

        <button
          onClick={onCreateNew}
          className="w-full bg-[#68577b] text-white font-bold py-3 rounded-xl hover:bg-[#504062] transition-all shadow-lg"
        >
          我是新成員 (建立新檔案)
        </button>
      </div>
    </div>
  );
};

const ProfileSetupModal = ({ isOpen, onSubmit, initialName = "", members = {}, onBack }) => {
  const animals = [
    "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", 
    "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔",
  ];
  
  const takenEmojis = Object.values(members).map(m => m.emoji);
  const [nickname, setNickname] = useState(initialName);
  const [selectedEmoji, setSelectedEmoji] = useState("🐶");

  useEffect(() => {
    if (isOpen) {
      setNickname(initialName);
      const firstAvailable = animals.find(a => !takenEmojis.includes(a)) || "🐶";
      setSelectedEmoji(firstAvailable);
    }
  }, [isOpen, members]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[80] bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-[#faf9f4] w-full max-w-xs rounded-[2rem] p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white">
        
        <div className="relative flex items-center justify-center mb-6">
          <button 
            onClick={onBack}
            className="absolute left-0 p-2 bg-white rounded-full text-stone-400 hover:text-stone-600 shadow-sm transition-colors -ml-2"
          >
            <ChevronRight className="rotate-180" size={20} />
          </button>
          <div className="text-center mt-4">
            <h3 className="text-xl font-serif font-bold text-stone-900 mb-1">
              建立旅者檔案
            </h3>
            <p className="text-xs text-stone-500">選擇一個動物代表你吧！</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-4xl shadow-md transition-transform hover:scale-105 border border-white">
              {selectedEmoji}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-[#68577b] uppercase tracking-wider ml-1 mb-1 block">
              暱稱
            </label>
            <input
              type="text"
              placeholder="例如：小明"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-white border border-white shadow-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#eadef1] text-center font-medium"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#68577b] uppercase tracking-wider ml-1 mb-2 block text-center">
              選擇動物
            </label>
            <div className="grid grid-cols-4 gap-2">
              {animals.map((a) => {
                const isTaken = takenEmojis.includes(a);
                return (
                  <button
                    key={a}
                    onClick={() => !isTaken && setSelectedEmoji(a)}
                    disabled={isTaken}
                    title={isTaken ? "已經被選走囉" : ""}
                    className={`text-2xl p-2 rounded-xl transition-all ${
                      isTaken
                        ? "opacity-20 cursor-not-allowed grayscale bg-transparent" 
                        : selectedEmoji === a
                        ? "bg-white scale-110 shadow-md border border-white"
                        : "hover:bg-white/50"
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            onClick={() => nickname && onSubmit({ nickname, emoji: selectedEmoji })}
            disabled={!nickname || takenEmojis.includes(selectedEmoji)}
            className="w-full bg-[#68577b] text-white font-bold py-3 rounded-xl hover:bg-[#504062] transition-all disabled:opacity-50 shadow-lg"
          >
            開始旅程
          </button>
        </div>
      </div>
    </div>
  );
};

const FileImportModal = ({ isOpen, onClose, onImport, isLoading }) => {
  const fileInputRef = useRef(null);
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) onImport(file);
  };
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[70] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-[#faf9f4] w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative border border-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white rounded-full text-stone-400 hover:text-stone-600 shadow-sm"
        >
          <XCircle size={20} />
        </button>
        <h3 className="text-xl font-serif font-bold text-stone-900 mb-2 flex items-center gap-2">
          <FileText className="text-[#68577b]" /> 匯入行程檔案
        </h3>
        <p className="text-sm text-stone-500 mb-6 leading-relaxed">
          支援 <b>PDF</b> 或 <b>圖片</b> (如 Excel 截圖)。
          <br />
          AI 將自動讀取內容並建立行程。
        </p>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="animate-spin text-[#68577b]" size={40} />
            <p className="text-sm font-medium text-stone-600 animate-pulse">
              正在分析檔案內容...
            </p>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#eadef1] bg-white/50 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-colors group shadow-sm"
          >
            <Upload
              size={32}
              className="text-[#b4a0c8] group-hover:text-[#68577b] mb-2 transition-colors"
            />
            <span className="text-[#68577b] font-medium">點擊上傳檔案</span>
            <span className="text-xs text-stone-400 mt-1">
              .pdf, .jpg, .png
            </span>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,image/*"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const ShareModal = ({ isOpen, onClose, tripId, tripName, copyToClipboard }) => {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-[60] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-[#faf9f4] w-full max-w-sm rounded-[2rem] p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative border border-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white rounded-full text-stone-400 hover:text-stone-600 shadow-sm"
        >
          <XCircle size={20} />
        </button>
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="bg-[#eedbff] p-4 rounded-full text-[#68577b] mb-2 shadow-sm">
            <Users size={32} />
          </div>
          <h3 className="text-xl font-serif font-bold text-stone-900">邀請朋友加入</h3>
          <p className="text-sm text-stone-500 leading-relaxed">
            將此代碼分享給您的旅伴。
            <br />
            他們只需在首頁輸入代碼即可共同編輯 <b>{tripName}</b>。
          </p>
          
          <div
            onClick={() => {
              const link = `${window.location.origin}${window.location.pathname}?tripId=${tripId}`;
              const message = `👋 點擊下方連結一起參與 ${tripName} 的行程！✈️\n${link}`;
              copyToClipboard(message);
            }}
            className="w-full bg-white border-2 border-dashed border-[#eadef1] rounded-2xl p-6 cursor-pointer hover:bg-[#faf9f4] hover:border-[#b4a0c8] transition-all group shadow-sm"
          >
            <div className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-1">
              點擊複製邀請函
            </div>
            <div className="text-3xl font-mono font-bold text-stone-900 tracking-wider group-hover:text-[#68577b]">
              {tripId}
            </div>
            <div className="text-xs text-stone-400 mt-2 flex items-center justify-center gap-1">
              <Copy size={12} /> 複製文字與連結
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

const LocationInput = ({ value, onChange, placeholder }) => {
  const [autocomplete, setAutocomplete] = useState(null);

  const onLoad = (auto) => setAutocomplete(auto);

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      const placeName = place.name || place.formatted_address;
      
      const lat = place.geometry?.location?.lat() || null;
      const lng = place.geometry?.location?.lng() || null;
      
      if (placeName) {
        onChange(placeName, lat, lng);
      }
    }
  };
  return (
    <div className="relative">
      <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value, null, null)}
          className="w-full bg-white border border-white shadow-sm rounded-2xl p-4 pl-11 outline-none focus:ring-2 focus:ring-[#eadef1] transition-colors text-stone-900 font-bold text-base"
        />
      </Autocomplete>
      <Search className="absolute left-4 top-4 text-[#b4a0c8]" size={18} />
      {value && (
        <button
          onClick={() => onChange("", null, null)}
          className="absolute right-4 top-4 text-stone-300 hover:text-stone-500 z-10"
        >
          <XCircle size={18} />
        </button>
      )}
    </div>
  );
};

const Tag = ({ type, text }) => {
  const styles = {
    mustEat: "bg-orange-50 text-orange-700 border-orange-200",
    mustBuy: "bg-emerald-50 text-emerald-700 border-emerald-200",
    reservation: "bg-red-50 text-red-700 border-red-200",
    story: "bg-[#eedbff] text-stone-900 border-[#eadef1]",
    default: "bg-stone-100 text-stone-600 border-stone-200",
  };
  return (
    <span
      className={`text-[10px] px-2 py-1 rounded-md border ${
        styles[type] || styles.default
      } font-medium inline-block mr-1 mb-1 tracking-wide`}
    >
      {typeof text === "string" ? text : String(text || "")}
    </span>
  );
};

const WeatherBadge = ({ date, weatherData }) => {
  if (!date || !weatherData || !weatherData[date]) return null;
  const info = weatherData[date];
  
  // 1. 預設圖示與顏色
  let Icon = Sun;
  let iconColor = "text-orange-400"; 

  const condition = info.condition || "";

  // 2. 根據天氣狀況，動態切換圖示與顏色
  if (condition.includes("雨")) {
    Icon = CloudRain;
    iconColor = "text-blue-500";
  } else if (condition.includes("雪")) {
    Icon = CloudSnow;
    iconColor = "text-sky-300";
  } else if (condition.includes("雷")) {
    Icon = CloudLightning;
    iconColor = "text-purple-500";
  } else if (condition.includes("雲") || condition.includes("陰") || condition.includes("霧")) {
    Icon = Cloud;
    iconColor = "text-stone-400"; // 陰天給予質感的灰色
  } else if (condition.includes("風")) {
    Icon = Wind;
    iconColor = "text-teal-400";
  }
  
  // 萃取地點名稱
  const shortLocation = info.locationName ? info.locationName.split(',')[0] : "";

  return (
    <div className="flex flex-col items-end gap-1 animate-in fade-in">
      <div className="flex items-center gap-2 text-xs bg-white/60 px-3 py-1.5 rounded-full border border-white shadow-sm backdrop-blur-sm">
        {/* 🟢 套用動態 Icon 與 顏色 */}
        <Icon size={14} className={iconColor} />
        {/* 🟢 文字改為稍微深一點的灰色，提升閱讀質感 */}
        <span className="font-bold text-stone-700 tracking-wide">
          {info.temp} {info.condition}
        </span>
      </div>
      {shortLocation && (
        <div className="text-[9px] text-stone-400 font-medium tracking-wide pr-1 flex items-center gap-1">
          <MapPin size={8} /> {shortLocation}
        </div>
      )}
    </div>
  );
};


// --- 精緻原尺寸版：動態天氣天數導覽列 ---
const DayNavigation = ({ days, tripData, onScrollToDay }) => {
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="sticky top-0 z-40 bg-[#faf9f4]/90 backdrop-blur-md pb-3 pt-3 px-4 -mx-4 mb-4 shadow-[0_10px_20px_rgba(104,87,123,0.05)] border-b border-white/60 transition-all">
      <div className="flex gap-3 overflow-x-auto py-1 custom-scrollbar justify-start px-2">
        {days.map((day) => {
          const dateObj = new Date(tripData.startDate);
          dateObj.setDate(dateObj.getDate() + (parseInt(day) - 1));
          
          const formattedDate = dateObj.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
          const dayOfWeek = weekdays[dateObj.getDay()];
          
          const y = dateObj.getFullYear();
          const m = String(dateObj.getMonth() + 1).padStart(2, '0');
          const d = String(dateObj.getDate()).padStart(2, '0');
          const dateKey = `${y}-${m}-${d}`;
          
          const weather = tripData.weather?.[dateKey];
          const condition = weather?.condition || "";

          // 1. 根據天氣定義專屬漸層與微動畫 (保留)
          let Icon = Sun;
          let bgStyle = "bg-white/70 border-white text-stone-900"; // 預設樣式
          let iconColor = "text-stone-400";
          let animClass = "";

          if (condition.includes("晴")) {
            Icon = Sun;
            bgStyle = "bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200 text-orange-900";
            iconColor = "text-orange-500";
            animClass = "animate-[spin_8s_linear_infinite]";
          } else if (condition.includes("雨")) {
            Icon = CloudRain;
            bgStyle = "bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 text-indigo-900";
            iconColor = "text-blue-500";
            animClass = "animate-bounce";
          } else if (condition.includes("雲") || condition.includes("陰")) {
            Icon = Cloud;
            bgStyle = "bg-gradient-to-br from-stone-50 to-gray-200 border-stone-200 text-stone-700";
            iconColor = "text-stone-500";
            animClass = "animate-pulse";
          } else if (condition.includes("雪")) {
            Icon = CloudSnow;
            bgStyle = "bg-gradient-to-br from-slate-50 to-sky-100 border-sky-200 text-sky-900";
            iconColor = "text-sky-500";
            animClass = "animate-pulse";
          }

          return (
            <button
              key={day}
              onClick={() => onScrollToDay(day)}
              // 恢復原本的尺寸：w-20, p-2.5, rounded-2xl
              className={`flex-shrink-0 w-20 backdrop-blur-sm border rounded-2xl p-2.5 shadow-sm active:scale-95 transition-all text-center group hover:shadow-md flex flex-col items-center gap-1 ${bgStyle}`}
            >
              {/* 恢復原本的字體大小：text-xl */}
              <div className="flex items-baseline gap-1 justify-center">
                <span className="text-xl font-serif font-black leading-none">{day}</span>
                <span className="text-[10px] font-bold leading-none uppercase opacity-60">Day</span>
              </div>
              
              {/* 恢復原本的日期字體大小：text-[9px] */}
              <div className="text-[9px] font-bold leading-none truncate w-full mt-1 opacity-80">
                {formattedDate} ({dayOfWeek})
              </div>
              
              {/* 恢復原本單行排版的迷你天氣列 */}
              {weather ? (
                <div className="mt-1 flex items-center justify-center gap-0.5 text-[9px] font-bold leading-none">
                  <Icon size={10} className={`${iconColor} ${animClass}`} />
                  <span className="truncate">{weather.temp.split('~')[1] || weather.temp}</span>
                </div>
              ) : (
                <div className="mt-1 text-[8px] text-stone-400 font-bold italic leading-none">無資訊</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const scrollToDay = (day) => {
  const element = document.getElementById(`day-section-${day}`);
  if (element) {
    // 修正：改回 scrollIntoView，讓瀏覽器自動處理內部容器的滾動
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

// --- ★ 垂直堆疊+大圖片+移除 Icon 版行程卡片 (Stitch 設計款) ---
const ItineraryCard = ({
  item,
  onSelect,
  onEdit,
  onDelete,
  onMap,
  members,
}) => {
  const typeConfig = {
    sightseeing: { iconColor: "text-[#68577b]", label: "景點" },
    food: { iconColor: "text-orange-500", label: "餐廳" },
    transport: { iconColor: "text-emerald-500", label: "交通" },
    flight: { iconColor: "text-sky-500", label: "航班" },
    accommodation: { iconColor: "text-rose-500", label: "住宿" },
    activity: { iconColor: "text-stone-500", label: "活動" },
  };

  const config = typeConfig[item.category] || typeConfig.activity;
  const author = members?.[item.createdBy] || {};

  return (
    <div
      onClick={() => onSelect(item)}
      // 1. 卡片外殼改為垂直佈局 (flex-col) 且移除 padding，讓圖片滿版
      className="flex flex-col gap-0 p-0 rounded-3xl bg-white/60 backdrop-blur-md border border-white/60 hover:bg-white/90 transition-all duration-300 mb-6 group relative cursor-pointer shadow-[0_8px_30px_rgba(104,87,123,0.06)] hover:shadow-[0_8px_30px_rgba(104,87,123,0.1)] overflow-hidden"
    >
      {/* 2. 頂部大圖片區塊 (如果有上傳照片) */}
      {item.image && (
        <div className="relative w-full h-20 sm:h-24 overflow-hidden rounded-t-3xl border-b border-white">
          <img 
            src={item.image} 
            alt={item.location} 
            className="w-full h-full object-cover opacity-95 group-hover:opacity-100 transition-opacity" 
          />
        </div>
      )}

      {/* 3. 下方資訊區塊 (獨立 padding) */}
      <div className="p-5 pt-4 relative">
        {/* 操作按鈕 (移動到資訊區塊的右上角) */}
        <div className="absolute top-3 right-3 flex gap-1 z-10 opacity-100 bg-white/80 backdrop-blur-md rounded-xl p-1 shadow-sm border border-stone-100/50">
          <button onClick={(e) => { e.stopPropagation(); onMap(item.location); }} className="p-1.5 text-stone-400 hover:text-[#68577b] rounded-lg transition-colors"><Navigation size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg transition-colors"><Edit size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(item); }} className="p-1.5 text-stone-400 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={14} /></button>
        </div>

        {/* 時間與分類標籤 (移除了 Icon，只顯示文字) */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[12px] font-bold text-stone-500 font-mono bg-white/80 px-2 py-0.5 rounded-md shadow-sm border border-stone-100/50">
            {item.time}
          </span>
          <span className="w-1 h-1 rounded-full bg-stone-300"></span>
          <span className={`text-[11px] font-bold uppercase tracking-widest ${config.iconColor}`}>
            {config.label}
          </span>
        </div>
        
        {/* 地點名稱 (字體調大一點，text-xl) */}
        <h4 className="font-serif text-xl font-bold text-stone-900 truncate leading-tight mb-2">
          {item.location}
        </h4>
        
        {/* 備註 (完整顯示，支援換行) */}
        {item.notes && (
          <div className="text-[12px] text-stone-500 mt-2 leading-relaxed break-words">
            <LinkText text={item.notes} />
          </div>
        )}

        {/* 建立者的頭像 */}
        {author.nickname && (
          <div className="flex items-center gap-1.5 mt-3 opacity-80 text-[11px]">
            <UserBadge nickname={author.nickname} emoji={author.emoji} color={author.color} size="sm" />
            <span className="text-stone-400 font-medium">by {author.nickname}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const MapView = ({ points }) => {
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [routeError, setRouteError] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);

  const items = points || [];
  
  // 🌟 修正重點 1：不再隨便切斷航班前面的行程！
  // 直接抓取這一天「所有」帶有座標的景點
  const effectivePoints = items.filter(p => p.lat && p.lng);

  useEffect(() => {
    setDirectionsResponse(null); 
    setRouteError(false);
    
    // 🌟 修正重點 2：為了避免「跨海航班」導致 Google Maps 開車路線報錯
    // 規劃路線時，把 'flight' 類別排除，只對陸地景點進行連線
    const landPoints = effectivePoints.filter(p => p.category !== 'flight');

    if (landPoints.length >= 2 && window.google) {
      const directionsService = new window.google.maps.DirectionsService();
      
      const origin = { lat: landPoints[0].lat, lng: landPoints[0].lng };
      const destination = { lat: landPoints[landPoints.length - 1].lat, lng: landPoints[landPoints.length - 1].lng };
      const waypoints = landPoints.slice(1, -1).map(p => ({
        location: { lat: p.lat, lng: p.lng },
        stopover: true
      }));

      directionsService.route({
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING
      }).then(response => {
        setDirectionsResponse(response);
        setRouteError(false);
      }).catch(e => {
        console.warn("陸地段路線計算失敗:", e);
        setRouteError(true); 
      });
    } else {
       // 如果陸地景點不足以連線 (例如只有1個點，或當天全是航班)
       // 強制進入「圖釘模式」，不畫線
       setRouteError(true);
    }
  }, [points]); 

  // 自動縮放地圖以包含所有點位
  useEffect(() => {
    if (mapInstance && effectivePoints.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      effectivePoints.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
      mapInstance.fitBounds(bounds);
    }
  }, [mapInstance, effectivePoints, routeError]);

  if (!effectivePoints.length) {
    return <div className="w-full h-[250px] bg-white/50 flex items-center justify-center rounded-2xl mb-2 text-stone-400 text-sm border border-white shadow-sm">無座標資訊，請嘗試重新編輯地點並點擊下拉選單</div>;
  }

  const center = { lat: effectivePoints[0].lat, lng: effectivePoints[0].lng };

  return (
    <div className="w-full h-[250px] shadow-sm border border-white rounded-2xl z-0 relative mb-2 overflow-hidden">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={12}
        options={{ disableDefaultUI: true }}
        onLoad={map => setMapInstance(map)}
      >
        {/* 顯示各點圖釘 (包含航班，只要它有座標就會標出來) */}
        {(effectivePoints.length === 1 || routeError) && effectivePoints.map((p, idx) => (
          <Marker key={idx} position={{ lat: p.lat, lng: p.lng }} />
        ))}
        
        {/* 顯示計算出的陸地導航路線 */}
        {directionsResponse && !routeError && (
          <DirectionsRenderer directions={directionsResponse} />
        )}
      </GoogleMap>
    </div>
  );
};
// --- 修改：更細窄精緻的折疊地圖按鈕 ---
const DayMapPreview = ({ points }) => {
  const [isOpen, setIsOpen] = useState(false);

  const validPoints = (points || []).filter(p => p.lat && p.lng);
  const hasRoute = validPoints.length >= 1; // 只要有1個座標就顯示

  if (!hasRoute) return null;

  return (
    <div className="mb-4 px-1 animate-in fade-in duration-500 w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white/70 backdrop-blur-md border border-white shadow-[0_4px_12px_rgba(104,87,123,0.05)] rounded-2xl py-2.5 px-4 flex items-center justify-between text-stone-900 hover:bg-white hover:shadow-[0_6px_16px_rgba(104,87,123,0.08)] transition-all active:scale-95 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#eedbff] to-[#eadef1] text-[#68577b] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
            <Map size={14} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif font-bold text-[13px] leading-tight">路線總覽</span>
            <span className="text-[9px] text-[#b4a0c8] tracking-widest font-mono">MAP</span>
          </div>
        </div>
        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-stone-50 transition-colors group-hover:bg-[#eedbff]/50">
          <ChevronRight 
            size={14} 
            className={`text-[#b4a0c8] group-hover:text-[#68577b] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? "rotate-90" : ""}`} 
          />
        </div>
      </button>

      {/* 地圖展開區域 */}
      <div 
        className={`w-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden ${
          isOpen ? "max-h-[350px] opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
        }`}
      >
        <MapView points={points} />
      </div>
    </div>
  );
};

const WelcomeScreen = ({
  onCreate,
  onImportTrip,
  onJoin,
  isCreating,
  isJoining,
  showToast,
}) => {
  const [joinId, setJoinId] = useState("");
  const [mode, setMode] = useState("home");
  const [newTripData, setNewTripData] = useState({
    destination: "",
    startDate: "",
    endDate: "",
  });
  const [history, setHistory] = useState([]);
  const [duration, setDuration] = useState(0);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImportLoading, setIsImportLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("myTravelHistory");
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (newTripData.startDate && newTripData.endDate) {
      const start = new Date(newTripData.startDate);
      const end = new Date(newTripData.endDate);
      if (end >= start)
        setDuration(
          Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1
        );
      else setDuration(0);
    } else setDuration(0);
  }, [newTripData.startDate, newTripData.endDate]);

  const handleStartDateChange = (e) => {
    const val = e.target.value;
    setNewTripData((prev) => {
      const newData = { ...prev, startDate: val };
      if (prev.endDate && val > prev.endDate) newData.endDate = "";
      return newData;
    });

    if (val) {
      setTimeout(() => {
        const endInput = document.getElementById("endDateInput");
        endInput?.focus();
      }, 100);
    }
  };

  const setQuickDuration = (days) => {
    if (!newTripData.startDate) {
      showToast("請先選擇出發日期", "error");
      return;
    }
    const start = new Date(newTripData.startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + (days - 1));
    setNewTripData({
      ...newTripData,
      endDate: end.toISOString().split("T")[0],
    });
  };

  const handleCreateSubmit = () => {
    if (
      !newTripData.destination ||
      !newTripData.startDate ||
      !newTripData.endDate
    ) {
      showToast("請完整填寫目的地與日期", "error");
      return;
    }
    if (newTripData.endDate < newTripData.startDate) {
      showToast("回程日期有誤", "error");
      return;
    }
    onCreate(newTripData);
  };

  const handleFileAnalyze = async (file) => {
    setIsImportLoading(true);
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
      });

      const prompt = `這是一份旅遊行程表（可能是圖片或PDF）。請分析並提取以下資訊回傳 JSON (純JSON，不要Markdown)：{"name": "旅程名稱", "destination": "主要城市", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "itinerary": [{"day": 數字, "time": "HH:MM", "location": "地點", "category": "sightseeing|food|transport|flight", "notes": "備註"}]}`;

      const payload = [
        { text: prompt },
        { inlineData: { mimeType: file.type, data: base64Data } },
      ];

      const resText = await callGeminiAPI(payload);
      if (!resText) throw new Error("AI analysis failed");

      const result = JSON.parse(resText.replace(/```json|```/g, "").trim());

      setIsImportOpen(false);
      onImportTrip(result);
    } catch (e) {
      console.error(e);
      showToast("匯入失敗，請確認檔案格式", "error");
    } finally {
      setIsImportLoading(false);
    }
  };

  if (mode === "create") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#faf9f4] p-6 font-sans">
        <FileImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onImport={handleFileAnalyze}
          isLoading={isImportLoading}
        />
        <div className="w-full max-w-md bg-white p-8 rounded-[2.5rem] shadow-[0_20px_60px_rgba(104,87,123,0.1)] border border-white space-y-6 animate-in zoom-in-95 duration-300">
          <div className="flex items-center gap-2 text-stone-900 mb-2">
            <button
              onClick={() => setMode("home")}
              className="p-2 bg-stone-50 hover:bg-[#eadef1]/50 rounded-full transition-colors"
            >
              <ChevronRight className="rotate-180" size={20} />
            </button>
            <h2 className="text-2xl font-serif font-bold">建立新旅程</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#b4a0c8] uppercase tracking-wider ml-1 mb-1 block">
                目的地
              </label>
              <input
                type="text"
                placeholder="例如：京都, 日本"
                className="w-full bg-stone-50 border border-transparent rounded-2xl p-4 outline-none focus:bg-white focus:border-[#eadef1] focus:ring-2 focus:ring-[#eedbff] transition-all text-stone-900 font-medium"
                value={newTripData.destination}
                onChange={(e) =>
                  setNewTripData({
                    ...newTripData,
                    destination: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end px-1">
                <label className="text-xs font-bold text-[#b4a0c8] uppercase tracking-wider">
                  旅遊日期
                </label>
                {duration > 0 && (
                  <span className="text-[10px] font-bold bg-[#68577b] text-white px-3 py-1 rounded-full animate-in zoom-in spin-in-3 shadow-sm">
                    ✈️ {duration} 天 {duration - 1} 夜
                  </span>
                )}
              </div>

              <div className="bg-stone-50 border border-transparent rounded-3xl p-1 focus-within:ring-2 focus-within:ring-[#eedbff] focus-within:border-[#eadef1] focus-within:bg-white transition-all">
                <div className="flex items-center divide-x divide-stone-200">
                  <div className="flex-1 px-4 py-3 relative group">
                    <label className="absolute top-2 left-4 text-[9px] font-bold text-[#b4a0c8] uppercase">
                      DEPART
                    </label>
                    <input
                      type="date"
                      className="w-full bg-transparent pt-4 pb-1 font-bold text-stone-900 outline-none text-sm font-mono cursor-pointer h-full"
                      value={newTripData.startDate}
                      onChange={handleStartDateChange}
                    />
                  </div>

                  <div className="px-2 text-stone-300">
                    <ArrowRight size={16} />
                  </div>

                  <div className="flex-1 px-4 py-3 relative group">
                    <label className="absolute top-2 left-4 text-[9px] font-bold text-[#b4a0c8] uppercase">
                      RETURN
                    </label>
                    <input
                      type="date"
                      id="endDateInput"
                      className="w-full bg-transparent pt-4 pb-1 font-bold text-stone-900 outline-none text-sm font-mono cursor-pointer disabled:opacity-30"
                      value={newTripData.endDate}
                      min={newTripData.startDate}
                      disabled={!newTripData.startDate}
                      onChange={(e) =>
                        setNewTripData({
                          ...newTripData,
                          endDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {newTripData.startDate && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-300 pt-2">
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 4, 5, 7].map((d) => (
                      <button
                        key={d}
                        onClick={() => setQuickDuration(d)}
                        className={`py-3 rounded-2xl text-xs font-bold transition-all active:scale-95 border ${
                          duration === d
                            ? "bg-[#68577b] text-white border-[#68577b] shadow-md transform scale-105"
                            : "bg-white border-stone-200 text-stone-500 hover:border-[#b4a0c8] hover:bg-[#faf9f4]"
                        }`}
                      >
                        {d}天
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <button
              onClick={handleCreateSubmit}
              disabled={isCreating}
              className="w-full bg-[#68577b] text-white font-bold py-4 rounded-2xl hover:bg-[#504062] transition-all shadow-[0_8px_20px_rgba(104,87,123,0.3)] flex justify-center items-center gap-2 active:scale-95"
            >
              {isCreating ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  建立專屬旅程 <Plane size={18} />
                </>
              )}
            </button>
            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-stone-100"></div>
              <span className="flex-shrink mx-4 text-stone-300 text-xs font-bold uppercase tracking-widest">
                OR
              </span>
              <div className="flex-grow border-t border-stone-100"></div>
            </div>
            <button
              onClick={() => setIsImportOpen(true)}
              className="w-full bg-[#eedbff]/50 text-[#68577b] font-bold py-4 rounded-2xl hover:bg-[#eedbff] transition-all flex justify-center items-center gap-2 border border-[#eadef1] active:scale-95"
            >
              <Upload size={18} /> 從檔案匯入 (PDF/圖片)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#faf9f4] p-6 font-sans">
      <div className="w-full max-w-md text-center space-y-10 animate-in fade-in zoom-in duration-700">
        
        {/* Stitch Style Hero Logo */}
        <div className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-[#eadef1] to-[#d3bee8] rounded-[2.5rem] shadow-[0_20px_40px_rgba(104,87,123,0.2)] border border-white">
          <Sparkles className="w-12 h-12 text-stone-900" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-serif font-black text-stone-900 tracking-tight">
            旅路 <span className="italic text-[#68577b]">TABIJI</span>
          </h1>
          <p className="text-stone-500 text-sm tracking-widest uppercase">Your Journey, Refined.</p>
        </div>

        <div className="space-y-4 pt-6">
          <button
            onClick={() => setMode("create")}
            className="w-full bg-[#68577b] text-white font-medium py-4 rounded-2xl hover:bg-[#504062] transition-all active:scale-95 shadow-[0_10px_30px_rgba(104,87,123,0.3)] flex items-center justify-center gap-2"
          >
            <Plus size={20} /> 開始新旅程
          </button>
          <div className="relative">
            <input
              type="text"
              placeholder="輸入邀請碼 (Trip ID)"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              className="w-full bg-white border border-white shadow-sm rounded-2xl py-4 px-6 text-center text-stone-900 font-mono tracking-widest focus:ring-2 focus:ring-[#eadef1] outline-none transition-all placeholder:text-stone-300 placeholder:tracking-normal placeholder:font-sans"
            />
          </div>
          <button
            onClick={() => {
              if (!joinId.trim()) {
                showToast("請輸入代碼", "error");
                return;
              }
              onJoin(joinId);
            }}
            disabled={isJoining}
            className="w-full text-[#b4a0c8] hover:text-[#68577b] font-bold tracking-wider py-2 transition-colors text-sm uppercase"
          >
            {isJoining ? "加入中..." : "Join Existing →"}
          </button>
        </div>

        {history.length > 0 && (
          <div className="pt-10 w-full text-left">
            <div className="flex items-center gap-2 text-[#b4a0c8] mb-4 ml-2">
              <History size={16} />
              <span className="text-xs font-bold tracking-widest uppercase">
                最近的旅程
              </span>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {history.map((h) => (
                <div
                  key={h.id}
                  onClick={() => onJoin(h.id)}
                  className="bg-white border border-white shadow-sm p-4 rounded-2xl flex justify-between items-center hover:border-[#eadef1] hover:shadow-md cursor-pointer transition-all active:scale-95 group"
                >
                  <div>
                    <div className="font-serif font-bold text-lg text-stone-900 group-hover:text-[#68577b] transition-colors leading-tight mb-1">
                      {h.name || "未命名旅程"}
                    </div>
                    <div className="text-[10px] text-stone-400 flex gap-2 font-medium tracking-wide">
                      <span>{h.destination || "未知地點"}</span>
                      <span>•</span>
                      <span className="font-mono">
                        {h.date
                          ? new Date(h.date).toLocaleDateString()
                          : "未設定日期"}
                      </span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-[#eedbff] transition-colors">
                     <ChevronRight
                       size={16}
                       className="text-stone-300 group-hover:text-[#68577b]"
                     />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const App = () => {
  // 從環境變數讀取 Key
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: libraries,
    language: "zh-TW",
    region: "TW",
  }); 
  // --- 1. 狀態定義 ---
  const [user, setUser] = useState(null);
  const [tripId, setTripId] = useState(null);
  const [tripData, setTripData] = useState(null);
  const [localTripName, setLocalTripName] = useState("");
  const [newChecklistText, setNewChecklistText] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false); 
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("itinerary");
  const [toast, setToast] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const imgRef = useRef(null);
  const [itemData, setItemData] = useState({});
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
  const [selectedItem, setSelectedItem] = useState(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editReplyContent, setEditReplyContent] = useState("");
  const [aiAnalysisResult, setAiAnalysisResult] = useState({
    isOpen: false,
    title: "",
    content: "",
    isDebtAnalysis: false,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [firebaseError, setFirebaseError] = useState(null);
  const [posterTheme, setPosterTheme] = useState(null);
  const [transportMode, setTransportMode] = useState("driving");
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);

  // --- 2. 輔助函式 ---
  const showToast = (message, type = "success") => setToast({ message, type });

  // --- 3. Effects ---
  useEffect(() => {
    if (tripData?.name) {
      setLocalTripName(tripData.name);
    }
  }, [tripData?.name]);

  const handleSaveName = async () => {
    if (!tripId || localTripName === tripData?.name) return;
    try {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId),
        { name: localTripName }
      );
      showToast("旅程名稱已更新");
    } catch (e) {
      showToast("更新失敗", "error");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTripId = params.get('tripId');
    if (urlTripId) {
      setTripId(urlTripId.toUpperCase());
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleDateUpdate = async (field, value) => {
    if (!tripId) return;
    setTripData((prev) => ({ ...prev, [field]: value }));
    try {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId),
        { [field]: value }
      );
    } catch (e) {
      console.error("Date update failed", e);
      showToast("日期更新失敗", "error");
    }
  };

  const copyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand("copy");
      if (successful) showToast("已複製");
      else
        navigator.clipboard
          .writeText(text)
          .then(() => showToast("已複製"))
          .catch(() => showToast("複製失敗", "error"));
    } catch (err) {
      showToast("複製失敗", "error");
    }
    document.body.removeChild(textArea);
  };

  const handleExportExcel = () => {
    if (!tripData?.itinerary?.length) {
      showToast("行程是空的，無法匯出", "error");
      return;
    }

    if (!window.XLSX) {
      showToast("Excel 工具尚未載入，請重新整理網頁", "error");
      return;
    }

    const data = tripData.itinerary
      .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))
      .map((item) => ({
        "Day": `Day ${item.day}`,
        "時間": item.time,
        "地點": item.location,
        "分類": item.category,
        "備註": item.guideInfo || item.notes || "",
      }));

    const ws = window.XLSX.utils.json_to_sheet(data);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "行程表");
    window.XLSX.writeFile(wb, `${tripData.name}_行程表.xlsx`);
    showToast("Excel 下載成功！");
  };

  const handleExportImage = async () => {
    if (!tripData?.itinerary?.length) return;
    setIsAnalyzing(true);

    try {
      const prompt = `
        你是一位旅遊手帳設計師。針對行程 "${tripData.name}" (${tripData.destination})，請設計一個簡約風格的插畫指令。
        請回傳 JSON (不要 Markdown): 
        {
          "imagePrompt": "一段英文繪圖指令，描述代表該地的一個小物件或地標 (例如: 'Cute minimalist watercolor sticker of Tokyo Tower, white background' 或 'Simple line art of a suitcase and croissant, white background')。風格必須是 'Minimalist Watercolor' (極簡水彩) 或 'Flat Vector Icon' (扁平圖示)，背景必須是純白 (White Background)，不要複雜背景。",
          "themeColor": "一個適合該城市的粉嫩色系 (HEX碼，例如 #FFF5F5 或 #F0F9FF，用來做海報底色)",
          "borderColor": "邊框顏色 (通常是深色或對比色，例如 #333333 或 #8B5CF6)",
          "title": "手帳標題(10字內)",
          "quote": "一句短語"
        }
      `;
      
      const res = await callGeminiAPI([{ text: prompt }]);
      if (!res) throw new Error("AI Text Failed");
      
      let cleanJson = res;
      const firstBracket = res.indexOf('{');
      const lastBracket = res.lastIndexOf('}');
      if (firstBracket !== -1 && lastBracket !== -1) {
        cleanJson = res.substring(firstBracket, lastBracket + 1);
      }
      const theme = JSON.parse(cleanJson);

      let aiImageUrl = await callImagenAPI(theme.imagePrompt);
      
      if (!aiImageUrl) {
        console.log("切換至 Pollinations 備用繪圖引擎");
        const encoded = encodeURIComponent(theme.imagePrompt);
        aiImageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=1024&nologo=true&seed=${Math.random()}`;
      }

      setPosterTheme({ ...theme, bgImage: aiImageUrl });

      await new Promise((resolve) => {
        const img = new Image();
        img.src = aiImageUrl;
        img.crossOrigin = "anonymous";
        img.onload = resolve;
        img.onerror = resolve; 
      });
      
      await new Promise(r => setTimeout(r, 1500));

      const element = document.getElementById("hidden-poster-area");
      if (element && window.html2canvas) {
        const canvas = await window.html2canvas(element, {
          scale: 3, 
          useCORS: true, 
          allowTaint: true,
          backgroundColor: null,
          scrollX: 0, 
          scrollY: 0, 
          x: 0, 
          y: 0,
          width: element.offsetWidth,
          height: element.offsetHeight,
        });
        
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `${tripData.name}_精美海報.png`;
        link.click();
        showToast("✨ AI 美圖生成成功！");
      }
    } catch (e) {
      console.error(e);
      showToast("圖片生成失敗", "error");
    } finally {
      setIsAnalyzing(false);
      setPosterTheme(null);
    }
  };
  
  const addToHistory = (id, data) => {
    try {
      const current = JSON.parse(
        localStorage.getItem("myTravelHistory") || "[]"
      );
      const filtered = current.filter((x) => x.id !== id);
      const newItem = {
        id,
        name: data.name,
        destination: data.destination,
        date: data.startDate,
        timestamp: Date.now(),
      };
      localStorage.setItem(
        "myTravelHistory",
        JSON.stringify([newItem, ...filtered].slice(0, 10))
      );
    } catch (e) {}
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== "undefined" && __initial_auth_token)
          await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch (e) {
        console.error("Auth error:", e);
        setFirebaseError(e);
        showToast("Firebase 連線失敗，請檢查設定", "error");
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // --- 自動更新匯率監控 (新增在此) ---
useEffect(() => {
  // 如果不是在編輯記帳，或是幣別是台幣，就不執行
  if (activeTab !== "expenses" || !isModalOpen || itemData.currency === "TWD") {
    if (itemData.currency === "TWD" && itemData.exchangeRate !== 1) {
       setItemData(prev => ({ ...prev, exchangeRate: 1 }));
    }
    return;
  }

  const updateRate = async () => {
    const rate = await fetchExchangeRate(itemData.currency);
    if (rate) {
      setItemData(prev => ({
        ...prev,
        exchangeRate: rate,
        // 如果已經有輸入外幣，順便幫使用者算好台幣
        amount: prev.foreignAmount ? Math.round(prev.foreignAmount * rate) : prev.amount
      }));
    }
  };
  updateRate();
}, [itemData.currency, isModalOpen]); // 當幣別切換或視窗打開時觸發
  
  useEffect(() => {
    if (!user || !tripId) return;
    const unsubscribe = onSnapshot(
      doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTripData(data);
          addToHistory(tripId, data);
          
          if (!data.members || !data.members[user.uid]) {
            if (data.members && Object.keys(data.members).length > 0) {
              setShowMemberSelect(true);
            } else {
              setShowProfileSetup(true);
            }
          } else {
            setShowMemberSelect(false);
            setShowProfileSetup(false);
          }
        } else {
          showToast("找不到旅程", "error");
          setTripId(null);
        }
      }
    );
    return () => unsubscribe();
  }, [user, tripId]);

  const createTrip = async ({ destination, startDate, endDate }) => {
    if (!user) return;
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const initialData = {
      id: newId,
      name: `${destination} 之旅`,
      destination,
      startDate,
      endDate,
      itinerary: [],
      expenses: [],
      createdBy: user.uid,
      weather: {},
      members: {},
    };
    await setDoc(
      doc(db, "artifacts", appId, "public", "data", "travel_trips", newId),
      initialData
    );
    setTripId(newId);
    updateTripWeather(newId, destination, startDate, endDate, []);
  };

  const createTripFromImport = async (importData) => {
    if (!user) return;
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const processedItinerary = (importData.itinerary || []).map((item) => ({
      ...item,
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      createdBy: user.uid,
      category: item.category || "sightseeing",
    }));
    const initialData = {
      id: newId,
      name: importData.name || "匯入的旅程",
      destination: importData.destination || "未知地點",
      startDate: importData.startDate || "",
      endDate: importData.endDate || "",
      itinerary: processedItinerary,
      expenses: [],
      createdBy: user.uid,
      weather: {},
      members: {},
    };
    await setDoc(
      doc(db, "artifacts", appId, "public", "data", "travel_trips", newId),
      initialData
    );
    setTripId(newId);
if (initialData.destination && initialData.startDate) {
      updateTripWeather(newId, initialData.destination, initialData.startDate, initialData.endDate, processedItinerary);
    }
    showToast("旅程匯入成功！");
  };

  const handleProfileSubmit = async (profileData) => {
    if (!user || !tripId) return;
    const tripRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "travel_trips",
      tripId
    );
    const updatedMembers = {
      ...(tripData.members || {}),
      [user.uid]: profileData,
    };
    await updateDoc(tripRef, { members: updatedMembers });
    setShowProfileSetup(false);
    showToast(`歡迎加入，${profileData.nickname}！`);
  };

  const handleJoinAsMember = async (targetUid, targetMemberData) => {
    if (!user || !tripId) return;
    setShowMemberSelect(false);
    
    const tripRef = doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId);
    
    const newMembers = { ...(tripData.members || {}) };
    delete newMembers[targetUid];
    newMembers[user.uid] = targetMemberData;
    
    const newItinerary = (tripData.itinerary || []).map(item => {
      if (item.createdBy === targetUid) {
        return { ...item, createdBy: user.uid };
      }
      return item;
    });

    try {
      await updateDoc(tripRef, { 
        members: newMembers,
        itinerary: newItinerary
      });
      showToast(`身分已轉移！歡迎回來，${targetMemberData.nickname}`);
    } catch (e) {
      console.error(e);
      showToast("身分轉移失敗", "error");
    }
  };

  const handleFileImport = async (file) => {
    setIsImportLoading(true);
    setIsImportOpen(false);

    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
      });

      const prompt = `這是一份旅遊行程表。請分析並回傳 JSON Array：- "day": 數字 - "time": "HH:MM" - "location": 地點 - "category": "sightseeing|food|transport|flight" - "notes": 備註`;
      
      const payload = [
        { text: prompt },
        {
          inlineData: {
            mimeType: file.type,
            data: base64Data,
          },
        },
      ];

      const resText = await callGeminiAPI(payload);
      
      if (!resText) throw new Error("AI analysis failed");

      const cleanJson = resText.replace(/```json|```/g, "").trim();
      const newItems = JSON.parse(cleanJson).map((item) => ({
        ...item,
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        createdBy: user.uid,
      }));

      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId),
        { itinerary: [...(tripData.itinerary || []), ...newItems] }
      );

      showToast(`成功匯入 ${newItems.length} 個行程！`);

    } catch (e) {
      console.error(e);
      showToast("匯入失敗或無法判讀檔案", "error");
      setIsImportOpen(true); 
    } finally {
      setIsImportLoading(false);
    }
  };

  const getWeatherDesc = (code) => {
    const codes = {
0: "晴朗", 1: "晴朗", 2: "多雲", 3: "陰天",
      45: "起霧", 48: "起霧",
      51: "毛毛雨", 53: "毛毛雨", 55: "毛毛雨",
      61: "下雨", 63: "下雨", 65: "豪大雨",
      71: "下雪", 73: "下雪", 75: "暴雪",
      80: "陣雨", 81: "陣雨", 82: "強陣雨",
      95: "雷雨", 96: "雷雨", 99: "雷雨"
    };
    return codes[code] || "多雲";
  };

// --- 整合版：智能氣象中心 ---
  const updateTripWeather = async (id, destination, startDate, endDate, itinerary = []) => {
    if (!destination || !startDate) return;

    // 1. 基本設定與日期限制
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxAllowedDate = new Date(today);
    maxAllowedDate.setDate(maxAllowedDate.getDate() + 14);

    const formatDateString = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // 2. 取得旅程總天數與分組
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(start);
    if (!endDate) end.setDate(start.getDate() + 6);

    const totalDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
    const grouped = (itinerary || []).reduce((acc, item) => {
      const day = item.day || 1;
      if (!acc[day]) acc[day] = [];
      acc[day].push(item);
      return acc;
    }, {});

    showToast("正在同步每日精準氣象...", "success");

    try {
      // 3. 獲取總目的地的預設座標 (作為無行程天數的備案)
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`);
      const geoData = await geoRes.json();
      const defaultCoords = geoData[0] ? { lat: geoData[0].lat, lng: geoData[0].lon } : null;

      const newWeatherMap = {};

      // 4. 針對每一天進行氣象掃描
      const fetchPromises = Array.from({ length: totalDays }, (_, i) => i + 1).map(async (dayNum) => {
        const targetDate = new Date(start);
        targetDate.setDate(targetDate.getDate() + (dayNum - 1));
        
        // 跳過過期或太遠的日期
        if (targetDate > maxAllowedDate || targetDate < today) return;
        const dateStr = formatDateString(targetDate);

        // 優先權：1. 當天最早且有座標的景點 -> 2. 旅程總目的地座標
        const firstValidItem = (grouped[dayNum] || [])
          .sort((a, b) => a.time.localeCompare(b.time))
          .find(i => i.lat && i.lng);

        const lat = firstValidItem?.lat || defaultCoords?.lat;
        const lng = firstValidItem?.lng || defaultCoords?.lng;

        if (!lat || !lng) return;

        try {
          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;
          const res = await fetch(weatherUrl);
          const data = await res.json();

          if (data.daily) {
            newWeatherMap[dateStr] = {
              date: dateStr,
              temp: `${Math.round(data.daily.temperature_2m_min[0])}~${Math.round(data.daily.temperature_2m_max[0])}°C`,
              condition: getWeatherDesc(data.daily.weathercode[0]),
              locationName: firstValidItem?.location || destination // 標註來源
            };
          }
        } catch (e) { console.warn(`Day ${dayNum} 失敗`, e); }
      });

      await Promise.all(fetchPromises);

      // 5. 更新到 Firestore
      await updateDoc(doc(db, "artifacts", appId, "public", "data", "travel_trips", id), {
        weather: newWeatherMap
      });
      showToast("全行程氣象已同步！");

    } catch (e) {
      console.error(e);
      showToast("氣象更新失敗", "error");
    }
  };

  const handleAIAnalyze = async () => {
    if (!tripData?.itinerary?.length) {
      showToast("行程是空的", "error");
      return;
    }
    
    setIsAnalyzing(true);

    try {
      const res = await callGeminiAPI([
        {
          text: `分析以下旅遊行程 JSON：${JSON.stringify(
            tripData.itinerary.map((i) => ({ id: i.id, location: i.location }))
          )}。
          
          請回傳 JSON Array，包含以下欄位：
          1. "id": 對應原本的 id
          2. "guideInfo": 景點介紹 (30字內)。
             **重要規則：如果地點是「一般地名」(如：飯店、機場、車站、便利商店) 或「無法辨識的亂碼」，請將 guideInfo 設為空字串 ""，絕對不要硬掰。**
          3. "tags": [{"type":"mustEat"|"mustBuy"|"reservation"|"story", "text":"標籤"}]`,
        },
      ]);

      if (!res) throw new Error("AI Failed");

      const cleanJson = res.replace(/```json|```/g, "").trim();
      const enrichedData = JSON.parse(cleanJson);

      const newItinerary = tripData.itinerary.map((item) => {
        const enrichment = enrichedData.find((e) => e.id === item.id);
        
        return enrichment ? { ...item, ...enrichment } : item;
      });

      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId),
        { itinerary: newItinerary }
      );

      showToast("導遊分析完成！");
    } catch (e) {
      console.error(e);
      showToast("分析失敗，請稍後再試", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeOptimize = async () => {
    if (!tripData?.itinerary?.length) {
      showToast("行程是空的", "error");
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      const days = [...new Set(tripData.itinerary.map(i => i.day))];
      const dayStartTimes = {};
      days.forEach(day => {
        const items = tripData.itinerary.filter(i => i.day === day).sort((a, b) => a.time.localeCompare(b.time));
        if (items.length > 0) dayStartTimes[day] = items[0].time;
      });

      const modeText = transportMode === "driving" ? "開車(Driving)" : "大眾運輸(Public Transit)";

      const res = await callGeminiAPI([
        {
          text: `你是一個專業的旅遊規劃師。
          
          請根據以下規則重新安排行程順序：
          1. 移動方式：${modeText}。
          2. 目標：最小化交通時間，讓路線最順暢。
          3. **時間重算**：請以每一天的「起始時間」(${JSON.stringify(dayStartTimes)}) 為準，根據景點停留時間(假設每站1.5小時)加上交通時間，重新計算每個景點的 "time"。
          4. 只能調整同一天內的順序，不要跨天移動。
          
          輸入 JSON: ${JSON.stringify(
            tripData.itinerary.map((i) => ({
              id: i.id,
              day: i.day,
              originalTime: i.time,
              location: i.location,
            }))
          )}。
          
          回傳 JSON Array (包含 id, day, time)。
          **注意：嚴禁包含任何說明文字、前言或後記，只能回傳純 JSON 資料，以 [ 開頭並以 ] 結尾。**`
        },
      ]);

      if (!res) throw new Error("AI Failed");
      
      let cleanJson = res;
      const firstBracket = res.indexOf('[');
      const lastBracket = res.lastIndexOf(']');
      
      if (firstBracket !== -1 && lastBracket !== -1) {
        cleanJson = res.substring(firstBracket, lastBracket + 1);
      } else {
        cleanJson = res.replace(/```json|```/g, "").trim();
      }
      const optimized = JSON.parse(cleanJson);

      const newItinerary = optimized
        .map((o) => {
          const orig = tripData.itinerary.find((i) => i.id === o.id);
          return orig ? { ...orig, day: o.day, time: o.time } : null;
        })
        .filter(Boolean);

      const finalItinerary = [
        ...newItinerary,
        ...tripData.itinerary.filter((i) => !newItinerary.find((n) => n.id === i.id))
      ];

      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId),
        { itinerary: finalItinerary }
      );

      showToast(`已根據${transportMode === "driving" ? "開車" : "大眾運輸"}路線優化完畢！`);
    } catch (e) {
      console.error(e);
      showToast("優化失敗，請稍後再試", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const OptimizeModal = () => {
    if (!showOptimizeModal) return null;
    return (
      <div className="absolute inset-0 z-[80] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
        <div className="bg-[#faf9f4] w-full max-w-xs rounded-[2rem] p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white">
          <h3 className="text-xl font-serif font-bold text-stone-900 mb-4 text-center">
            路線優化設定
          </h3>
          <p className="text-sm text-stone-500 mb-6 text-center leading-relaxed">
            AI 將重新排序景點並計算時間。
          </p>
          
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setTransportMode("driving")}
              className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all shadow-sm ${
                transportMode === "driving"
                  ? "border-[#68577b] bg-white text-[#68577b]"
                  : "border-white bg-white/50 text-stone-400 hover:border-[#eadef1]"
              }`}
            >
              <Car size={24} />
              <span className="text-xs font-bold">開車</span>
            </button>
            <button
              onClick={() => setTransportMode("transit")}
              className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all shadow-sm ${
                transportMode === "transit"
                  ? "border-[#68577b] bg-white text-[#68577b]"
                  : "border-white bg-white/50 text-stone-400 hover:border-[#eadef1]"
              }`}
            >
              <Train size={24} />
              <span className="text-xs font-bold">大眾運輸</span>
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowOptimizeModal(false)}
              className="flex-1 py-3 rounded-xl bg-white border border-white text-stone-500 font-medium hover:bg-stone-50 transition-colors shadow-sm"
            >
              取消
            </button>
            <button
              onClick={() => {
                setShowOptimizeModal(false);
                executeOptimize();
              }}
              className="flex-1 py-3 rounded-xl bg-[#68577b] text-white font-medium hover:bg-[#504062] transition-colors shadow-lg"
            >
              開始優化
            </button>
          </div>
        </div>
      </div>
    );
  };

const handleCalculateDebts = async () => {
    if (!tripData?.expenses?.length) {
      showToast("沒有支出紀錄", "error");
      return;
    }

    // 1. 過濾出有意義的金額
    const validExpenses = tripData.expenses.filter((item) => {
      const amount = parseFloat(item.amount);
      return !isNaN(amount) && amount > 0;
    });

    if (validExpenses.length === 0) {
      setAiAnalysisResult({
        isOpen: true,
        title: "計算失敗",
        content: "原因：偵測不到有效的金額數字。\n請檢查您的支出紀錄，確保金額皆大於 0。",
        isDebtAnalysis: false,
        isLoading: false,
      });
      return;
    }

    // 2. 開啟 AI 等待視窗
    setAiAnalysisResult({
      isOpen: true,
      title: "AI 分帳計算",
      content: "",
      isDebtAnalysis: true,
      isLoading: true,
    });

    try {
      // 🌟 改寫後的精確 Prompt 邏輯
      const res = await callGeminiAPI([
        {
          text: `你是一個精準的旅遊財務計算機器人。請根據以下 JSON 資料計算成員間的還款：${JSON.stringify(validExpenses)}。

          ### 運算規則（務必嚴格遵守）：
          1. 逐一掃描每一筆支出物件。
          2. **檢查 isSplit 欄位**：
             - 如果 "isSplit" 為 false，該筆支出完全由 "payer" 負擔，不產生任何還款債務。
             - 如果 "isSplit" 為 true，該筆支出才需要計算債務。
          3. **計算分攤方式**：
             - 僅限 "splitWith" 陣列中列出的成員參與分攤。
             - 每人分攤額 = "amount" / ("splitWith" 陣列的人數)。
             - 注意："payer" (代墊人) 通常也會在 "splitWith" 名單內，請務必計算人數。
          4. **結算邏輯**：
             - 統計每個人「代墊的總額」與「應分攤的總額」。
             - 計算「代墊總額 - 應分攤總額 = 淨餘額」。
             - 淨餘額為正者是「收錢的人」，負者是「給錢的人」。
          5. **還款優化**：
             - 算出誰該給誰多少錢，並盡可能減少轉帳次數。

          ### 回傳規範：
          - 嚴格只回傳純 JSON Array，不准有 Markdown 標籤或解釋文字。
          - 格式：[{"from": "給錢者姓名", "to": "收錢者姓名", "amount": 四捨五入整數}]
          - 若無人欠款，回傳 []。`,
        },
      ]);

      if (!res) throw new Error("AI Failed");

      // 3. 清洗資料並顯示結果
      const cleanJson = res.replace(/```json|```/g, "").trim();
      setAiAnalysisResult((prev) => ({
        ...prev,
        content: cleanJson,
        isLoading: false,
      }));
    } catch (e) {
      console.error("AI 結算失敗:", e);
      setAiAnalysisResult((prev) => ({
        ...prev,
        content: "計算失敗，請檢查網路或金鑰權限。",
        isLoading: false,
        isDebtAnalysis: false,
      }));
    }
  };

  const handleSaveItem = async () => {
    const tripRef = doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId);

    try {
      const list = activeTab === "itinerary" ? tripData.itinerary : tripData.expenses;

      // 🌟 只要這串字超過 1000 字，代表它是一坨沒處理過的圖片代碼，就啟動上傳！
      let finalImageUrl = itemData.image || null;
      if (itemData.image && typeof itemData.image === 'string' && itemData.image.length > 1000) {
        showToast("正在上傳圖片至雲端，請稍候...", "success");
        setIsUploading(true); // 開啟上傳動畫
        
        const uploadedUrl = await uploadImageToImgBB(itemData.image);
        
        setIsUploading(false); // 關閉上傳動畫
        
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          showToast("圖片上傳失敗，將不包含圖片儲存", "error");
          finalImageUrl = null;
        }
      }

      let safeData = {};
      const commonFields = {
        id: isEditMode ? editingId : Date.now().toString(),
        createdBy: user.uid,
      };

      if (activeTab === "itinerary") {
        safeData = {
          ...commonFields,
          day: itemData.day || 1,
          time: itemData.time || "10:00",
          location: itemData.location || "", 
          lat: itemData.lat || null,  
          lng: itemData.lng || null,  
          category: itemData.category || "sightseeing",
          notes: itemData.notes || "",
          guideInfo: itemData.guideInfo || "", 
          tags: itemData.tags || [],
          image: finalImageUrl, // 🌟 這裡現在存的是 ImgBB 網址了！
        };
      } else {
        safeData = {
          ...commonFields,
          item: itemData.item || "",
          amount: Number(itemData.amount) || 0,
          category: itemData.category || "other",
          date: itemData.date || new Date().toISOString().split("T")[0],
          payer: itemData.payer || getCurrentUserNickname(),
          isSplit: !!itemData.isSplit, 
          splitWith: itemData.splitWith || [],
          currency: itemData.currency || "TWD",
          foreignAmount: itemData.foreignAmount || "",
          exchangeRate: itemData.exchangeRate || 1,
        };
      }

      if (isEditMode) {
        await updateDoc(tripRef, {
          [activeTab]: list.map((i) => i.id === editingId ? { ...i, ...safeData } : i ),
        });
      } else {
        await updateDoc(tripRef, { [activeTab]: arrayUnion(safeData) });
      }

      setIsModalOpen(false);
      showToast(isEditMode ? "已更新" : "已新增");
    } catch (e) {
      console.error(e);
      showToast("儲存失敗: " + e.message, "error");
    }
  };

  const handleNoteImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) { showToast("圖片需小於 15MB", "error"); return; }
      const reader = new FileReader();
      reader.onloadend = () => setItemData({ ...itemData, noteImage: reader.result });
      reader.readAsDataURL(file);
    }
  };

const handleSaveNote = async () => {
    if (!itemData.noteContent?.trim() && !itemData.noteImage) {
      showToast("請輸入文字或上傳圖片", "error");
      return;
    }
    
    if (!user || !tripId) {
      showToast("錯誤：無法確認使用者或旅程 ID", "error");
      return;
    }

    const tripRef = doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId);
    
    try {
// 🌟 記事本的圖片一樣用長度 1000 來攔截！
      let finalNoteImageUrl = itemData.noteImage || null;
      if (itemData.noteImage && typeof itemData.noteImage === 'string' && itemData.noteImage.length > 1000) {
        showToast("正在上傳圖片至雲端，請稍候...", "success");
        setIsUploading(true); 
        
        const uploadedUrl = await uploadImageToImgBB(itemData.noteImage);
        
        setIsUploading(false); 
        
        if (uploadedUrl) {
          finalNoteImageUrl = uploadedUrl; 
        } else {
          showToast("圖片上傳失敗，將不包含圖片儲存", "error");
          finalNoteImageUrl = null;
        }
      }

      if (isEditMode && editingId) {
        const currentNotes = tripData.notes || [];
        const updatedNotes = currentNotes.map(n => n.id === editingId ? { 
          ...n, 
          content: itemData.noteContent || "", 
          image: finalNoteImageUrl, // 🌟 存入網址
          isEdited: true 
        } : n);
        
        await updateDoc(tripRef, { notes: updatedNotes });
        showToast("更新成功！");

      } else {
        let userEmoji = "👤";
        if (tripData.members && tripData.members[user.uid] && tripData.members[user.uid].emoji) {
          userEmoji = tripData.members[user.uid].emoji;
        }

        const newNote = {
          id: "note_" + Date.now(),
          content: itemData.noteContent || "", 
          image: finalNoteImageUrl, // 🌟 存入網址
          color: '#68577b', 
          author: getCurrentUserNickname(),
          emoji: userEmoji,
          time: Date.now(),
          replies: []
        };

        await updateDoc(tripRef, { notes: arrayUnion(newNote) });
        showToast("留言發送成功！");
      }
      
      setItemData({ ...itemData, noteContent: "", noteImage: null });
      setIsEditMode(false);
      setEditingId(null);
      
    } catch (e) { 
      console.error("記事本儲存失敗:", e);
      showToast("留言失敗: " + (e.message || "未知錯誤"), "error"); 
    }
  };

  const togglePinNote = async (note) => {
    const tripRef = doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId);
    const updatedNotes = (tripData.notes || []).map(n => 
      n.id === note.id ? { ...n, isPinned: !n.isPinned } : n
    );
    await updateDoc(tripRef, { notes: updatedNotes });
    showToast(note.isPinned ? "已取消置頂" : "已置頂！");
  };

  const deleteNote = async (noteId) => {
    const tripRef = doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId);
    await updateDoc(tripRef, { notes: tripData.notes.filter(n => n.id !== noteId) });
    showToast("已刪除");
  };

  const handleReplySubmit = async (noteId) => {
    const input = document.getElementById(`reply-input-${noteId}`);
    const text = input?.value;
    if (!text?.trim()) return;

    const tripRef = doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId);
    const updatedNotes = tripData.notes.map(n => n.id === noteId ? { 
      ...n, replies: [...(n.replies || []), { id: Date.now(), author: getCurrentUserNickname(), content: text, time: Date.now() }] 
    } : n);
    await updateDoc(tripRef, { notes: updatedNotes });
    showToast("回覆成功");
    if (input) input.value = ''; 
  };

  const handleEditReplySave = async (noteId, replyId) => {
    if (!editReplyContent.trim()) return;
    const tripRef = doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId);
    const updatedNotes = tripData.notes.map(n => {
      if (n.id === noteId) {
        return {
          ...n,
          replies: n.replies.map(r => r.id === replyId ? { ...r, content: editReplyContent, isEdited: true } : r)
        };
      }
      return n;
    });
    await updateDoc(tripRef, { notes: updatedNotes });
    setEditingReplyId(null);
    showToast("回覆已更新");
  };

  const handleDeleteReply = async (noteId, replyId) => {
    const tripRef = doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId);
    const updatedNotes = tripData.notes.map(n => {
      if (n.id === noteId) {
        return { ...n, replies: n.replies.filter(r => r.id !== replyId) };
      }
      return n;
    });
    await updateDoc(tripRef, { notes: updatedNotes });
    showToast("回覆已刪除");
  };
  
  const deleteItem = async (col, item) => {
    const tripRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "travel_trips",
      tripId
    );
    await updateDoc(tripRef, {
      [col]: tripData[col].filter((i) => i.id !== item.id),
    });
    setConfirmConfig({ isOpen: false });
    showToast("已刪除");
  };

  // --- 🌟 行李清單相關邏輯 ---
  const handleAddChecklist = async () => {
    if (!newChecklistText.trim() || !tripId) return;
    const tripRef = doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId);
    const newItem = {
      id: "check_" + Date.now(),
      text: newChecklistText.trim(),
      isCompleted: false,
      createdBy: user.uid
    };
    try {
      await updateDoc(tripRef, { checklist: arrayUnion(newItem) });
      setNewChecklistText(""); // 清空輸入框
      showToast("已新增清單項目");
    } catch (e) {
      showToast("新增失敗", "error");
    }
  };

  const toggleChecklist = async (item) => {
    if (!tripId) return;
    const tripRef = doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId);
    const updatedList = (tripData.checklist || []).map(i =>
      i.id === item.id ? { ...i, isCompleted: !i.isCompleted } : i
    );
    await updateDoc(tripRef, { checklist: updatedList });
  };

  const deleteChecklist = async (item) => {
    if (!tripId) return;
    const tripRef = doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId);
    const updatedList = (tripData.checklist || []).filter(i => i.id !== item.id);
    await updateDoc(tripRef, { checklist: updatedList });
    showToast("已刪除項目");
  };

  const handleDeleteTrip = async () => {
    if (!tripId) return;
    try {
      await deleteDoc(
        doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId)
      );
      const currentHistory = JSON.parse(
        localStorage.getItem("myTravelHistory") || "[]"
      );
      localStorage.setItem(
        "myTravelHistory",
        JSON.stringify(currentHistory.filter((x) => x.id !== tripId))
      );
      setConfirmConfig({ isOpen: false });
      setTripId(null);
      showToast("旅程已刪除");
    } catch (e) {
      showToast("刪除失敗，請稍後再試", "error");
    }
  };

  const groupedItinerary = (tripData?.itinerary || []).reduce((acc, item) => {
    const day = item.day || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(item);
    return acc;
  }, {});
  
  const getDateForDay = (day) => {
    if (!tripData?.startDate) return "";
    const d = new Date(tripData.startDate);
    d.setDate(d.getDate() + (parseInt(day) - 1));
    return d.toISOString().split("T")[0];
  };

  const getCurrentUserNickname = () =>
    tripData && user && tripData.members && tripData.members[user.uid]
      ? tripData.members[user.uid].nickname
      : "我";

  if (firebaseError) return <SetupGuide error={firebaseError} />;
  if (!user)
    return (
      <div className="flex items-center justify-center h-screen bg-[#faf9f4]">
        <Loader2 className="animate-spin text-[#68577b]" size={40} />
      </div>
    );
  if (!tripId || !tripData)
    return (
      <WelcomeScreen
        onCreate={createTrip}
        onImportTrip={createTripFromImport}
        onJoin={setTripId}
        isCreating={false}
        isJoining={false}
        showToast={showToast}
      />
    );

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-x-hidden bg-[#faf9f4] font-sans max-w-md mx-auto shadow-2xl relative text-stone-800 transition-colors duration-500">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <ConfirmModal {...confirmConfig} />
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        tripId={tripId}
        tripName={tripData.name}
        copyToClipboard={copyToClipboard}
      />

      <OptimizeModal />
      <MemberSelectModal 
        isOpen={showMemberSelect}
        members={tripData?.members || {}} 
        onSelect={handleJoinAsMember}
        onCreateNew={() => {
          setShowMemberSelect(false);
          setShowProfileSetup(true);
        }}
        onClose={() => setTripId(null)}
      />

      <ProfileSetupModal
        isOpen={showProfileSetup}
        onSubmit={handleProfileSubmit}
        initialName=""
        members={tripData?.members || {}}
        onBack={() => {
          if (Object.keys(tripData?.members || {}).length > 0) {
            setShowProfileSetup(false);
            setShowMemberSelect(true);
          } else {
            setShowProfileSetup(false);
            setTripId(null);
          }
        }}
      />
      <FileImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleFileImport}
        isLoading={isImportLoading}
      />
      <ItemDetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
        members={tripData.members}
      />
      <AIAnalysisModal
        isOpen={aiAnalysisResult.isOpen}
        onClose={() =>
          setAiAnalysisResult({ ...aiAnalysisResult, isOpen: false })
        }
        title={aiAnalysisResult.title}
        content={aiAnalysisResult.content}
        isLoading={aiAnalysisResult.isLoading}
        isDebtAnalysis={aiAnalysisResult.isDebtAnalysis}
        members={tripData.members}
      />

    {/* 🌟 修改這個全螢幕載入畫面 */}
      {(isAnalyzing || isImportLoading || isUploading || (aiAnalysisResult && aiAnalysisResult.isLoading)) && (
        <div className="absolute inset-0 z-[100] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative mb-6">
            <div className="w-20 h-20 border-4 border-[#eadef1] rounded-full animate-spin"></div>
            <div className="w-20 h-20 border-4 border-[#68577b] rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              {/* 如果是上傳中，顯示雲端上傳圖示，否則顯示 AI 星星 */}
              {isUploading ? (
                <Upload className="text-[#68577b] animate-bounce" size={24} />
              ) : (
                <Sparkles className="text-[#68577b] animate-pulse" size={32} />
              )}
            </div>
          </div>
          <h3 className="text-xl font-serif font-bold text-stone-900 tracking-widest animate-pulse mb-2">
            {/* 根據不同狀態顯示對應文字 */}
            {isUploading ? "圖片上傳中..." : isImportLoading ? "讀取檔案中..." : "AI 正在思考中..."}
          </h3>
        </div>
      )}

      {posterTheme && (
        <div
          id="hidden-poster-area"
          className="absolute top-0 left-0 w-[450px] font-sans flex flex-col p-6"
          style={{
            height: "auto",
            minHeight: "800px",
            zIndex: -50,
            visibility: "visible",
            backgroundColor: posterTheme.themeColor || "#faf9f4",
            color: "#333",
            overflow: "visible",
          }}
        >
          <div
            className="flex-1 border-4 border-double rounded-3xl p-8 flex flex-col relative bg-white/50"
            style={{ borderColor: posterTheme.borderColor || "#504062" }}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-xs font-bold tracking-[0.3em] uppercase text-stone-400 mb-2">
                  Boarding Pass
                </div>
                <h1
                  className="text-4xl font-serif font-black leading-tight text-stone-900"
                  style={{ color: posterTheme.borderColor }}
                >
                  {posterTheme.title}
                </h1>
                <div className="mt-2 text-sm font-bold text-stone-500 flex gap-2 items-center">
                  <span>{tripData.destination}</span>
                  <div className="w-10 h-[1px] bg-stone-300"></div>
                  <span>{tripData.startDate}</span>
                </div>
              </div>
              <div className="w-32 h-32 relative -mt-4 -mr-4 rotate-12 filter drop-shadow-md transition-all">
                <img
                  src={posterTheme.bgImage}
                  alt="Sticker"
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain mix-blend-multiply"
                />
              </div>
            </div>

            <div className="w-full border-t-2 border-dashed border-stone-300 my-4 relative">
              <div
                className="absolute -left-[34px] -top-3 w-6 h-6 rounded-full bg-stone-100/0"
                style={{ backgroundColor: posterTheme.themeColor }}
              ></div>
              <div
                className="absolute -right-[34px] -top-3 w-6 h-6 rounded-full bg-stone-100/0"
                style={{ backgroundColor: posterTheme.themeColor }}
              ></div>
            </div>

            <div className="flex-1 space-y-6 mt-2">
              {Object.keys(groupedItinerary)
                .sort((a, b) => a - b)
                .slice(0, 6)
                .map((day) => (
                  <div key={day} className="flex gap-4">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-1"
                      style={{ backgroundColor: posterTheme.borderColor || "#68577b" }}
                    >
                      {day}
                    </div>

                    <div className="flex-1 space-y-2 pt-1 pb-2 mb-1 leading-relaxed">
                      {groupedItinerary[day]
                        .sort((a, b) => a.time.localeCompare(b.time))
                        .map((item) => (
                          <div
                            key={item.id}
                            className="flex gap-3 items-start border-b border-stone-200 pb-2 mb-1 last:border-0"
                            style={{ lineHeight: "1.5" }}
                          >
                            <span className="font-mono text-stone-400 text-[10px] shrink-0 mt-1">
                              {item.time}
                            </span>
                            <div className="flex-1 flex flex-col min-w-0">
                              <span
                                className="font-bold text-stone-700 text-[12px] break-words"
                                style={{
                                  wordBreak: "break-word",
                                  display: "block",
                                }}
                              >
                                {item.location}
                              </span>
                              {item.notes && (
                                <span className="text-[9px] text-stone-500 font-normal mt-0.5 break-words opacity-80 leading-snug">
                                  {item.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-8 pt-4 border-t border-stone-200 text-center">
              <p className="font-serif italic text-stone-500 text-sm">
                "{posterTheme.quote}"
              </p>
              <div className="mt-2 text-[9px] tracking-widest opacity-30 uppercase font-bold">
                Design by Tabiji
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 全局 Header --- */}
      <header className="bg-white/60 backdrop-blur-md px-6 py-3 sticky top-0 z-30 border-b border-white/50 shadow-[0_10px_30px_rgba(104,87,123,0.05)] flex flex-col transition-all">
        <div className="flex justify-between items-center">
          <div className="flex-1 flex items-center min-w-0 mr-4">
            <div className="flex items-center gap-2 group flex-1 min-w-0">
              <input
                className="text-3xl leading-none font-serif font-black bg-transparent border-b-2 border-transparent hover:border-[#eadef1] focus:border-[#68577b] px-1 pb-0 pt-1 flex-1 min-w-0 placeholder-[#b4a0c8] focus:outline-none text-stone-900 tracking-wide transition-all truncate"
                value={localTripName}
                placeholder="點擊輸入旅程名稱..."
                onChange={(e) => setLocalTripName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.target.blur();
                }}
              />
              <Edit size={16} className="text-[#b4a0c8] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </div>
            
            <div className="flex -space-x-2 ml-2 flex-shrink-0">
              {Object.values(tripData.members || {})
                .slice(0, 3)
                .map((member) => (
                  <UserBadge
                    key={member.nickname}
                    nickname={member.nickname}
                    emoji={member.emoji}
                    size="sm"
                  />
                ))}
              {Object.keys(tripData.members || {}).length > 3 && (
                <div className="w-6 h-6 rounded-full bg-white border border-stone-100 ring-2 ring-white flex items-center justify-center text-[8px] font-bold text-stone-500 shadow-sm">
                  +{Object.keys(tripData.members).length - 3}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setIsShareOpen(true)}
              className="p-2 bg-[#eedbff]/50 rounded-full text-[#68577b] hover:bg-[#eedbff] transition-colors"
            >
              <Share2 size={18} />
            </button>
            <button
              onClick={() =>
                setConfirmConfig({
                  isOpen: true,
                  title: "刪除旅程",
                  message: "確定要刪除整個旅程嗎？此動作無法復原。",
                  onConfirm: handleDeleteTrip,
                  onCancel: () => setConfirmConfig({ isOpen: false }),
                  isDangerous: true,
                  confirmText: "確認刪除",
                })
              }
              className="p-2 bg-red-50 rounded-full text-red-500 hover:bg-red-100 transition-colors"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={() => setTripId(null)}
              className="p-2 bg-white rounded-full text-stone-500 hover:bg-stone-100 transition-colors shadow-sm border border-stone-100"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-2 pl-1">
          <div className="relative flex items-center gap-1 bg-white/60 border border-white shadow-sm hover:bg-white px-2 py-0.5 rounded-md transition-colors cursor-pointer group overflow-hidden">
            <Calendar size={10} className="text-[#b4a0c8] group-hover:text-[#68577b]" />
            <span className="font-mono text-[9px] font-bold text-[#68577b] group-hover:text-stone-900 leading-none mt-0.5">
              {tripData.startDate || "出發日"}
            </span>
            <input 
              type="date" 
              value={tripData.startDate || ""}
              onChange={(e) => handleDateUpdate('startDate', e.target.value)}
              onClick={(e) => { try { e.target.showPicker() } catch(err){} }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full"
            />
          </div>

          <ArrowRight size={8} className="text-[#b4a0c8] mx-0.5" />
          
          <div className="relative flex items-center gap-1 bg-white/60 border border-white shadow-sm hover:bg-white px-2 py-0.5 rounded-md transition-colors cursor-pointer group overflow-hidden">
            <span className="font-mono text-[9px] font-bold text-[#68577b] group-hover:text-stone-900 leading-none mt-0.5">
              {tripData.endDate || "回程日"}
            </span>
            <input 
              type="date" 
              value={tripData.endDate || ""}
              min={tripData.startDate}
              onChange={(e) => handleDateUpdate('endDate', e.target.value)}
              onClick={(e) => { try { e.target.showPicker() } catch(err){} }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full"
            />
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              updateTripWeather(tripId, tripData.destination, tripData.startDate, tripData.endDate);
            }}
            className="ml-1 p-1 bg-white/60 border border-white shadow-sm hover:bg-orange-50 text-[#b4a0c8] hover:text-orange-500 rounded-md transition-colors"
            title="點擊更新天氣"
          >
            <CloudSun size={11} />
          </button>
        </div>
      </header>

{/* --- Main 內容區 --- */}
      <main className={`flex-1 overflow-y-auto px-4 pt-4 scrollbar-hide relative ${activeTab === 'notes' ? 'pb-64' : 'pb-32'}`}>
        
        {/* 🌟 核心修改：寬度改為 400% 容納四個分頁，推移比例改為 25%、50%、75% */}
<div
          className="flex h-full w-[400%] transition-transform duration-500 ease-out"
          style={{
            transform:
              activeTab === "itinerary" ? "translateX(0%)" :
              activeTab === "checklist" ? "translateX(-25%)" :
              activeTab === "notes"     ? "translateX(-50%)" :
                                          "translateX(-75%)",
          }}
        >
          {/* ========================================= */}
          {/* 1. 行程分頁 (左一) */}
          {/* ========================================= */}
          <div className="w-1/4 h-full overflow-y-auto overflow-x-hidden pb-[120px] scroll-smooth">
            {tripData && (
              <>
                <DayNavigation 
                  days={Object.keys(groupedItinerary).sort((a, b) => a - b)} 
                  tripData={tripData}
                  onScrollToDay={scrollToDay}
                />

                <div className="px-4">
                 {Object.keys(groupedItinerary)
                  .sort((a, b) => a - b)
                  .map((day) => {
                    const dateStr = getDateForDay(day);
                    return (
                      <div
                        key={day}
                        id={`day-section-${day}`}
                        className="mb-10 pt-4 animate-in fade-in slide-in-from-bottom-5 duration-500 scroll-mt-32"
                      >
                        <div className="flex justify-between items-end mb-4 px-2">
                            <div className="flex flex-col">
                              <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-serif font-black text-stone-900 leading-none">
                                  {String(day).padStart(2, "0")}
                                </span>
                                <span className="text-xs font-bold text-[#b4a0c8] uppercase tracking-widest">
                                  Day {day}
                                </span>
                              </div>
                              <span className="text-[10px] text-[#68577b] font-mono font-medium pl-0.5 mt-1">
                                {dateStr}
                              </span>
                            </div>
                            <div className="origin-bottom-right">
                              <WeatherBadge
                                date={dateStr}
                                weatherData={tripData.weather}
                              />
                            </div>
                          </div>

                        <DayMapPreview points={groupedItinerary[day]} />
                        
                          <div className="space-y-4">
                            {groupedItinerary[day]
                              .sort((a, b) => a.time.localeCompare(b.time))
                              .map((item) => (
                                <ItineraryCard
                                  key={item.id}
                                  item={item}
                                  members={tripData.members}
                                  onSelect={setSelectedItem}
                                  onEdit={(i) => {
                                    setEditingId(i.id);
                                    setItemData(i);
                                    setIsEditMode(true);
                                    setIsModalOpen(true);
                                  }}
                                  onDelete={(i) =>
                                    setConfirmConfig({
                                      isOpen: true,
                                      title: "刪除項目",
                                      message: "確定要刪除嗎？",
                                      onConfirm: () => deleteItem("itinerary", i),
                                      onCancel: () =>
                                        setConfirmConfig({ isOpen: false }),
                                      isDangerous: true,
                                    })
                                  }
                                 onMap={(loc) =>
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        loc
      )}`,
      "_blank"
    )
  }
/>
                              ))}
                          </div>
                        </div>
                    );
                  })}
                {(!tripData.itinerary || tripData.itinerary.length === 0) && (
                  <div className="text-center py-20 opacity-40 flex flex-col items-center">
                    <div className="w-20 h-20 bg-stone-200 rounded-full flex items-center justify-center mb-4">
                      <Map className="w-10 h-10 text-stone-400" />
                    </div>
                    <p className="tracking-widest font-serif text-[#68577b]">旅程空白中...</p>
                  </div>
                )}
              </div>
              </>
            )}
          </div>

          {/* ========================================= */}
          {/* 🌟 2. 行李清單分頁 (左二) 🌟 */}
          {/* ========================================= */}
          <div className="w-1/4 h-full overflow-y-auto overflow-x-hidden pb-[120px] scroll-smooth">
            <div className="space-y-4 px-4 pt-6 max-w-lg mx-auto">
              
              {/* 進度條 */}
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-white">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <h3 className="text-xl font-serif font-bold text-stone-900">行李清單</h3>
                    <p className="text-[10px] text-stone-500 mt-1 tracking-widest uppercase">Packing List</p>
                  </div>
                  <div className="text-[#68577b] font-bold font-mono text-2xl">
                    {(tripData?.checklist || []).filter(i => i.isCompleted).length} 
                    <span className="text-sm text-stone-400"> / {(tripData?.checklist || []).length}</span>
                  </div>
                </div>
                
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-[#b4a0c8] to-[#68577b] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] rounded-full"
                    style={{ width: `${(tripData?.checklist || []).length === 0 ? 0 : ((tripData?.checklist || []).filter(i => i.isCompleted).length / (tripData?.checklist || []).length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* 輸入框 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="新增物品 (護照、轉接頭...)"
                  className="flex-1 bg-white border border-white shadow-sm rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#eadef1] text-stone-900 font-bold text-base"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()}
                />
                <button 
                  onClick={handleAddChecklist}
                  className="bg-[#68577b] hover:bg-[#504062] text-white w-14 rounded-2xl flex items-center justify-center shadow-md active:scale-95 transition-all"
                >
                  <Plus size={24} />
                </button>
              </div>

              {/* 待辦事項列表 */}
              <div className="space-y-2.5 mt-2">
                {(tripData?.checklist || [])
                  .slice()
                  .sort((a, b) => (a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1))
                  .map(item => (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${item.isCompleted ? 'bg-white/40 border-transparent opacity-60' : 'bg-white border-white shadow-sm hover:border-[#eadef1]'}`}
                  >
                    <button 
                      onClick={() => toggleChecklist(item)}
                      className="flex items-center gap-3 flex-1 text-left group"
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-colors duration-300 ${item.isCompleted ? 'bg-[#68577b] border-[#68577b] text-white' : 'border-[#b4a0c8] text-transparent group-hover:border-[#68577b]'}`}>
                        <CheckSquare size={14} className={item.isCompleted ? 'opacity-100' : 'opacity-0'} />
                      </div>
                      <span className={`font-bold text-base transition-all duration-300 ${item.isCompleted ? 'text-stone-400 line-through decoration-stone-300' : 'text-stone-700'}`}>
                        {item.text}
                      </span>
                    </button>
                    
                    <button 
                      onClick={() => deleteChecklist(item)}
                      className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors ml-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                
                {(!tripData?.checklist || tripData?.checklist.length === 0) && (
                  <div className="text-center py-10 text-[#b4a0c8] text-sm font-bold tracking-widest">
                    清單空空的，開始新增要帶的東西吧！
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ========================================= */}
          {/* 3. 記事本分頁 (右二) */}
          {/* ========================================= */}
          <div className="w-1/4 h-full overflow-y-auto overflow-x-hidden pb-[120px] scroll-smooth">
            <div className="space-y-4 pt-6 px-4">
              
              {/* 留言輸入區 */}
              <div className="bg-white/80 backdrop-blur-sm p-5 rounded-[2rem] shadow-[0_8px_30px_rgba(104,87,123,0.06)] border border-white">
                <textarea
                  placeholder="想分享什麼？"
                  className="w-full bg-[#faf9f4] p-4 rounded-2xl text-sm placeholder:text-stone-400 outline-none border border-transparent focus:bg-white focus:border-[#eadef1] focus:ring-2 focus:ring-[#eedbff] transition-all min-h-[100px] resize-y text-stone-900"
                  value={itemData.noteContent || ""}
                  onChange={(e) => setItemData({ ...itemData, noteContent: e.target.value })}
                />

                {itemData.noteImage && (
                  <div className="relative mt-3 h-24 inline-block">
                    <img src={itemData.noteImage} className="h-full w-auto max-w-[200px] object-cover rounded-xl border-2 border-white shadow-sm" alt="Preview" />
                    <button onClick={() => setItemData({ ...itemData, noteImage: null })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:scale-110 transition-transform"><X size={12} /></button>
                  </div>
                )}

                <div className="flex justify-between items-center mt-3">
                  <div>
                    <label className="cursor-pointer p-3 bg-stone-50 rounded-full text-[#68577b] hover:bg-[#eadef1]/50 transition-colors inline-flex items-center justify-center border border-stone-100">
                      <Camera size={20} />
                      <input type="file" accept="image/*" className="hidden" onChange={handleNoteImageUpload} />
                    </label>
                  </div>
                  <button onClick={handleSaveNote} className="bg-[#68577b] hover:bg-[#504062] text-white px-8 py-3 rounded-2xl text-sm font-bold active:scale-95 transition-all shadow-md">
                    {isEditMode ? "更新" : "發佈"}
                  </button>
                </div>
              </div>

              {/* 留言列表 */}
              <div className="space-y-4">
                {(tripData?.notes || [])
                  .slice()
                  .sort((a, b) => {
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;
                    return b.time - a.time;
                  })
                  .map((note) => (
                    <div key={note.id} className={`p-5 rounded-3xl shadow-sm border transition-all ${note.isPinned ? "border-amber-200 bg-amber-50/40" : "border-white bg-white/60 backdrop-blur-sm"}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <UserBadge nickname={note.author} emoji={note.emoji} size="md" />
                        <div className="flex flex-col">
                          <span className="font-bold text-stone-900">{note.author}</span>
                          <span className="text-[10px] text-stone-400 font-mono">{new Date(note.time).toLocaleString()}</span>
                        </div>

                        {note.isPinned && (
                          <span className="ml-auto text-[9px] font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-md uppercase tracking-widest flex items-center gap-1 shadow-sm">
                            <Pin size={10} className="fill-amber-600" /> Pinned
                          </span>
                        )}

                        <div className={`flex gap-1 ${note.isPinned ? "" : "ml-auto"}`}>
                          <button
                            onClick={() => togglePinNote(note)}
                            className={`p-2 rounded-xl transition-all ${note.isPinned ? "text-amber-500 bg-amber-100 hover:bg-amber-200" : "text-stone-400 hover:text-[#68577b] hover:bg-stone-100"}`}
                            title="置頂/取消置頂"
                          >
                            <Pin size={14} className={note.isPinned ? "fill-amber-500" : ""} />
                          </button>

                          <button onClick={() => { setIsEditMode(true); setEditingId(note.id); setItemData({ noteContent: note.content, noteImage: note.image }); }} className="p-2 rounded-xl text-stone-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"><Edit size={14} /></button>
                          <button onClick={() => deleteNote(note.id)} className="p-2 rounded-xl text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </div>

                      <div className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                        <LinkText text={note.content} />
                      </div>
                      {note.image && (
                        <img
                          src={note.image}
                          onClick={() => setZoomedImage(note.image)}
                          className="mt-4 rounded-2xl w-full h-auto border border-stone-200 shadow-sm cursor-zoom-in active:scale-[0.98] transition-transform"
                          alt="Note Attachment"
                        />
                      )}

                      {/* 回覆區 */}
                      <div className="mt-4 pl-4 border-l-2 border-[#eadef1] space-y-3">
                        {(note.replies || []).map((r, i) => (
                          <div key={r.id || i} className="text-xs group relative">
                            {editingReplyId === r.id ? (
                              <div className="flex flex-col gap-2 mt-1 bg-white p-3 rounded-xl border border-[#eadef1] animate-in fade-in zoom-in-95 shadow-sm">
                                <textarea
                                  value={editReplyContent}
                                  onChange={(e) => setEditReplyContent(e.target.value)}
                                  className="w-full bg-transparent text-xs outline-none resize-y min-h-[40px] text-stone-900"
                                  autoFocus
                                />
                                <div className="flex justify-end gap-2 border-t border-stone-100 pt-2">
                                  <button onClick={() => setEditingReplyId(null)} className="text-[10px] font-bold text-stone-400 hover:text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-50">取消</button>
                                  <button onClick={() => handleEditReplySave(note.id, r.id)} className="text-[10px] font-bold bg-[#68577b] text-white px-4 py-1.5 rounded-lg shadow-sm hover:bg-[#504062]">儲存</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 bg-white/40 p-2.5 rounded-xl">
                                  <span className="font-bold text-[#68577b]">{r.author}:</span>{" "}
                                  <span className="text-stone-600 leading-relaxed">
                                    <LinkText text={r.content} />
                                  </span>
                                  {r.isEdited && <span className="text-[9px] text-stone-400 ml-2 italic">(已編輯)</span>}
                                </div>

                                {r.author === getCurrentUserNickname() && (
                                  <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 bg-white/80 backdrop-blur-sm rounded-lg px-1 shadow-sm border border-white">
                                    <button
                                      onClick={() => { setEditingReplyId(r.id); setEditReplyContent(r.content); }}
                                      className="p-1.5 text-stone-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                                    >
                                      <Edit size={12} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setConfirmConfig({
                                          isOpen: true,
                                          title: "刪除回覆",
                                          message: "確定要刪除這則回覆嗎？",
                                          onConfirm: () => { handleDeleteReply(note.id, r.id); setConfirmConfig({ isOpen: false }); },
                                          onCancel: () => setConfirmConfig({ isOpen: false }),
                                          isDangerous: true,
                                        });
                                      }}
                                      className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* 新增回覆輸入框 */}
                        <div className="flex gap-2 items-end pt-2">
                          <textarea
                            id={`reply-input-${note.id}`}
                            rows="1"
                            placeholder="回覆旅伴..."
                            className="flex-1 w-full bg-white text-xs placeholder:text-[10px] px-4 py-3 rounded-2xl outline-none resize-y min-h-[40px] border border-white shadow-sm focus:border-[#eadef1] focus:ring-2 focus:ring-[#eedbff] transition-all text-stone-900"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleReplySubmit(note.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleReplySubmit(note.id)}
                            className="bg-[#68577b] hover:bg-[#504062] text-white px-4 py-3 rounded-xl text-[10px] font-bold transition-all active:scale-95 mb-0 shrink-0 shadow-md"
                          >
                            送出
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* ========================================= */}
          {/* 4. 記帳分頁 (右一) */}
          {/* ========================================= */}
          <div className="w-1/4 h-full overflow-y-auto overflow-x-hidden pb-[120px] scroll-smooth">
            <div className="space-y-4 px-4 pt-6">
              <div className="bg-gradient-to-br from-[#504062] to-[#68577b] text-white p-6 rounded-3xl shadow-xl relative overflow-hidden flex justify-between items-center border border-white/10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="relative z-10">
                  <div className="text-[#eadef1] text-xs tracking-widest mb-1 uppercase font-medium">
                    My Personal Spend
                  </div>
                  <div className="text-4xl font-bold font-mono text-white">
                    $
                    {(tripData?.expenses || [])
                      .reduce((sum, item) => {
                        const amount = Number(item.amount) || 0;
                        const myName = getCurrentUserNickname();
                        return item.payer === myName ? sum + amount : sum;
                      }, 0)
                      .toLocaleString()} 
                  </div>

                  <div className="text-[#eadef1] text-xs tracking-widest mb-1 uppercase font-medium">
                    我已墊付總額 (My Out-of-Pocket)
                  </div>

                  <button
                    onClick={() => {
                      setIsEditMode(false);
                      setEditingId(null);
                      setItemData({
                        payer: getCurrentUserNickname(),
                        date: new Date().toISOString().split("T")[0],
                        isSplit: false,
                        splitWith: [],
                        category: "food",
                        foreignAmount: "",  
                        exchangeRate: 1,  
                        amount: ""
                      });
                      setIsModalOpen(true);
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 mt-4 rounded-xl backdrop-blur-md transition-all active:scale-95 flex items-center gap-2 border border-white/20 shadow-sm"
                  >
                    <Plus size={16} />
                    <span className="text-xs font-bold">記一筆</span>
                  </button>
                  <div className="text-[9px] text-[#b4a0c8] mt-2">
                    *包含分帳後的預估金額
                  </div>
                </div>
                
                <button
                  onClick={handleCalculateDebts}
                  className="bg-white text-[#68577b] hover:bg-[#faf9f4] p-3 rounded-2xl shadow-lg flex flex-col items-center gap-1 text-[10px] font-bold active:scale-95 transition-transform"
                >
                  <Calculator size={20} /> AI 結算
                </button>
              </div>

              <div className="space-y-3 mt-4">
                {(tripData?.expenses || [])
                  .filter((expense) => {
                    const myNickname = getCurrentUserNickname();
                    const isCreatedByMe = expense.createdBy === user.uid;
                    const isPaidByMe = expense.payer === myNickname;
                    const isInvolved =
                      expense.isSplit &&
                      (expense.splitWith || []).includes(myNickname);
                    return isCreatedByMe || isPaidByMe || isInvolved;
                  })
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((expense) => {
                    const expenseIcons = {
                      food: <Utensils size={18} />,
                      transport: <Train size={18} />,
                      accommodation: <Home size={18} />,
                      shopping: <ShoppingBag size={18} />,
                      other: <MoreHorizontal size={18} />,
                    };
                    const Icon =
                      expenseIcons[expense.category] || expenseIcons.other;
                    const bgColor =
                      {
                        food: "bg-orange-100 text-orange-600",
                        transport: "bg-emerald-100 text-emerald-600",
                        accommodation: "bg-blue-100 text-blue-600",
                        shopping: "bg-pink-100 text-pink-600",
                        other: "bg-stone-100 text-stone-600",
                      }[expense.category] || "bg-stone-100 text-stone-600";

                    return (
                      <div
                        key={expense.id}
                        className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-white flex justify-between items-center group hover:bg-white transition-colors cursor-pointer"
                        onClick={() => {
                          setEditingId(expense.id);
                          setItemData(expense);
                          setIsEditMode(true);
                          setIsModalOpen(true);
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl ${bgColor} shadow-inner`}>
                            {Icon}
                          </div>
                          <div>
                            <div className="font-bold text-stone-900 flex items-center gap-2 text-base">
                              {expense.item}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[10px]">
                              <span className="text-[#b4a0c8] font-mono">
                                {expense.date}
                              </span>
                              <div className="flex items-center gap-1 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-100">
                                <span className="text-stone-400">墊:</span>
                                <span className="font-bold text-[#68577b]">
                                  {expense.payer}
                                </span>
                              </div>
                              {expense.isSplit && (
                                <span className="text-purple-500 border border-purple-200 bg-purple-50 px-1.5 py-0.5 rounded font-medium">
                                  {expense.splitWith.length}人分
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-0">
                          <span className="font-bold font-mono text-stone-800 text-lg">
                            ${Number(expense.amount).toLocaleString()}
                          </span>
                          {expense.currency && expense.currency !== "TWD" && (
                            <span className="text-[9px] text-stone-400 font-mono">
                              {expense.foreignAmount} {expense.currency}
                            </span>
                          )}
                            
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmConfig({
                                isOpen: true,
                                title: "刪除支出",
                                message: `確定要刪除「${expense.item}」嗎？`,
                                onConfirm: () => deleteItem("expenses", expense),
                                onCancel: () => setConfirmConfig({ isOpen: false }),
                                isDangerous: true,
                              });
                            }}
                            className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                
              {(tripData?.expenses || []).filter(e => e.createdBy === user.uid || e.payer === getCurrentUserNickname() || (e.isSplit && (e.splitWith || []).includes(getCurrentUserNickname()))).length === 0 && (
                 <div className="text-center py-10 text-[#b4a0c8] text-sm font-medium">
                   尚無與您相關的支出紀錄
                 </div>
              )}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* 🌟 新增：記事本的底部懸浮輸入區 (毛玻璃背景) */}
      {activeTab === "notes" && ( // 若你的記事本 tab 叫做別的名稱，請修改這裡
        <div className="absolute bottom-[90px] left-0 right-0 px-4 z-30 animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* 毛玻璃外層容器 */}
          <div className="bg-[#FDFCF8]/60 backdrop-blur-xl border border-white/60 p-3 rounded-[2rem] shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
            
            {/* 純白色的內部輸入區 */}
            <div className="bg-white rounded-[1.5rem] p-3 shadow-sm border border-stone-100 flex flex-col gap-2 relative">
              <textarea
                rows="2"
                placeholder="想分享什麼？"
                className="w-full bg-transparent outline-none resize-none text-stone-700 placeholder:text-stone-400 text-sm font-medium px-2 pt-1"
                onChange={(e) => {
                  // 讓文字框自動長高 (選用)
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                style={{ maxHeight: '100px' }}
              />
              
              {/* 底部按鈕區 */}
              <div className="flex items-center justify-between mt-1">
                <button className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-full transition-colors flex items-center justify-center">
                  <Camera size={20} />
                </button>
                <button className="bg-[#6B5A74] hover:bg-[#56485E] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95">
                  發佈
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 下面是你原本的導覽列 */}
      <nav className="absolute bottom-6 left-6 right-6 ...">

{/* --- Bottom Navigation (完美膠囊比例 + 4選項果凍動畫) --- */}
      <nav className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-[340px]">
        <div className="bg-white/80 backdrop-blur-xl p-1.5 rounded-full border border-white/80 shadow-[0_15px_40px_rgba(104,87,123,0.12)]">
          <div className="relative flex w-full">
            
            {/* 紫色果凍色塊滑動邏輯：寬度改為 w-1/4，對應四個選項 */}
            <div
              className="absolute top-0 bottom-0 w-1/4 p-0.5 transition-transform duration-500"
              style={{
                transform: `translateX(${
                  activeTab === "itinerary" ? "0%" :
                  activeTab === "checklist" ? "100%" :
                  activeTab === "notes" ? "200%" : "300%"
                })`,
                transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" 
              }}
            >
               <div className="w-full h-full bg-gradient-to-b from-[#faf9f4] to-[#eedbff] rounded-full shadow-sm border border-white"></div>
            </div>

            {/* 選單按鈕順序：行程 -> 清單 -> 記事本 -> 記帳 */}
            {[
              { id: "itinerary", icon: <Calendar size={20} />, label: "行程" },
              { id: "checklist", icon: <CheckSquare size={20} />, label: "清單" },
              { id: "notes", icon: <BookOpen size={20} />, label: "記事本" },
              { id: "expenses", icon: <CreditCard size={20} />, label: "記帳" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsEditMode(false);
                  setEditingId(null);
                  setItemData({});
                }}
                className={`relative z-10 flex flex-col items-center justify-center flex-1 py-2 transition-colors duration-300 ease-out active:scale-95 group ${
                  activeTab === tab.id
                    ? "text-stone-900"
                    : "text-[#b4a0c8] hover:text-[#68577b]"
                }`}
              >
                <div className={`transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${activeTab === tab.id ? "scale-110 -translate-y-0.5" : "group-hover:scale-110 group-hover:-translate-y-0.5"}`}>
                  {tab.icon}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 transition-opacity duration-300 ${activeTab === tab.id ? "opacity-100" : "opacity-70"}`}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </nav>
                                    
{/* --- FAB (Plus / AI Buttons) --- */}
      {!isModalOpen && activeTab === "itinerary" && (
        <div className="absolute bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-6 z-[60] flex flex-col-reverse items-end gap-4 pointer-events-none">
          <button
            onClick={() => {
              setIsEditMode(false);
              setEditingId(null);
              setItemData({ day: 1, time: "10:00", category: "sightseeing" });
              setIsModalOpen(true);
            }}
            className="bg-[#68577b] text-white w-14 h-14 flex items-center justify-center rounded-2xl shadow-[0_15px_30px_rgba(104,87,123,0.35)] transition-all duration-300 active:scale-90 hover:bg-[#504062] hover:shadow-[0_20px_40px_rgba(104,87,123,0.45)] hover:-translate-y-1 pointer-events-auto border border-white/20"
          >
            <Plus size={26} />
          </button>

          <div className="flex flex-col-reverse items-end gap-3 pointer-events-auto">
            <button
              onClick={() => {
                setShowAIMenu(!showAIMenu);
                setShowExportMenu(false);
              }}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 border border-white/20 hover:-translate-y-1 ${
                showAIMenu ? "bg-[#504062] rotate-45 scale-90" : "bg-[#b4a0c8] hover:bg-[#68577b]"
              }`}
            >
              {isAnalyzing || (typeof isImportLoading !== 'undefined' && isImportLoading) ? (
                <Loader2 className="animate-spin text-white" size={20} />
              ) : (
                <Sparkles className={`text-white transition-all ${showAIMenu ? "opacity-0" : "opacity-100"}`} size={20} />
              )}
              {showAIMenu && <Plus className="text-white absolute rotate-0" size={24} />}
            </button>

            {showAIMenu && (
              <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-5 duration-300 items-end mb-2">
                <div className="px-2 text-[9px] font-black text-[#b4a0c8] uppercase tracking-widest mt-2">AI Tools</div>
                <button
                  onClick={() => { handleAIAnalyze(); setShowAIMenu(false); }}
                  className="flex items-center gap-3 bg-white/90 backdrop-blur-md border border-white px-4 py-3 rounded-2xl shadow-xl hover:bg-[#faf9f4] transition-all w-48 active:scale-95"
                >
                  <div className="w-8 h-8 bg-[#eedbff] text-[#68577b] rounded-xl flex items-center justify-center"><Sparkles size={16} /></div>
                  <span className="text-sm font-bold text-stone-900">智能導遊分析</span>
                </button>
                <button
                  onClick={() => { setShowOptimizeModal(true); setShowAIMenu(false); }}
                  className="flex items-center gap-3 bg-white/90 backdrop-blur-md border border-white px-4 py-3 rounded-2xl shadow-xl hover:bg-[#faf9f4] transition-all w-48 active:scale-95"
                >
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center"><Route size={16} /></div>
                  <span className="text-sm font-bold text-stone-900">路線優化建議</span>
                </button>

                <div className="px-2 text-[9px] font-black text-[#b4a0c8] uppercase tracking-widest mt-2">Files</div>
                <button
                  onClick={() => { setIsImportOpen(true); setShowAIMenu(false); }}
                  className="flex items-center gap-3 bg-white/90 backdrop-blur-md border border-white px-4 py-3 rounded-2xl shadow-xl hover:bg-[#faf9f4] transition-all w-48 active:scale-95"
                >
                  <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center"><Upload size={16} /></div>
                  <span className="text-sm font-bold text-stone-900">匯入行程檔案</span>
                </button>

                <div className="relative">
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenuPos({ top: rect.top - 10, left: rect.left - 160 });
                      setShowExportMenu(!showExportMenu);
                    }}
                    className={`flex items-center gap-3 w-48 bg-white/90 backdrop-blur-md border px-4 py-3 rounded-2xl shadow-xl transition-all active:scale-95 ${
                      showExportMenu ? "border-[#68577b] bg-[#faf9f4]" : "border-white hover:bg-[#faf9f4]"
                    }`}
                  >
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center"><Download size={16} /></div>
                    <span className="text-sm font-bold text-stone-900">匯出行程內容</span>
                    <ChevronRight size={14} className={`ml-auto text-[#b4a0c8] transition-transform ${showExportMenu ? "rotate-90" : ""}`} />
                  </button>

                  {showExportMenu && (
                    <div 
                      className="fixed bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white p-2 z-[70] flex flex-col gap-1 animate-in slide-in-from-right-2 duration-200"
                      style={{ top: menuPos.top, left: menuPos.left }}
                    >
                      <button onClick={() => { handleExportExcel(); setShowExportMenu(false); setShowAIMenu(false); }} className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-stone-900 hover:bg-[#faf9f4] rounded-xl transition-colors whitespace-nowrap">
                        <FileSpreadsheet size={16} className="text-emerald-500" /> Excel 表格
                      </button>
                      <button onClick={() => { handleExportImage(); setShowExportMenu(false); setShowAIMenu(false); }} className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-stone-900 hover:bg-[#faf9f4] rounded-xl transition-colors whitespace-nowrap">
                        <ImageIcon size={16} className="text-pink-500" /> AI 美圖分享
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="absolute inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#faf9f4] w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200 max-h-[90vh] flex flex-col border border-white">
            <h3 className="text-xl font-serif font-bold mb-6 text-stone-900 tracking-wide text-center shrink-0">
              {isEditMode
                ? "編輯內容"
                : activeTab === "itinerary"
                ? "新增行程"
                : "新增支出"}
            </h3>

            <div className="space-y-4 overflow-y-auto scrollbar-hide px-1 flex-1">
              {activeTab === "itinerary" ? (
                <>
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <div className="min-w-0">
                      <label className="text-[10px] text-[#b4a0c8] font-bold uppercase tracking-wider ml-1 mb-1 block">
                        Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={itemData.day}
                        onChange={(e) =>
                          setItemData({ ...itemData, day: e.target.value })
                        }
                        className="w-full min-w-0 box-border bg-white border border-white shadow-sm rounded-2xl px-3 py-3 outline-none focus:ring-2 focus:ring-[#eadef1] transition-all text-center font-mono text-stone-900 font-bold text-base"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="text-[10px] text-[#b4a0c8] font-bold uppercase tracking-wider ml-1 mb-1 block">
                        Time
                      </label>
                      <input
                        type="time"
                        value={itemData.time}
                        onChange={(e) =>
                          setItemData({ ...itemData, time: e.target.value })
                        }
                        className="w-full min-w-0 box-border bg-white border border-white shadow-sm rounded-2xl px-3 py-3 outline-none focus:ring-2 focus:ring-[#eadef1] transition-all text-center font-mono text-stone-900 font-bold text-base"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#b4a0c8] font-bold uppercase tracking-wider ml-1 mb-1 block">
                      {itemData.category === "flight"
                        ? "起降機場 (例如: TPE - NRT)"
                        : "Location"}
                    </label>
                    <LocationInput
                      placeholder={
                        itemData.category === "flight"
                          ? "TPE - NRT"
                          : "搜尋地點"
                      }
                      value={itemData.location || ""}
                      onChange={(val, lat, lng) =>
                        setItemData({ 
                          ...itemData, 
                          location: val, 
                          lat: lat, 
                          lng: lng 
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-[#b4a0c8] font-bold uppercase tracking-wider ml-1 mb-1 block">
                      Category
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "sightseeing", icon: <Camera size={16} />, label: "景點" },
                        { id: "food", icon: <Utensils size={16} />, label: "餐廳" },
                        { id: "transport", icon: <Train size={16} />, label: "交通" },
                        { id: "flight", icon: <Plane size={16} />, label: "航班" },
                        { id: "accommodation", icon: <Home size={16} />, label: "住宿" },
                        { id: "activity", icon: <MapPin size={16} />, label: "活動" },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() =>
                            setItemData({ ...itemData, category: cat.id })
                          }
                          className={`py-3 rounded-2xl border flex flex-col items-center gap-1 text-xs transition-all shadow-sm ${
                            itemData.category === cat.id
                              ? "bg-[#68577b] text-white border-[#68577b]"
                              : "bg-white text-[#b4a0c8] border-white hover:border-[#eadef1]"
                          }`}
                        >
                          {cat.icon} <span className="font-medium">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#b4a0c8] font-bold uppercase tracking-wider ml-1 mb-1 block">
                      {itemData.category === "flight"
                        ? "航班代號 / 航廈資訊"
                        : "Notes"}
                    </label>
                    <textarea
                      rows="2"
                      value={itemData.notes || ""}
                      onChange={(e) =>
                        setItemData({ ...itemData, notes: e.target.value })
                      }
                      className="w-full bg-white border border-white shadow-sm rounded-2xl p-4 outline-none focus:ring-2 focus:ring-[#eadef1] transition-all resize-y min-h-[80px] text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-[#b4a0c8] font-bold uppercase tracking-wider ml-1 mb-1 block">
                      自訂照片 (選填)
                    </label>
                    <div className="flex items-center gap-4">
                      {itemData.image ? (
                        <div className="relative w-28 h-20 rounded-2xl overflow-hidden border border-white shadow-sm">
                          <img src={itemData.image} alt="preview" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => setItemData({...itemData, image: null})}
                            className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white p-1 rounded-full backdrop-blur-md transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer w-28 h-20 rounded-2xl border-2 border-dashed border-[#eadef1] flex items-center justify-center bg-white/50 text-[#b4a0c8] hover:bg-white hover:text-[#68577b] hover:border-[#b4a0c8] transition-all shadow-sm">
                          <Camera size={20} />
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                if (file.size > 15 * 1024 * 1024) { showToast("圖片需小於 15MB", "error"); return; }
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setOriginalImage(reader.result);
                                  setShowCropModal(true);
                                  setCrop({ unit: '%', width: 90, aspect: 21 / 9 });
                                };
                                reader.readAsDataURL(file);
                              }
                            }} 
                          />
                        </label>
                      )}
                      <span className="text-[10px] text-stone-400 leading-tight">
                        點擊左側圖示上傳照片<br/>我們會開啟裁剪視窗
                      </span>
                    </div>
                  </div>

                  {showCropModal && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
                      <div className="w-full max-w-2xl bg-[#faf9f4] rounded-[2.5rem] p-6 shadow-2xl border border-white">
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#eadef1]">
                          <h3 className="font-serif text-xl font-bold text-stone-900">裁剪照片</h3>
                          <p className="text-xs text-stone-400">請拖曳選擇最適合放上卡片的範圍</p>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto rounded-2xl border-2 border-dashed border-[#eadef1] bg-white p-2 flex justify-center">
                          <ReactCrop
                            crop={crop}
                            onChange={c => setCrop(c)}
                            onComplete={c => setCompletedCrop(c)}
                            aspect={16 / 6} 
                            className="max-w-full"
                          >
                            <img
                              ref={imgRef}
                              src={originalImage}
                              alt="原始圖"
                              onLoad={(e) => {
                                const { width, height } = e.currentTarget;
                                setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 16 / 6, width, height), width, height));
                              }}
                            />
                          </ReactCrop>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#eadef1]">
                          <button 
                            onClick={() => { setShowCropModal(false); setOriginalImage(null); }}
                            className="px-6 py-3 rounded-xl text-sm font-bold text-stone-500 bg-white border border-stone-200 hover:bg-stone-50 transition-colors"
                          >
                            取消
                          </button>
                          <button 
                            onClick={async () => {
                              if (completedCrop && imgRef.current) {
                                const image = imgRef.current;
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                
                                const scaleX = image.naturalWidth / image.width;
                                const scaleY = image.naturalHeight / image.height;
                                
                                canvas.width = completedCrop.width;
                                canvas.height = completedCrop.height;
                                
                                ctx.drawImage(
                                  image,
                                  completedCrop.x * scaleX,
                                  completedCrop.y * scaleY,
                                  completedCrop.width * scaleX,
                                  completedCrop.height * scaleY,
                                  0,
                                  0,
                                  completedCrop.width,
                                  completedCrop.height
                                );
                                
                                const base64Image = canvas.toDataURL('image/jpeg', 1.0);
                                setItemData({ ...itemData, image: base64Image });
                                setShowCropModal(false);
                                setOriginalImage(null);
                              }
                            }}
                            className="px-8 py-3 rounded-xl text-sm font-bold text-white bg-[#68577b] hover:bg-[#504062] shadow-lg transition-all"
                          >
                            確認裁剪
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="w-full min-w-0">
                    <label className="text-[10px] text-[#b4a0c8] font-bold uppercase tracking-wider ml-1 mb-1 block">
                      消費項目
                    </label>
                    <input
                      type="text"
                      placeholder="例如: 晚餐"
                      value={itemData.item || ""}
                      onChange={(e) =>
                        setItemData({ ...itemData, item: e.target.value })
                      }
                      className="w-full min-w-0 box-border bg-white border border-white shadow-sm rounded-2xl px-3 py-3 outline-none focus:ring-2 focus:ring-[#eadef1] text-stone-900 font-bold text-base"
                    />
                  </div>         
                  <div>
                    <label className="text-[10px] text-[#b4a0c8] font-bold uppercase tracking-wider ml-1 mb-1 block">
                      分類
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "food", label: "飲食", icon: <Utensils size={16} /> },
                        { id: "transport", label: "交通", icon: <Train size={16} /> },
                        { id: "accommodation", label: "住宿", icon: <Home size={16} /> },
                        { id: "shopping", label: "購物", icon: <ShoppingBag size={16} /> },
                        { id: "other", label: "其他", icon: <MoreHorizontal size={16} /> },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() =>
                            setItemData({ ...itemData, category: cat.id })
                          }
                          className={`py-3 rounded-2xl border flex flex-col items-center gap-1 text-xs transition-all shadow-sm ${
                            itemData.category === cat.id
                              ? "bg-[#68577b] text-white border-[#68577b]"
                              : "bg-white text-[#b4a0c8] border-white hover:border-[#eadef1]"
                          }`}
                        >
                          {cat.icon} <span className="font-medium">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#b4a0c8] font-bold uppercase tracking-wider ml-1 mb-1 block">
                      金額與匯率 ({itemData.currency || 'TWD'})
                    </label>
                    <div className="bg-white/50 p-4 rounded-2xl border border-white shadow-sm space-y-3 w-full box-border">
                      <div className="flex gap-2 w-full">
                        <select 
                          className="bg-white border border-white shadow-sm rounded-xl px-3 py-3 text-base font-bold outline-none focus:ring-2 focus:ring-[#eadef1] text-[#68577b] shrink-0"
                          value={itemData.currency || "TWD"}
                          onChange={(e) => setItemData({ ...itemData, currency: e.target.value })}
                        >
                          <option value="TWD">TWD 台幣</option>
                          <option value="JPY">JPY 日幣</option>
                          <option value="KRW">KRW 韓元</option>
                          <option value="USD">USD 美金</option>
                          <option value="THB">THB 泰銖</option>
                        </select>
                        
                        <input
                          type="number"
                          placeholder="金額"
                          className="flex-1 min-w-0 bg-white border border-white shadow-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#eadef1] font-mono text-base font-bold text-stone-900"
                          value={itemData.foreignAmount || ""}
                          onChange={(e) => {
                            const fAmount = e.target.value;
                            const rate = itemData.exchangeRate || 1;
                            setItemData({ 
                              ...itemData, 
                              foreignAmount: fAmount, 
                              amount: fAmount ? Math.round(fAmount * rate) : "" 
                            });
                          }}
                        />
                      </div>

                      {itemData.currency !== "TWD" && (
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2 text-[11px] font-bold text-stone-500">
                            <span>匯率:</span>
                            <input 
                              type="number"
                              step="0.0001"
                              className="w-20 bg-white border border-white shadow-sm rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#eadef1] text-base text-[#68577b] font-mono"
                              value={itemData.exchangeRate || ""}
                              onChange={(e) => {
                                const newRate = e.target.value;
                                setItemData({ 
                                  ...itemData, 
                                  exchangeRate: newRate,
                                  amount: itemData.foreignAmount ? Math.round(itemData.foreignAmount * newRate) : itemData.amount
                                });
                              }}
                            />
                          </div>
                          <div className="text-[11px] text-[#68577b] font-bold">
                            約台幣 ${Number(itemData.amount).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-full min-w-0">
                    <label className="text-[10px] text-[#b4a0c8] font-bold uppercase tracking-wider ml-1 mb-1 block">
                      日期
                    </label>
                    <input
                      type="date"
                      value={itemData.date}
                      onChange={(e) =>
                        setItemData({ ...itemData, date: e.target.value })
                      }
                      className="w-full min-w-0 box-border bg-white border border-white shadow-sm rounded-2xl px-3 py-3 outline-none focus:ring-2 focus:ring-[#eadef1] text-stone-900 font-bold text-base font-mono"
                    />
                  </div>
                  
                  <div>
                    <label className="text-[10px] text-[#b4a0c8] font-bold uppercase tracking-wider ml-1 mb-1 block">
                      付款人
                    </label>
                    <input
                      type="text"
                      value={itemData.payer || ""}
                      onChange={(e) =>
                        setItemData({ ...itemData, payer: e.target.value })
                      }
                      className="w-full bg-white border border-white shadow-sm rounded-2xl p-4 outline-none focus:ring-2 focus:ring-[#eadef1] text-stone-900 font-bold text-base"
                    />
                  </div>
                  <div className="bg-white/50 p-4 rounded-2xl border border-white shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-bold text-[#68577b] uppercase tracking-wider">
                        需要分帳？
                      </label>
                      <button
                        onClick={() =>
                          setItemData({
                            ...itemData,
                            isSplit: !itemData.isSplit,
                            splitWith: itemData.isSplit
                              ? []
                              : Object.values(tripData.members).map(
                                  (m) => m.nickname
                                ),
                          })
                        }
                        className={`w-12 h-7 rounded-full transition-all flex items-center p-1 shadow-inner ${
                          itemData.isSplit
                            ? "bg-[#68577b] justify-end"
                            : "bg-stone-200 justify-start"
                        }`}
                      >
                        <div className="w-5 h-5 bg-white rounded-full shadow-sm"></div>
                      </button>
                    </div>
                    {itemData.isSplit && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-white/50">
                        <p className="text-[10px] text-[#b4a0c8] mb-2 font-bold">
                          請選擇需要分攤此費用的人 (包含付款人)：
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.values(tripData.members).map((member) => {
                            const isSelected = (
                              itemData.splitWith || []
                            ).includes(member.nickname);
                            return (
                              <div
                                key={member.nickname}
                                onClick={() => {
                                  const currentSplit = itemData.splitWith || [];
                                  const newSplit = isSelected
                                    ? currentSplit.filter(
                                        (n) => n !== member.nickname
                                      )
                                    : [...currentSplit, member.nickname];
                                  setItemData({
                                    ...itemData,
                                    splitWith: newSplit,
                                  });
                                }}
                                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all shadow-sm ${
                                  isSelected
                                    ? "bg-white border-[#68577b]"
                                    : "bg-white/50 border-white hover:bg-white"
                                }`}
                              >
                                {isSelected ? (
                                  <CheckSquare size={16} className="text-[#68577b]" />
                                ) : (
                                  <Square size={16} className="text-[#b4a0c8]" />
                                )}
                                <span
                                  className={`text-xs font-bold ${
                                    isSelected ? "text-stone-900" : "text-stone-400"
                                  }`}
                                >
                                  {member.nickname}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 mt-6 shrink-0 border-t border-white/50 pt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-4 rounded-2xl bg-white border border-white shadow-sm text-stone-500 font-bold hover:bg-stone-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveItem}
                className="flex-1 py-4 rounded-2xl bg-[#68577b] text-white font-bold hover:bg-[#504062] transition-colors shadow-lg shadow-[#68577b]/30"
              >
                確認儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[110] bg-stone-900/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all active:scale-95 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setZoomedImage(null);
            }}
          >
            <X size={24} />
          </button>
          <img 
            src={zoomedImage} 
            className="max-w-full max-h-[90dvh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" 
            alt="Zoomed Fullscreen"
          />
        </div>
      )}
    </div>
  );
};

export default App;
