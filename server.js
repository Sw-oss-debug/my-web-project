const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;
const DB_PATH = path.join(__dirname, 'novaflow.db');
const db = new sqlite3.Database(DB_PATH);

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

function runDb(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function errorHandler(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function getDb(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row || null);
    });
  });
}

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          plan TEXT NOT NULL,
          mode TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }

        db.run(`
          CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            plan TEXT NOT NULL,
            amount INTEGER NOT NULL,
            currency TEXT NOT NULL,
            created_at TEXT NOT NULL
          )
        `, (err2) => {
          if (err2) {
            reject(err2);
            return;
          }
          resolve();
        });
      });
    });
  });
}

function getPlanLabel(plan) {
  const map = {
    starter: 'Starter',
    growth: 'Growth',
    enterprise: 'Enterprise',
  };
  return map[plan] || 'Growth';
}

function buildAiResponse(input) {
  const text = String(input || '').toLowerCase();
  const responses = [];

  if (text.includes('客服') || text.includes('回覆') || text.includes('模板')) {
    return '可先做 3 層客服流程：FAQ 自動回覆、訂單狀態查詢、轉人工時的風險判斷。這樣能有效降低重複成本，同時維持服務體驗。';
  }

  if (text.includes('行銷') || text.includes('文案') || text.includes('launch')) {
    return '行銷文案可先做 3 個版本：品牌價值、場景實例與行動呼籲。用 AI 生成後，再按轉化率與點擊率做 A/B 測試。';
  }

  if (text.includes('crm') || text.includes('銷售') || text.includes('潛在客戶') || text.includes('名單')) {
    return '建議把 CRM 分成 3 個維度：興趣程度、購買意願與回覆速度。AI 能先做資料歸納，讓業務人員能快速跟進最有價值的客戶。';
  }

  if (text.includes('營運') || text.includes('流程') || text.includes('自動化')) {
    return '自動化的重點是把重複任務全部標準化，例如：訊息分流、資料整理、工單指派與後續追蹤。這樣能把人力留在最關鍵的決策層。';
  }

  if (text.includes('網站') || text.includes('產品') || text.includes('app')) {
    return '如果要做 B2B AI 產品，最重要是先鎖定單一行業痛點，避免做成大而全的工具。先驗證 10 位潛在客戶願不願意付費，再快速迭代。';
  }

  if (text.includes('方向') || text.includes('賣點') || text.includes('怎麼做') || text.includes('商業模式')) {
    return '這個方向很適合以「營運效率 + 金額節省」作為賣點。先定義目標客群、既有流程與痛點，再將 AI 融入客服、CRM 或數據分析。真正能賣的不是功能多，而是能幫客戶每月少花多少人力、增加多少成交。';
  }

  // 多样化的默认回复，随机选择
  const defaultResponses = [
    '先把目標客群縮小到一個明確產業，例如服務業、電商或銷售代理。接著看他們現在的流程卡在哪裡，例如回覆速度慢、資料整理繁瑣、商機漏失。只有先解決現金流問題，AI 才有辦法真正變成可持續的產品。',
    
    '建議從痛點開始。先列出目標客群的 5 個最大問題，再評估 AI 能否解決其中前 3 個。如果能，就專注在這 3 個上，把 MVP 做到極簡但有用。',
    
    '不要貪心做全功能。先找 1 個高價值痛點，用 AI 快速測試是否有人願意付費。驗證商業模式後再擴功能，這樣風險最小。',
    
    'AI 產品成功的關鍵不是技術強，而是找到真正能夠降低成本或增加收入的應用場景。先從後勤、客服或銷售著手會更容易驗證價值。',
    
    '先做一個簡單的 Proof of Concept 讓潛在客戶試用，根據他們的反饋快速調整。比起完美的產品，市場驗證更重要。',
  ];

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

function getPlanProviderAccess(plan = 'guest') {
  const normalizedPlan = String(plan || 'guest').toLowerCase();
  const access = {
    guest: ['gemini'],
    starter: ['openai'],
    growth: ['openai', 'gemini'],
    enterprise: ['openai', 'claude', 'gemini', 'perplexity', 'deepseek'],
  };

  return access[normalizedPlan] || access.guest;
}

function getEnabledAiProviders(plan = 'guest') {
  const providers = ['openai', 'claude', 'gemini', 'perplexity', 'deepseek'];
  const allowed = getPlanProviderAccess(plan);
  const available = providers.filter((provider) => {
    if (provider === 'openai') return Boolean(process.env.OPENAI_API_KEY);
    if (provider === 'claude') return Boolean(process.env.ANTHROPIC_API_KEY);
    if (provider === 'gemini') return Boolean(process.env.GEMINI_API_KEY);
    if (provider === 'perplexity') return Boolean(process.env.PERPLEXITY_API_KEY);
    if (provider === 'deepseek') return Boolean(process.env.DEEPSEEK_API_KEY);
    return false;
  });

  if (!allowed.length) {
    return [];
  }

  return available.filter((provider) => allowed.includes(provider));
}

async function callOpenAIModel(message) {
  if (!process.env.OPENAI_API_KEY) return { ok: false, provider: 'openai', reason: 'missing key' };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '你是 NovaFlow 的商業顧問，請用簡潔中文回答企業 AI 產品、客服自動化與 CRM 問題。' },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    return { ok: false, provider: 'openai', reason: 'request failed' };
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    return { ok: false, provider: 'openai', reason: 'empty reply' };
  }

  return { ok: true, provider: 'openai', reply };
}

async function callClaudeModel(message) {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, provider: 'claude', reason: 'missing key' };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      messages: [{ role: 'user', content: message }],
    }),
  });

  if (!response.ok) {
    return { ok: false, provider: 'claude', reason: 'request failed' };
  }

  const data = await response.json();
  const reply = data?.content?.[0]?.text?.trim();

  if (!reply) {
    return { ok: false, provider: 'claude', reason: 'empty reply' };
  }

  return { ok: true, provider: 'claude', reply };
}

async function callGeminiModel(message) {
  if (!process.env.GEMINI_API_KEY) return { ok: false, provider: 'gemini', reason: 'missing key' };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: `你是 NovaFlow 的商業顧問，請用簡潔中文回答：${message}` }],
      }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Gemini API error: ${response.status}`, error);
    return { ok: false, provider: 'gemini', reason: `request failed: ${response.status}` };
  }

  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!reply) {
    return { ok: false, provider: 'gemini', reason: 'empty reply' };
  }

  return { ok: true, provider: 'gemini', reply };
}

async function callPerplexityModel(message) {
  if (!process.env.PERPLEXITY_API_KEY) return { ok: false, provider: 'perplexity', reason: 'missing key' };

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: '你是 NovaFlow 的商業顧問。請用簡潔中文回答企業 AI 產品、客服自動化與 CRM 問題。' },
        { role: 'user', content: message },
      ],
    }),
  });

  if (!response.ok) {
    return { ok: false, provider: 'perplexity', reason: 'request failed' };
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    return { ok: false, provider: 'perplexity', reason: 'empty reply' };
  }

  return { ok: true, provider: 'perplexity', reply };
}

async function callDeepSeekModel(message) {
  if (!process.env.DEEPSEEK_API_KEY) return { ok: false, provider: 'deepseek', reason: 'missing key' };

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是 NovaFlow 的商業顧問。請用簡潔中文回答企業 AI 產品、客服自動化與 CRM 問題。' },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    return { ok: false, provider: 'deepseek', reason: 'request failed' };
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    return { ok: false, provider: 'deepseek', reason: 'empty reply' };
  }

  return { ok: true, provider: 'deepseek', reply };
}

function cleanGeminiResponse(text) {
  // 过滤Gemini的常见口头禅和模式
  let cleaned = text
    .replace(/^.*?可以幫你.*?\n/gm, '')
    .replace(/^.*?希望這有幫助.*$/gm, '')
    .replace(/^.*?有其他問題嗎\?.*$/gm, '')
    .replace(/\n\n+/g, '\n\n')
    .trim();
  
  return cleaned || text;
}

async function callAiAcrossProviders(message, requestedProviders = [], plan = 'guest') {
  const providers = requestedProviders.length ? requestedProviders : getEnabledAiProviders(plan);
  console.log(`[AI] Message: "${message.substring(0, 50)}..." | Providers: ${providers.join(', ')} | Plan: ${plan}`);

  if (providers.length === 0) {
    const fallbackReply = buildAiResponse(message);
    console.log(`[FALLBACK] No provider available`);
    return {
      ok: true,
      reply: fallbackReply,
      source: 'local-fallback',
      providers: [],
      providerResults: [],
    };
  }

  const handlers = {
    openai: callOpenAIModel,
    claude: callClaudeModel,
    gemini: callGeminiModel,
    perplexity: callPerplexityModel,
    deepseek: callDeepSeekModel,
  };

  const timeoutMs = providers.length === 1 ? 25000 : 12000;

  const runWithTimeout = async (provider, handler) => {
    const result = await Promise.race([
      handler(message).then((value) => {
        console.log(`[${provider.toUpperCase()}] Result:`, value.ok ? `✅ Success` : `❌ Failed (${value.reason})`);
        if (value.ok && provider === 'gemini' && value.reply) {
          value.reply = cleanGeminiResponse(value.reply);
        }
        return value;
      }),
      new Promise((_, reject) => {
        setTimeout(() => {
          console.log(`[${provider.toUpperCase()}] ⏱️ Timeout (${timeoutMs / 1000}s)`);
          reject({ ok: false, provider, reason: 'timeout' });
        }, timeoutMs);
      }),
    ]);

    return result;
  };

  if (providers.length === 1) {
    const provider = providers[0];
    const handler = handlers[provider];
    if (!handler) {
      return { ok: true, reply: buildAiResponse(message), source: 'local-fallback', providers: [], providerResults: [] };
    }

    try {
      const result = await runWithTimeout(provider, handler);
      if (result && result.ok) {
        console.log(`[SUCCESS] Using ${result.provider} response`);
        return {
          ok: true,
          reply: result.reply,
          source: 'api',
          provider: result.provider,
          providers: [result.provider],
          providerResults: [result],
        };
      }
    } catch (error) {
      console.log(`[RACE] Single-provider request failed; falling back to local`);
    }
  } else {
    const results = await Promise.allSettled(
      providers.map((provider) => {
        const handler = handlers[provider];
        if (!handler) {
          return { ok: false, provider, reason: 'unsupported provider' };
        }
        return runWithTimeout(provider, handler);
      })
    );

    const successful = results
      .filter((result) => result.status === 'fulfilled' && result.value?.ok)
      .map((result) => result.value);

    if (successful.length > 0) {
      const chosen = successful[0];
      console.log(`[SUCCESS] Using ${chosen.provider} response`);
      return {
        ok: true,
        reply: chosen.reply,
        source: 'api',
        provider: chosen.provider,
        providers: successful.map((item) => item.provider),
        providerResults: successful,
      };
    }
  }

  const fallbackReply = buildAiResponse(message);
  console.log(`[FALLBACK] Using local response`);
  return {
    ok: true,
    reply: fallbackReply,
    source: 'local-fallback',
    providers: [],
    providerResults: [],
  };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'NovaFlow API is up', timestamp: new Date().toISOString() });
});

app.post('/api/login', async (req, res) => {
  const { email, plan = 'growth', mode = 'guest' } = req.body || {};

  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ ok: false, message: '請輸入有效的電子郵件。' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const selectedPlan = getPlanLabel(plan);
  const timestamp = new Date().toISOString();

  try {
    await runDb(
      `
        INSERT INTO users (email, plan, mode, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          plan = excluded.plan,
          mode = excluded.mode,
          updated_at = excluded.updated_at
      `,
      [normalizedEmail, selectedPlan, mode, timestamp, timestamp]
    );

    const user = await getDb('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

    return res.json({
      ok: true,
      user: {
        email: user.email,
        plan: user.plan,
        mode: user.mode,
        isMember: user.mode === 'member',
      },
      message: user.mode === 'member' ? `會員方案 ${user.plan} 已啟用。` : '普通登入成功。',
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: '登入失敗，請稍後再試。' });
  }
});

app.post('/api/checkout', async (req, res) => {
  const { email, plan = 'growth' } = req.body || {};

  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ ok: false, message: '請提供有效電子郵件。' });
  }

  const selectedPlan = getPlanLabel(plan);
  const planPrices = {
    Starter: 2900,
    Growth: 12900,
    Enterprise: 0,
  };

  const amount = planPrices[selectedPlan] || 12900;

  try {
    await runDb(
      `INSERT INTO payments (email, plan, amount, currency, created_at) VALUES (?, ?, ?, ?, ?)`,
      [String(email).trim().toLowerCase(), selectedPlan, amount, 'TWD', new Date().toISOString()]
    );

    return res.json({
      ok: true,
      message: '付款成功，會員權限已開通。',
      plan: selectedPlan,
      amount,
      currency: 'TWD',
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: '付款記錄寫入失敗。' });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message, providers, plan = 'guest' } = req.body || {};

  if (!message || !String(message).trim()) {
    return res.status(400).json({ ok: false, message: '請輸入聊天內容。' });
  }

  try {
    const normalizedPlan = String(plan).toLowerCase();
    const allowedProviders = getEnabledAiProviders(normalizedPlan);
    const requestedProviders = Array.isArray(providers)
      ? providers
          .map((item) => String(item).toLowerCase())
          .filter((item) => allowedProviders.includes(item))
      : allowedProviders;

    const result = await callAiAcrossProviders(String(message).trim(), requestedProviders, normalizedPlan);
    return res.json({
      ...result,
      allowedProviders,
      selectedPlan: normalizedPlan,
    });
  } catch (error) {
    const fallback = buildAiResponse(message);
    return res.json({ ok: true, reply: fallback, source: 'local-fallback', providers: [], providerResults: [], allowedProviders: [], selectedPlan: String(plan || 'guest').toLowerCase() });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const rows = await new Promise((resolve, reject) => {
      db.all('SELECT email, plan, mode, created_at, updated_at FROM users ORDER BY created_at DESC', (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });

    return res.json({ ok: true, users: rows });
  } catch (error) {
    return res.status(500).json({ ok: false, message: '讀取使用者資料失敗。' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`NovaFlow server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });
