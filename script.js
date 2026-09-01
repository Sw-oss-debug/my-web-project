const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatBody = document.getElementById('chatBody');
const promptChips = document.querySelectorAll('.prompt-chip');
const providerButtons = document.querySelectorAll('.provider-btn');
const selectedProviders = new Set(['openai', 'claude', 'gemini', 'perplexity', 'deepseek']);

const monthlyTicketsInput = document.getElementById('monthlyTickets');
const avgCostInput = document.getElementById('avgCost');
const retainRateInput = document.getElementById('retainRate');
const retainText = document.getElementById('retainText');
const monthlySavings = document.getElementById('monthlySavings');

const authModal = document.getElementById('authModal');
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const memberPanel = document.querySelector('[data-membership]');
const loginButtons = document.querySelectorAll('.open-login, .member-login');
const userStatus = document.getElementById('userStatus');
const modalCloseButton = document.querySelector('.modal-close');
const loginTitle = document.getElementById('loginTitle');
const loginHint = document.getElementById('loginHint');
const loginSubmit = document.getElementById('loginSubmit');
const paymentFields = document.getElementById('paymentFields');
const memberPlan = document.getElementById('memberPlan');
const startDemoButtons = document.querySelectorAll('.start-demo');
const watchDemoButtons = document.querySelectorAll('.watch-demo');

function appendMessage(role, text) {
  if (!chatBody) return;
  const message = document.createElement('div');
  message.className = `message ${role}`;
  message.innerHTML = `<span>${text}</span>`;
  chatBody.appendChild(message);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function getProviderList() {
  return [...selectedProviders];
}

function generateAiResponse(input) {
  const text = input.toLowerCase();

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

  return '先把目標客群縮小到一個明確產業，例如服務業、電商或銷售代理。接著看他們現在的流程卡在哪裡，例如回覆速度慢、資料整理繁瑣、商機漏失。只有先解決現金流問題，AI 才有辦法真正變成可持續的產品。';
}

function formatCurrency(value) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(value);
}

function updateSavings() {
  if (!monthlyTicketsInput || !avgCostInput || !retainRateInput || !retainText || !monthlySavings) {
    return;
  }

  const tickets = Number(monthlyTicketsInput.value) || 0;
  const cost = Number(avgCostInput.value) || 0;
  const rate = Number(retainRateInput.value) || 0;

  const savings = tickets * cost * (rate / 100);

  retainText.textContent = `${rate}%`;
  monthlySavings.textContent = formatCurrency(savings);
}

function setLoggedInState(email, mode = 'guest') {
  const userName = email.split('@')[0] || '會員';
  const memberLabel = document.getElementById('memberLabel');

  if (mode === 'member') {
    if (memberPanel) {
      memberPanel.classList.add('unlocked');
    }

    if (memberLabel) {
      memberLabel.textContent = `${userName} 的 VIP 會員`;
    }

    if (userStatus) {
      userStatus.textContent = `會員登入：${userName}`;
    }

    localStorage.setItem('novaflowMember', email);
    localStorage.setItem('novaflowMode', 'member');
  } else {
    if (memberPanel) {
      memberPanel.classList.remove('unlocked');
    }

    if (memberLabel) {
      memberLabel.textContent = '登入後解鎖更多 AI 工具與專屬內容。';
    }

    if (userStatus) {
      userStatus.textContent = `普通登入：${userName}`;
    }

    localStorage.setItem('novaflowMember', email);
    localStorage.setItem('novaflowMode', 'guest');
  }

  document.body.classList.add('is-logged-in');
}

function closeModal() {
  if (authModal) {
    authModal.classList.add('hidden');
  }
}

function openModal(mode = 'guest') {
  if (authModal) {
    authModal.dataset.mode = mode;
    authModal.classList.remove('hidden');
  }

  if (loginTitle) {
    loginTitle.textContent = mode === 'member' ? '會員登入 & 付款' : '普通登入';
  }

  if (loginHint) {
    loginHint.textContent = mode === 'member'
      ? '登入會員後即可付款解鎖 VIP 內容、進階模板與會員專屬儀表板。'
      : '立即開始使用 AI 客服與營運助手。';
  }

  if (loginSubmit) {
    loginSubmit.textContent = mode === 'member' ? '確認付款並登入' : '普通登入';
  }

  if (paymentFields) {
    paymentFields.classList.toggle('hidden', mode !== 'member');
  }

  if (loginEmail) {
    loginEmail.focus();
  }
}

function scrollToDemo() {
  const demoSection = document.getElementById('demo');
  if (demoSection) {
    demoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.location.href = '/chat.html';
    return;
  }

  window.setTimeout(() => {
    const input = document.getElementById('chatInput');
    if (input) {
      input.focus();
    }
  }, 500);
}

function checkLoginState() {
  const stored = localStorage.getItem('novaflowMember');
  const mode = localStorage.getItem('novaflowMode') || 'guest';
  if (stored) {
    setLoggedInState(stored, mode);
  }
}

function getSelectedPlanLabel() {
  if (!memberPlan) {
    return 'Growth';
  }

  const selected = memberPlan.value;
  const planMap = {
    starter: 'Starter',
    growth: 'Growth',
    enterprise: 'Enterprise',
  };

  return planMap[selected] || 'Growth';
}

async function callLoginApi(email, mode) {
  const payload = {
    email,
    mode,
    plan: mode === 'member' ? memberPlan?.value || 'growth' : 'growth',
  };

  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return response.json();
}

async function callCheckoutApi(email, mode) {
  if (mode !== 'member') {
    return { ok: true };
  }

  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, plan: memberPlan?.value || 'growth' }),
  });

  return response.json();
}

async function callChatApi(message) {
  const plan = localStorage.getItem('novaflowPlan') || 'guest';
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, providers: getProviderList(), plan }),
  });

  return response.json();
}

function syncProviderButtonsByPlan() {
  const plan = (localStorage.getItem('novaflowPlan') || 'guest').toLowerCase();
  const allowed = {
    guest: ['gemini'],
    starter: ['openai'],
    growth: ['openai', 'gemini'],
    enterprise: ['openai', 'claude', 'gemini', 'perplexity', 'deepseek'],
  };

  providerButtons.forEach((button) => {
    const provider = button.dataset.provider;
    const isAllowed = !!(provider && allowed[plan] && allowed[plan].includes(provider));
    button.classList.toggle('active', isAllowed);

    if (isAllowed) {
      selectedProviders.add(provider);
    } else if (provider) {
      selectedProviders.delete(provider);
    }
  });

  if (plan === 'guest' || !allowed[plan]?.length) {
    providerButtons.forEach((button) => {
      button.classList.remove('active');
      const provider = button.dataset.provider;
      if (provider) {
        selectedProviders.delete(provider);
      }
    });
  }
}

if (providerButtons.length) {
  providerButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const provider = button.dataset.provider;
      if (!provider) return;

      const plan = (localStorage.getItem('novaflowPlan') || 'guest').toLowerCase();
      const allowed = {
        guest: ['gemini'],
        starter: ['openai'],
        growth: ['openai', 'gemini'],
        enterprise: ['openai', 'claude', 'gemini', 'perplexity', 'deepseek'],
      };

      if (allowed[plan] && !allowed[plan].includes(provider)) {
        window.alert('此方案不能切換到該模型，請升級會員方案。');
        return;
      }

      if (selectedProviders.has(provider)) {
        selectedProviders.delete(provider);
        button.classList.remove('active');
      } else {
        selectedProviders.add(provider);
        button.classList.add('active');
      }

      if (selectedProviders.size === 0) {
        ['openai', 'claude', 'gemini', 'perplexity', 'deepseek'].forEach((item) => {
          if (allowed[plan] && allowed[plan].includes(item)) {
            selectedProviders.add(item);
          }
        });
        document.querySelectorAll('.provider-btn').forEach((item) => {
          const itemProvider = item.dataset.provider;
          item.classList.toggle('active', !!(itemProvider && allowed[plan] && allowed[plan].includes(itemProvider)));
        });
      }
    });
  });
}

if (monthlyTicketsInput) {
  monthlyTicketsInput.addEventListener('input', updateSavings);
}
if (avgCostInput) {
  avgCostInput.addEventListener('input', updateSavings);
}
if (retainRateInput) {
  retainRateInput.addEventListener('input', updateSavings);
}
updateSavings();

if (chatForm && chatInput) {
  chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = chatInput.value.trim();

    if (!value) {
      return;
    }

    appendMessage('user', value);
    chatInput.value = '';

    try {
      const data = await callChatApi(value);
      const providerHint = data.providers && data.providers.length ? `（${data.providers.join(' / ')}）` : '';
      appendMessage('ai', `${data.reply || generateAiResponse(value)}${providerHint}`);
    } catch (error) {
      appendMessage('ai', generateAiResponse(value));
    }
  });
}

promptChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    if (!chatInput) return;
    chatInput.value = chip.textContent.trim();
    chatInput.focus();
  });
});

loginButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const mode = button.dataset.authMode || 'guest';
    openModal(mode);
  });
});

startDemoButtons.forEach((button) => {
  button.addEventListener('click', () => {
    scrollToDemo();
  });
});

watchDemoButtons.forEach((button) => {
  button.addEventListener('click', () => {
    scrollToDemo();
  });
});

if (authModal) {
  authModal.addEventListener('click', (event) => {
    if (event.target === authModal) {
      closeModal();
    }
  });
}

if (modalCloseButton) {
  modalCloseButton.addEventListener('click', closeModal);
}

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = loginEmail.value.trim();
    if (!email) {
      loginEmail.focus();
      return;
    }

    const mode = authModal && authModal.dataset.mode === 'member' ? 'member' : 'guest';

    try {
      if (mode === 'member') {
        const checkoutResult = await callCheckoutApi(email, mode);
        if (!checkoutResult.ok) {
          throw new Error(checkoutResult.message || '付款失敗');
        }
        const selectedPlan = getSelectedPlanLabel();
        localStorage.setItem('novaflowPlan', selectedPlan);
      }

      const loginResult = await callLoginApi(email, mode);
      if (!loginResult.ok) {
        throw new Error(loginResult.message || '登入失敗');
      }

      setLoggedInState(email, mode);
      if (mode === 'member') {
        window.alert(`會員方案已確認：${getSelectedPlanLabel()}，付款成功並已登入。`);
      }
    } catch (error) {
      window.alert(error.message || '登入失敗');
      return;
    }

    closeModal();
  });
}

checkLoginState();
if (providerButtons.length) {
  syncProviderButtonsByPlan();
}
