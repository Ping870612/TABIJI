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
// 修正: 檢查是否已經初始化過，避免 Hot Reload 導致 Duplicate App Error
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// 設定 App ID
const appId =
  typeof __app_id !== "undefined" ? __app_id : "travel-app-sandbox-v1";

// --- AI 呼叫函式 ---
// --- 修改後的 AI 呼叫函式 ---
async function callGeminiAPI(parts) {
  try {
    // 改為呼叫我們自己的後端 API，不需要帶 Key
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parts: parts }), // 傳送資料給後端
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    // 解析回傳結構
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    // 回傳空字串或錯誤訊息，避免程式崩潰
    return "";
  }
}

// --- 新增：使用 Google Imagen 3 模型畫圖 ---
async function callImagenAPI(imagePrompt) {
  try {
    // 1. 抓取金鑰 (優先讀取 Vercel 環境變數 VITE_GEMINI_API_KEY)
    // 如果本地開發讀不到，請確認 .env.local 也有設定
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || firebaseConfig.apiKey;
    
    if (!apiKey) {
      console.error("未找到 API Key");
      return null;
    }

    // 2. 呼叫 Imagen 3 模型
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: imagePrompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "3:4", // 直式海報比例
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
    
    // 回傳圖片格式
    return base64Image ? `data:image/png;base64,${base64Image}` : null;
  } catch (error) {
    console.error("Imagen Error:", error);
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
        type === "error" ? "bg-red-500" : "bg-stone-800"
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
      <div className="bg-[#FDFCF8] w-full max-w-xs rounded-2xl p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-stone-100">
        <h3 className="text-lg font-bold mb-2 text-stone-800 tracking-wide">
          {title}
        </h3>
        <p className="text-stone-500 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-600 font-medium hover:bg-stone-200 transition-colors text-sm"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl text-white font-medium shadow-md transition-colors text-sm ${
              isDangerous
                ? "bg-red-500 hover:bg-red-600"
                : "bg-stone-800 hover:bg-stone-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const SetupGuide = ({ error }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 p-8 text-center font-sans">
    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg border border-stone-100 text-left">
      <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertTriangle size={32} />
      </div>
      <h2 className="text-2xl font-bold text-stone-800 mb-2 text-center">
        需要設定 Firebase
      </h2>
      <p className="text-stone-500 mb-6 leading-relaxed text-center text-sm">
        預設的測試金鑰在外部環境無法使用。請依照以下步驟設定您自己的 Firebase
        專案。
      </p>

      <div className="bg-red-50 text-red-600 p-4 rounded-xl text-[10px] font-mono mb-6 overflow-x-auto border border-red-100">
        錯誤訊息: {error?.message || "Unknown Connection Error"}
      </div>

      <ol className="text-sm text-stone-600 space-y-3 list-decimal pl-5 mb-8">
        <li>前往 Firebase Console 並建立新專案。</li>
        <li>
          建立 Web App 並複製 <code>firebaseConfig</code>。
        </li>
        <li>
          回到程式碼，取代 <code>firebaseConfig</code> 變數。
        </li>
        <li>
          開啟 <strong>Authentication</strong> (匿名登入) 與{" "}
          <strong>Firestore</strong> (Test mode)。
        </li>
      </ol>

      <button
        onClick={() => window.location.reload()}
        className="w-full bg-stone-800 text-white px-6 py-4 rounded-xl font-bold hover:bg-stone-700 transition-colors"
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
        emoji ? "bg-stone-100" : bgColor
      } text-stone-800 flex items-center justify-center font-bold shadow-sm flex-shrink-0 select-none border border-stone-200 border-white ring-2 ring-white`}
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
      <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative max-h-[80vh] flex flex-col">
        <div className="flex items-center gap-2 mb-4 text-stone-800 border-b border-stone-100 pb-4">
          <Sparkles className="text-indigo-500" size={24} />
          <h3 className="text-xl font-bold">{title}</h3>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[150px] text-stone-700 leading-relaxed scrollbar-hide">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-stone-400 gap-3">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
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
                    className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-100"
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
                    <div className="flex flex-col items-center text-stone-400 px-2">
                      <span className="text-[10px] font-bold text-emerald-600 mb-1">
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
          className="w-full mt-4 py-3 rounded-xl bg-stone-800 text-white font-medium hover:bg-stone-700 shadow-lg transition-all"
        >
          關閉
        </button>
      </div>
    </div>
  );
};

const ItemDetailModal = ({ isOpen, onClose, item, members }) => {
  if (!isOpen || !item) return null;

// --- 新增元件：成員選擇視窗 ---
const MemberSelectModal = ({ isOpen, members, onSelect, onCreateNew }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[90] bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xs rounded-[2rem] p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-stone-800 mb-2">
            歡迎回來！
          </h3>
          <p className="text-sm text-stone-500">
            這個行程已經有成員了，請問您是...？
          </p>
        </div>
        
        <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
          {Object.entries(members).map(([uid, member]) => (
            <button
              key={uid}
              onClick={() => onSelect(uid, member)}
              className="w-full flex items-center gap-4 p-4 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-all active:scale-95 group"
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl shadow-sm border border-stone-100">
                {member.emoji}
              </div>
              <div className="text-left">
                <div className="font-bold text-stone-800 group-hover:text-indigo-600 transition-colors">
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
          <div className="flex-grow border-t border-stone-100"></div>
          <span className="flex-shrink mx-4 text-stone-300 text-xs">或是</span>
          <div className="flex-grow border-t border-stone-100"></div>
        </div>

        <button
          onClick={onCreateNew}
          className="w-full bg-stone-800 text-white font-bold py-3 rounded-xl hover:bg-stone-700 transition-all shadow-lg"
        >
          我是新成員 (建立新檔案)
        </button>
      </div>
    </div>
  );
};
  
  const typeConfig = {
    sightseeing: {
      icon: <Camera size={24} />,
      bg: "bg-indigo-100 text-indigo-600",
      label: "景點",
    },
    food: {
      icon: <Utensils size={24} />,
      bg: "bg-orange-100 text-orange-600",
      label: "餐廳",
    },
    transport: {
      icon: <Train size={24} />,
      bg: "bg-emerald-100 text-emerald-600",
      label: "交通",
    },
    flight: {
      icon: <Plane size={24} />,
      bg: "bg-sky-100 text-sky-600",
      label: "航班",
    },
    activity: {
      icon: <MapPin size={24} />,
      bg: "bg-stone-100 text-stone-600",
      label: "活動",
    },
  };
  const config = typeConfig[item.category] || typeConfig.activity;
  const author = members?.[item.createdBy] || {};

  return (
    <div className="absolute inset-0 z-[70] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative max-h-[80vh] overflow-y-auto scrollbar-hide">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-stone-50 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 z-10"
        >
          <X size={20} />
        </button>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 border-b border-stone-100 pb-4">
            <div className={`p-4 rounded-2xl ${config.bg} shadow-sm`}>
              {config.icon}
            </div>
            <div>
              <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
                {config.label} • {item.time}
              </div>
              <h2 className="text-xl font-bold text-stone-800 leading-tight">
                {item.location}
              </h2>
            </div>
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=$${encodeURIComponent(
              item.location
            )}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 font-medium py-3 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <MapPin size={18} /> 在 Google Maps 開啟
          </a>
          {(item.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag, i) => (
                <span
                  key={i}
                  className="text-xs px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-600 font-medium"
                >
                  {tag.text}
                </span>
              ))}
            </div>
          )}
          {item.guideInfo && (
            <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-2 mb-2 text-indigo-700 font-bold text-sm">
                <Sparkles size={16} /> 導遊介紹
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">
                {item.guideInfo}
              </p>
            </div>
          )}
          {item.notes && (
            <div>
              <h4 className="text-sm font-bold text-stone-700 mb-2">備註</h4>
              <p className="text-sm text-stone-600 bg-stone-50 p-4 rounded-xl border border-stone-100 leading-relaxed whitespace-pre-wrap">
                {item.notes}
              </p>
            </div>
          )}
          {author.nickname && (
            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-stone-100 text-xs text-stone-400">
              <span>Added by</span>
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center text-xs">
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
  );
};

const ProfileSetupModal = ({ isOpen, onSubmit, initialName = "" }) => {
  const [nickname, setNickname] = useState(initialName);
  const [selectedEmoji, setSelectedEmoji] = useState("🐶");
  const animals = [
    "🐶",
    "🐱",
    "🐭",
    "🐹",
    "🐰",
    "🦊",
    "🐻",
    "🐼",
    "🐨",
    "🐯",
    "🦁",
    "🐮",
    "🐷",
    "🐸",
    "🐵",
    "🐔",
  ];

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[80] bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xs rounded-[2rem] p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-stone-800 mb-2">
            建立您的旅者檔案
          </h3>
          <p className="text-sm text-stone-500">選擇一個動物代表你吧！</p>
        </div>
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center text-4xl shadow-lg transition-transform hover:scale-105">
              {selectedEmoji}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1 mb-1 block">
              暱稱
            </label>
            <input
              type="text"
              placeholder="例如：小明"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 outline-none focus:border-stone-800 text-center font-medium"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1 mb-2 block text-center">
              選擇動物
            </label>
            <div className="grid grid-cols-4 gap-2">
              {animals.map((a) => (
                <button
                  key={a}
                  onClick={() => setSelectedEmoji(a)}
                  className={`text-2xl p-2 rounded-xl transition-all ${
                    selectedEmoji === a
                      ? "bg-stone-200 scale-110 shadow-sm"
                      : "hover:bg-stone-100"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() =>
              nickname && onSubmit({ nickname, emoji: selectedEmoji })
            }
            disabled={!nickname}
            className="w-full bg-stone-800 text-white font-bold py-3 rounded-xl hover:bg-stone-700 transition-all disabled:opacity-50"
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
      <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600"
        >
          <XCircle size={20} />
        </button>
        <h3 className="text-xl font-bold text-stone-800 mb-2 flex items-center gap-2">
          <FileText className="text-indigo-500" /> 匯入行程檔案
        </h3>
        <p className="text-sm text-stone-500 mb-6 leading-relaxed">
          支援 <b>PDF</b> 或 <b>圖片</b> (如 Excel 截圖)。
          <br />
          AI 將自動讀取內容並建立行程。
        </p>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="animate-spin text-indigo-500" size={40} />
            <p className="text-sm font-medium text-stone-600 animate-pulse">
              正在分析檔案內容...
            </p>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-indigo-200 bg-indigo-50 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-100 transition-colors group"
          >
            <Upload
              size={32}
              className="text-indigo-400 group-hover:text-indigo-600 mb-2"
            />
            <span className="text-indigo-600 font-medium">點擊上傳檔案</span>
            <span className="text-xs text-indigo-400 mt-1">
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
      <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-stone-50 rounded-full text-stone-400 hover:bg-stone-100"
        >
          <XCircle size={20} />
        </button>
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="bg-indigo-50 p-4 rounded-full text-indigo-600 mb-2">
            <Users size={32} />
          </div>
          <h3 className="text-xl font-bold text-stone-800">邀請朋友加入</h3>
          <p className="text-sm text-stone-500 leading-relaxed">
            將此代碼分享給您的旅伴。
            <br />
            他們只需在首頁輸入代碼即可共同編輯 <b>{tripName}</b>。
          </p>
          <div
            onClick={() => copyToClipboard(tripId)}
            className="w-full bg-stone-50 border-2 border-dashed border-stone-300 rounded-xl p-6 cursor-pointer hover:bg-stone-100 hover:border-indigo-300 transition-all group"
          >
            <div className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-1">
              旅程代碼
            </div>
            <div className="text-3xl font-mono font-bold text-stone-800 tracking-wider group-hover:text-indigo-600">
              {tripId}
            </div>
            <div className="text-xs text-stone-400 mt-2 flex items-center justify-center gap-1">
              <Copy size={12} /> 點擊複製
            </div>
          </div>
        </div>
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
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target))
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleSearch = (query) => {
    onChange(query);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5`
        );
        if (!res.ok) throw new Error("Network response was not ok");
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (e) {
        console.warn("Location suggestion unavailable");
        setSuggestions([]);
      }
    }, 200);
  };

  const handleSelect = (place) => {
    onChange(place.display_name.split(",")[0]);
    setShowSuggestions(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-white border border-stone-200 rounded-xl p-3 pl-10 outline-none focus:border-stone-400 transition-colors"
        />
        <Search className="absolute left-3 top-3.5 text-stone-400" size={16} />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 top-3.5 text-stone-300 hover:text-stone-500"
          >
            <XCircle size={16} />
          </button>
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-stone-100 rounded-xl mt-1 shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          {suggestions.map((place) => (
            <li
              key={place.place_id}
              onClick={() => handleSelect(place)}
              className="p-3 hover:bg-stone-50 cursor-pointer text-sm text-stone-600 border-b border-stone-50 last:border-0 truncate"
            >
              <span className="font-bold text-stone-800">
                {place.display_name.split(",")[0]}
              </span>
              <span className="text-xs text-stone-400 ml-2">
                {place.display_name.split(",").slice(1, 2).join(",")}
              </span>
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
  let Icon = Sun;
  if (info.condition.includes("Rain") || info.condition.includes("雨"))
    Icon = CloudRain;
  else if (info.condition.includes("Cloud") || info.condition.includes("雲"))
    Icon = CloudSun;
  else if (info.condition.includes("Wind") || info.condition.includes("風"))
    Icon = Wind;
  return (
    <div className="flex items-center gap-2 text-xs text-stone-500 bg-white/50 px-3 py-1.5 rounded-full border border-stone-100 backdrop-blur-sm animate-in fade-in">
      <Icon size={14} className="text-orange-400" />
      <span>
        {info.temp} {info.condition}
      </span>
    </div>
  );
};

const ItineraryCard = ({
  item,
  onSelect,
  onEdit,
  onDelete,
  onMap,
  members,
}) => {
  const typeConfig = {
    sightseeing: {
      icon: <Camera size={14} />,
      bg: "bg-indigo-100 text-indigo-600",
      label: "景點",
    },
    food: {
      icon: <Utensils size={14} />,
      bg: "bg-orange-100 text-orange-600",
      label: "餐廳",
    },
    transport: {
      icon: <Train size={14} />,
      bg: "bg-emerald-100 text-emerald-600",
      label: "交通",
    },
    flight: {
      icon: <Plane size={14} />,
      bg: "bg-sky-100 text-sky-600",
      label: "航班",
    },
    activity: {
      icon: <MapPin size={14} />,
      bg: "bg-stone-100 text-stone-600",
      label: "活動",
    },
  };
  const config = typeConfig[item.category] || typeConfig.activity;
  const author = members?.[item.createdBy] || {};

  return (
    <div
      onClick={() => onSelect(item)}
      className={`bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-stone-100 mb-3 relative group transition-all active:scale-[0.99] border-l-4 cursor-pointer hover:shadow-md ${config.color}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col items-center mr-4 pt-1 min-w-[3.5rem]">
          <span className="text-sm font-bold text-stone-800 tracking-wider font-mono">
            {item.time}
          </span>
          <div className="h-full w-[1px] bg-stone-100 my-2"></div>
        </div>
        <div className="flex-1 min-w-0 pr-20">
          <div className="flex items-center gap-2 mb-1">
            <span className={`p-1.5 rounded-lg ${config.bgIcon}`}>
              {config.icon}
            </span>
            <h3 className="font-bold text-stone-800 text-lg truncate tracking-tight">
              {item.location}
            </h3>
          </div>
          {(item.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2 mt-1">
              {item.tags.map((tag, i) => (
                <Tag key={i} type={tag.type} text={tag.text} />
              ))}
            </div>
          )}
          {item.guideInfo && (
            <div className="text-xs text-stone-500 bg-stone-50 p-2 rounded-lg leading-relaxed mb-2 border border-stone-100 flex gap-2">
              <BookOpen
                size={14}
                className="text-stone-400 flex-shrink-0 mt-0.5"
              />
              {item.guideInfo}
            </div>
          )}
          {item.notes && !item.guideInfo && (
            <p className="text-stone-400 text-xs mt-1 line-clamp-2">
              {item.notes}
            </p>
          )}
          {author.nickname && (
            <div className="flex items-center gap-1 mt-2 justify-end opacity-50 text-[10px]">
              <span className="text-stone-400">added by</span>
              <UserBadge
                nickname={author.nickname}
                emoji={author.emoji}
                color={author.color}
              />
            </div>
          )}
        </div>
      </div>
      <div className="absolute top-4 right-4 flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMap(item.location);
          }}
          className="p-2 text-stone-300 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
        >
          <Navigation size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          className="p-2 text-stone-300 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
        >
          <Edit size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item);
          }}
          className="p-2 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-full transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// ↓↓↓↓↓ 請複製這整段 WelcomeScreen (包含前面的 const 和最後的 };) ↓↓↓↓↓

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

  // 修改後的日期變更函式 (手機版優化：不強求彈出日曆)
  const handleStartDateChange = (e) => {
    const val = e.target.value;
    setNewTripData((prev) => {
      const newData = { ...prev, startDate: val };
      if (prev.endDate && val > prev.endDate) newData.endDate = "";
      return newData;
    });

    // 手機版對策：選完出發日後，聚焦到回程框，引導視覺
    if (val) {
      setTimeout(() => {
        const endInput = document.getElementById("endDateInput");
        endInput?.focus();
      }, 100);
    }
  };

  // 快速天數設定 (這是手機版一次選完的關鍵)
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFCF8] p-6 font-sans">
        <FileImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onImport={handleFileAnalyze}
          isLoading={isImportLoading}
        />
        <div className="w-full max-w-md bg-white p-8 rounded-[2rem] shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
          <div className="flex items-center gap-2 text-stone-800 mb-2">
            <button
              onClick={() => setMode("home")}
              className="p-2 hover:bg-stone-100 rounded-full"
            >
              <ChevronRight className="rotate-180" size={20} />
            </button>
            <h2 className="text-xl font-bold">建立新旅程</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1 mb-1 block">
                目的地
              </label>
              <input
                type="text"
                placeholder="例如：京都, 日本"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-4 outline-none focus:border-stone-800 transition-colors"
                value={newTripData.destination}
                onChange={(e) =>
                  setNewTripData({
                    ...newTripData,
                    destination: e.target.value,
                  })
                }
              />
            </div>

            {/* 🟢 修改後：手機版優化的日期選擇區 */}
            <div className="space-y-3">
              <div className="flex justify-between items-end px-1">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  旅遊日期
                </label>
                {duration > 0 && (
                  <span className="text-[10px] font-bold bg-stone-800 text-white px-3 py-1 rounded-full animate-in zoom-in spin-in-3">
                    ✈️ {duration} 天 {duration - 1} 夜
                  </span>
                )}
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-1 focus-within:ring-2 focus-within:ring-stone-800 focus-within:border-stone-800 transition-all shadow-sm">
                <div className="flex items-center divide-x divide-stone-200">
                  {/* 出發日 */}
                  <div className="flex-1 px-3 py-3 relative group">
                    <label className="absolute top-2 left-3 text-[9px] font-bold text-stone-400 uppercase">
                      DEPART
                    </label>
                    <input
                      type="date"
                      className="w-full bg-transparent pt-4 pb-1 font-bold text-stone-800 outline-none text-sm font-mono cursor-pointer h-full"
                      value={newTripData.startDate}
                      onChange={handleStartDateChange}
                    />
                  </div>

                  {/* 裝飾箭頭 */}
                  <div className="px-2 text-stone-300">
                    <ArrowRight size={16} />
                  </div>

                  {/* 回程日 */}
                  <div className="flex-1 px-3 py-3 relative group">
                    <label className="absolute top-2 left-3 text-[9px] font-bold text-stone-400 uppercase">
                      RETURN
                    </label>
                    <input
                      type="date"
                      id="endDateInput"
                      className="w-full bg-transparent pt-4 pb-1 font-bold text-stone-800 outline-none text-sm font-mono cursor-pointer disabled:opacity-30"
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

              {/* 🟢 快速按鈕區：這就是你要的「一次選完」功能 */}
              {newTripData.startDate && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="h-[1px] bg-stone-200 flex-1"></div>
                    <span className="text-[10px] text-stone-400 font-bold">
                      或是直接選擇天數
                    </span>
                    <div className="h-[1px] bg-stone-200 flex-1"></div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[2, 3, 4, 5, 6, 7, 8, 10].map((d) => (
                      <button
                        key={d}
                        onClick={() => setQuickDuration(d)}
                        className={`py-3 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
                          duration === d
                            ? "bg-stone-800 text-white border-stone-800 shadow-md transform scale-105"
                            : "bg-white border-stone-200 text-stone-500 hover:border-stone-400 hover:bg-stone-50"
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

          <div className="space-y-3 pt-2">
            <button
              onClick={handleCreateSubmit}
              disabled={isCreating}
              className="w-full bg-stone-800 text-white font-bold py-4 rounded-xl hover:bg-stone-700 transition-all shadow-lg flex justify-center items-center gap-2"
            >
              {isCreating ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  建立旅程 <Plane size={18} />
                </>
              )}
            </button>
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-stone-100"></div>
              <span className="flex-shrink mx-4 text-stone-300 text-xs">
                OR
              </span>
              <div className="flex-grow border-t border-stone-100"></div>
            </div>
            <button
              onClick={() => setIsImportOpen(true)}
              className="w-full bg-indigo-50 text-indigo-600 font-bold py-4 rounded-xl hover:bg-indigo-100 transition-all flex justify-center items-center gap-2 border border-indigo-100"
            >
              <Upload size={18} /> 從檔案匯入 (PDF/圖片)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFCF8] p-6 font-sans">
      <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="inline-flex items-center justify-center p-6 bg-stone-900 rounded-[2rem] shadow-2xl shadow-stone-200">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-stone-800 tracking-widest">
            旅路 TABIJI
          </h1>
        </div>
        <div className="space-y-4 pt-4">
          <button
            onClick={() => setMode("create")}
            className="w-full bg-stone-800 text-white font-medium py-4 rounded-2xl hover:bg-stone-700 transition-all active:scale-95 shadow-lg shadow-stone-200 flex items-center justify-center gap-2"
          >
            <Plus size={20} /> 開始新旅程
          </button>
          <div className="relative">
            <input
              type="text"
              placeholder="輸入邀請碼 (Trip ID)"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-2xl py-4 px-6 text-center text-stone-800 tracking-widest focus:ring-2 focus:ring-stone-200 outline-none transition-all placeholder:text-stone-300 placeholder:tracking-normal"
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
            className="w-full text-stone-400 hover:text-stone-600 font-medium py-2 transition-colors text-sm"
          >
            {isJoining ? "加入中..." : "加入現有旅程 →"}
          </button>
        </div>
        {history.length > 0 && (
          <div className="pt-8 w-full text-left">
            <div className="flex items-center gap-2 text-stone-400 mb-3 ml-2">
              <History size={14} />
              <span className="text-xs font-bold tracking-widest uppercase">
                我的旅程
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {history.map((h) => (
                <div
                  key={h.id}
                  onClick={() => onJoin(h.id)}
                  className="bg-white border border-stone-100 p-4 rounded-xl flex justify-between items-center hover:border-stone-300 cursor-pointer transition-colors group"
                >
                  <div>
                    <div className="font-bold text-stone-700 group-hover:text-stone-900">
                      {h.name || "未命名旅程"}
                    </div>
                    <div className="text-[10px] text-stone-400 flex gap-2">
                      <span>{h.destination || "未知地點"}</span>
                      <span>•</span>
                      <span>
                        {h.date
                          ? new Date(h.date).toLocaleDateString()
                          : "未設定日期"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-stone-300 group-hover:text-stone-500"
                  />
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
  const [user, setUser] = useState(null);
  const [tripId, setTripId] = useState(null);
  const [tripData, setTripData] = useState(null);
  const [localTripName, setLocalTripName] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false); 
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

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
  const [activeTab, setActiveTab] = useState("itinerary");
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
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState({
    isOpen: false,
    title: "",
    content: "",
    isDebtAnalysis: false,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [firebaseError, setFirebaseError] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });

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
      if (successful) showToast("代碼已複製");
      else
        navigator.clipboard
          .writeText(text)
          .then(() => showToast("代碼已複製"))
          .catch(() => showToast("複製失敗", "error"));
    } catch (err) {
      showToast("複製失敗", "error");
    }
    document.body.removeChild(textArea);
  };

  // ==========================================
  // ↓↓↓↓↓ 新增功能：匯出 Excel 與 美圖 ↓↓↓↓↓
  // ==========================================

  // 1. 匯出 Excel (使用 CDN 載入的 window.XLSX)
  const handleExportExcel = () => {
    if (!tripData?.itinerary?.length) {
      showToast("行程是空的，無法匯出", "error");
      return;
    }

    if (!window.XLSX) {
      showToast("Excel 工具尚未載入，請重新整理網頁", "error");
      return;
    }

    // 整理資料
    const data = tripData.itinerary
      .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))
      .map((item) => ({
        "Day": `Day ${item.day}`,
        "時間": item.time,
        "地點": item.location,
        "分類": item.category,
        "備註": item.guideInfo || item.notes || "",
      }));

    // 產生 Excel
    const ws = window.XLSX.utils.json_to_sheet(data);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "行程表");
    window.XLSX.writeFile(wb, `${tripData.name}_行程表.xlsx`);
    showToast("Excel 下載成功！");
  };

  // 2. 匯出美圖 (包含 AI 設計邏輯)
  const [posterTheme, setPosterTheme] = useState(null); // 存 AI 設計的主題

// ↓↓↓↓↓ 修改後的 handleExportImage (支援 Imagen 3) ↓↓↓↓↓
  const handleExportImage = async () => {
    if (!tripData?.itinerary?.length) return;
    setIsAnalyzing(true); // 開始轉圈圈

    try {
      // 1. 【大腦】請 Gemini 1.5 Flash 根據行程寫出「繪圖指令」
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
      
      // 呼叫原本的文字 AI
      const res = await callGeminiAPI([{ text: prompt }]);
      if (!res) throw new Error("AI Text Failed");
      
      // 解析 JSON
      let cleanJson = res;
      const firstBracket = res.indexOf('{');
      const lastBracket = res.lastIndexOf('}');
      if (firstBracket !== -1 && lastBracket !== -1) {
        cleanJson = res.substring(firstBracket, lastBracket + 1);
      }
      const theme = JSON.parse(cleanJson);

      // 2. 【畫家】使用 Imagen 3 畫圖
      let aiImageUrl = await callImagenAPI(theme.imagePrompt);
      
      // 如果 Imagen 失敗 (例如 Key 有問題)，自動切換到 Pollinations (免費備案)
      if (!aiImageUrl) {
        console.log("切換至 Pollinations 備用繪圖引擎");
        const encoded = encodeURIComponent(theme.imagePrompt);
        aiImageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=1024&nologo=true&seed=${Math.random()}`;
      }

      // 設定主題
      setPosterTheme({ ...theme, bgImage: aiImageUrl });

      // 3. 【合成】等待圖片載入
      await new Promise((resolve) => {
        const img = new Image();
        img.src = aiImageUrl;
        img.crossOrigin = "anonymous"; // 允許跨域
        img.onload = resolve;
        img.onerror = resolve; 
      });
      
      // 給瀏覽器一點時間渲染 DOM
      await new Promise(r => setTimeout(r, 1500));

      // 4. 截圖下載
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
        // 補上這兩行，精確對準元件的大小
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
  // ↑↑↑↑↑ 新增功能結束 ↑↑↑↑↑
  
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

useEffect(() => {
    if (!user || !tripId) return;
    const unsubscribe = onSnapshot(
      doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTripData(data);
          addToHistory(tripId, data);
          
          // --- 身分判斷邏輯 ---
          // 如果我還不在成員名單中
          if (!data.members || !data.members[user.uid]) {
            // 如果行程已經有其他人 (代表是舊行程或別人開的)，詢問是否要繼承
            if (data.members && Object.keys(data.members).length > 0) {
              setShowMemberSelect(true);
            } else {
              // 如果完全沒成員 (新行程)，直接建立新檔案
              setShowProfileSetup(true);
            }
          } else {
            // 我已經在名單中，隱藏所有視窗
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
    fetchWeather(newId, destination, startDate);
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
    if (initialData.destination && initialData.startDate)
      fetchWeather(newId, initialData.destination, initialData.startDate);
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
    
    // 1. 更新成員名單：移除舊 UID，加入新 UID
    const newMembers = { ...(tripData.members || {}) }; // 加了 || {} 防止舊行程報錯
    delete newMembers[targetUid];
    newMembers[user.uid] = targetMemberData;
    
    // 2. 更新行程擁有權
    const newItinerary = (tripData.itinerary || []).map(item => {
      if (item.createdBy === targetUid) {
        return { ...item, createdBy: user.uid };
      }
      return item;
    });

 // --- 請將這段程式碼貼在 handleJoinAsMember 之後，fetchWeather 之前 ---
  const handleFileImport = async (file) => {
    setIsImportLoading(true);
    setIsImportOpen(false); // 關閉視窗，顯示全螢幕動畫

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

      // 呼叫 AI (這時候動畫持續在跑)
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
      // 失敗時把視窗開回來讓使用者重試
      setIsImportOpen(true); 
    } finally {
      // 無論成功失敗，最後才關閉動畫
      setIsImportLoading(false);
    }
  };

  const fetchWeather = async (id, destination, startDate) => {
    if (!destination || !startDate) return;
    try {
      const res = await callGeminiAPI([
        {
          text: `預測 ${destination} ${startDate} 起 7 天天氣。回傳 JSON Array: [{"date": "YYYY-MM-DD", "temp": "25°C", "condition": "晴朗"}]`,
        },
      ]);
      if (res) {
        const weatherMap = {};
        JSON.parse(res.replace(/```json|```/g, "").trim()).forEach((d) => {
          if (d.date) weatherMap[d.date] = d;
        });
        await updateDoc(
          doc(db, "artifacts", appId, "public", "data", "travel_trips", id),
          { weather: weatherMap }
        );
      }
    } catch (e) {}
  };

const handleAIAnalyze = async () => {
    if (!tripData?.itinerary?.length) {
      showToast("行程是空的", "error");
      return;
    }
    
    // 開啟全螢幕 AI 動畫
    setIsAnalyzing(true);

    try {
      // --- 修改重點開始 ---
      // 我們修改了 Prompt，增加了「規則 2」
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
      // --- 修改重點結束 ---

      if (!res) throw new Error("AI Failed");

      const cleanJson = res.replace(/```json|```/g, "").trim();
      const enrichedData = JSON.parse(cleanJson);

      const newItinerary = tripData.itinerary.map((item) => {
        const enrichment = enrichedData.find((e) => e.id === item.id);
        
        // 如果 AI 回傳有資料，就更新；
        // 如果 AI 回傳 guideInfo 是空字串，UI 只要檢查到是空字串就不會顯示
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

 // --- 新增：路線優化相關狀態 ---
  const [transportMode, setTransportMode] = useState("driving");
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);

  // --- 新增：路線優化執行邏輯 ---
  const executeOptimize = async () => {
    if (!tripData?.itinerary?.length) {
      showToast("行程是空的", "error");
      return;
    }
    
    setIsAnalyzing(true); // 開啟 AI 動畫
    
    try {
      // 抓每一天原本的第一個時間點
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

  // --- 新增：優化設定視窗元件 ---
  const OptimizeModal = () => {
    if (!showOptimizeModal) return null;
    return (
      <div className="absolute inset-0 z-[80] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-xs rounded-[2rem] p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
          <h3 className="text-xl font-bold text-stone-800 mb-4 text-center">
            路線優化設定
          </h3>
          <p className="text-sm text-stone-500 mb-6 text-center leading-relaxed">
            AI 將重新排序景點並計算時間。
          </p>
          
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setTransportMode("driving")}
              className={`flex-1 py-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                transportMode === "driving"
                  ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                  : "border-stone-100 bg-white text-stone-400 hover:border-stone-200"
              }`}
            >
              <Car size={24} />
              <span className="text-xs font-bold">開車</span>
            </button>
            <button
              onClick={() => setTransportMode("transit")}
              className={`flex-1 py-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                transportMode === "transit"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                  : "border-stone-100 bg-white text-stone-400 hover:border-stone-200"
              }`}
            >
              <Train size={24} />
              <span className="text-xs font-bold">大眾運輸</span>
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowOptimizeModal(false)}
              className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-600 font-medium hover:bg-stone-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => {
                setShowOptimizeModal(false);
                executeOptimize();
              }}
              className="flex-1 py-3 rounded-xl bg-stone-800 text-white font-medium hover:bg-stone-700 transition-colors shadow-lg"
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
    setAiAnalysisResult({
      isOpen: true,
      title: "AI 分帳計算",
      content: "",
      isDebtAnalysis: true,
      isLoading: true,
    });
    try {
      const res = await callGeminiAPI([
        {
          text: `計算旅遊記帳 JSON: ${JSON.stringify(
            tripData.expenses
          )}。回傳純 JSON Array: [{"from": "付款人", "to": "收款人", "amount": 整數金額}]。金額請四捨五入。`,
        },
      ]);
      if (!res) throw new Error("AI Failed");
      setAiAnalysisResult((prev) => ({
        ...prev,
        content: res,
        isLoading: false,
      }));
    } catch (e) {
      setAiAnalysisResult((prev) => ({
        ...prev,
        content: "計算失敗",
        isLoading: false,
      }));
    }
  };

  const handleSaveItem = async () => {
    const tripRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "travel_trips",
      tripId
    );
    try {
      const list =
        activeTab === "itinerary" ? tripData.itinerary : tripData.expenses;
      const newItemData = {
        ...itemData,
        id: isEditMode ? editingId : Date.now().toString(),
        category:
          itemData.category ||
          (activeTab === "itinerary" ? "sightseeing" : "other"),
        createdBy: user.uid,
        date: itemData.date || new Date().toISOString().split("T")[0],
      };
      if (isEditMode)
        await updateDoc(tripRef, {
          [activeTab]: list.map((i) =>
            i.id === editingId ? { ...i, ...newItemData } : i
          ),
        });
      else await updateDoc(tripRef, { [activeTab]: arrayUnion(newItemData) });
      setIsModalOpen(false);
      showToast(isEditMode ? "已更新" : "已新增");
    } catch (e) {
      showToast("儲存失敗", "error");
    }
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

  const handleDeleteTrip = async () => {
    if (!tripId) return;
    try {
      await deleteDoc(
        doc(db, "artifacts", appId, "public", "data", "travel_trips", tripId)
      );
      // Remove from local history
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

  if (firebaseError) return <SetupGuide error={firebaseError} />;
  if (!user)
    return (
      <div className="flex items-center justify-center h-screen bg-[#FDFCF8]">
        <Loader2 className="animate-spin text-stone-400" />
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
    <div className="flex flex-col h-screen bg-[#FDFCF8] font-sans max-w-md mx-auto shadow-2xl relative text-stone-800">
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
      
      {(isAnalyzing || isImportLoading || (aiAnalysisResult && aiAnalysisResult.isLoading)) && (
        <div className="absolute inset-0 z-[100] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative mb-6">
            <div className="w-20 h-20 border-4 border-indigo-100 rounded-full animate-spin"></div>
            <div className="w-20 h-20 border-4 border-indigo-500 rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="text-indigo-500 animate-pulse" size={32} />
            </div>
          </div>
          <h3 className="text-xl font-bold text-stone-800 tracking-widest animate-pulse mb-2">
            AI 正在思考中...
          </h3>
        </div>
      )}

      {posterTheme && (
        <div
          id="hidden-poster-area"
          className="absolute top-0 left-0 w-[450px] font-sans flex flex-col p-6"
          style={{
            height: "auto",            // 確保容器隨內容長高
            minHeight: "800px",
            zIndex: -50,
            visibility: "visible",
            backgroundColor: posterTheme.themeColor || "#fffbf0",
            color: "#333",
            overflow: "visible",       // 防止切斷溢出內容
          }}
        >
         
          <div
            className="flex-1 border-4 border-double rounded-3xl p-8 flex flex-col relative bg-white/50"
            style={{ borderColor: posterTheme.borderColor || "#333" }}
          >
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-xs font-bold tracking-[0.3em] uppercase text-stone-400 mb-2">
                  Boarding Pass
                </div>
                <h1
                  className="text-4xl font-serif font-black leading-tight text-stone-800"
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
                      style={{ backgroundColor: posterTheme.borderColor || "#333" }}
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
                            style={{ lineHeight: "1.5" }} //稍微調緊一點行高，因為有備註會變長
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

<MemberSelectModal 
        isOpen={showMemberSelect}
        members={tripData?.members || {}} 
        onSelect={handleJoinAsMember}
        onCreateNew={() => {
          setShowMemberSelect(false);
          setShowProfileSetup(true);
        }}
      />

      <ProfileSetupModal
        isOpen={showProfileSetup}
        onSubmit={handleProfileSubmit}
        initialName=""
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


      <header className="bg-[#FDFCF8]/90 backdrop-blur-md px-6 py-5 sticky top-0 z-30 border-b border-stone-100 flex flex-col justify-between transition-all">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 mr-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 group flex-1">
                <input
                  className="text-xl font-bold bg-transparent border-b-2 border-transparent hover:border-stone-200 focus:border-stone-800 p-1 w-full placeholder-stone-300 focus:outline-none text-stone-800 tracking-wide transition-all"
                  value={localTripName}
                  placeholder="點擊輸入旅程名稱..."
                  onChange={(e) => setLocalTripName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.target.blur();
                  }}
                />
                <Edit size={14} className="text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
              {/* Feature 1: Member Avatars next to title */}
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
                  <div className="w-6 h-6 rounded-full bg-stone-100 border border-white ring-2 ring-white flex items-center justify-center text-[8px] font-bold text-stone-500">
                    +{Object.keys(tripData.members).length - 3}
                  </div>
                )}
              </div>
            </div>

<div className="flex items-center gap-3 text-xs text-stone-400 mt-1">
  <div className="flex items-center gap-1 font-mono">
    <Calendar size={10} /> 
    <span>{tripData.startDate || "未設定"}</span>
    {tripData.endDate && (
      <>
        <ArrowRight size={10} className="mx-0.5" />
        <span>{tripData.endDate}</span>
      </>
    )}
  </div>
</div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setIsShareOpen(true)}
              className="p-2 bg-indigo-50 rounded-full text-indigo-500 hover:bg-indigo-100"
            >
              <Share2 size={18} />
            </button>
            {/* Feature 3: Delete Trip Button */}
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
              className="p-2 bg-red-50 rounded-full text-red-500 hover:bg-red-100"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={() => setTripId(null)}
              className="p-2 bg-stone-100 rounded-full text-stone-500 hover:bg-stone-200"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

{/* ↓↓↓↓↓ 修改後的按鈕區塊 (包含下拉選單) ↓↓↓↓↓ */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide mask-linear-fade relative">
          
          {/* 群組 1: 智能功能 */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleAIAnalyze}
              disabled={isAnalyzing}
              className="bg-white border border-stone-200 text-stone-600 px-3 py-2 rounded-xl shadow-sm hover:border-yellow-400 hover:text-yellow-600 hover:bg-yellow-50 transition-all flex items-center justify-center gap-2 active:scale-95 text-xs font-bold whitespace-nowrap"
            >
              {isAnalyzing ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Sparkles size={14} className="text-yellow-500" />
              )}
              智能導遊
            </button>

            <button
              onClick={() => setShowOptimizeModal(true)}
              disabled={isAnalyzing}
              className="bg-white border border-stone-200 text-stone-600 px-3 py-2 rounded-xl shadow-sm hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 active:scale-95 text-xs font-bold whitespace-nowrap"
            >
              {isAnalyzing ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Route size={14} className="text-emerald-500" />
              )}
              路線優化
            </button>
          </div>

          <div className="w-[1px] h-6 bg-stone-200 flex-shrink-0"></div>

          {/* 群組 2: 檔案操作 */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setIsImportOpen(true)}
              className="bg-white border border-stone-200 text-stone-600 px-3 py-2 rounded-xl shadow-sm hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 active:scale-95 text-xs font-bold whitespace-nowrap"
            >
              <Upload size={14} /> 匯入行程
            </button>

            {/* 匯出行程 (下拉選單) */}
            <div className="relative">
              <button
                onClick={(e) => {
                  // 1. 計算按鈕在螢幕上的位置
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMenuPos({
                    top: rect.bottom + 8, // 在按鈕下方 8px
                    right: window.innerWidth - rect.right // 對齊按鈕右邊
                  });
                  setShowExportMenu(!showExportMenu);
                }}
                className={`bg-white border text-stone-600 px-3 py-2 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 text-xs font-bold whitespace-nowrap ${
                  showExportMenu 
                    ? "border-stone-800 bg-stone-50" 
                    : "border-stone-200 hover:border-stone-400"
                }`}
              >
                <Download size={14} /> 匯出行程
              </button>

              {/* 下拉選單本體 */}
              {showExportMenu && (
                <>
                  {/* 遮罩：點擊空白處關閉 */}
                  <div 
                    className="fixed inset-0 z-[60]" 
                    onClick={() => setShowExportMenu(false)}
                  ></div>
                  
                  {/* 選單內容：改用 fixed 定位，這樣就不會被 overflow 切掉了 */}
                  <div 
                    className="fixed w-36 bg-white rounded-xl shadow-xl border border-stone-100 p-1.5 z-[70] flex flex-col gap-1 animate-in zoom-in-95 duration-200"
                    style={{ 
                      top: menuPos.top, 
                      right: menuPos.right 
                    }}
                  >
                    <button
                      onClick={() => {
                        handleExportExcel();
                        setShowExportMenu(false);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-bold text-stone-600 hover:bg-green-50 hover:text-green-600 rounded-lg transition-colors text-left"
                    >
                      <FileSpreadsheet size={16} /> Excel 表格
                    </button>
                    <button
                      onClick={() => {
                        handleExportImage();
                        setShowExportMenu(false);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-bold text-stone-600 hover:bg-pink-50 hover:text-pink-600 rounded-lg transition-colors text-left"
                    >
                      <ImageIcon size={16} /> 美圖分享
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {/* ↑↑↑↑↑ 修改結束 ↑↑↑↑↑ */}

      </header>

      <main className="flex-1 overflow-y-auto pb-32 px-4 pt-4 scrollbar-hide relative">
        {activeTab === "itinerary" && (
          <>
            {Object.keys(groupedItinerary)
              .sort((a, b) => a - b)
              .map((day) => {
                const dateStr = getDateForDay(day);
                return (
                  <div
                    key={day}
                    className="mb-8 animate-in fade-in slide-in-from-bottom-5 duration-500"
                  >
                    <div className="flex justify-between items-end mb-4 px-2">
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-stone-200 font-mono">
                            {String(day).padStart(2, "0")}
                          </span>
                          <span className="text-sm font-bold text-stone-600">
                            Day {day}
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-400 font-mono pl-1">
                          {dateStr}
                        </span>
                      </div>
                      <WeatherBadge
                        date={dateStr}
                        weatherData={tripData.weather}
                      />
                    </div>
                    <div className="pl-2 border-l-2 border-stone-100 ml-4">
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
              <div className="text-center py-20 opacity-30">
                <Map className="w-16 h-16 mx-auto mb-4" />
                <p className="tracking-widest">旅程空白中...</p>
              </div>
            )}
          </>
        )}

        {activeTab === "expenses" && (
          <div className="space-y-4">
            <div className="bg-stone-800 text-stone-50 p-6 rounded-2xl shadow-xl relative overflow-hidden flex justify-between items-center">
              <div className="relative z-10">
                <div className="text-stone-400 text-xs tracking-widest mb-1 uppercase">
                  Total Expenses
                </div>
                <div className="text-4xl font-bold font-mono">
                  $
                  {(tripData.expenses || [])
                    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
                    .toLocaleString()}
                </div>
              </div>
              <button
                onClick={handleCalculateDebts}
                className="bg-emerald-500 hover:bg-emerald-400 text-white p-3 rounded-xl shadow-lg flex flex-col items-center gap-1 text-[10px] font-bold active:scale-95 transition-transform"
              >
                <Calculator size={20} /> AI 分帳
              </button>
            </div>
            {(tripData.expenses || [])
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
                    className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex justify-between items-center group hover:border-stone-300 transition-colors cursor-pointer"
                    onClick={() => {
                      setEditingId(expense.id);
                      setItemData(expense);
                      setIsEditMode(true);
                      setIsModalOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${bgColor}`}>
                        {Icon}
                      </div>
                      <div>
                        <div className="font-bold text-stone-800">
                          {expense.item}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                          <span className="text-stone-400 font-mono">
                            {expense.date}
                          </span>
                          <div className="flex items-center gap-1 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-100">
                            <span className="text-stone-400">付:</span>
                            <span className="font-bold text-stone-600">
                              {expense.payer}
                            </span>
                          </div>
                          {expense.isSplit && (
                            <span className="text-purple-400 border border-purple-100 bg-purple-50 px-1.5 py-0.5 rounded">
                              分帳
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold font-mono text-stone-800 text-lg">
                        ${Number(expense.amount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </main>

      <button
        onClick={() => {
          setIsEditMode(false);
          setEditingId(null);
          setItemData(
            activeTab === "itinerary"
              ? { day: 1, time: "10:00", category: "sightseeing" }
              : {
                  payer: getCurrentUserNickname(),
                  date: new Date().toISOString().split("T")[0],
                  isSplit: false,
                  splitWith: [],
                  category: "food",
                }
          );
          setIsModalOpen(true);
        }}
        className="absolute bottom-28 right-6 bg-stone-800 text-white p-4 rounded-full shadow-lg shadow-stone-300 transition-transform active:scale-90 z-40 hover:bg-stone-700"
      >
        <Plus size={24} />
      </button>

      <nav className="absolute bottom-6 left-6 right-6 bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-2 flex justify-around items-center z-40">
        <button
          onClick={() => setActiveTab("itinerary")}
          className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
            activeTab === "itinerary"
              ? "text-stone-800 bg-stone-100"
              : "text-stone-400 hover:text-stone-600"
          }`}
        >
          <Calendar size={20} />
          <span className="text-[10px] font-medium tracking-wide">行程</span>
        </button>
        <div className="w-[1px] h-6 bg-stone-200"></div>
        <button
          onClick={() => setActiveTab("expenses")}
          className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
            activeTab === "expenses"
              ? "text-stone-800 bg-stone-100"
              : "text-stone-400 hover:text-stone-600"
          }`}
        >
          <CreditCard size={20} />
          <span className="text-[10px] font-medium tracking-wide">記帳</span>
        </button>
      </nav>

      {isModalOpen && (
        <div className="absolute inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#FDFCF8] w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300 max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold mb-6 text-stone-800 tracking-wide text-center shrink-0">
              {isEditMode
                ? "編輯內容"
                : activeTab === "itinerary"
                ? "新增行程"
                : "新增支出"}
            </h3>
            <div className="space-y-4 overflow-y-auto scrollbar-hide px-1 flex-1">
              {activeTab === "itinerary" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-stone-400 font-bold uppercase tracking-wider ml-1 mb-1 block">
                        Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={itemData.day}
                        onChange={(e) =>
                          setItemData({ ...itemData, day: e.target.value })
                        }
                        className="w-full bg-white border border-stone-200 rounded-xl p-3 outline-none focus:border-stone-400 transition-colors text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-400 font-bold uppercase tracking-wider ml-1 mb-1 block">
                        Time
                      </label>
                      <input
                        type="time"
                        value={itemData.time}
                        onChange={(e) =>
                          setItemData({ ...itemData, time: e.target.value })
                        }
                        className="w-full bg-white border border-stone-200 rounded-xl p-3 outline-none focus:border-stone-400 transition-colors text-center font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 font-bold uppercase tracking-wider ml-1 mb-1 block">
                      {itemData.category === "flight"
                        ? "起降機場 (例如: TPE - NRT)"
                        : "Location"}
                    </label>
                    <LocationInput
                      placeholder={
                        itemData.category === "flight"
                          ? "TPE - NRT"
                          : "搜尋地點 (例如：東京鐵塔)"
                      }
                      value={itemData.location || ""}
                      onChange={(val) =>
                        setItemData({ ...itemData, location: val })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 font-bold uppercase tracking-wider ml-1 mb-1 block">
                      Category
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        {
                          id: "sightseeing",
                          icon: <Camera size={16} />,
                          label: "景點",
                        },
                        {
                          id: "food",
                          icon: <Utensils size={16} />,
                          label: "餐廳",
                        },
                        {
                          id: "transport",
                          icon: <Train size={16} />,
                          label: "交通",
                        },
                        {
                          id: "flight",
                          icon: <Plane size={16} />,
                          label: "航班",
                        },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() =>
                            setItemData({ ...itemData, category: cat.id })
                          }
                          className={`flex-1 py-2 min-w-[3.5rem] rounded-xl border flex flex-col items-center gap-1 text-xs transition-all ${
                            itemData.category === cat.id
                              ? "bg-stone-800 text-white border-stone-800"
                              : "bg-white text-stone-400 border-stone-200 hover:border-stone-300"
                          }`}
                        >
                          {cat.icon} {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 font-bold uppercase tracking-wider ml-1 mb-1 block">
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
                      className="w-full bg-white border border-stone-200 rounded-xl p-3 outline-none focus:border-stone-400 transition-colors resize-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] text-stone-400 font-bold uppercase tracking-wider ml-1 mb-1 block">
                      消費項目
                    </label>
                    <input
                      type="text"
                      placeholder="例如: 晚餐"
                      value={itemData.item || ""}
                      onChange={(e) =>
                        setItemData({ ...itemData, item: e.target.value })
                      }
                      className="w-full bg-white border border-stone-200 rounded-xl p-3 outline-none focus:border-stone-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 font-bold uppercase tracking-wider ml-1 mb-1 block">
                      分類
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        {
                          id: "food",
                          label: "飲食",
                          icon: <Utensils size={16} />,
                        },
                        {
                          id: "transport",
                          label: "交通",
                          icon: <Train size={16} />,
                        },
                        {
                          id: "accommodation",
                          label: "住宿",
                          icon: <Home size={16} />,
                        },
                        {
                          id: "shopping",
                          label: "購物",
                          icon: <ShoppingBag size={16} />,
                        },
                        {
                          id: "other",
                          label: "其他",
                          icon: <MoreHorizontal size={16} />,
                        },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() =>
                            setItemData({ ...itemData, category: cat.id })
                          }
                          className={`flex-1 py-2 min-w-[3.5rem] rounded-xl border flex flex-col items-center gap-1 text-xs transition-all ${
                            itemData.category === cat.id
                              ? "bg-stone-800 text-white border-stone-800"
                              : "bg-white text-stone-400 border-stone-200 hover:border-stone-300"
                          }`}
                        >
                          {cat.icon} {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-stone-400 font-bold uppercase tracking-wider ml-1 mb-1 block">
                        金額
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={itemData.amount || ""}
                        onChange={(e) =>
                          setItemData({ ...itemData, amount: e.target.value })
                        }
                        className="w-full bg-white border border-stone-200 rounded-xl p-3 outline-none focus:border-stone-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-400 font-bold uppercase tracking-wider ml-1 mb-1 block">
                        日期
                      </label>
                      <input
                        type="date"
                        value={itemData.date}
                        onChange={(e) =>
                          setItemData({ ...itemData, date: e.target.value })
                        }
                        className="w-full bg-white border border-stone-200 rounded-xl p-3 outline-none focus:border-stone-400 font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 font-bold uppercase tracking-wider ml-1 mb-1 block">
                      付款人
                    </label>
                    <input
                      type="text"
                      value={itemData.payer || ""}
                      onChange={(e) =>
                        setItemData({ ...itemData, payer: e.target.value })
                      }
                      className="w-full bg-white border border-stone-200 rounded-xl p-3 outline-none focus:border-stone-400"
                    />
                  </div>
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
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
                        className={`w-10 h-6 rounded-full transition-colors flex items-center p-1 ${
                          itemData.isSplit
                            ? "bg-stone-800 justify-end"
                            : "bg-stone-300 justify-start"
                        }`}
                      >
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                      </button>
                    </div>
                    {itemData.isSplit && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <p className="text-[10px] text-stone-400 mb-2">
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
                                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                                  isSelected
                                    ? "bg-white border-stone-800 shadow-sm"
                                    : "bg-transparent border-transparent hover:bg-white"
                                }`}
                              >
                                {isSelected ? (
                                  <CheckSquare
                                    size={16}
                                    className="text-stone-800"
                                  />
                                ) : (
                                  <Square
                                    size={16}
                                    className="text-stone-300"
                                  />
                                )}
                                <span
                                  className={`text-xs font-medium ${
                                    isSelected
                                      ? "text-stone-800"
                                      : "text-stone-400"
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
            <div className="flex gap-3 mt-8 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-600 font-medium hover:bg-stone-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveItem}
                className="flex-1 py-3 rounded-xl bg-stone-800 text-white font-medium hover:bg-stone-700 transition-colors"
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
