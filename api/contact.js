// api/contact.js
const { Resend } = require('resend');
const querystring = require('querystring');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async (req, res) => {
  // Basit CORS (aynı origin çalıştığı için sorun yok ama garanti)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const contentType = (req.headers['content-type'] || '').toLowerCase();
    let body = {};

    // 🔧 JSON gövdeyi GERÇEKTEN oku (Vercel Node: req.body çoğu zaman dolu olmaz)
    if (contentType.includes('application/json')) {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const raw = Buffer.concat(buffers).toString('utf8');
      try { body = JSON.parse(raw || '{}'); } catch { body = {}; }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const raw = Buffer.concat(buffers).toString('utf8');
      body = querystring.parse(raw);
    } else {
      // Düz text vb. gelirse yine JSON dene
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const raw = Buffer.concat(buffers).toString('utf8');
      try { body = JSON.parse(raw || '{}'); } catch { body = {}; }
    }

    const name = (body.name || '').toString().trim();
    const email = (body.email || '').toString().trim();
    const message = (body.message || '').toString().trim();
    const bot = (body.company || '').toString().trim(); // honeypot alanı varsa yut

    if (bot) return res.status(200).json({ ok: true });
    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Missing fields' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'Invalid email' });
    }

    // ✉️ E-posta gönder (test için default sender; domainin doğrulandıysa kendi adresini kullan)
    const payload = {
      from: 'Sermin Contact <onboarding@resend.dev>', // doğrulama bittiyse: 'Sermin Contact <contact@send.sermin.uk>'
      to: 'contact@sermin.uk',
      replyTo: email,            // SDK için doğru anahtar
      subject: `Yeni mesaj: ${name}`,
      text: `Kimden: ${name} <${email}>\n\n${message}`
    };

    const result = await resend.emails.send(payload);
    return res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error('Send error:', err);
    // Hata mesajını geri döndür ki Network/Console'da görebilesin
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
};
