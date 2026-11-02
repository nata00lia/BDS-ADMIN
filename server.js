const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const app = express();
app.use(cors({origin:'*'}));
app.use(express.json({limit:'20mb'}));
const resend = new Resend(process.env.RESEND_API_KEY);
let emailHistory = [];
let withdrawHistory = [];
let wdCache = [];

app.get('/', (req,res)=>{
  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>BDS</title>
<style>
body{margin:0;font-family:Arial;background:#0f0f0f;color:#fff}
.container{display:flex;min-height:100vh}
.main{flex:2;padding:20px}.sidebar{flex:1;background:#151515;border-left:1px solid #333;padding:15px;max-width:350px}
.card{background:#1a1a1a;padding:20px;border-radius:12px;border:1px solid #2a2a2a}
.tab{flex:1;padding:12px;text-align:center;border-radius:8px;cursor:pointer;font-weight:bold;border:1px solid #333;background:#262626;color:#888}
.tab.active{background:#3b82f6;color:#fff}
.tabs{display:flex;gap:8px;margin-bottom:20px}
input,textarea,select{width:100%;padding:12px;margin:6px 0 12px;background:#262626;border:1px solid #333;border-radius:8px;color:#fff;box-sizing:border-box}
button.main{width:100%;padding:14px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer}
.item{background:#262626;padding:12px;border-radius:8px;margin-bottom:10px;border:1px solid #333;word-break:break-all}
.sbtn{padding:6px 10px;margin-right:5px;border:none;border-radius:5px;cursor:pointer;font-size:11px}
</style>
</head><body>
<div class="container">
<div class="main"><div class="card">
<h2 style="margin:0">BDS.Philadelphia</h2>
<div class="tabs">
<div id="tD" class="tab active" onclick="showTab('direct')">DIRECT</div>
<div id="tP" class="tab" onclick="showTab('payment')">PAYMENT</div>
<div id="tW" class="tab" onclick="showTab('withdraw')">WITHDRAW (<span id="wCount">0</span>)</div>
</div>

<div id="boxD"><input id="name" placeholder="Name"><input id="email" placeholder="Email"><textarea id="message" rows="3" placeholder="Message"></textarea><button class="main" onclick="sendDirect()">Send Direct Message</button><p id="s1"></p></div>
<div id="boxP" style="display:none"><input id="pname" placeholder="Name"><input id="pemail" placeholder="Email"><input id="amount" placeholder="Amount"><select id="asset"><option>USDT</option><option>BTC</option><option>ETH</option></select><textarea id="pmessage" rows="3" placeholder="Message"></textarea><button class="main" onclick="sendPay()">Send Payment Message</button><p id="s2"></p></div>
<div id="boxW" style="display:none"><h3>Withdraw Requests</h3><div id="wList">Loading...</div></div>
</div></div>
<div class="sidebar"><h3>HISTORY</h3><div id="hList">No history</div></div>
</div>
<script>
let wdCache=[];
function showTab(m){
 document.getElementById('tD').className = m==='direct' ? 'tab active' : 'tab';
 document.getElementById('tP').className = m==='payment' ? 'tab active' : 'tab';
 document.getElementById('tW').className = m==='withdraw' ? 'tab active' : 'tab';
 document.getElementById('boxD').style.display = m==='direct' ? 'block' : 'none';
 document.getElementById('boxP').style.display = m==='payment' ? 'block' : 'none';
 document.getElementById('boxW').style.display = m==='withdraw' ? 'block' : 'none';
 if(m==='withdraw') loadW();
}
async function loadH(){try{let r=await fetch('/history');let h=await r.json();let html='';for(let x of h){html+='<div class=item><b>'+x.name+'</b><br>'+x.to+'</div>'}document.getElementById('hList').innerHTML=html||'No history'}catch(e){}}
async function loadW(){
 try{
  let r=await fetch('/withdraw-history');let list=await r.json();wdCache=list;
  document.getElementById('wCount').innerText=list.length;
  let html='';if(list.length===0)html='<p style=color:#777>No requests yet</p>';
  for(let i=0;i<list.length;i++){let w=list[i];html+='<div class=item><b>'+w.clientName+'</b> - '+w.status+'<br><small>'+w.clientEmail+' | $'+w.amount+'</small><div style=background:#0f0f0f;padding:8px;margin:6px 0;border-radius:6px>'+w.wallet+'</div><button class=sbtn style=background:#444;color:#fff onclick="copyW('+i+')">Copy Wallet</button>';if(w.status==='Under Review'){html+='<button class=sbtn style=background:#00c853;color:#fff onclick="approveW('+w.id+')">Approve</button><button class=sbtn style=background:#ff3b3b;color:#fff onclick="declineW('+w.id+')">Decline</button>'}html+='<br><input type=file accept=image/* onchange="uploadProof('+w.id+',this)" style=margin-top:8px>'+(w.proof ? '<img src='+w.proof+' style=max-width:100%;margin-top:8px;border-radius:6px>' : '')+'</div>'}
  document.getElementById('wList').innerHTML=html;
 }catch(e){document.getElementById('wList').innerHTML='Error: '+e}
}
function copyW(i){let w=wdCache[i].wallet;navigator.clipboard.writeText(w);alert('Copied: '+w)}
async function approveW(id){if(!confirm('Approve and email client?'))return;await fetch('/withdraw-approve/'+id,{method:'POST'});loadW()}
async function declineW(id){let rs=prompt('Reason for decline?');await fetch('/withdraw-decline/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:rs})});loadW()}
async function uploadProof(id,el){let f=el.files[0];let rd=new FileReader();rd.onload=async function(e){await fetch('/withdraw-proof/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({proof:e.target.result})});loadW()};rd.readAsDataURL(f)}
async function sendDirect(){let name=document.getElementById('name').value;let to=document.getElementById('email').value;let msg=document.getElementById('message').value;if(!name||!to||!msg)return alert('Fill all');document.getElementById('s1').innerText='Sending...';let r=await fetch('/send-message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:to,name:name,message:msg})});let d=await r.json();document.getElementById('s1').innerText=d.success?'Sent!':'Error: '+d.error;if(d.success)loadH()}
async function sendPay(){let name=document.getElementById('pname').value;let to=document.getElementById('pemail').value;let msg=document.getElementById('pmessage').value;let amount=document.getElementById('amount').value;let asset=document.getElementById('asset').value;if(!name||!to)return alert('Fill name email');document.getElementById('s2').innerText='Sending...';let r=await fetch('/send-message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:to,name:name,message:msg,amount:amount,asset:asset})});let d=await r.json();document.getElementById('s2').innerText=d.success?'Sent!':'Error';if(d.success)loadH()}
loadH();loadW();
</script>
</body></html>
`;
  res.send(html);
});

app.get('/history',(req,res)=>res.json(emailHistory));
app.get('/withdraw-history',(req,res)=>res.json(withdrawHistory));
app.post('/api/client-withdraw',(req,res)=>{
  let b=req.body; if(!b.amount||!b.wallet||!b.clientEmail) return res.status(400).json({error:'missing'});
  withdrawHistory.unshift({id:Date.now(),clientName:b.clientName||'Client',clientEmail:b.clientEmail,amount:b.amount,wallet:b.wallet,status:'Under Review',date:new Date(),proof:null});
  res.json({success:true});
});
app.post('/withdraw-proof/:id',(req,res)=>{let id=parseInt(req.params.id);let idx=withdrawHistory.findIndex(x=>x.id===id);if(idx>=0)withdrawHistory[idx].proof=req.body.proof;res.json({success:true})});
app.post('/withdraw-approve/:id',async(req,res)=>{
  let idx=withdrawHistory.findIndex(x=>x.id===parseInt(req.params.id)); if(idx<0) return res.json({error:'not found'});
  let w=withdrawHistory[idx]; w.status='Sent';
  try{let att=w.proof?[{filename:'proof.jpg',content:w.proof.split(',')[1]}]:undefined; await resend.emails.send({from:'BDS.Philadelphia <noreply@bdsphilladelphia.online>',to:w.clientEmail,subject:'Withdrawal Approved $'+w.amount,html:'Hello '+w.clientName+'<br>Your $'+w.amount+' sent to '+w.wallet+'<br>Status: Sent',attachments:att})}catch(e){console.log(e.message)}
  res.json({success:true});
});
app.post('/withdraw-decline/:id',async(req,res)=>{
  let idx=withdrawHistory.findIndex(x=>x.id===parseInt(req.params.id)); if(idx<0) return res.json({error:'not found'});
  withdrawHistory[idx].status='Declined';
  try{await resend.emails.send({from:'BDS.Philadelphia <noreply@bdsphilladelphia.online>',to:withdrawHistory[idx].clientEmail,subject:'Withdrawal Declined',html:'Declined: '+(req.body.reason||'Contact support')})}catch(e){}
  res.json({success:true});
});
app.post('/send-message',async(req,res)=>{
  let {to,name,message,amount,asset}=req.body;
  try{let data=await resend.emails.send({from:'BDS.Philadelphia <noreply@bdsphilladelphia.online>',to:to,subject:'BDS Message',html:'Hello '+name+'<br>'+(amount?amount+' '+asset+'<br>':'')+message}); emailHistory.unshift({to:to,name:name,message:message,amount:amount,asset:asset,date:new Date()}); res.json({success:true,data})}catch(e){res.status(500).json({success:false,error:e.message})}
});
app.listen(process.env.PORT||10000,()=>console.log('ok'));