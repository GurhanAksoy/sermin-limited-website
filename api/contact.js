// /api/contact.js
module.exports = async (req, res) => {
  if (req.method !== 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    // JSON body'yi oku
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8');
    const { name = '', email = '', message = '' } = JSON.parse(raw || '{}');

    if (!name || !email || !message)
      return res.status(400).json({ ok: false, error: 'Missing fields' });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey)
      return res.status(500).json({ ok: false, error: 'Missing RESEND_API_KEY' });

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Sermin Limited <onboarding@resend.dev>', // TEST için hazır sender
        to: ['contact@sermin.uk'], // kendi adresin
        reply_to: email,
        subject: `Website Contact — ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
      })
    });

    const txt = await response.text();
    if (!response.ok) {
      console.error('Resend error:', txt);
      return res.status(500).json({ ok: false, error: txt });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Send error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
