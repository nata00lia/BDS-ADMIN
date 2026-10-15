const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const resend = new Resend(process.env.RESEND_API_KEY);

app.get('/', (req, res) => {
  res.send('BDS Admin Server Running');
});

app.post('/send-message', async (req, res) => {
  const { to, name, message, image } = req.body;

  console.log('Request to send to:', to);

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY missing in Render Env' });
  }

  if (!to) {
    return res.status(400).json({ error: 'Missing to field' });
  }

  let imageHtml = '';
  if (image) {
    imageHtml = '<img src="' + image + '" style="max-width: 100%; margin-top: 15px;" />';
  }

  let html = '<div style="font-family: Arial, sans-serif; padding: 20px;">' +
    '<h2>Hello ' + name + ',</h2>' +
    '<p>' + message + '</p>' +
    imageHtml +
    '<br/><br/><p>- BDS Philadelphia Team</p></div>';

  try {
    const data = await resend.emails.send({
      from: 'BDS <noreply@bdsphiladelphia.online>',
      to: to,
      subject: 'Message for ' + name,
      html: html
    });

    console.log('Email sent:', data);
    res.json({ success: true, data });

  } catch (error) {
    console.log('Resend error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});