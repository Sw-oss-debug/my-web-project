require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const message = "你好，請建議一個簡單的創業想法";

console.log('Testing Gemini API...');
console.log('API Key exists:', !!GEMINI_API_KEY);

if (!GEMINI_API_KEY) {
  console.error('❌ No Gemini API key found!');
  process.exit(1);
}

fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{
      role: 'user',
      parts: [{ text: message }],
    }],
  }),
})
.then(res => {
  console.log('Status:', res.status, res.statusText);
  return res.json();
})
.then(data => {
  console.log('Response:', JSON.stringify(data, null, 2));
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log('✅ Reply:', reply);
})
.catch(err => {
  console.error('❌ Error:', err.message);
});
