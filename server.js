const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
const resend = new Resend(process.env.RESEND_API_KEY);
let emailHistory = [];

app.get('/', (req, res) => {
  const page = `
<html><head><title>BDS Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
body{font-family:Arial,sans-serif;background:#0f0f0f;color:white;margin:0;padding:0}
.container{display:flex;min-height:100vh}
.main{flex:2;padding:30px}.sidebar{flex:1;background:#151515;border-left:1px solid #2a2a2a;padding:20px;max-width:380px;overflow-y:auto}
.card{background:#1a1a1a;padding:25px;border-radius:12px;border:1px solid #2a2a2a}
.tabs{display:flex;gap:10px;margin-bottom:20px}
.tab{flex:1;padding:12px;text-align:center;border-radius:8px;cursor:pointer;font-size:13px;font-weight:bold;border:1px solid #333}
.tab.active{background:#3b82f6;color:white;border-color:#3b82f6}
.tab.inactive{background:#262626;color:#888}
.row{display:flex;gap:15px}.row div{flex:1}
label{font-size:11px;color:#888;letter-spacing:1.5px}
input,textarea,select{width:100%;padding:14px;margin:8px 0 18px 0;background:#262626;border:1px solid #333;border-radius:8px;color:white;box-sizing:border-box}
button.main{width:100%;padding:16px;background:#3b82f6;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:15px}
.upload{border:1px dashed #444;padding:12px;border-radius:8px;text-align:center;margin-bottom:18px;background:#262626}
#preview{max-width:100%;margin-top:10px;border-radius:8px;display:none}
.history-item{background:#262626;padding:14px;border-radius:8px;margin-bottom:12px;border:1px solid #333}
.btn-small{padding:6px 12px;font-size:11px;border-radius:6px;border:none;cursor:pointer;margin-right:5px}
.btn-resend{background:#3b82f6;color:white}.btn-use{background:#333;color:white}
.hidden{display:none}
</style>
</head><body>
<div class="container">
  <div class="main">
    <div class="card">
      <h2 style="margin:0">BDS.Philadelphia</h2><p style="color:#666;font-size:12px">CLIENT MESSAGE DASHBOARD</p>
      <div class="tabs">
        <div id="tabDirect" class="tab active" onclick="switchMode('direct')">DIRECT MESSAGE</div>
        <div id="tabPayment" class="tab inactive" onclick="switchMode('payment')">PAYMENT MESSAGE</div>
      </div>
      <div class="row">
        <div><label>NAME</label><input id="name" placeholder="Jennifer" /></div>
        <div><label>EMAIL</label><input id="email" placeholder="client@email.com" /></div>
      </div>
      <div id="paymentFields" class="hidden">
        <div class="row">
          <div><label>AMOUNT</label><input id="amount" placeholder="e.g. 2500" /></div>
          <div><label>ASSET TYPE</label>
            <select id="asset">
              <option value="">Select Asset</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="USDT">USDT</option>
              <option value="USD">USD</option>
              <option value="SOL">SOL</option>
            </select>
          </div>
        </div>
      </div>
      <label>MESSAGE</label>
      <textarea id="message" rows="6" placeholder="Type your message here..."></textarea>
      <label>ATTACH IMAGE (Optional)</label>
      <div class="upload"><input type="file" id="image" accept="image/*" onchange="previewImage(this)" /><img id="preview" /><p id="fileName" style="color:#888;font-size:12px"></p></div>
      <button class="main" onclick="send()">Send Message</button>
      <p id="status" style="text-align:center;margin-top:15px;color:#3b82f6"></p>
    </div>
  </div>
  <div class="sidebar"><h3 style="font-size:14px">HISTORY</h3><div id="historyList"><p style="color:#555;font-size:12px">No emails yet</p></div></div>
</div>
<script>
let base64Image=null,imageName=null,historyData=[],currentMode='direct';
function switchMode(mode){
  currentMode=mode;
  document.getElementById('tabDirect').className=mode==='direct'?'tab active':'tab inactive';
  document.getElementById('tabPayment').className=mode==='payment'?'tab active':'tab inactive';
  document.getElementById('paymentFields').className=mode==='payment'?'':'hidden';
}
function previewImage(input){const file=input.files[0];if(!file)return;imageName=file.name;document.getElementById('fileName').innerText=file.name;const reader=new FileReader();reader.onload=function(e){base64Image=e.target.result;const img=document.getElementById('preview');img.src=base64Image;img.style.display='block';};reader.readAsDataURL(file);}
async function loadHistory(){const res=await fetch('/history');historyData=await res.json();const list=document.getElementById('historyList');if(historyData.length===0){list.innerHTML='<p style="color:#555;font-size:12px">No emails yet</p>';return}let html='';for(let i=0;i<historyData.length;i++){const h=historyData[i];let extra=h.amount?'<span style="color:#3b82f6;font-size:11px">'+h.amount+' '+h.asset+'</span> ':'';html+='<div class="history-item"><b>'+h.name+'</b> '+extra+'<span style="color:#666;font-size:11px">'+new Date(h.date).toLocaleString()+'</span><p>'+h.to+'</p><p style="color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+h.message.substring(0,60)+'...</p><button class="btn-small btn-resend" onclick="resendEmail('+i+')">Resend</button><button class="btn-small btn-use" onclick="useEmail('+i+')">Use Again</button></div>';}list.innerHTML=html;}
function useEmail(i){const h=historyData[i];document.getElementById('name').value=h.name;document.getElementById('email').value=h.to;document.getElementById('message').value=h.message;if(h.amount){switchMode('payment');document.getElementById('amount').value=h.amount;document.getElementById('asset').value=h.asset;}else{switchMode('direct');}window.scrollTo(0,0);}
async function resendEmail(i){const h=historyData[i];if(!confirm('Resend to '+h.to+'?'))return;document.getElementById('status').innerText='Resending...';const res=await fetch('/resend/'+i,{method:'POST'});const data=await res.json();document.getElementById('status').innerText=data.success?'Resent':'Error: '+data.error;loadHistory();}
async function send(){const name=document.getElementById('name').value;const email=document.getElementById('email').value;const message=document.getElementById('message').value;const amount=document.getElementById('amount').value;const asset=document.getElementById('asset').value;if(!name||!email||!message){alert('Fill name, email, message');return}document.getElementById('status').innerText='Sending...';const res=await fetch('/send-message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:email,name:name,message:message,amount:amount,asset:asset,image:base64Image,imageName:imageName})});const data=await res.json();document.getElementById('status').innerText=data.success?'Sent to '+email:'Error: '+data.error;if(data.success){document.getElementById('message').value='';loadHistory();}}
loadHistory();
</script>
</body></html>
`;
  res.send(page);
});

app.get('/history', (req, res) => { res.json(emailHistory); });

app.post('/send-message', async (req, res) => {
  const { to, name, message, amount, asset, image, imageName } = req.body;
  const hasPayment = amount && amount.toString().trim() !== '';
  
  let amountBlock = '';
  if (hasPayment) {
    amountBlock = '<div style="margin-top:20px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;padding:16px;display:flex;gap:20px">'
      + '<div><div style="font-size:11px;color:#64748b;letter-spacing:1px">AMOUNT</div><div style="font-size:16px;color:#0b1e3a;font-weight:bold;margin-top:4px">' + amount + '</div></div>'
      + '<div style="border-left:1px solid #e2e8f0;padding-left:20px"><div style="font-size:11px;color:#64748b;letter-spacing:1px">ASSET</div><div style="font-size:16px;color:#0b1e3a;font-weight:bold;margin-top:4px">' + (asset || 'USD') + '</div></div>'
      + '</div>';
  }

  const htmlContent = '<div style="margin:0;padding:20px;background:#f4f6f9;font-family:Arial,sans-serif">'
    + '<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">'
    + '<div style="background:#0b1e3a;padding:28px 32px;display:flex;align-items:center">'
    + '<div style="width:44px;height:44px;background:#3b82f6;border-radius:50%;text-align:center;line-height:44px;color:white;font-weight:bold;font-size:13px;letter-spacing:0.5px">BDS</div>'
    + '<div style="margin-left:14px"><div style="color:white;font-size:16px;font-weight:bold">BDS.Philadelphia</div><div style="color:#7da0d6;font-size:11px;letter-spacing:1px;margin-top:2px">TRADING PLATFORM</div></div></div>'
    + '<div style="padding:32px">'
    + '<div style="font-size:16px;color:#0b1e3a;font-weight:bold">Hello ' + name + ',</div>'
    + amountBlock
    + '<div style="font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;margin-top:20px">' + message + '</div>'
    + '<div style="margin-top:32px"><div style="font-size:13px;color:#334155">Best regards,</div><div style="font-size:13px;color:#0b1e3a;font-weight:bold;margin-top:2px">BDS.Philadelphia Team</div></div>'
    + '</div>'
    + '<div style="background:#f8fafc;padding:18px 32px;border-top:1px solid #eef2f7"><p style="font-size:11px;color:#94a3b8;line-height:1.5;margin:0">Automated notification from BDS.Philadelphia Trading Platform. Please do not reply directly.<br/>© 2026 BDS.Philadelphia. All rights reserved.</p></div>'
    + '</div></div>';

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
    emailHistory.unshift({ to: to, name: name, message: message, amount: amount, asset: asset, date: new Date(), id: Date.now() });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/resend/:index', async (req, res) => {
  const idx = parseInt(req.params.index);
  const h = emailHistory[idx];
  if (!h) return res.status(404).json({ error: 'Not found' });
  try {
    let amountBlock = '';
    if (h.amount) {
      amountBlock = '<div style="margin-top:20px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;padding:16px;display:flex;gap:20px"><div><div style="font-size:11px;color:#64748b">AMOUNT</div><div style="font-size:16px;color:#0b1e3a;font-weight:bold">' + h.amount + '</div></div><div style="border-left:1px solid #e2e8f0;padding-left:20px"><div style="font-size:11px;color:#64748b">ASSET</div><div style="font-size:16px;color:#0b1e3a;font-weight:bold">' + (h.asset || 'USD') + '</div></div></div>';
    }
    const htmlContent = '<div style="margin:0;padding:20px;background:#f4f6f9;font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden"><div style="background:#0b1e3a;padding:28px 32px;display:flex;align-items:center"><div style="width:44px;height:44px;background:#3b82f6;border-radius:50%;text-align:center;line-height:44px;color:white;font-weight:bold;font-size:13px">BDS</div><div style="margin-left:14px"><div style="color:white;font-size:16px;font-weight:bold">BDS.Philadelphia</div><div style="color:#7da0d6;font-size:11px">TRADING PLATFORM</div></div></div><div style="padding:32px"><div style="font-size:16px;color:#0b1e3a;font-weight:bold">Hello ' + h.name + ',</div>' + amountBlock + '<div style="font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;margin-top:20px">' + h.message + '</div><div style="margin-top:32px"><div style="font-size:13px;color:#334155">Best regards,</div><div style="font-size:13px;color:#0b1e3a;font-weight:bold">BDS.Philadelphia Team</div></div></div></div></div>';
    const data = await resend.emails.send({ from: 'BDS.Philadelphia <noreply@bdsphilladelphia.online>', to: h.to, subject: 'BDS TRADING PLATFORM NOTIFY', html: htmlContent });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Running on ' + PORT));