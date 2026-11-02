const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const app = express();
app.use(cors({origin:'*'}));
app.use(express.json({limit:'30mb'}));
const resend = new Resend(process.env.RESEND_API_KEY);

let emailHistory = [];
let withdrawHistory = [];
let wdCache = [];

app.get('/', (req,res)=>{
res.send(`
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>BDS Dashboard</title>
<style>
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,Arial;background:#0f141f;color:#fff}
.container{max-width:1150px;margin:0 auto;padding:24px;display:flex;gap:20px}
.left{flex:2.2}.right{flex:1}
h1{margin:0;font-size:28px} .sub{color:#8b9bb4;font-size:11px;letter-spacing:1px;margin:6px 0 18px;font-weight:700}
.tabs{display:flex;gap:12px;margin-bottom:20px}
.tab{flex:1;padding:14px;text-align:center;border-radius:10px;cursor:pointer;font-weight:800;font-size:12px;background:#1e293b;color:#8b9bb4;border:1px solid #263244}
.tab.active{background:#2563eb;color:#fff;border-color:#2563eb}
.card{background:#131b29;border:1px solid #1e2d45;border-radius:16px;padding:22px}
.row{display:flex;gap:14px} .row>div{flex:1}
label{font-size:11px;color:#8b9bb4;font-weight:700;letter-spacing:0.8px;display:block;margin:16px 0 8px}
input,textarea,select{width:100%;padding:13px;background:#0f172a;border:1px solid #1e2d45;border-radius:10px;color:#e2e8f0;font-size:14px;outline:none}
textarea{min-height:120px}
.attach{margin-top:16px;border:1px dashed #1e2d45;border-radius:10px;padding:14px;background:#0f172a}
button.send{width:100%;padding:15px;background:#2563eb;color:#fff;border:none;border-radius:12px;font-weight:800;font-size:15px;cursor:pointer;margin-top:20px}
button.send:hover{background:#1d4ed8}
.item{background:#0f172a;padding:12px;border-radius:10px;margin-bottom:10px;border:1px solid #1e2d45;word-break:break-all}
.sbtn{padding:7px 12px;border:none;border-radius:6px;cursor:pointer;font-size:11px;margin-right:6px;font-weight:700}
</style>
</head><body>
<div class="container">
<div class="left">
<h1>BDS.Philadelphia</h1><div class="sub">MESSAGE DASHBOARD</div>
<div class="tabs">
<div id="tD" class="tab active" onclick="showTab('direct')">DIRECT MESSAGE</div>
<div id="tP" class="tab" onclick="showTab('payment')">PAYMENT MESSAGE</div>
<div id="tW" class="tab" onclick="showTab('withdraw')">WITHDRAW (<span id="wCount">0</span>)</div>
</div>

<div class="card" id="boxD">
<div class="row"><div><label>NAME</label><input id="dName" placeholder="Client name"></div><div><label>EMAIL</label><input id="dEmail" placeholder="client@email.com"></div></div>
<label>MESSAGE</label><textarea id="dMsg" placeholder="Type your message here..."></textarea>
<div class="attach"><label>ATTACH IMAGE (Optional)</label><input type="file" id="dImg" accept="image/*"></div>
<button class="send" onclick="sendDirect()">Send Message</button><div id="sD" style="margin-top:10px;font-size:13px"></div>
</div>

<div class="card" id="boxP" style="display:none">
<div class="row"><div><label>NAME</label><input id="pName" placeholder="Client name"></div><div><label>EMAIL</label><input id="pEmail" placeholder="client@email.com"></div></div>
<div class="row"><div><label>AMOUNT</label><input id="pAmount" placeholder="500"></div><div><label>ASSET</label><select id="pAsset"><option>USDT</option><option>BTC</option><option>ETH</option><option>BANK</option></select></div></div>
<label>MESSAGE</label><textarea id="pMsg" placeholder="Payment details..."></textarea>
<div class="attach"><label>ATTACH IMAGE (Optional)</label><input type="file" id="pImg" accept="image/*"></div>
<button class="send" onclick="sendPay()">Send Payment Message</button><div id="sP" style="margin-top:10px;font-size:13px"></div>
</div>

<div class="card" id="boxW" style="display:none">
<h3 style="margin:0 0 12px">Withdraw Requests</h3><div id="wList">No requests yet</div>
</div>

</div>
<div class="right"><div class="card"><h3 style="margin:0 0 12px;font-size:14px">HISTORY</h3><div id="hList">No history</div></div></div>
</div>

<script>
let wdCache=[];
function showTab(m){
 document.getElementById('tD').className=m==='direct'?'tab active':'tab';
 document.getElementById('tP').className=m==='payment'?'tab active':'tab';
 document.getElementById('tW').className=m==='withdraw'?'tab active':'tab';
 document.getElementById('boxD').style.display=m==='direct'?'block':'none';
 document.getElementById('boxP').style.display=m==='payment'?'block':'none';
 document.getElementById('boxW').style.display=m==='withdraw'?'block':'none';
 if(m==='withdraw') loadW();
}
async function loadH(){try{let r=await fetch('/history');let h=await r.json();let html='';for(let x of h){html+='<div class=item><b>'+x.name+'</b><br><small>'+x.to+'</small>'+(x.amount?'<br><small style=color:#60a5fa>$'+x.amount+' '+x.asset+'</small>':'')+'</div>'}document.getElementById('hList').innerHTML=html||'No history'}catch(e){}}
async function loadW(){
 try{
  let r=await fetch('/withdraw-history');let list=await r.json();wdCache=list;
  document.getElementById('wCount').innerText=list.length;
  let html='';if(list.length===0)html='<p style=color:#64748b>No requests yet</p>';
  for(let i=0;i<list.length;i++){let w=list[i];html+='<div class=item><b>'+w.clientName+'</b> - <span style=color:'+(w.status==='Sent'?'#22c55e':w.status==='Declined'?'#ef4444':'#f59e0b')+'>'+w.status+'</span><br><small>'+w.clientEmail+' | $'+w.amount+'</small><div style=background:#020617;padding:8px;margin:8px 0;border-radius:8px;font-size:12px;border:1px solid #1e2d45>'+w.wallet+'</div><button class=sbtn style=background:#334155;color:#fff onclick="copyW('+i+')">Copy Wallet</button>';if(w.status==='Under Review'){html+='<button class=sbtn style=background:#16a34a;color:#fff onclick="approveW('+w.id+')">Approve</button><button class=sbtn style=background:#dc2626;color:#fff onclick="declineW('+w.id+')">Decline</button>'}html+='<div style=margin-top:10px'><label style=font-size:10px>Upload Proof</label><input type=file accept=image/* onchange="uploadProof('+w.id+',this)"></div>'+(w.proof?'<img src='+w.proof+' style=max-width:100%;margin-top:8px;border-radius:8px>':'')+'</div>'}
  document.getElementById('wList').innerHTML=html;
 }catch(e){document.getElementById('wList').innerText='Error';}
}
function copyW(i){navigator.clipboard.writeText(wdCache[i].wallet);alert('Copied: '+wdCache[i].wallet)}
async function approveW(id){if(!confirm('Approve and email client?'))return;await fetch('/withdraw-approve/'+id,{method:'POST'});loadW()}
async function declineW(id){let rs=prompt('Reason?');await fetch('/withdraw-decline/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:rs})});loadW()}
async function uploadProof(id,el){let f=el.files[0];let r=new FileReader();r.onload=async e=>{await fetch('/withdraw-proof/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({proof:e.target.result})});loadW()};r.readAsDataURL(f)}
async function getImg(id){let el=document.getElementById(id);if(!el.files[0])return null;return await new Promise(res=>{let rd=new FileReader();rd.onload=()=>res(rd.result);rd.readAsDataURL(el.files[0])})}
async function sendDirect(){let n=document.getElementById('dName').value;let to=document.getElementById('dEmail').value;let m=document.getElementById('dMsg').value;if(!n||!to||!m)return alert('Fill name email message');document.getElementById('sD').innerText='Sending...';let img=await getImg('dImg');let r=await fetch('/send-message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:to,name:n,message:m,image:img})});let d=await r.json();document.getElementById('sD').innerText=d.success?'Sent!':'Error: '+(d.error||'');if(d.success)loadH()}
async function sendPay(){let n=document.getElementById('pName').value;let to=document.getElementById('pEmail').value;let m=document.getElementById('pMsg').value;let amt=document.getElementById('pAmount').value;let asset=document.getElementById('pAsset').value;if(!n||!to)return alert('Fill name email');document.getElementById('sP').innerText='Sending...';let img=await getImg('pImg');let r=await fetch('/send-message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:to,name:n,message:m,amount:amt,asset:asset,image:img})});let d=await r.json();document.getElementById('sP').innerText=d.success?'Sent!':'Error';if(d.success)loadH()}
loadH();loadW();
</script>
</body></html>
`);
});

app.get('/history',(req,res)=>res.json(emailHistory));
app.get('/withdraw-history',(req,res)=>res.json(withdrawHistory));

// CLIENT: submit withdraw
app.post('/api/client-withdraw',(req,res)=>{
 let b=req.body;
 if(!b.amount||!b.wallet||!b.clientEmail) return res.status(400).json({error:'missing fields'});
 withdrawHistory.unshift({
  id: Date.now(),
  clientName: b.clientName||'Client',
  clientEmail: b.clientEmail,
  amount: b.amount,
  wallet: b.wallet,
  status: 'Under Review',
  date: new Date(),
  proof: null
 });
 res.json({success:true});
});

// CLIENT: check status below amount input
app.get('/api/withdraw-status',(req,res)=>{
 let email = req.query.email;
 if(!email) return res.json([]);
 let filtered = withdrawHistory.filter(x=>x.clientEmail.toLowerCase()===email.toLowerCase());
 res.json(filtered);
});

app.post('/withdraw-proof/:id',(req,res)=>{
 let id=parseInt(req.params.id);
 let i=withdrawHistory.findIndex(x=>x.id===id);
 if(i>=0) withdrawHistory[i].proof=req.body.proof;
 res.json({success:true});
});

app.post('/withdraw-approve/:id',async(req,res)=>{
 let i=withdrawHistory.findIndex(x=>x.id===parseInt(req.params.id));
 if(i<0) return res.json({error:'not found'});
 withdrawHistory[i].status='Sent';
 try{
  let att=withdrawHistory[i].proof?[{filename:'proof.jpg',content:withdrawHistory[i].proof.split(',')[1],encoding:'base64'}]:undefined;
  await resend.emails.send({
   from:'BDS.Philadelphia <noreply@bdsphilladelphia.online>',
   to:withdrawHistory[i].clientEmail,
   subject:'Withdrawal Approved $'+withdrawHistory[i].amount,
   html:'Hello '+withdrawHistory[i].clientName+'<br>Your withdrawal of $'+withdrawHistory[i].amount+' to '+withdrawHistory[i].wallet+' has been approved.<br>Status: <b>Sent</b>',
   attachments:att
  });
 }catch(e){console.log(e.message)}
 res.json({success:true});
});

app.post('/withdraw-decline/:id',async(req,res)=>{
 let i=withdrawHistory.findIndex(x=>x.id===parseInt(req.params.id));
 if(i<0) return res.json({error:'not found'});
 withdrawHistory[i].status='Declined';
 try{
  await resend.emails.send({
   from:'BDS.Philadelphia <noreply@bdsphilladelphia.online>',
   to:withdrawHistory[i].clientEmail,
   subject:'Withdrawal Declined',
   html:'Hello '+withdrawHistory[i].clientName+'<br>Your withdrawal of $'+withdrawHistory[i].amount+' was Declined.<br>Reason: '+(req.body.reason||'Contact support')
  });
 }catch(e){}
 res.json({success:true});
});

app.post('/send-message',async(req,res)=>{
 let {to,name,message,amount,asset,image}=req.body;
 try{
  let attachments;
  if(image){attachments=[{filename:'image.jpg',content:image.split(',')[1],encoding:'base64'}]}
  let html='Hello '+name+'<br><br>'+message+(amount?'<br><br>Amount: '+amount+' '+asset:'');
  let result=await resend.emails.send({
   from:'BDS.Philadelphia <noreply@bdsphilladelphia.online>',
   to:to,
   subject: amount? 'Payment $'+amount : 'Direct Message from BDS.Philadelphia',
   html:html,
   attachments:attachments
  });
  emailHistory.unshift({to:to,name:name,message:message,amount:amount,asset:asset,date:new Date()});
  res.json({success:true,data:result});
 }catch(e){res.status(500).json({success:false,error:e.message})}
});

app.listen(process.env.PORT||10000,()=>console.log('ok'));