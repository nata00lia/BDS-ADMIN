const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));
const resend = new Resend(process.env.RESEND_API_KEY);
let emailHistory = [];
let withdrawHistory = [];

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
.tab{flex:1;padding:10px;text-align:center;border-radius:8px;cursor:pointer;font-size:11px;font-weight:bold;border:1px solid #333}
.tab.active{background:#3b82f6;color:white}.tab.inactive{background:#262626;color:#888}
input,textarea,select{width:100%;padding:14px;margin:8px 0 18px 0;background:#262626;border:1px solid #333;border-radius:8px;color:white;box-sizing:border-box}
button.main{width:100%;padding:16px;background:#3b82f6;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer}
.history-item{background:#262626;padding:14px;border-radius:8px;margin-bottom:12px;border:1px solid #333}
.btn-small{padding:6px 12px;font-size:11px;border-radius:6px;border:none;cursor:pointer;margin-right:5px}
.hidden{display:none}.badge{padding:3px 8px;border-radius:10px;font-size:10px;margin-left:8px}
.badge-review{background:#ff9800;color:white}.badge-sent{background:#00c853;color:white}.badge-decline{background:#ff3b3b;color:white}
.upload{border:1px dashed #444;padding:8px;border-radius:8px;text-align:center;margin-top:10px;background:#1a1a1a}
</style>
</head><body>
<div class="container">
<div class="main">
<div class="card">
<h2 style="margin:0">BDS.Philadelphia</h2><p style="color:#666;font-size:12px">CLIENT MESSAGE DASHBOARD</p>
<div class="tabs">
<div id="tabDirect" class="tab active" onclick="switchMode('direct')">DIRECT MESSAGE</div>
<div id="tabPayment" class="tab inactive" onclick="switchMode('payment')">PAYMENT MESSAGE</div>
<div id="tabWithdraw" class="tab active" onclick="switchMode('withdraw')">WITHDRAW REQUESTS (<span id="wCount">0</span>)</div>
</div>

<div id="directPaymentSection">
<div style="display:flex;gap:15px"><div style="flex:1"><label>NAME</label><input id="name"/></div><div style="flex:1"><label>EMAIL</label><input id="email"/></div></div>
<div id="paymentFields" class="hidden"><div style="display:flex;gap:15px"><div style="flex:1"><label>AMOUNT</label><input id="amount"/></div><div style="flex:1"><label>ASSET</label><select id="asset"><option>USDT</option><option>BTC</option><option>ETH</option><option>USD</option></select></div></div></div>
<label>MESSAGE</label><textarea id="message" rows="5"></textarea>
<label>ATTACH IMAGE (Optional)</label><div class="upload"><input type="file" id="image" accept="image/*" onchange="previewImage(this)" /><img id="preview" style="max-width:100%;display:none;margin-top:10px"/><p id="fileName" style="color:#888;font-size:12px"></p></div>
<button class="main" onclick="send()" style="margin-top:15px">Send Message</button><p id="status" style="text-align:center;color:#3b82f6"></p>
</div>

<div id="withdrawSection" class="hidden">
<h3 style="margin:0">Incoming Withdraw Requests</h3><p style="color:#888;font-size:12px">Client requests show here. Upload proof screenshot, then Approve. Email auto-sends to client.</p>
<div id="withdrawList" style="margin-top:20px"></div>
</div>

</div></div>
<div class="sidebar"><h3>HISTORY</h3><div id="historyList"></div></div>
</div>
<script>
let historyData=[]; let base64Image=null,imageName=null;
function switchMode(m){
 document.getElementById('tabDirect').className=m==='direct'?'tab active':'tab inactive';
 document.getElementById('tabPayment').className=m==='payment'?'tab active':'tab inactive';
 document.getElementById('tabWithdraw').className=m==='withdraw'?'tab active':'tab inactive';
 document.getElementById('directPaymentSection').className=m==='withdraw'?'hidden':'';
 document.getElementById('withdrawSection').className=m==='withdraw'?'':'hidden';
 document.getElementById('paymentFields').className=m==='payment'?'':'hidden';
 if(m==='withdraw') loadWithdraws();
}
function previewImage(input){const file=input.files[0];if(!file)return;imageName=file.name;document.getElementById('fileName').innerText=file.name;const reader=new FileReader();reader.onload=function(e){base64Image=e.target.result;document.getElementById('preview').src=base64Image;document.getElementById('preview').style.display='block';};reader.readAsDataURL(file);}
async function loadHistory(){const res=await fetch('/history');historyData=await res.json();let html='';for(let i=0;i<historyData.length;i++){const h=historyData[i];html+='<div class=history-item><b>'+h.name+'</b><p>'+h.to+'</p></div>';}document.getElementById('historyList').innerHTML=html||'<p style=color:#555>No emails yet</p>';}
async function loadWithdraws(){
 const res=await fetch('/withdraw-history'); const list=await res.json();
 document.getElementById('wCount').innerText=list.length;
 const div=document.getElementById('withdrawList');
 if(list.length===0){div.innerHTML='<p style=color:#666>No withdraw requests yet</p>';return}
 let html=''; for(let w of list){
  let badge=w.status==='Sent'?'<span class=badge badge-sent>Sent</span>':w.status==='Declined'?'<span class=badge badge-decline>Declined</span>':'<span class=badge badge-review>Under Review</span>';
  html+='<div class=history-item><div><b>'+(w.clientName||'Client')+'</b> '+badge+' <span style=float:right;color:#666;font-size:11px>'+new Date(w.date).toLocaleString()+'</span></div>'+
  '<p style=color:#888;font-size:12px;margin:5px 0'>'+w.clientEmail+' | <b style=color:white>$'+w.amount+' USDT</b></p>'+
  '<div style=background:#0f0f0f;padding:8px;border-radius:6px;word-break:break-all;font-size:12px;margin:8px 0>'+w.wallet+'</div>'+
  '<button class=btn-small style=background:#444;color:white onclick="copyW(\\''+w.wallet+'\\')">Copy Wallet</button>'+
  (w.status==='Under Review'?'<button class=btn-small style=background:#00c853;color:white onclick="approveW('+w.id+')">Approve & Send Email</button><button class=btn-small style=background:#ff3b3b;color:white onclick="declineW('+w.id+')">Decline & Email</button>':'<span style=color:#888;font-size:11px> Emailed to client</span>')+
  '<div style=margin-top:10px><label style=font-size:10px>Upload proof screenshot BEFORE approve:</label><input type=file accept=image/* onchange="uploadProof('+w.id+',this)"/></div>'+
  (w.proof?'<img src='+w.proof+' style=max-width:100%;margin-top:10px;border-radius:6px />':'')+
  '</div>';
 }
 div.innerHTML=html;
}
function copyW(w){navigator.clipboard.writeText(w);alert('Copied: '+w)}
async function approveW(id){if(!confirm('Approve? This will EMAIL client that money was sent with screenshot'))return;await fetch('/withdraw-approve/'+id,{method:'POST'});loadWithdraws();alert('Approved and Emailed to client');}
async function declineW(id){let reason=prompt('Reason for decline? (optional)');await fetch('/withdraw-decline/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason})});loadWithdraws();alert('Declined and Emailed');}
async function uploadProof(id,input){const file=input.files[0];const reader=new FileReader();reader.onload=async function(e){await fetch('/withdraw-proof/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({proof:e.target.result})});loadWithdraws();};reader.readAsDataURL(file);}
async function send(){const name=document.getElementById('name').value;const email=document.getElementById('email').value;const message=document.getElementById('message').value;const amount=document.getElementById('amount').value;const asset=document.getElementById('asset').value;if(!name||!email||!message){alert('Fill');return}document.getElementById('status').innerText='Sending...';const res=await fetch('/send-message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:email,name,message,amount,asset,image:base64Image,imageName:imageName})});const data=await res.json();document.getElementById('status').innerText=data.success?'Sent':'Error';if(data.success)loadHistory();}
switchMode('withdraw'); loadHistory(); loadWithdraws(); setInterval(loadWithdraws,5000);
</script></body></html>
`;
  res.send(page);
});

app.get('/history', (req,res)=>res.json(emailHistory));
app.get('/withdraw-history', (req,res)=>res.json(withdrawHistory));

app.post('/api/client-withdraw', (req,res)=>{
  const { clientName, clientEmail, amount, wallet } = req.body;
  if(!amount || !wallet || !clientEmail) return res.status(400).json({error:'missing'});
  const obj = { id: Date.now(), clientName: clientName||'Client', clientEmail, amount, wallet, status:'Under Review', date:new Date(), proof:null };
  withdrawHistory.unshift(obj);
  res.json({success:true, status:'Under Review', id:obj.id});
});

app.get('/api/withdraw-status', (req,res)=>{
  const email=req.query.email;
  res.json(withdrawHistory.filter(x=>x.clientEmail===email));
});

app.post('/withdraw-proof/:id', (req,res)=>{
  const id=parseInt(req.params.id); const i=withdrawHistory.findIndex(x=>x.id===id);
  if(i>=0) withdrawHistory[i].proof=req.body.proof;
  res.json({success:true});
});

app.post('/withdraw-approve/:id', async (req,res)=>{
  const id=parseInt(req.params.id); const idx=withdrawHistory.findIndex(x=>x.id===id);
  if(idx<0) return res.status(404).json({error:'not found'});
  const w=withdrawHistory[idx];
  w.status='Sent';
  // EMAIL CLIENT WITH PROOF
  try{
    let attachments;
    if(w.proof){ const base64=w.proof.split(',')[1]; attachments=[{filename:'withdraw-proof.jpg', content:base64}]; }
    const html = '<div style="margin:0;padding:20px;background:#f4f6f9;font-family:Arial"><div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden"><div style="background:#0b1e3a;padding:24px;color:white"><b>BDS.Philadelphia</b> - Withdrawal Approved</div><div style="padding:28px"><h3>Hello '+w.clientName+',</h3><p>Your withdrawal of <b>$'+w.amount+' USDT</b> has been approved and sent.</p><p><b>Wallet:</b> '+w.wallet+'</p><p style="color:#00c853;font-weight:bold">Status: Sent ✓</p><p>Proof screenshot is attached if uploaded.</p><p>Best regards,<br/>BDS.Philadelphia Team</p></div></div></div>';
    await resend.emails.send({from:'BDS.Philadelphia <noreply@bdsphilladelphia.online>', to:w.clientEmail, subject:'Withdrawal Approved - $'+w.amount+' Sent', html, attachments});
  }catch(e){console.log('email error', e.message)}
  res.json({success:true});
});

app.post('/withdraw-decline/:id', async (req,res)=>{
  const id=parseInt(req.params.id); const idx=withdrawHistory.findIndex(x=>x.id===id);
  if(idx<0) return res.status(404).json({error:'not found'});
  const w=withdrawHistory[idx];
  w.status='Declined';
  const reason=req.body.reason||'Please contact support';
  try{
    const html='<div style="padding:20px;font-family:Arial"><div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;border:1px solid #eee"><div style="background:#ff3b3b;padding:20px;color:white"><b>Withdrawal Declined</b></div><div style="padding:24px"><p>Hello '+w.clientName+',</p><p>Your withdrawal of <b>$'+w.amount+' USDT</b> to <br/>'+w.wallet+' was declined.</p><p><b>Reason:</b> '+reason+'</p><p>Status: Declined</p><p>BDS.Philadelphia Team</p></div></div></div>';
    await resend.emails.send({from:'BDS.Philadelphia <noreply@bdsphilladelphia.online>', to:w.clientEmail, subject:'Withdrawal Declined', html});
  }catch(e){console.log(e.message)}
  res.json({success:true});
});

app.post('/send-message', async (req,res)=>{
  const { to,name,message,amount,asset,image,imageName }=req.body;
  let amountBlock= amount?'<div>AMOUNT: '+amount+' '+asset+'</div>':'';
  const html='<div>Hello '+name+',<br/>'+amountBlock+'<br/>'+message+'</div>';
  try{
    const data=await resend.emails.send({from:'BDS.Philadelphia <noreply@bdsphilladelphia.online>',to,subject:'BDS TRADING PLATFORM NOTIFY',html, attachments: image?[{filename:imageName||'img.jpg',content:image.split(',')[1]}]:undefined});
    emailHistory.unshift({to,name,message,amount,asset,date:new Date()});
    res.json({success:true,data});
  }catch(e){res.status(500).json({error:e.message})}
});

const PORT=process.env.PORT||10000;
app.listen(PORT,()=>console.log('Running '+PORT)); 