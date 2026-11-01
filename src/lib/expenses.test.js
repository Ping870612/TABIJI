import { amountInCents, calculateDebts, validateExpense } from "./expenses";
const expense = (amount, payer = "A", splitWith = ["A", "B"], isSplit = true) => ({ amount, payer, splitWith, isSplit });

test("personal expenses never create debts; payer need not be a participant", () => {
  expect(calculateDebts([expense(100, "A", [], false)])).toEqual([]);
  expect(calculateDebts([expense(100, "A", ["B", "C"])])).toEqual([
    { from: "B", to: "A", amount: 50 }, { from: "C", to: "A", amount: 50 },
  ]);
});
test("duplicates and rounding preserve every cent deterministically", () => {
  expect(calculateDebts([expense("100.00", "A", ["C", "B", "A", "B"])])).toEqual([
    { from: "B", to: "A", amount: 33.33 }, { from: "C", to: "A", amount: 33.33 },
  ]);
  expect(calculateDebts([expense("0.01", "C", ["A", "B", "C"])])).toEqual([{ from: "A", to: "C", amount: 0.01 }]);
});
test("reciprocal debts cancel and stored TWD amount is not converted twice", () => {
  expect(calculateDebts([expense(100), expense(100, "B")])).toEqual([]);
  expect(calculateDebts([{ ...expense(20.25), currency: "JPY", foreignAmount: 100, exchangeRate: .2025 }])).toEqual([{ from: "B", to: "A", amount: 10.12 }]);
});
test.each(["", "12abc", Infinity, NaN, -1, 0, "1.234", "1e3", Number.MAX_SAFE_INTEGER])("rejects invalid money %s", value => {
  expect(() => amountInCents(value)).toThrow();
});
test("rejects missing payer or participants instead of quietly undercharging", () => {
  expect(() => validateExpense(expense(100, ""))).toThrow();
  expect(() => calculateDebts([expense(100, "A", [])])).toThrow();
});
test("many cent amounts conserve net obligations", () => {
  for (let cents = 1; cents <= 300; cents++) {
    const transfers = calculateDebts([expense((cents / 100).toFixed(2), "P", ["A", "B", "C"])]);
    expect(transfers.reduce((sum, item) => sum + Math.round(item.amount * 100), 0)).toBe(cents);
  }
});
