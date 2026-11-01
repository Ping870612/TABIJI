export function amountInCents(value) {
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(String(value))) throw new Error("金額須為有效數字，最多兩位小數");
  const [whole, fraction = ""] = String(value).split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error("金額須大於零且在可計算範圍內");
  return cents;
}

export function validateExpense(expense) {
  const cents = amountInCents(expense.amount);
  if (typeof expense.payer !== "string" || !expense.payer.trim()) throw new Error("請填寫付款人");
  if (expense.isSplit && (!Array.isArray(expense.splitWith) || !expense.splitWith.length ||
    expense.splitWith.some(name => typeof name !== "string" || !name.trim()))) {
    throw new Error("請至少選擇一位分攤成員");
  }
  return cents;
}

export function calculateDebts(expenses) {
  const balances = new Map();
  const add = (name, cents) => {
    const value = (balances.get(name) || 0) + cents;
    if (!Number.isSafeInteger(value)) throw new Error("總金額超出可計算範圍");
    balances.set(name, value);
  };
  for (const expense of expenses) {
    if (!expense.isSplit) continue;
    const cents = validateExpense(expense);
    const people = [...new Set(expense.splitWith.map(name => name.trim()))].sort();
    add(expense.payer.trim(), cents);
    const share = Math.floor(cents / people.length);
    const remainder = cents % people.length;
    people.forEach((name, index) => add(name, -(share + (index < remainder ? 1 : 0))));
  }
  const creditors = [...balances].filter(([, value]) => value > 0);
  const debtors = [...balances].filter(([, value]) => value < 0);
  const transfers = [];
  let creditor = 0;
  for (const [from, balance] of debtors) {
    let owed = -balance;
    while (owed > 0) {
      const [to, available] = creditors[creditor];
      const cents = Math.min(owed, available);
      transfers.push({ from, to, amount: cents / 100 });
      owed -= cents;
      creditors[creditor][1] -= cents;
      if (creditors[creditor][1] === 0) creditor += 1;
    }
  }
  return transfers;
}
