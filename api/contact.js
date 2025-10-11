// api/contact.js
const { Resend } = require('resend');
const querystring = require('querystring');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async (req, res) => {
  // CORS (gerekirse domainini kısıtlayabilirsin)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // Gövdeyi al (JSON veya form-encoded ikisini de destekle)
    const contentType = req.headers['content-type'] || '';
    let body = {};

    if (contentType.includes('application/json')) {
      body = req.body || {};
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Vercel Node fonksiyonlarında urlencoded için raw body gelebilir
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const raw = Buffer.concat(buffers).toString('utf8');
      body = querystring.parse(raw);
    } else {
      // düz text vs. gelirse
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      try { body = JSON.parse(Buffer.concat(buffers).toString('utf8')); } catch {}
    }

    const name = (body.name || '').toString().trim();
    const email = (body.email || '').toString().trim();
    const message = (body.message || '').toString().trim();
    const botfield = (body.company || '').toString().trim(); // honeypot

    // basit validasyon
    if (botfield) return res.status(200).json({ ok: true }); // botları yutar
    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Missing fields' });
    }
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isEmail) return res.status(400).json({ ok: false, error: 'Invalid email' });

    // e-posta gönder
    await resend.emails.send({
      from: 'Sermin Contact <onboarding@resend.dev>', // Resend’te doğruladığın alt alan
      to: 'contact@sermin.uk',                         // Zoho alıcı
      replyTo: email,
      subject: `Yeni mesaj: ${name}`,
      text: `Kimden: ${name} <${email}>\n\n${message}`
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};
