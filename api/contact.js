// /api/contact.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { name = '', email = '', message = '' } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Missing fields' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ ok: false, error: 'Server configuration error' });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Website Contact <contact@sermin.uk>',
        to: ['contact@sermin.uk'],
        reply_to: email,
        subject: `Website Contact — ${name}`,
        html: `<h3>New Contact Form Submission</h3>
               <p><strong>Name:</strong> ${name}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Message:</strong></p>
               <p>${message.replace(/\n/g, '<br>')}</p>`
      })
    });

    const data = await response.text();
    
    if (!response.ok) {
      console.error('Resend error:', data);
      return res.status(response.status).json({ ok: false, error: data });
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}