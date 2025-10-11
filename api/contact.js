// /api/contact.js
export default async function handler(req, res) {
  // Sadece POST isteklerine izin ver
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // Form verilerini al
    const { name = '', email = '', message = '' } = req.body || {};

    // Boş alan kontrolü
    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Missing fields' });
    }

    // API key kontrolü
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY not found');
      return res.status(500).json({ ok: false, error: 'Server configuration error' });
    }

    // Resend API'ye istek gönder
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Sermin Contact <onboarding@resend.dev>',
        to: ['contact@sermin.uk'],
        reply_to: email,
        subject: `Website Contact — ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        html: `<h3>New Contact Form Submission</h3>
               <p><strong>Name:</strong> ${name}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Message:</strong></p>
               <p>${message}</p>`
      })
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('Resend API error:', response.status, responseText);
      return res.status(500).json({ ok: false, error: 'Failed to send email' });
    }

    console.log('Email sent successfully:', responseText);
    return res.status(200).json({ ok: true, data: JSON.parse(responseText) });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}