const express = require('express');
const { Resend } = require('resend');
const path = require('path');

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

app.post('/send', async (req, res) => {
  try {
    const { to, name, message, image } = req.body;
    
    console.log('Request to send to:', to);
    
    if (!process.env.RESEND_API_KEY) {
      console.log('ERROR: RESEND_API_KEY missing in Render Environment');
      return res.status(500).json({ error: 'RESEND_API_KEY not set on server' });
    }

    const html = `
      <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; border:1px solid #e5e5e5; border-radius:10px; overflow:hidden;">
        <div style="background: linear-gradient(90deg,#cc0000,#990000); padding:22px; color:white; text-align:center;">
          <span style="font-size:40px; font-weight:900; letter-spacing:2px;">BDS</span>
          <div style="font-size:12px; opacity:0.9; margin-top:4px; letter-spacing:3px;">PHILADELPHIA</div>
        </div>
        <div style="padding:30px; background:white; color:#222;">
          <p style="font-size:16px; margin-bottom:12px;">Hi <b>${name}</b>,</p>
          <p style="font-size:16px; line-height:1.8; white-space:pre-wrap;">${message}</p>
          ${image ? `<div style="margin-top:24px; text-align:center;"><img src="${image}" style="max-width:100%; border-radius:8px;"/></div>` : ''}
          <div style="margin-top:30px; padding-top:20px; border-top:1px solid #eee; font-size:12px; color:#888; text-align:center;">
            Sent via BDS Philadelphia
          </div>
        </div>
      </div>
    `;

    const result = await resend.emails.send({
      from: 'BDS <noreply@bdsphiladelphia.online>',
      to: to,
      subject: `Message for ${name}`,
      html: html
    });

    console.log('Resend OK:', result);
    res.json({ success: true, result });

  } catch (err) {
    console.error('RESEND FULL ERROR:', err);
    res.status(500).json({ error: err.message || 'Unknown error - check Render logs' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`BDS Server Live on ${PORT}`));