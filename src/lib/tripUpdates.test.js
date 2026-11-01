import { runTransaction } from "firebase/firestore";
import { updateTrip, editRecord, updateRecord, applyAIUpdates, normalizeImportedItems } from "./tripUpdates";
jest.mock("firebase/firestore", () => ({ runTransaction: jest.fn() }));
const a = { id: "a", location: "Tokyo", day: 1, time: "10:00", notes: "old", createdBy: "owner" };
const b = { id: "b", location: "Kyoto", day: 1, time: "12:00" };

test("transaction retries use the latest snapshot and preserve concurrent additions/edits", async () => {
  const update = jest.fn();
  runTransaction.mockImplementation(async (db, callback) => {
    await callback({ get: async () => ({ exists: () => true, data: () => ({ itinerary: [a] }) }), update });
    await callback({ get: async () => ({ exists: () => true, data: () => ({ itinerary: [{ ...a, time: "11:00" }, b] }) }), update });
  });
  await updateTrip({}, "trip", latest => ({ itinerary: editRecord(latest.itinerary, "a", a, { ...a, notes: "new" }) }));
  expect(update.mock.calls[1][1].itinerary).toEqual([{ ...a, time: "11:00", notes: "new" }, b]);
});
test("same-field conflicts and remotely deleted records are rejected", () => {
  expect(() => editRecord([{ ...a, notes: "remote" }], "a", a, { notes: "mine" })).toThrow(/其他成員/);
  expect(() => editRecord([b], "a", a, { notes: "mine" })).toThrow(/已刪除/);
});
test("note edits preserve concurrent replies, pins, and other notes", () => {
  const base = { id: "n", content: "old", image: null, replies: [] };
  const current = { ...base, replies: [{ id: "r", content: "reply" }], isPinned: true };
  expect(editRecord([current, b], "n", base, { content: "new" })).toEqual([{ ...current, content: "new" }, b]);
  expect(updateRecord([current], "n", n => ({ ...n, replies: [...n.replies, { id: "r2" }] }))[0].replies).toHaveLength(2);
});
test("missing trips are never recreated by edits", async () => {
  const update = jest.fn();
  runTransaction.mockImplementation((db, callback) => callback({ get: async () => ({ exists: () => false }), update }));
  await expect(updateTrip({}, "trip", () => ({}))).rejects.toThrow(/不存在/);
  expect(update).not.toHaveBeenCalled();
});
test("AI changes preserve concurrent additions, edits, deletions and ignore unapproved fields", () => {
  const result = [{ id: "a", guideInfo: "guide", tags: [], location: "malicious", createdBy: "AI" }];
  expect(applyAIUpdates([{ ...a, notes: "new" }, b], [a], result, "guide")).toEqual([{ ...a, notes: "new", guideInfo: "guide", tags: [] }, b]);
  expect(applyAIUpdates([b], [a], result, "guide")).toEqual([b]);
  expect(() => applyAIUpdates([{ ...a, location: "Osaka" }], [a], result, "guide")).toThrow(/已變更/);
});
test("AI optimization validates IDs, days, and times", () => {
  expect(applyAIUpdates([a, b], [a, b], [{ id: "a", day: 1, time: "09:00" }], "optimize")).toEqual([{ ...a, time: "09:00" }, b]);
  for (const result of [
    [{ id: "a", day: 2, time: "09:00" }], [{ id: "a", day: 1, time: "25:70" }],
    [{ id: "x", day: 1, time: "09:00" }], [{ id: "a", day: 1, time: "09:00" }, { id: "a", day: 1, time: "09:00" }],
  ]) expect(() => applyAIUpdates([a, b], [a, b], result, "optimize")).toThrow();
});

test("coordinate and money fields reject incompatible concurrent edits", () => {
  expect(() => editRecord([{ ...a, lat: 36, lng: 136 }], "a", { ...a, lat: 35, lng: 135 }, { location: "Osaka" })).toThrow(/其他成員/);
  const expense = { id: "e", amount: 20, foreignAmount: 100, exchangeRate: .2, currency: "JPY" };
  expect(() => editRecord([{ ...expense, exchangeRate: .3, amount: 30 }], "e", expense, { amount: 40, foreignAmount: 200 })).toThrow(/其他成員/);
});


test("import rejects malformed AI data before any write", () => {
  for (const items of [null, {}, [], [{ day: 0, time: "10:00", location: "Tokyo" }], [{ day: 1, time: "25:00", location: "Tokyo" }], [{ day: 1, time: "10:00", location: "" }]]) {
    expect(() => normalizeImportedItems(items, "user")).toThrow();
  }
});
test("import uses new IDs and only supported fields", () => {
  Object.defineProperty(global, "crypto", { value: { randomUUID: () => "new-id" }, configurable: true });
  expect(normalizeImportedItems([{ day: "2", time: "10:00", location: " Tokyo ", id: "AI", createdBy: "other", category: "bad", notes: "walk", members: {} }], "me")).toEqual([
    { id: "new-id", createdBy: "me", day: 2, time: "10:00", location: "Tokyo", category: "sightseeing", notes: "walk" }
  ]);
});
