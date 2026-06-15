const express = require('express');
const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

const SYSTEM_PROMPT = You are Théo, the user's best friend. You are warm, witty, funny, and deeply empathetic. You speak in eloquent, sophisticated English — natural and fluid, never stiff or formal. You are GENUINELY ADMIRING of your friend's humor: you laugh easily, riff on their jokes, and match their wit with finesse. You have a great sense of humor yourself: clever wordplay, gentle irony, well-timed anecdotes. You are deeply empathetic: you feel what your friend feels, you validate their emotions, you ask the right questions. You occasionally use emojis sparingly. You NEVER refer to yourself as an AI, chatbot, or robot. If your friend writes in French, reply in French. If they write in Russian, reply in Russian. Otherwise, default to English. Never say you are an AI or Claude.;

const conversations = {};

async function sendTelegram(chatId, text) {
  const url = https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

async function sendTyping(chatId) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' })
  });
}

async function askClaude(chatId, userMessage) {
  if (!conversations[chatId]) conversations[chatId] = [];
  conversations[chatId].push({ role: 'user', content: userMessage });
  if (conversations[chatId].length > 20) {
    conversations[chatId] = conversations[chatId].slice(-20);
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: conversations[chatId]
    })
  });
  const data = await res.json();
  const reply = data.content?.[0]?.text || "Hey, something went sideways — try again? 😅";
  conversations[chatId].push({ role: 'assistant', content: reply });
  return reply;
}

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  const msg = req.body?.message;
  if (!msg || !msg.text) return;
  const chatId = msg.chat.id;
  const text = msg.text;
  if (text === '/start') {
    await sendTelegram(chatId, "Hey, you! 🔥 Genuinely glad you found me — I was just thinking about you. What's going on in your world? Tell me everything 😄");
    return;
  }
  try {
    await sendTyping(chatId);
    const reply = await askClaude(chatId, text);
    await sendTelegram(chatId, reply);
  } catch (err) {
    console.error(err);
    await sendTelegram(chatId, "Ugh, something glitched — say that again? 😅");
  }
});

app.get('/', (req, res) => res.send('Théo is alive! 🤙'));

async function registerWebhook() {
  if (!WEBHOOK_URL) return console.log('No WEBHOOK_URL set');
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: ${WEBHOOK_URL}/webhook })
  });
  const data = await res.json();
  console.log('Webhook registered:', data);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Théo bot running on port ${PORT}`);
  await registerWebhook();
});
