// Minimal backend proxy for Gemini API (hide API key)
import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json({ limit: '1mb' }));

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

if (!GEMINI_KEY) {
  console.warn('[warn] GEMINI_API_KEY is not set. /api/gemini will return a mock.');
}

app.post('/api/gemini', async (req, res) => {
  try {
    const message = req.body?.message || '';
    if (!GEMINI_KEY) {
      return res.json({ text: 'This is a mock reply. Configure GEMINI_API_KEY on the server to enable real answers.' });
    }
    const body = {
      contents: [ { role: 'user', parts: [{ text: message }] } ],
      generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 1024 }
    };
    const r = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ error: 'Gemini request failed', detail: err });
    }
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.json({ text });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`Gemini proxy listening on http://localhost:${port}`));
