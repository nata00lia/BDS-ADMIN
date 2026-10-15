const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
const resend = new Resend(process.env.RESEND_API_KEY);

app.get('/', (req, res) => {
  res.send(`
    <html><head><title>BDS Dashboard</title>
    <style>body{font-family:Arial;max-width:600px;margin:40px auto;padding:20px;background:#f5f5f5}.card{background:white;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}input,textarea{width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:5px}button{width:100%;padding:15px;background:#000;color:white;border:none;border-radius:5px;font-size:16px;cursor:pointer}</style>
    </head><body><div class="card">
    <h2>BDS - Send Message</h2><p style="color:green"><b>Server Running ✓</b></p><hr/>
    <input id="to" placeholder="Recipient Email" />
    <input id="name" placeholder="Recipient Name" />
    <textarea id="message" rows="6" placeholder="Message"></textarea>
    <button onclick="send()">Send Email</button><p id="status"></p>
    </div><script>
    async function send(){
      const to=document.getElementById('to').value;
      const name=document.getElementById('name').value;
      const message=document.getElementById('message').value;
      document.getElementById('status').innerText='Sending...';
      const res=await fetch('/send-message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to,name,message})});
      const data=await res.json();
      document.getElementById('status').innerText=data.success?'✓ Sent!':'Error: '+data.error;
    }<\/script></body></html>
  `);
});

app.post('/send-message', async (req, res) => {
  const { to, name, message } = req.body;
  if (!to) return res.status(400).json({ error: 'Missing to field' });
  try {
    const data = await resend.emails.send({
      from: 'BDS <noreply@bdsphiladelphia.online>',
      to: to, subject: 'Message for ' + name,
      html: '<h2>Hello '+name+',</h2><p>'+message+'</p><p>- BDS Team</p>'
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Running on '+PORT));