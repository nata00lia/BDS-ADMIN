const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const app = express();
app.use(cors({origin:'*'}));
app.use(express.json({limit:'30mb'}));
const resend = new Resend(process.env.RESEND_API_KEY);
let emailHistory = [];
let withdrawHistory = [];

app.get('/', (req,res)=>{
res.setHeader('Content-Type','text/html');
res.end(`
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>BDS Dashboard</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:Arial;background:#0f141f;color:#fff}
.container{max-width:1100px;margin:0 auto;padding:24px;display:flex;gap:20px}
.left{flex:2}.right{flex:1}
h1{margin:0;font-size:26px}.sub{color:#8b9bb4;font-size:11px;margin:6px 0 18px;font-weight:700}
.tabs{display:flex;gap:12px;margin-bottom:20px}
.tab{flex:1;padding:14px;text-align:center;border-radius:10px;cursor:pointer;font-weight:800;font-size:12px;background:#1e293b;color:#8b9bb4;border:1px solid #263244}
.tab.active{background:#2563eb;color:#fff}
.card{background:#131b29;border:1px solid #1e2d45;border-radius:16px;padding:22px}
.row{display:flex;gap:14px}.row>div{flex:1}
label{font-size:11px;color:#8b9bb4;font-weight:700;display:block;margin:14px 0 6px}
input,textarea,select{width:100%;padding:12px;background:#0f172a;border:1px solid #1e2d45;border-radius:10px;color:#fff}
textarea{min-height:110px}
.attach{margin-top:14px;border:1px dashed #1e2d45;border-radius:10px;padding:12px;background:#0f172a}
button.send{width:100%;padding:14px;background:#2563eb;color:#fff;border:none;border-radius:12px;font-weight:800;cursor:pointer;margin-top:18px}
.item{background:#0f172a;padding:10px;border-radius:10px;margin-bottom:8px;border:1px solid #1e2d45;word-break:break-all;font-size:13px}
</style>
</head><body>
<div class="container">
<div class="left">
<h1>BDS.Philadelphia</h1><div class="sub">MESSAGE DASHBOARD</div>
<div class="tabs">
<div id="tD" class="tab active">DIRECT MESSAGE</div>
<div id="tP" class="tab">PAYMENT MESSAGE</div>
<div id="tW" class="tab">WITHDRAW (<span id="wCount">0</span>)</div>
</div>

<div class="card" id="boxD">
<div class="row"><div><label>NAME</label><input id="dName"></div><div><label>EMAIL</label><input id="dEmail" placeholder="client@email.com"></div></div>
<label>MESSAGE</label><textarea id="dMsg"></textarea>
<div class="attach"><label>ATTACH IMAGE (Optional)</label><input type="file" id="dImg" accept="image/*"></div>
<button class="send" id="btnD">Send Message</button><div id="sD"></div>
</div>

<div class="card" id="boxP" style="display:none">
<div class="row"><div><label>NAME</label><input id="pName"></div><div><label>EMAIL</label><input id="pEmail"></div></div>
<div class="row"><div><label>AMOUNT</label><input id="pAmount"></div><div><label>ASSET</label><select id="pAsset"><option>USDT</option><option>BTC</option><option>ETH</option><option>BANK</option></select></div></div>
<label>MESSAGE</label><textarea id="pMsg"></textarea>
<div class="attach"><label>ATTACH IMAGE (Optional)</label><input type="file" id="pImg" accept="image/*"></div>
<button class="send" id="btnP">Send Payment Message</button><div id="sP"></div>
</div>

<div class="card" id="boxW" style="display:none">
<h3>Withdraw Requests</h3><div id="wList">No requests yet</div>
</div>
</div>

<div class="right"><div class="card"><h3 style="font-size:14px">HISTORY</h3><div id="hList"></div></div></div>
</div>

<script>
var wdCache=[];
function showTab(m){
document.getElementById('tD').className=m=='direct'?'tab active':'tab';
document.getElementById('tP').className=m=='payment'?'tab active':'tab';
document.getElementById('tW').className=m=='withdraw'?'tab active':'tab';
document.getElementById('boxD').style.display=m=='direct'?'block':'none';
document.getElementById('boxP').style.display=m=='payment'?'block':'none';
document.getElementById('boxW').style.display=m=='withdraw'?'block':'none';
if(m=='withdraw') loadW();
}
document.getElementById('tD').addEventListener('click',function(){showTab('direct')});
document.getElementById('tP').addEventListener('click',function(){showTab('payment')});
document.getElementById('tW').addEventListener('click',function(){showTab('withdraw')});

async function loadH(){try{var r=await fetch('/history');var h=await r.json();var html='';for(var i=0;i<h.length;i++){html+='<div class=item><b>'+h[i].name+'</b><br>'+h[i].to+'</div>'}document.getElementById('hList').innerHTML=html||'No history'}catch(e){}}
async function loadW(){
try{
var r=await fetch('/withdraw-history');var list=await r.json();wdCache=list;
document.getElementById('wCount').innerText=list.length;
var html='';if(list.length==0)html='No requests yet';
for(var i=0;i<list.length;i++){var w=list[i];html+='<div class=item><b>'+w.clientName+'</b> - '+w.status+'<br><small>'+w.clientEmail+' | $'+w.amount+'</small><div style=background:#020617;padding:6px;margin:6px 0;border-radius:6px>'+w.wallet+'</div><button onclick="copyW('+i+')">Copy</button> ';if(w.status=='Under Review'){html+='<button onclick="approveW('+w.id+')">Approve</button><button onclick="declineW('+w.id+')">Decline</button>'}html+='<br><input type=file accept=image/* onchange="uploadProof('+w.id+',this)">'+(w.proof?'<br><img src='+w.proof+' style=max-width:100%>':'')+'</div>'}
document.getElementById('wList').innerHTML=html;
}catch(e){}
}
window.copyW=function(i){navigator.clipboard.writeText(wdCache[i].wallet);alert('Copied')};
window.approveW=async function(id){if(!confirm('Approve?'))return;await fetch('/withdraw-approve/'+id,{method:'POST'});loadW()};
window.declineW=async function(id){var rs=prompt('Reason?');await fetch('/withdraw-decline/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:rs})});loadW()};
window.uploadProof=async function(id,el){var f=el.files[0];var r=new FileReader();r.onload=async function(e){await fetch('/withdraw-proof/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({proof:e.target.result})});loadW()};r.readAsDataURL(f)};
async function getImg(id){var el=document.getElementById(id);if(!el.files[0])return null;return await new Promise(function(res){var rd=new FileReader();rd.onload=function(){res(rd.result)};rd.readAsDataURL(el.files[0])})}
document.getElementById('btnD').addEventListener('click',async function(){var n=document.getElementById('dName').value;var to=document.getElementById('dEmail').value;var m=document.getElementById('dMsg').value;if(!n||!to||!m){alert('Fill all');return}document.getElementById('sD').innerText='Sending...';var img=await getImg('dImg');var r=await fetch('/send-message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:to,name:n,message:m,image:img})});var d=await r.json();document.getElementById('sD').innerText=d.success?'Sent!':'Error';if(d.success)loadH()});
document.getElementById('btnP').addEventListener('click',async function(){var n=document.getElementById('pName').value;var to=document.getElementById('pEmail').value;var m=document.getElementById('pMsg').value;var amt=document.getElementById('pAmount').value;var asset=document.getElementById('pAsset').value;if(!n||!to){alert('Fill name email');return}document.getElementById('sP').innerText='Sending...';var img=await getImg('pImg');var r=await fetch('/send-message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:to,name:n,message:m,amount:amt,asset:asset,image:img})});var d=await r.json();document.getElementById('sP').innerText=d.success?'Sent!':'Error';if(d.success)loadH()});
loadH();loadW();
</script>
</body></html>
`);
});

app.get('/history',(req,res)=>res.json(emailHistory));
app.get('/withdraw-history',(req,res)=>res.json(withdrawHistory));
app.post('/api/client-withdraw',(req,res)=>{
let b=req.body; if(!b.amount||!b.wallet||!b.clientEmail) return res.status(400).json({error:'missing'});
withdrawHistory.unshift({id:Date.now(),clientName:b.clientName||'Client',clientEmail:b.clientEmail,amount:b.amount,wallet:b.wallet,status:'Under Review',date:new Date(),proof:null});
res.json({success:true});
});
app.get('/api/withdraw-status',(req,res)=>{
let email=req.query.email; if(!email) return res.json([]);
let filtered=withdrawHistory.filter(x=>x.clientEmail.toLowerCase()==email.toLowerCase());
res.json(filtered);
});
app.post('/withdraw-proof/:id',(req,res)=>{let id=parseInt(req.params.id);let i=withdrawHistory.findIndex(x=>x.id==id);if(i>=0)withdrawHistory[i].proof=req.body.proof;res.json({success:true})});
app.post('/withdraw-approve/:id',async(req,res)=>{
let i=withdrawHistory.findIndex(x=>x.id==parseInt(req.params.id)); if(i<0) return res.json({error:'not found'});
withdrawHistory[i].status='Sent';
try{let att=withdrawHistory[i].proof?[{filename:'proof.jpg',content:withdrawHistory[i].proof.split(',')[1],encoding:'base64'}]:undefined; await resend.emails.send({from:'BDS.Philadelphia <noreply@bdsphilladelphia.online>',to:withdrawHistory[i].clientEmail,subject:'Withdrawal Approved $'+withdrawHistory[i].amount,html:'Your $'+withdrawHistory[i].amount+' approved',attachments:att})}catch(e){}
res.json({success:true});
});
app.post('/withdraw-decline/:id',async(req,res)=>{
let i=withdrawHistory.findIndex(x=>x.id==parseInt(req.params.id)); if(i<0) return res.json({error:'not found'});
withdrawHistory[i].status='Declined';
try{await resend.emails.send({from:'BDS.Philadelphia <noreply@bdsphilladelphia.online>',to:withdrawHistory[i].clientEmail,subject:'Withdrawal Declined',html:'Declined: '+(req.body.reason||'')})}catch(e){}
res.json({success:true});
});
app.post('/send-message',async(req,res)=>{
let {to,name,message,amount,asset,image}=req.body;
try{
let attachments; if(image){attachments=[{filename:'image.jpg',content:image.split(',')[1],encoding:'base64'}]}
let html='Hello '+name+'<br><br>'+message+(amount?'<br><br>Amount: '+amount+' '+asset:'');
let result=await resend.emails.send({from:'BDS.Philadelphia <noreply@bdsphilladelphia.online>',to:to,subject: amount? 'Payment $'+amount : 'Direct Message',html:html,attachments:attachments});
emailHistory.unshift({to:to,name:name,message:message,amount:amount,asset:asset,date:new Date()});
res.json({success:true,data:result});
}catch(e){res.status(500).json({success:false,error:e.message})}
});
app.listen(process.env.PORT||10000,()=>console.log('ok'));