let data = {
  id: "DEMO", name: "京都之旅", destination: "京都", startDate: "2026-11-01", endDate: "2026-11-03", weather: {},
  members: { me: { nickname: "Alice", emoji: "🐱" }, other: { nickname: "Bob", emoji: "🐶" } },
  itinerary: [
    { id: "a", createdBy: "other", day: 1, time: "10:00", location: "清水寺", category: "sightseeing", notes: "散步與拍照", lat: 35, lng: 135 },
    { id: "b", createdBy: "me", day: 1, time: "12:00", location: "午餐", category: "food", notes: "", lat: 35.1, lng: 135.1 },
    { id: "c", createdBy: "me", day: 2, time: "09:00", location: "嵐山", category: "sightseeing", notes: "竹林散步", lat: 35.2, lng: 135.2 },
  ],
  expenses: [{ id: "e", createdBy: "me", item: "午餐費", amount: 210, currency: "JPY", foreignAmount: 1000, exchangeRate: .21, payer: "Alice", isSplit: true, splitWith: ["Alice", "Bob"], date: "2026-11-01" }],
  checklist: [{ id: "check", text: "護照", createdBy: "me", isCompleted: false }],
  notes: [{ id: "note", content: "集合時間", author: "Alice", emoji: "🐱", time: 1, replies: [] }],
};
let listeners = [];
const emit = () => listeners.forEach(listener => listener({ exists: () => true, data: () => structuredClone(data) }));
window.testTrip = { get: () => structuredClone(data), patch: update => { data = { ...data, ...update }; emit(); }, writes: 0, fail: false };
export const initializeApp = () => ({}), getApps = () => [], getApp = () => ({}), getAuth = () => ({}), getFirestore = () => ({});
export const signInAnonymously = async () => {}, signInWithCustomToken = async () => {};
export const onAuthStateChanged = (auth, callback) => { callback({ uid: "me" }); return () => {}; };
export const doc = (...args) => args.join("/"), arrayUnion = (...items) => ({ union: items });
export const onSnapshot = (ref, callback) => { listeners.push(callback); emit(); return () => { listeners = listeners.filter(item => item !== callback); }; };
export const updateDoc = async (ref, changes) => {
  if (window.testTrip.fail) throw new Error("模擬離線");
  for (const [key, value] of Object.entries(changes)) data[key] = value?.union ? [...(data[key] || []), ...value.union] : value;
  window.testTrip.writes++; emit();
};
export const runTransaction = async (db, callback) => {
  let pending;
  await callback({ get: async () => ({ exists: () => true, data: () => structuredClone(data) }), update: (ref, changes) => { pending = [ref, changes]; }, set: () => { throw new Error("Unexpected create"); } });
  if (pending) await updateDoc(...pending);
};
export const deleteDoc = () => { throw new Error("Deletion is forbidden in browser tests"); };
