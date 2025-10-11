// /api/contact.js
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    // JSON body'yi oku (index.html fetch ile JSON gönderiyor)
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8');
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch { body = {}; }

    const name = (body.name || '').trim();
    const email = (body.email || '').trim();
    const message = (body.message || '').trim();

    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Missing fields' });
    }

    // Zoho SMTP — EU kullanıyorsan smtp.zoho.eu, US için smtp.zoho.com
    const transporter = nodemailer.createTransport({
      host: process.env.ZOHO_SMTP_HOST || 'smtp.zoho.eu',
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_USER, // örn: contact@sermin.uk
        pass: process.env.ZOHO_PASS  // Zoho App Password (hesap şifresi değil)
      }
    });

    const info = await transporter.sendMail({
      from: `"Sermin Limited" <${process.env.ZOHO_USER}>`,
      to: process.env.TO_EMAIL || 'contact@sermin.uk',
      replyTo: email,
      subject: `Website Contact — ${name}`,
      text:
`Name: ${name}
Email: ${email}

Message:
${message}`
    });

    return res.status(200).json({ ok: true, id: info.messageId });
  } catch (err) {
    console.error('Mail error:', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
};
