// api/gemini.js
export default async function handler(req, res) {
  // 1. 設定 CORS (讓你的前端可以呼叫這個 API)
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  // 處理預檢請求 (Preflight request)
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // 2. 取得 Vercel 環境變數中的 API Key
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "Server configuration error: Missing API Key" });
  }

  // 3. 取得前端傳來的資料
  const { parts } = req.body;

  if (!parts) {
    return res.status(400).json({ error: "Missing parts in request body" });
  }

  try {
    // 4. 由後端呼叫 Google Gemini API
    // 這裡改用穩定的 1.5-flash 模型，速度快且便宜
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: parts }],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Gemini API Error");
    }

    // 5. 將結果回傳給前端
    res.status(200).json(data);
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message });
  }
}
