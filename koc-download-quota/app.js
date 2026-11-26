'use strict';
const $=id=>document.getElementById(id);
const R=window.QuotaRules;
const fmt=n=>n.toLocaleString('zh-CN');
const badge='<span class="new">新增</span>';
const accounts=[
 {id:1,name:'SYQ雅乔直播返场',handle:'周记开锁',company:'周记开锁',cid:'2510681',ip:'SYQ雅乔',pid:'ip01',mentor:'绿豆',channel:'Douboss_9572',channelId:'2405273',type:'渠道',date:'2026-11-21'},
 {id:2,name:'SYQ雅乔好物分享',handle:'周记好物',company:'周记开锁',cid:'2510681',ip:'SYQ雅乔',pid:'ip01',mentor:'绿豆',channel:'Douboss_9572',channelId:'2405273',type:'渠道',date:'2026-11-22'},
 {id:3,name:'大码胖佳佳—爆品精选',handle:'Douboss_1234',company:'Douboss_1234',cid:'2510682',ip:'大码胖佳佳',pid:'ip02',mentor:'梅子',channel:'—',channelId:'',type:'—',date:'2026-11-20'},
 {id:4,name:'老马Marius直播返场',handle:'小暖气',company:'小暖气',cid:'2510683',ip:'老马Marius',pid:'ip03',mentor:'绿豆',channel:'—',channelId:'',type:'—',date:'2026-11-19'},
 {id:5,name:'Dancy丹姐直播返场',handle:'Douboss_7834',company:'Douboss_7834',cid:'2510684',ip:'Dancy丹姐',pid:'ip04',mentor:'梅子',channel:'阿优优',channelId:'1966503',type:'渠道',date:'2026-11-18'},
 {id:6,name:'周记丹姐精选',handle:'周记开锁',company:'周记开锁',cid:'2510681',ip:'Dancy丹姐',pid:'ip04',mentor:'绿豆',channel:'Douboss_9572',channelId:'2405273',type:'渠道',date:'2026-11-23'},
 {id:7,name:'雅乔穿搭日记',handle:'小文',company:'小文',cid:'2510685',ip:'SYQ雅乔',pid:'ip01',mentor:'梅子',channel:'乔',channelId:'1910707',type:'一级推广位',date:'2026-11-24'},
 {id:8,name:'雅乔时尚精选',handle:'青禾穿搭',company:'青禾团队',cid:'2510686',ip:'SYQ雅乔',pid:'ip01',mentor:'绿豆',channel:'阿优优',channelId:'1966503',type:'渠道',date:'2026-11-23',mode:'ip',stage:'bound'},
 {id:9,name:'雅乔直播好物',handle:'青禾好物',company:'青禾团队',cid:'2510686',ip:'SYQ雅乔',pid:'ip01',mentor:'绿豆',channel:'阿优优',channelId:'1966503',type:'渠道',date:'2026-11-24',mode:'ip',stage:'bound'},
 {id:10,name:'丹姐穿搭分享',handle:'小林',company:'小林',cid:'2510687',ip:'Dancy丹姐',pid:'ip04',mentor:'梅子',channel:'—',channelId:'',type:'—',date:'2026-11-24',mode:'self',stage:'bound'},
 {id:11,name:'胖佳佳好物日记',handle:'小米',company:'小米',cid:'2510688',ip:'大码胖佳佳',pid:'ip02',mentor:'绿豆',channel:'—',channelId:'',type:'—',date:'2026-11-24',mode:'self',stage:'clearing'},
 {id:12,name:'老马精选日记',handle:'小树',company:'小树',cid:'2510689',ip:'老马Marius',pid:'ip03',mentor:'梅子',channel:'—',channelId:'',type:'—',date:'2026-11-24',mode:'ip',stage:'approved'}
].map(a=>({mode:'self',stage:'cooperated',...a}));
const key=a=>a.cid+':'+a.pid;
let groups,selected=null,filters={},busy=false,toastTimer,today=R.initialDate,mode='self',stage=R.completeStage('self');
const month=()=>today.slice(0,7);
function initialize(){today=R.initialDate;mode='self';stage=R.completeStage(mode);groups={};accounts.forEach(a=>{const k=key(a);if(!groups[k])groups[k]={n:0,initialDayUsed:180,initialMonthUsed:2400,records:[]};if(a.stage==='cooperated'||a.stage==='bound')groups[k].n++;});groups[key(accounts[0])].initialDayUsed=480;groups[key(accounts[0])].initialMonthUsed=5400;groups[key(accounts[2])].initialMonthUsed=3000;groups[key(accounts[3])].initialDayUsed=300;groups[key(accounts[4])].initialDayUsed=300;groups[key(accounts[4])].initialMonthUsed=3000;filters={};render();}
function usage(g){return{day:today===R.initialDate?g.initialDayUsed:0,month:month()===R.initialDate.slice(0,7)?g.initialMonthUsed:0};}
function addition(g,period){return g.records.filter(r=>r.period===period&&(period==='day'?r.date===today:r.date.slice(0,7)===month())).reduce((sum,r)=>sum+r.amount,0);}
function monthlyAdded(g){return g.records.filter(r=>r.date.slice(0,7)===month()).reduce((sum,r)=>sum+r.amount,0);}
function totals(g){const used=usage(g);return{day:g.n*300+addition(g,'day')-used.day,month:g.n*3000+addition(g,'month')-used.month};}
function person(name,sub,tint='#e8edf8'){return `<div class="person"><span class="avatar" style="--tint:${tint}">${name.slice(0,1)}</span><div><strong title="${name}">${name}</strong><small>${sub}</small></div></div>`;}
function renderTabs(){const list=accounts.filter(a=>a.mode===mode);$('tabs').innerHTML=R.stages[mode].map(([id,label])=>`<button type="button" data-stage="${id}" class="${stage===id?'active':''}">${label}（${list.filter(a=>a.stage===id).length}）</button>`).join('');document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('current',b.dataset.mode===mode));$('date-label').textContent=mode==='ip'?'绑定时间':'合作时间';$('demo-date').textContent=today;}
function render(){closeQuotaHelp();renderTabs();const complete=stage===R.completeStage(mode);$('open-all-records').hidden=!complete;document.querySelector('.business th:nth-child(7)').hidden=!complete;const visible=accounts.filter(a=>a.mode===mode&&a.stage===stage&&(!filters.koc||[a.name,a.handle].some(v=>v.toLowerCase().includes(filters.koc)))&&(!filters.ip||a.ip===filters.ip)&&(!filters.mentor||a.mentor===filters.mentor)&&(!filters.start||a.date>=filters.start)&&(!filters.end||a.date<=filters.end));$('rows').innerHTML=visible.map(a=>{const t=totals(groups[key(a)]);const used=usage(groups[key(a)]),dayTotal=used.day+t.day,monthTotal=used.month+t.month;return `<tr data-row="${a.id}"><td>${person(a.name,a.handle)}</td><td>${person(a.ip,'暂无','#f3e8df')}</td><td>${person(a.mentor,'','#e6f0ea')}</td><td>${a.channel==='—'?'—':person(a.channel,'机构ID '+a.channelId,'#f0e8f5')}</td><td>${a.type}</td><td>70%</td><td ${complete?'':'hidden'}><div class="quota-lines"><div class="${used.day>=dayTotal?'zero':''}">今日：<span data-value="day-used">${fmt(used.day)}</span>／<span data-value="day-total">${fmt(dayTotal)}</span>分钟</div><div class="${used.month>=monthTotal?'zero':''}">本月：<span data-value="month-used">${fmt(used.month)}</span>／<span data-value="month-total">${fmt(monthTotal)}</span>分钟</div></div></td><td>${a.date} 至 长期</td><td class="sticky"><div class="row-actions"><span class="subtle">${complete?'清退达人':'—'}</span>${complete?`<button class="link" data-add="${a.id}">新增额度 ${badge}</button>`:''}</div></td></tr>`;}).join('')||`<tr><td class="empty" colspan="${complete?9:8}">暂无符合条件的记录</td></tr>`;$('count').textContent=visible.length;$('count-bottom').textContent=visible.length;}
function identity(a){return `<div class="identity"><div><small>所属机构</small><strong>${a.company}</strong><div class="minor">机构ID ${a.cid}</div></div><div><small>合作IP</small><strong>${a.ip}</strong></div></div>`;}
function summary(g){const t=totals(g),used=usage(g);return `<div class="subtle" style="text-align:right;margin-bottom:7px">单位：分钟</div><table class="summary"><thead><tr><th>周期</th><th>基础额度</th><th>已追加</th><th>总额度</th><th>已用</th><th>剩余</th></tr></thead><tbody>${[['今日',g.n*300,addition(g,'day'),used.day,t.day],['本月',g.n*3000,addition(g,'month'),used.month,t.month]].map(([label,base,add,count,left])=>`<tr><td>${label}</td><td>${fmt(base)}</td><td>${fmt(add)}</td><td>${fmt(base+add)}</td><td>${fmt(count)}</td><td>${fmt(left)}</td></tr>`).join('')}</tbody></table><p class="limit-note">本月累计追加：${fmt(monthlyAdded(g))}／${fmt(R.monthlyMax)}分钟（含今日与当月追加）</p>`;}
function lastDay(date){const [y,m]=date.split('-').map(Number);return new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);}
function records(g){if(!g.records.length)return '<p class="empty">暂无追加记录</p>';return `<table class="records"><thead><tr><th>操作时间／操作人</th><th>追加周期</th><th>新增分钟数</th><th>有效期</th></tr></thead><tbody>${g.records.map(r=>`<tr><td>${r.at}<br>${r.operator}</td><td>${R.periodLabel(r.period)}</td><td>${fmt(r.amount)}分钟</td><td>${r.period==='day'?r.date+'当日有效':r.date+'至'+lastDay(r.date)}</td></tr>`).join('')}</tbody></table>`;}
function chosenPeriod(){return document.querySelector('input[name="period"]:checked').value;}
function singleMax(period){return period==='day'?R.dayMax:R.monthMax;}
function preview(){if(!selected)return;const g=groups[key(selected)],period=chosenPeriod(),left=totals(g)[period],label=R.periodLabel(period),raw=$('amount-add').value,n=Number(raw);$('amount-add').max=singleMax(period);$('amount-preview').textContent=raw&&Number.isSafeInteger(n)&&n>0?`${label}追加后剩余：${fmt(left+n)}分钟`:`${label}当前剩余：${fmt(left)}分钟`;$('amount-hint').textContent=`单次最多${fmt(singleMax(period))}分钟；本月还可追加${fmt(R.monthlyMax-monthlyAdded(g))}分钟。`;}
function openAdd(id){closeQuotaHelp();const a=accounts.find(a=>a.id===id);if(!a||a.mode!==mode||a.stage!==R.completeStage(mode)||stage!==R.completeStage(mode))return;selected=a;$('quota-form').reset();document.querySelector(`input[name="period"][value="${R.defaultPeriod}"]`).checked=true;$('identity').innerHTML=identity(selected);$('quota-summary').innerHTML=summary(groups[key(selected)]);$('error').textContent='';$('inline-records').hidden=true;$('inline-records').innerHTML='';$('expand-records').innerHTML='查看追加记录 '+badge;preview();$('quota-dialog').showModal();}
function toast(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',3200);}
$('rows').addEventListener('click',e=>{const add=e.target.closest('[data-add]');if(add)openAdd(Number(add.dataset.add));});
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;stage=R.completeStage(mode);render();}));
$('tabs').addEventListener('click',e=>{const b=e.target.closest('[data-stage]');if(b){stage=b.dataset.stage;render();}});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{if(!busy)b.closest('dialog').close();}));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('cancel',e=>{if(busy)e.preventDefault();}));
$('amount-add').addEventListener('input',()=>{$('error').textContent='';preview();});
document.querySelectorAll('input[name="period"]').forEach(input=>input.addEventListener('change',()=>{$('error').textContent='';preview();}));
$('expand-records').addEventListener('click',()=>{const panel=$('inline-records');panel.hidden=!panel.hidden;panel.innerHTML=records(groups[key(selected)]);$('expand-records').innerHTML=(panel.hidden?'查看':'收起')+'追加记录 '+badge;});
$('quota-form').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const period=chosenPeriod(),raw=$('amount-add').value.trim(),amount=Number(raw);if(raw===''){$('error').textContent='请输入新增分钟数。';return;}if(!/^\d+$/.test(raw)||!Number.isSafeInteger(amount)||amount<=0){$('error').textContent='新增分钟数须为大于0的整数。';$('amount-add').focus();return;}if(amount>singleMax(period)){$('error').textContent=`${R.periodLabel(period)}单次新增不能超过${fmt(singleMax(period))}分钟。`;return;}const g=groups[key(selected)];if(monthlyAdded(g)+amount>R.monthlyMax){$('error').textContent=`本月累计追加不能超过${fmt(R.monthlyMax)}分钟，本月还可追加${fmt(R.monthlyMax-monthlyAdded(g))}分钟。`;return;}
 busy=true;$('save').disabled=true;$('save').textContent='正在保存…';$('amount-add').disabled=true;document.querySelectorAll('input[name="period"]').forEach(input=>input.disabled=true);await new Promise(resolve=>setTimeout(resolve,400));try{if($('fail').checked){$('error').textContent='保存失败，请重试。额度未变更。';return;}const now=new Date();g.records.unshift({period,amount,date:today,operator:'空青',company:selected.company,cid:selected.cid,ip:selected.ip,sequence:allRecords().length+1,at:today+' '+now.toLocaleTimeString('zh-CN',{hour12:false,timeZone:'Asia/Shanghai'})});render();$('quota-dialog').close();toast('额度已新增，同一机构、同一IP下的KOC已同步更新。');}finally{busy=false;$('save').disabled=false;$('save').innerHTML='确认新增 '+badge;$('amount-add').disabled=false;document.querySelectorAll('input[name="period"]').forEach(input=>input.disabled=false);}});
function allRecords(){return Object.values(groups).flatMap(g=>g.records).sort((a,b)=>b.at.localeCompare(a.at)||b.sequence-a.sequence);}
function renderAllRecords(){const company=$('records-company').value.trim().toLowerCase(),ip=$('records-ip').value;const list=allRecords().filter(r=>(!company||[r.company,r.cid].some(v=>v.toLowerCase().includes(company)))&&(!ip||r.ip===ip));$('all-records-count').textContent=list.length;$('all-records-body').innerHTML=list.map(r=>`<tr><td>${r.at}</td><td>${r.company}<small>机构ID ${r.cid}</small></td><td>${r.ip}</td><td>${R.periodLabel(r.period)}</td><td>${fmt(r.amount)}分钟</td><td>${r.operator}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">暂无追加记录</td></tr>';}
$('open-all-records').addEventListener('click',()=>{closeQuotaHelp();$('records-filters').reset();$('records-ip').replaceChildren(new Option('全部IP',''),...[...new Set(allRecords().map(r=>r.ip))].map(ip=>new Option(ip,ip)));renderAllRecords();$('all-records-dialog').showModal();});
$('records-filters').addEventListener('submit',e=>{e.preventDefault();renderAllRecords();});
$('records-clear').addEventListener('click',()=>{$('records-filters').reset();renderAllRecords();});
$('filters').addEventListener('submit',e=>{e.preventDefault();const start=$('start').value,end=$('end').value;if(start&&end&&start>end){$('filter-error').textContent='开始日期不能晚于结束日期';return;}$('filter-error').textContent='';filters={start,end,koc:$('koc').value.trim().toLowerCase(),ip:$('ip').value,mentor:$('mentor').value};render();});
$('clear').addEventListener('click',()=>{$('filters').reset();$('filter-error').textContent='';filters={};render();});
$('reset-demo').addEventListener('click',()=>{$('filters').reset();$('filter-error').textContent='';$('fail').checked=false;initialize();toast('模拟数据已重置。');});
function advanceDate(next){if(busy)return;today=next;render();toast('演示日期已切换至'+today+'，已按周期重新计算额度。');}
$('next-day').addEventListener('click',()=>{const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1);advanceDate(d.toISOString().slice(0,10));});
$('next-month').addEventListener('click',()=>{const [y,m]=today.split('-').map(Number);advanceDate(new Date(Date.UTC(y,m,1)).toISOString().slice(0,10));});
$('show-prd').addEventListener('click',()=>{closeQuotaHelp();$('prd').innerHTML=window.QuotaRequirements.html();$('prd-dialog').showModal();});
const helpButton=$('quota-help'),helpContent=$('quota-help-content');
let helpPinned=false,helpHideTimer;
helpContent.textContent=R.quotaHelp.join('\n');
function closeQuotaHelp(){clearTimeout(helpHideTimer);helpPinned=false;$('quota-help-content').hidden=true;$('quota-help').setAttribute('aria-expanded','false');}
function showQuotaHelp(){clearTimeout(helpHideTimer);helpContent.hidden=false;helpButton.setAttribute('aria-expanded','true');const rect=helpButton.getBoundingClientRect(),box=helpContent.getBoundingClientRect();const left=Math.max(12,Math.min(rect.left,window.innerWidth-box.width-12));const below=rect.bottom+9;const top=below+box.height<=window.innerHeight-12?below:Math.max(12,rect.top-box.height-9);helpContent.style.left=left+'px';helpContent.style.top=top+'px';}
function scheduleHelpClose(){clearTimeout(helpHideTimer);helpHideTimer=setTimeout(()=>{if(!helpPinned&&document.activeElement!==helpButton&&!helpButton.matches(':hover')&&!helpContent.matches(':hover'))closeQuotaHelp();},140);}
helpButton.addEventListener('mouseenter',showQuotaHelp);
helpButton.addEventListener('mouseleave',scheduleHelpClose);
helpButton.addEventListener('focus',showQuotaHelp);
helpButton.addEventListener('blur',scheduleHelpClose);
helpButton.addEventListener('click',()=>{if(helpPinned){closeQuotaHelp();}else{helpPinned=true;showQuotaHelp();}});
helpContent.addEventListener('mouseenter',()=>clearTimeout(helpHideTimer));
helpContent.addEventListener('mouseleave',scheduleHelpClose);
document.addEventListener('pointerdown',e=>{if(!helpButton.contains(e.target)&&!helpContent.contains(e.target))closeQuotaHelp();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeQuotaHelp();});
document.addEventListener('scroll',closeQuotaHelp,true);
window.addEventListener('resize',closeQuotaHelp);
initialize();
