const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
const resend = new Resend(process.env.RESEND_API_KEY);
let emailHistory = [];

app.get('/', (req, res) => {
  res.send(`
<html><head><title>BDS Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
body{font-family:Arial,sans-serif;background:#0f0f0f;color:white;margin:0;padding:0}
.container{display:flex;min-height:100vh}
.main{flex:2;padding:30px}
.sidebar{flex:1;background:#151515;border-left:1px solid #2a2a2a;padding:20px;max-width:380px;overflow-y:auto}
.card{background:#1a1a1a;padding:25px;border-radius:12px;border:1px solid #2a2a2a}
.row{display:flex;gap:15px}
.row div{flex:1}
label{font-size:11px;color:#888;letter-spacing:1.5px}
input,textarea{width:100%;padding:14px;margin:8px 0 18px 0;background:#262626;border:1px solid #333;border-radius:8px;color:white;box-sizing:border-box}
button.main{width:100%;padding:16px;background:#3b82f6;color:white;border:none;border-radius:8px;font-weight:bold;font-size:15px;cursor:pointer}
.upload{border:1px dashed #444;padding:12px;border-radius:8px;text-align:center;margin-bottom:18px;background:#262626}
#preview{max-width:100%;margin-top:10px;border-radius:8px;display:none}
.history-item{background:#262626;padding:14px;border-radius:8px;margin-bottom:12px;border:1px solid #333}
.btn-small{padding:6px 12px;font-size:11px;border-radius:6px;border:none;cursor:pointer;margin-right:5px}
.btn-resend{background:#3b82f6;color:white}
.btn-use{background:#333;color:white}
</style>
</head><body>
<div class="container">
  <div class="main">
    <div class="card">
      <h2 style="margin:0">BDS.Philadelphia</h2><p style="color:#666;font-size:12px">CLIENT MESSAGE DASHBOARD</p>
      <div class="row">
        <div><label>NAME</label><input id="name" placeholder="Jennifer" /></div>
        <div><label>EMAIL</label><input id="email" placeholder="client@email.com" /></div>
      </div>
      <label>MESSAGE</label>
      <textarea id="message" rows="6" placeholder="Please confirm whether these details are correct..."></textarea>
      <label>ATTACH IMAGE (Optional)</label>
      <div class="upload">
        <input type="file" id="image" accept="image/*" onchange="previewImage(this)" />
        <img id="preview" />
        <p id="fileName" style="color:#888;font-size:12px"></p>
      </div>
      <button class="main" onclick="send()">Send Message</button>
      <p id="status" style="text-align:center;margin-top:15px;color:#3b82f6"></p>
    </div>
  </div>
  <div class="sidebar">
    <h3 style="font-size:14px;letter-spacing:1px">HISTORY</h3>
    <p style="color:#666;font-size:11px">All sent emails - Click to resend</p>
    <div id="historyList"><p style="color:#555;font-size:12px">No emails yet</p></div>
  </div>
</div>
<script>
let base64Image=null, imageName=null;
let historyData=[];
function previewImage(input){
  const file=input.files[0]; if(!file) return;
  imageName=file.name;
  document.getElementById('fileName').innerText=file.name;
  const reader=new FileReader();
  reader.onload=function(e){
    base64Image=e.target.result;
    const img=document.getElementById('preview');
    img.src=base64Image; img.style.display='block';
  };
  reader.readAsDataURL(file);
}
async function loadHistory(){
  const res=await fetch('/history');
  historyData=await res.json();
  const list=document.getElementById('historyList');
  if(historyData.length===0){list.innerHTML='<p style="color:#555;font-size:12px">No emails yet</p>';return}
  let html='';
  for(let i=0;i<historyData.length;i++){
    const h=historyData[i];
    html+='<div class="history-item"><b>'+h.name+'</b> <span style="color:#666;font-size:11px">'+new Date(h.date).toLocaleString()+'</span><p>'+h.to+'</p><p style="color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+h.message.substring(0,60)+'...</p><button class="btn-small btn-resend" onclick="resendEmail('+i+')">Resend</button><button class="btn-small btn-use" onclick="useEmail('+i+')">Use Again</button></div>';
  }
  list.innerHTML=html;
}
function useEmail(i){
  const h=historyData[i];
  document.getElementById('name').value=h.name;
  document.getElementById('email').value=h.to;
  document.getElementById('message').value=h.message;
  window.scrollTo(0,0);
}
async function resendEmail(i){
  const h=historyData[i];
  if(!confirm('Resend to '+h.to+'?')) return;
  document.getElementById('status').innerText='Resending to '+h.to+'...';
  const res=await fetch('/resend/'+i,{method:'POST'});
  const data=await res.json();
  document.getElementById('status').innerText=data.success?'Resent to '+h.to:'Error: '+data.error;
  loadHistory();
}
async function send(){
  const name=document.getElementById('name').value;
  const email=document.getElementById('email').value;
  const message=document.getElementById('message').value;
  if(!name||!email||!message){alert('Fill name, email, message');return}
  document.getElementById('status').innerText='Sending to '+email+'...';
  const res=await fetch('/send-message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:email,name:name,message:message,image:base64Image,imageName:imageName})});
  const data=await res.json();
  document.getElementById('status').innerText=data.success?'Sent to '+email:'Error: '+data.error;
  if(data.success){
    document.getElementById('message').value='';
    document.getElementById('image').value='';
    document.getElementById('preview').style.display='none';
    base64Image=null;
    loadHistory();
  }
}
loadHistory();
</script>
</body></html>
  `);
});

app.get('/history', (req, res) => { res.json(emailHistory); });

app.post('/send-message', async (req, res) => {
  const { to, name, message, image, imageName } = req.body;
  if (!to) return res.status(400).json({ error: 'Missing email' });
  let htmlContent = '<div style="margin:0;padding:0;background:#0f0f0f;font-family:Arial,sans-serif">';
  htmlContent += '<div style="max-width:600px;margin:0 auto;background:#1e1e1e;border-radius:12px;overflow:hidden">';
  htmlContent += '<div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);padding:30px;text-align:center">';
  htmlContent += '<div style="width:60px;height:60px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 15px auto;line-height:60px;font-weight:bold;color:white">BDS</div>';
  htmlContent += '<div style="color:white;font-weight:bold;font-size:20px">BDS.Philadelphia</div>';
  htmlContent += '<div style="color:rgba(255,255,255,0.7);font-size:10px;letter-spacing:2px;margin-top:5px">CLIENT MESSAGE</div></div>';
  htmlContent += '<div style="padding:30px;background:#1e1e1e">';
  htmlContent += '<div style="color:#888;font-size:11px;letter-spacing:2px;margin-bottom:10px">MESSAGE FROM BDS.PHILADELPHIA</div>';
  htmlContent += '<div style="color:white;font-size:22px;font-weight:bold;margin-bottom:20px">Hi, ' + name + '</div>';
  htmlContent += '<div style="background:#262626;border-left:3px solid #3b82f6;padding:20px;border-radius:0 8px 8px 0;color:#ddd;line-height:1.6;font-size:14px;white-space:pre-wrap">' + message + '</div>';
  htmlContent += '<div style="margin-top:30px;color:#aaa;font-size:13px">Best regards,<br/><span style="color:white;font-weight:bold">BDS.Philadelphia Trading Platform</span></div>';
  htmlContent += '<hr style="border:none;border-top:1px solid #2a2a2a;margin:30px 0 15px 0"/><div style="color:#666;font-size:11px;text-align:center">Automated message from BDS.Philadelphia Trading Platform.<br/>© 2026 BDS.Philadelphia. All rights reserved.</div>';
  htmlContent += '</div></div></div>';
  try {
    const payload = {
      from: 'BDS.Philadelphia <noreply@bdsphilladelphia.online>',
      to: to,
      subject: 'BDS TRADING PLATFORM NOTIFY',
      html: htmlContent,
    };
    if (image) {
      const base64Data = image.split(',')[1];
      payload.attachments = [{ filename: imageName || 'image.jpg', content: base64Data }];
    }
    const data = await resend.emails.send(payload);
    emailHistory.unshift({ to: to, name: name, message: message, date: new Date(), id: Date.now(), imageName: imageName });
    if (emailHistory.length > 100) emailHistory.pop();
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/resend/:index', async (req, res) => {
  const idx = parseInt(req.params.index);
  const h = emailHistory[idx];
  if (!h) return res.status(404).json({ error: 'Not found' });
  try {
    let htmlContent = '<div style="margin:0;padding:0;background:#0f0f0f;font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;background:#1e1e1e;border-radius:12px;overflow:hidden"><div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);padding:30px;text-align:center"><div style="width:60px;height:60px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 15px auto;line-height:60px;font-weight:bold;color:white">BDS</div><div style="color:white;font-weight:bold;font-size:20px">BDS.Philadelphia</div></div><div style="padding:30px;background:#1e1e1e"><div style="color:#888;font-size:11px;letter-spacing:2px;margin-bottom:10px">MESSAGE FROM BDS.PHILADELPHIA</div><div style="color:white;font-size:22px;font-weight:bold;margin-bottom:20px">Hi, ' + h.name + '</div><div style="background:#262626;border-left:3px solid #3b82f6;padding:20px;border-radius:0 8px 8px 0;color:#ddd;line-height:1.6;white-space:pre-wrap">' + h.message + '</div><div style="margin-top:30px;color:#aaa;font-size:13px">Best regards,<br/><span style="color:white;font-weight:bold">BDS.Philadelphia Trading Platform</span></div></div></div></div>';
    const data = await resend.emails.send({
      from: 'BDS.Philadelphia <noreply@bdsphilladelphia.online>',
      to: h.to,
      subject: 'BDS TRADING PLATFORM NOTIFY',
      html: htmlContent,
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Running on ' + PORT));