// /api/contact.js
// Vercel Node.js (Serverless) uyumlu, ESM/CJS farkı yok. SDK yok, sadece fetch.
// Frontend'e dokunmadan JSON body'yi kendimiz okuyoruz.

module.exports = async (req, res) => {
  // Basit preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    // --- JSON body'yi oku ---
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch { body = {}; }

    const name = (body.name || '').toString().trim();
    const email = (body.email || '').toString().trim();
    const message = (body.message || '').toString().trim();

    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Missing fields' });
    }

    // --- ENV kontrolü ---
    const API_KEY = process.env.RESEND_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ ok: false, error: 'RESEND_API_KEY missing' });
    }
    const TO = process.env.TO_EMAIL || 'contact@sermin.uk';

    // --- GÖNDERİM ---
    // Domain doğrulaması beklemeden çalışması için test sender kullanıyoruz.
    // Domainin doğrulandıysa aşağıdaki "from" değerini kendi adresinle değiştir:
    // from: `Sermin Limited <contact@send.sermin.uk>`
    const payload = {
      from: 'Sermin Limited <onboarding@resend.dev>',
      to: [TO],
      subject: `Website Contact — ${name}`,
      text:
`Name: ${name}
Email: ${email}

Message:
${message}`,
      reply_to: email // Resend REST alan adı "reply_to"
    };

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    let data = {};
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!r.ok) {
      // Hata sebebini öne çıkar — Network/Console’dan görürüz
      return res.status(500).json({ ok: false, status: r.status, error: data });
    }

    return res.status(200).json({ ok: true, result: data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
};
