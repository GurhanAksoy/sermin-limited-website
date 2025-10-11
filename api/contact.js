// /api/contact.js
const { Resend } = require('resend');
const querystring = require('querystring');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async (req, res) => {
  // CORS (gerekirse origin kısıtlayabilirsin)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const contentType = req.headers['content-type'] || '';
    let body = {};

    if (contentType.includes('application/json')) {
      // 🔧 DÜZELTME: JSON gövdeyi gerçekten oku ve parse et
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
      // Diğer tipler için de dene
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const raw = Buffer.concat(buffers).toString('utf8');
      try { body = JSON.parse(raw || '{}'); } catch { body = {}; }
    }

    const name = (body.name || '').toString().trim();
    const email = (body.email || '').toString().trim();
    const message = (body.message || '').toString().trim();
    const botfield = (body.company || '').toString().trim(); // honeypot

    if (botfield) return res.status(200).json({ ok: true });
    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Missing fields' });
    }
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isEmail) return res.status(400).json({ ok: false, error: 'Invalid email' });

    await resend.emails.send({
      from: 'Sermin Contact <onboarding@resend.dev>', // test için hazır; domainin doğrulandıysa burayı kendi adresinle değiştir
      to: 'contact@sermin.uk',
      replyTo: email, // ✅ SDK anahtarı doğru
      subject: `Yeni mesaj: ${name}`,
      text: `Kimden: ${name} <${email}>\n\n${message}`
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};
