const express = require('express');
const { Resend } = require('resend');
const path = require('path');

const app = express();
const resend = new Resend('re_ewX97y6o_Ne12VeFJmv8gWodAX1z6qFKA');

app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

app.post('/send', async (req, res) => {
  const { to, name, message, image } = req.body;

  // This is your old RED BDS banner from screenshot
  const html = `
    <div style="font-family:Arial,sans-serif; max-width:600px; margin:auto; background:#ffffff; border:1px solid #eee; border-radius:16px; overflow:hidden">
      <div style="background: linear-gradient(90deg, #5a0000 0%, #e30613 100%); padding:50px 0; text-align:center;">
        <div style="width:110px; height:110px; border:3px solid rgba(255,255,255,0.5); border-radius:50%; margin:0 auto; display:flex; align-items:center; justify-content:center;">
          <span style="color:white; font-size:38px; font-weight:900; letter-spacing:2px; line-height:110px;">BDS</span>
        </div>
      </div>
      <div style="padding:28px;">
        <p style="font-size:16px;">Hi ${name},</p>
        <p style="font-size:16px; line-height:1.7; white-space:pre-wrap; color:#222;">${message}</p>
        ${image ? `<div style="margin-top:22px;"><img src="${image}" style="max-width:100%; border-radius:12px; border:1px solid #eee;" /></div>` : ''}
        <p style="margin-top:30px; font-size:13px; color:#888;">© BDS Team</p>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: 'BDS Admin <notify@bdsphiladelphia.online>',
      to: to,
      subject: 'Message from BDS Team',
      html: html
    });
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`BDS Admin running on port ${PORT}`));