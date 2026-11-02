const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));
const resend = new Resend(process.env.RESEND_API_KEY);
let emailHistory = [];
let withdrawHistory = [];
let wdCache = [];

app.get('/', (req, res) => {
res.send(`
<html><head><title>BDS</title><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
body{font-family:Arial;background:#0f0f0f;color:white;margin:0}
.container{display:flex;min-height:100vh}
.main{flex:2;padding:30px}.sidebar{flex:1;background:#151515;border-left:1px solid #2a2a2a;padding:20px;max-width:380px}
.card{background:#1a1a1a;padding:25px;border-radius:12px;border:1px solid #2a2a2a}
.tabs{display:flex;gap:10px;margin-bottom:20px}
.tab{flex:1;padding:12px;text-align:center;border-radius:8px;cursor:pointer;font-weight:bold;border:1px solid #333}
.tab.active{background:#3b82f6;color:white}.tab.inactive{background:#262626;color:#888}
input,textarea,select{width:100%;padding:12px;margin:8px 0 12px;background:#262626;border:1px solid #333;border-radius:8px;color:white}
button.main{width:100%;padding:14px;background:#3b82f6;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer}
.history-item{background:#262626;padding:12px;border-radius:8px;margin-bottom:12px;border:1px solid #333;word-break:break-all}
.btn{padding:6px 10px;font-size:11px;border-radius:6px;border:none;cursor:pointer;margin-right:5px}
</style></head><body>
<div class="container"><div class="main"><div class="card">
<h2>BDS.Philadelphia</h2>
<div class="tabs">
<div id="tDirect" class="tab active" onclick="showTab('direct')">DIRECT</div>
<div id="tPayment" class="tab inactive" onclick="showTab('payment')">PAYMENT</div>
<div id="tWithdraw" class="tab inactive" onclick="showTab('withdraw')">WITHDRAW (<span id="wCount">0</span>)</div>
</div>

<div id="boxDirect"><label>NAME</label><input id="name"><label>EMAIL</label><input id="email"><label>MESSAGE</label><textarea id="message" rows="3"></textarea><button class="main" onclick="sendMsg()">Send Direct</button><p id="status"></p></div>
<div id="boxPayment" style="display:none"><label>NAME</label><input id="pname"><label>EMAIL</label><input id="pemail"><label>AMOUNT</label><input id="amount"><label>ASSET</label><select id="asset"><option>USDT</option><option>BTC</option><option>ETH</option></select><label>MESSAGE</label><textarea id="pmessage" rows="3"></textarea><button class="main" onclick="sendPay()">Send Payment</button><p id="pstatus"></p></div>
<div id="boxWithdraw" style="display:none"><h3>Withdraw Requests</h3><div id="withdrawList">Loading...</div></div>
</div></div><div class="sidebar"><h3>HISTORY</h3><div id="historyList"></div></div></div>
<script>
let currentTab='direct';
function showTab(m){
 currentTab=m;
 document.getElementById('tDirect').className=m==='direct'?'tab active':'tab inactive';
 document.getElementById('tPayment').className=m==='payment'?'tab active':'tab inactive';
 document.getElementById('tWithdraw').className=m==='withdraw'?'tab active':'tab inactive';
 document.getElementById('boxDirect').style.display=m==='direct'?'block':'none';
 document.getElementById('boxPayment').style.display=m==='payment'?'block':'none';
 document.getElementById('boxWithdraw').style.display=m==='withdraw'?'block':'none';
 if(m==='withdraw') loadWithdraws();
}
async function loadHistory(){try{const r=await fetch('/history');const h=await r.json();let html='';for(let x of h){html+='<div class=history-item><b>'+x.name+'</b><br/>'+x.to+'</div>'}document.getElementById('historyList').innerHTML=html||'No history';}catch(e){}}
async function loadWithdraws(){
 try{
  const r=await fetch('/withdraw-history'); const list=await r.json(); wdCache=list;
  document.getElementById('wCount').innerText=list.length;
  let html=''; if(list.length===0) html='<p style=color:#666>No requests</p>';
  for(let i=0;i<list.length;i++){let w=list[i];let badge=w.status==='Sent'?'Sent':w.status==='Declined'?'Declined':'Under Review';
   html+='<div class=history-item><b>'+w.clientName+'</b> - '+badge+'<br/><small>'+w.clientEmail+' | $'+w.amount+'</small><div style=background:#0f0f0f;padding:8px;margin:8px 0;border-radius:6px>'+w.wallet+'</div><button class=btn style=background:#444;color:white onclick="copyIdx('+i+')">Copy Wallet</button>';
   if(w.status==='Under Review'){html+='<button class=btn style=background:#00c853;color:white onclick="approveW('+w.id+')">Approve</button><button class=btn style=background:#ff3b3b;color:white onclick="declineW('+w.id+')">Decline</button>';}
   html+='<div style=margin-top:8px'><input type=file accept=image/* onchange="uploadProof('+w.id+',this)"/></div>'+(w.proof?'<img src='+w.proof+' style=max-width:100%;margin-top:8px;border-radius:6px/>':'')+'</div>';
  }
  document.getElementById('withdrawList').innerHTML=html;
 }catch(e){document.getElementById('withdrawList').innerText='Error loading';}
}
function copyIdx(i){let w=wdCache[i].wallet; navigator.clipboard.writeText(w); alert('Copied: '+w);}
async function approveW(id){if(!confirm('Approve and email client?'))return;await fetch('/withdraw-approve/'+id,{method:'POST'});loadWithdraws();}
async function declineW(id){let rs=prompt('Reason?');await fetch('/withdraw-decline/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:rs})});loadWithdraws();}
async function uploadProof(id,input){let f=input.files[0];let rd=new FileReader();rd.onload=async e=>{await fetch('/withdraw-proof/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({proof:e.target.result})});loadWithdraws();};rd.readAsDataURL(f);}
async function sendMsg(){let name=document.getElementById('name').value;let to=document.getElementById('email').value;let message=document.getElementById('message').value;if(!name||!to)return alert('fill');document.getElementById('status').innerText='Sending...';let r=await fetch('/send-message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to,name,message})});let d=await r.json();document.getElementById('status').innerText=d.success?'Sent':'Error';if(d.success)loadHistory();}
async function sendPay(){let name=document.getElementById('pname').value;let to=document.getElementById('pemail').value;let message=document.getElementById('pmessage').value;let amount=document.getElementById('amount').value;let asset=document.getElementById('asset').value;if(!name||!to)return alert('fill');document.getElementById('pstatus').innerText='Sending...';let r=await fetch('/send-message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to,name,message,amount,asset})});let d=await r.json();document.getElementById('pstatus').innerText=d.success?'Sent':'Error';if(d.success)loadHistory();}
loadHistory();loadWithdraws();
</script></body></html>
`);
});
app.get('/history',(req,res)=>res.json(emailHistory));
app.get('/withdraw-history',(req,res)=>res.json(withdrawHistory));
app.post('/api/client-withdraw',(req,res)=>{
 let {clientName,clientEmail,amount,wallet}=req.body;
 if(!amount||!wallet||!clientEmail) return res.status(400).json({error:'missing'});
 withdrawHistory.unshift({id:Date.now(),clientName:clientName||'Client',clientEmail,amount,wallet,status:'Under Review',date:new Date(),proof:null});
 res.json({success:true});
});
app.post('/withdraw-proof/:id',(req,res)=>{let id=parseInt(req.params.id);let idx=withdrawHistory.findIndex(x=>x.id===id);if(idx>=0)withdrawHistory[idx].proof=req.body.proof;res.json({success:true});});
app.post('/withdraw-approve/:id',async(req,res)=>{
 let idx=withdrawHistory.findIndex(x=>x.id===parseInt(req.params.id)); if(idx<0) return res.status(404).json({error:'no'});
 let w=withdrawHistory[idx]; w.status='Sent';
 try{let att; if(w.proof) att=[{filename:'proof.jpg',content:w.proof.split(',')[1]}]; await resend.emails.send({from:'BDS.Philadelphia <noreply@bdsphilladelphia.online>',to:w.clientEmail,subject:'Withdrawal Approved $'+w.amount,html:'Hello '+w.clientName+',<br/>Your $'+w.amount+' sent to '+w.wallet+'<br/>Status: Sent',attachments:att});}catch(e){console.log(e.message)}
 res.json({success:true});
});
app.post('/withdraw-decline/:id',async(req,res)=>{
 let idx=withdrawHistory.findIndex(x=>x.id===parseInt(req.params.id)); if(idx<0) return res.status(404).json({error:'no'});
 withdrawHistory[idx].status='Declined';
 try{await resend.emails.send({from:'BDS.Philadelphia <noreply@bdsphilladelphia.online>',to:withdrawHistory[idx].clientEmail,subject:'Withdrawal Declined',html:'Declined: '+(req.body.reason||'Contact support')});}catch(e){}
 res.json({success:true});
});
app.post('/send-message',async(req,res)=>{
 let {to,name,message,amount,asset}=req.body;
 try{let data=await resend.emails.send({from:'BDS.Philadelphia <noreply@bdsphilladelphia.online>',to,subject:'BDS Notify',html:'Hello '+name+'<br/>'+(amount?amount+' '+asset+'<br/>':'')+message}); emailHistory.unshift({to,name,message,amount,asset,date:new Date()}); res.json({success:true,data});}catch(e){res.status(500).json({error:e.message})}
});
app.listen(process.env.PORT||10000,()=>console.log('ok'));