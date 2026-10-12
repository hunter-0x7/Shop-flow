(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = "mandiflow.v1";
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const now = () => new Date().toISOString();
  const money = n => "₹" + (Number(n)||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
  const num = v => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  let weights = [""];
  let state = loadState();
  function blankState(){ return {version:1,bills:[],handovers:[],counts:[],nextBill:1}; }
  function loadState(){
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if(s && s.version===1 && Array.isArray(s.bills) && Array.isArray(s.handovers) && Array.isArray(s.counts)) return s;
    } catch(e) {}
    return blankState();
  }
  function persist(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
    catch(e) { toast("Storage full or unavailable. Export a backup and free space."); return false; }
  }
  function toast(message){
    const t=$("toast"); t.textContent=message; t.style.display="block";
    clearTimeout(toast.timer); toast.timer=setTimeout(()=>t.style.display="none",2500);
  }
  function todayBills(){ return state.bills.filter(b=>b.date===today()); }
  function todayHandovers(){ return state.handovers.filter(h=>h.date===today()); }
  function todayCounts(){ return state.counts.filter(c=>c.date===today()); }
  function calc(){
    const rate = num($("rate").value);
    const valid = weights.map((raw,index)=>({raw,index,weight:num(raw)})).filter(x=>x.raw.trim()!=="" && x.weight>0);
    const totalWeight=valid.reduce((s,x)=>s+x.weight,0);
    const base=totalWeight*rate;
    const atat=base*.07;
    const fees=valid.length*10;
    return {rate,valid,totalWeight,base,atat,fees,total:base+atat+fees};
  }
  function renderWeights(){
    const host=$("weights"); host.innerHTML="";
    weights.forEach((value,i)=>{
      const row=document.createElement("div"); row.className="weight-row";
      const number=document.createElement("div"); number.className="number"; number.textContent=String(i+1).padStart(2,"0");
      const input=document.createElement("input"); input.type="number"; input.inputMode="decimal"; input.min="0"; input.step="any"; input.placeholder="Weight in kg"; input.setAttribute("aria-label",`Weight ${i+1} in kg`); input.value=value;
      input.addEventListener("input",()=>{weights[i]=input.value;renderCalc();});
      const remove=document.createElement("button"); remove.className="remove"; remove.type="button"; remove.textContent="×"; remove.title="Remove weight"; remove.setAttribute("aria-label",`Remove weight ${i+1}`);
      remove.addEventListener("click",()=>{weights.splice(i,1);if(!weights.length)weights.push("");renderWeights();renderCalc();});
      row.append(number,input,remove); host.append(row);
    });
  }
  function renderCalc(){
    const c=calc();
    $("heroTotal").textContent=money(c.total);
    $("heroWeight").textContent=`${c.totalWeight.toLocaleString("en-IN",{maximumFractionDigits:3})} kg`;
    $("heroUnits").textContent=c.valid.length;
    $("heroRate").textContent=money(c.rate).replace(".00","");
    $("baseAmount").textContent=money(c.base);
    $("atatAmount").textContent=money(c.atat);
    $("unitCount").textContent=c.valid.length;
    $("unitFees").textContent=money(c.fees);
    $("finalTotal").textContent=money(c.total);
  }
  function switchTab(tab){
    ["bill","cash","records"].forEach(t=>{
      $(`${t}Tab`).classList.toggle("hidden",t!==tab);
      document.querySelector(`[data-tab="${t}"]`).classList.toggle("active",t===tab);
    });
    if(tab==="cash")renderCash();
    if(tab==="records")renderRecords();
  }
  function saveBill(forceUnpaid=false){
    const c=calc();
    if(!Number.isFinite(c.rate) || $("rate").value.trim()==="" || c.rate<=0){toast("Enter a valid price per kg first.");$("rate").focus();return;}
    if(!c.valid.length){toast("Add at least one weight greater than zero.");return;}
    const rawReceived=forceUnpaid ? 0 : $("received").value.trim()==="" ? 0 : num($("received").value);
    const received=Math.min(rawReceived,c.total);
    if(rawReceived>c.total){toast("Cash received cannot exceed this bill. Check the amount.");return;}
    const bill={id:uid(),number:state.nextBill++,date:today(),createdAt:now(),rate:c.rate,weights:c.valid.map(x=>x.weight),totalWeight:c.totalWeight,units:c.valid.length,base:c.base,atat:c.atat,unitFees:c.fees,total:c.total,received,due:Math.max(0,c.total-received),status:received>=c.total-0.005?"PAID":received>0?"PARTIAL":"UNPAID"};
    state.bills.push(bill);
    if(!persist()){state.bills.pop();state.nextBill--;return;}
    $("received").value="";
    weights=[""];renderWeights();renderCalc();renderCash();renderRecords();
    toast(`Bill #${bill.number} saved · ${bill.status}`);
    $("rate").focus();
  }
  function handover(){
    const amount=num($("handoverAmount").value);
    if($("handoverAmount").value.trim()==="" || amount<=0){toast("Enter a handover amount greater than zero.");return;}
    const h={id:uid(),date:today(),createdAt:now(),amount,note:$("handoverNote").value.trim()};
    state.handovers.push(h);
    if(!persist()){state.handovers.pop();return;}
    $("handoverAmount").value="";$("handoverNote").value="";
    renderCash();renderRecords();toast("Cash handover recorded.");
  }
  function totals(){
    const bills=todayBills(), handovers=todayHandovers();
    return {
      billed:bills.reduce((s,b)=>s+b.total,0),
      received:bills.reduce((s,b)=>s+b.received,0),
      due:bills.reduce((s,b)=>s+b.due,0),
      handed:handovers.reduce((s,h)=>s+h.amount,0),
      count:bills.length
    };
  }
  function renderCash(){
    const t=totals(), expected=t.received-t.handed;
    $("cashCollected").textContent=money(t.received);
    $("cashHanded").textContent=money(t.handed);
    $("cashExpected").textContent=money(expected);
    $("cashOutstanding").textContent=money(t.due);
    const count=todayCounts().slice(-1)[0];
    const actual=$("actualCash").value.trim()!==""?num($("actualCash").value):(count?String(count.actual):"");
    $("cashDifference").textContent=actual===""?"—":money(num(actual)-expected);
    $("cashDifference").style.color=actual===""?"var(--text)":Math.abs(num(actual)-expected)<0.005?"var(--accent)":"var(--red)";
    $("cashCountSaved").textContent=count?`Last saved count: ${money(count.actual)} · ${new Date(count.createdAt).toLocaleTimeString()}`:"No closing count saved today.";
    const list=$("handoverList");list.innerHTML="";
    const hs=todayHandovers().slice().reverse();
    if(!hs.length){list.innerHTML='<div class="empty">No handovers recorded today.</div>';return;}
    hs.forEach(h=>{
      const el=document.createElement("div");el.className="record";
      const top=document.createElement("div");top.className="record-top";
      const left=document.createElement("div");left.innerHTML=`<div class="record-title">Owner handover</div><div class="record-meta">${new Date(h.createdAt).toLocaleTimeString()}${h.note?" · "+escapeHtml(h.note):""}</div>`;
      const amount=document.createElement("div");amount.className="record-amount";amount.textContent=money(h.amount);
      top.append(left,amount);el.append(top);list.append(el);
    });
  }
  function renderRecords(){
    const t=totals();
    $("todayLabel").textContent=today();
    $("sumBilled").textContent=money(t.billed);$("sumReceived").textContent=money(t.received);$("sumDue").textContent=money(t.due);$("sumCount").textContent=t.count;
    const list=$("billList");list.innerHTML="";
    const bills=todayBills().slice().reverse();
    if(!bills.length){list.innerHTML='<div class="empty">No bills saved today.</div>';return;}
    bills.forEach(b=>{
      const el=document.createElement("div");el.className="record";
      const top=document.createElement("div");top.className="record-top";
      const left=document.createElement("div");
      const title=document.createElement("div");title.className="record-title";title.textContent=`Bill #${b.number}`;
      const meta=document.createElement("div");meta.className="record-meta";meta.textContent=`${new Date(b.createdAt).toLocaleTimeString()} · ${b.totalWeight} kg · ${b.units} units · ₹${b.rate}/kg`;
      const pay=document.createElement("div");pay.className="record-meta";pay.textContent=`Received ${money(b.received)} · Due ${money(b.due)}`;
      left.append(title,meta,pay);
      const right=document.createElement("div");right.style.textAlign="right";
      const amount=document.createElement("div");amount.className="record-amount";amount.textContent=money(b.total);
      const pill=document.createElement("span");pill.className="pill "+(b.status==="PAID"?"green":b.status==="PARTIAL"?"amber":"red");pill.textContent=b.status;
      right.append(amount,pill);top.append(left,right);el.append(top);
      if(b.due>0.005){
        const receivedWrap=document.createElement("div");receivedWrap.style.display="grid";receivedWrap.style.gridTemplateColumns="1fr auto";receivedWrap.style.gap="8px";receivedWrap.style.marginTop="12px";
        const input=document.createElement("input");input.type="number";input.inputMode="decimal";input.min="0";input.step="any";input.placeholder="Add payment received (₹)";input.style.fontSize="14px";input.style.padding="10px";
        const btn=document.createElement("button");btn.className="small-btn";btn.textContent="Record payment";
        btn.addEventListener("click",()=>{
          const amt=num(input.value);
          if(!input.value.trim()||amt<=0){toast("Enter payment amount.");return;}
          if(amt>b.due+0.005){toast("Payment is greater than the outstanding balance.");return;}
          const idx=state.bills.findIndex(x=>x.id===b.id);if(idx<0)return;
          const old={...state.bills[idx]};state.bills[idx].received+=amt;state.bills[idx].due=Math.max(0,state.bills[idx].total-state.bills[idx].received);state.bills[idx].status=state.bills[idx].due<0.005?"PAID":"PARTIAL";
          if(!persist()){state.bills[idx]=old;return;}
          renderRecords();renderCash();toast("Payment recorded.");
        });
        receivedWrap.append(input,btn);el.append(receivedWrap);
      }
      list.append(el);
    });
  }
  function saveCashCount(){
    if($("actualCash").value.trim()===""){toast("Enter the cash physically counted.");return;}
    const c={id:uid(),date:today(),createdAt:now(),actual:num($("actualCash").value)};
    state.counts.push(c);
    if(!persist()){state.counts.pop();return;}
    renderCash();toast("Closing cash count saved.");
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function download(name,content,type){
    const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportJson(){download(`mandiflow-backup-${today()}.json`,JSON.stringify(state,null,2),"application/json");toast("Backup exported.");}
  function exportCsv(){
    const rows=[["Bill","Date","Time","Price/kg","Weights kg","Total weight kg","Units","Base","Atat 7%","Unit fees","Bill total","Cash received","Due","Status"]];
    state.bills.forEach(b=>rows.push([b.number,b.date,b.createdAt,b.rate,b.weights.join(" + "),b.totalWeight,b.units,b.base.toFixed(2),b.atat.toFixed(2),b.unitFees.toFixed(2),b.total.toFixed(2),b.received.toFixed(2),b.due.toFixed(2),b.status]));
    rows.push([]);rows.push(["HANDOVERS"]);rows.push(["Date","Time","Amount","Note"]);
    state.handovers.forEach(h=>rows.push([h.date,h.createdAt,h.amount,h.note]));
    const csv=rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
    download(`mandiflow-records-${today()}.csv`,"\ufeff"+csv,"text/csv;charset=utf-8");toast("CSV exported.");
  }
  function importJson(file){
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const incoming=JSON.parse(reader.result);
        if(incoming.version!==1||!Array.isArray(incoming.bills)||!Array.isArray(incoming.handovers)||!Array.isArray(incoming.counts))throw new Error("Invalid backup");
        if(!confirm(`Import ${incoming.bills.length} bills and ${incoming.handovers.length} handovers? This replaces records currently on this device.`))return;
        state=incoming;if(!state.nextBill)state.nextBill=state.bills.length+1;
        persist();renderCash();renderRecords();toast("Backup imported.");
      }catch(e){toast("Could not import: invalid backup file.");}
      $("importFile").value="";
    };reader.readAsText(file);
  }
  function resetToday(){
    if(!confirm("Delete today's bills, handovers and cash counts from this device? Export a backup first. This cannot be undone."))return;
    const d=today();state.bills=state.bills.filter(b=>b.date!==d);state.handovers=state.handovers.filter(h=>h.date!==d);state.counts=state.counts.filter(c=>c.date!==d);
    persist();renderCash();renderRecords();toast("Today's records reset.");
  }
  $("rate").addEventListener("input",renderCalc);
  $("addWeight").addEventListener("click",()=>{weights.push("");renderWeights();renderCalc();const inputs=$("weights").querySelectorAll("input");inputs[inputs.length-1].focus();});
  $("saveBill").addEventListener("click",()=>saveBill(false));
  $("saveUnpaid").addEventListener("click",()=>saveBill(true));
  $("saveHandover").addEventListener("click",handover);
  $("actualCash").addEventListener("input",renderCash);
  $("saveCashCount").addEventListener("click",saveCashCount);
  $("exportJson").addEventListener("click",exportJson);
  $("exportCsv").addEventListener("click",exportCsv);
  $("importFile").addEventListener("change",e=>{if(e.target.files&&e.target.files[0])importJson(e.target.files[0]);});
  $("resetDay").addEventListener("click",resetToday);
  document.querySelectorAll("[data-tab]").forEach(btn=>btn.addEventListener("click",()=>switchTab(btn.dataset.tab)));
  $("connection").textContent=navigator.onLine?"● READY":"● OFFLINE";
  window.addEventListener("online",()=>$("connection").textContent="● READY");
  window.addEventListener("offline",()=>$("connection").textContent="● OFFLINE");
  if("serviceWorker" in navigator && location.protocol!=="file:"){
    window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  }
  $("todayLabel").textContent=today();
  renderWeights();renderCalc();renderCash();renderRecords();
})();