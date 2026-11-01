import { runTransaction } from "firebase/firestore";

export async function updateTrip(db, ref, change) {
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("旅程已不存在，請重新開啟旅程");
    transaction.update(ref, change(snapshot.data()));
  });
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Merge only edited fields; a concurrent edit to the same field needs review.
export function mergeFields(current, base, edited) {
  if (!current || !base) throw new Error("項目已刪除，請重新開啟列表");
  // Coordinates and converted money are coupled values, not independent fields.
  for (const fields of [["location", "lat", "lng"], ["amount", "foreignAmount", "currency", "exchangeRate"]]) {
    if (fields.some(key => key in edited && !same(base[key], edited[key])) &&
        fields.some(key => !same(current[key], base[key]) && !same(current[key], key in edited ? edited[key] : base[key]))) {
      throw new Error("其他成員已修改相同內容，請保留草稿並重新開啟項目確認");
    }
  }
  const changes = {};
  for (const [key, value] of Object.entries(edited)) {
    if (same(base[key], value)) continue;
    if (!same(current[key], base[key]) && !same(current[key], value)) {
      throw new Error("其他成員已修改相同內容，請保留草稿並重新開啟項目確認");
    }
    changes[key] = value;
  }
  return { ...current, ...changes };
}

export function editRecord(list = [], id, base, edited) {
  const current = list.find(item => item.id === id);
  const merged = mergeFields(current, base, edited);
  return list.map(item => item.id === id ? merged : item);
}

export function updateRecord(list = [], id, change) {
  if (!list.some(item => item.id === id)) throw new Error("項目已刪除，請重新開啟列表");
  return list.map(item => item.id === id ? change(item) : item);
}

export function applyAIUpdates(current, base, result, mode) {
  if (!Array.isArray(result)) throw new Error("AI 回傳格式錯誤");
  const seen = new Set();
  const updates = new Map(result.map(item => {
    const original = base.find(record => record.id === item.id);
    if (!original || seen.has(item.id)) throw new Error("AI 回傳了未知或重複的項目");
    seen.add(item.id);
    if (mode === "optimize") {
      if (Number(item.day) !== Number(original.day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)) {
        throw new Error("AI 回傳了無效時間或跨日行程");
      }
      return [item.id, { time: item.time }];
    }
    if (typeof item.guideInfo !== "string" || !Array.isArray(item.tags) || item.tags.some(tag =>
      !tag || !["mustEat", "mustBuy", "reservation", "story"].includes(tag.type) || typeof tag.text !== "string"
    )) throw new Error("AI 導遊資料格式錯誤");
    return [item.id, { guideInfo: item.guideInfo, tags: item.tags }];
  }));
  return current.map(item => {
    if (!updates.has(item.id)) return item;
    const original = base.find(record => record.id === item.id);
    // The response describes the old location/schedule; never apply it to a changed stop.
    if (["location", "day", "time"].some(key => !same(item[key], original[key]))) {
      throw new Error("分析期間行程已變更，請重新分析");
    }
    return mergeFields(item, original, updates.get(item.id));
  });
}

export function normalizeImportedItems(items, uid) {
  if (!Array.isArray(items) || !items.length) throw new Error("未找到可匯入的行程");
  return items.map(item => {
    if (!item || typeof item.location !== "string" || !item.location.trim() ||
      !Number.isInteger(Number(item.day)) || Number(item.day) < 1 ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)) throw new Error("匯入行程的地點、天數或時間無效");
    return { id: crypto.randomUUID(), createdBy: uid, day: Number(item.day), time: item.time,
      location: item.location.trim(), category: ["sightseeing", "food", "transport", "flight", "accommodation", "activity"].includes(item.category) ? item.category : "sightseeing",
      notes: typeof item.notes === "string" ? item.notes : "" };
  });
}
