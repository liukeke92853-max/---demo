'use strict';
// 本演示不连接后端。业务金额以整数分保存；月度GMV以分比较边界。
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => (n / 100).toLocaleString('zh-CN', {minimumFractionDigits:2,maximumFractionDigits:2});
const monthText = m => m.replace('-', '.');
const monthChinese = m => {const [year,month]=m.split('-');return `${year}年${Number(month)}月`;};
const nextMonth = m => { const [y,n] = m.split('-').map(Number); return `${n===12?y+1:y}-${String(n===12?1:n+1).padStart(2,'0')}`; };
const tag = (t,c='') => `<span class="tag ${c}">${esc(t)}</span>`;
const mark = (t='改造') => `<span class="change ${t==='新增'?'add':''}">${t}</span>`;
// 当前评审统一按10月演示；此日期不代表正式上线日期。
const demoStart = '2026-10';
const monthDays=month=>{const [year,n]=month.split('-').map(Number);return new Date(Date.UTC(year,n,0)).getUTCDate();};
// 北京时间提交满168小时截止；人工审批与超时处理共用生效逻辑。
const shiftTime=(time,days)=>new Date(Date.parse(time.replace(' ','T')+'+08:00')+days*86400000+8*3600000).toISOString().slice(0,19).replace('T',' ');
const approvalDeadline=a=>a.deadline??shiftTime(a.created,7);
const approvalEffectiveMonth=(a,time)=>a.kind==='preset'?a.targetMonth:time.slice(0,7);
let currentModal = '', modalContext = null, lastFocus = null, toastTimer;
function buildSeed(){
  const ruleVersions=[{version:1,effectiveMonth:demoStart,operator:'初始演示配置',savedAt:'2026-10-01 00:00:00',tiers:[
    {min:0,max:100000000,rate:50},
    {min:100000000,max:200000000,rate:70},
    {min:200000000,max:300000000,rate:80},
    {min:300000000,max:null,rate:100}
  ]}];
  const profiles = [
    {id:1536835,name:'sena',color:'#d5c6a8',rate:30,gmv:100000000,plan:{mode:'fixed',start:'2026-10',end:'2026-12'}},
    {id:2746650,name:'抖音运营',color:'#b3bfcf',rate:50,gmv:200000000},
    {id:2208085,name:'Douboss_8752',color:'#d0c3e1',rate:20,gmv:300000000},
    {id:2158208,name:'青禾工作室',color:'#bbd5c7',rate:70,gmv:170000000},
    {id:223324,name:'王泽',color:'#b8cbe7',rate:100,gmv:350000000},
    {id:2831509,name:'木棉传媒',color:'#efd0ba',rate:null,gmv:0},
    {id:2680091,name:'暖阳推广',color:'#c6d6e4',rate:30,gmv:0,active:false},
    {id:2680092,name:'远川传媒',color:'#d6cde6',rate:40,gmv:170000000,active:true},
    {id:2680093,name:'初见传媒',color:'#cce0d9',rate:25,gmv:0,plan:{mode:'fixed',start:'2026-09',end:'2026-11'}},
    {id:2680094,name:'山海合作社',color:'#efddbb',rate:80,gmv:170000000,plan:{mode:'fixed',start:'2026-07',end:'2026-09'}},
    {id:2680095,name:'微光传媒',color:'#ead2d9',rate:80,gmv:170000000,plan:{mode:'downOnly',start:'2026-09',end:'2026-11'}},
    {id:2680096,name:'长青伙伴',color:'#c8dfd1',rate:80,gmv:170000000,plan:{mode:'upOnly',start:'2026-09',end:null}},
    {id:2680097,name:'星澜传媒',color:'#b9d9e9',rate:45,gmv:60000000}
  ];
  const channels=profiles.map((p,i)=>({...p,origin:p.id===2831509?'new':'existing',active:p.id!==2831509&&p.active!==false,requiresReconfiguration:p.active===false,resumptionPending:false,phone:`1380000${String(i+1).padStart(4,'0')}`,ips:i%2?['纪广','王乐康']:['纪广','胡允'],protect:7,inviteProtect:7,initialProtection:p.plan??noProtection(),created:`2026-08-${String(6+i).padStart(2,'0')} 15:30:00`,updated:'2026-10-01 00:00:00',status:p.rate===null?(p.id===2831509?'pending':'unconfigured'):'effective',history:p.rate===null?[]:[
    {month:'2026-08',rate:i%2?30:50,source:'历史比例记录'},
    {month:'2026-09',rate:p.rate,source:'历史比例记录'},
    {month:demoStart,rate:p.rate,protection:p.plan??noProtection(),source:'业务提供初始配置（模拟）'}
  ]}));
  const bills=[];
  const bill=(id,enter,parts)=>bills.push({id:`${id}-${enter}`,channelId:id,enter,parts:parts.map(([pay,base,count])=>({pay,base,count})),created:`${nextMonth(enter)}-01 00:00:42`});
  bill(1536835,'2026-08',[['2026-08',5000,7]]);
  bill(1536835,'2026-09',[['2026-08',12115,16],['2026-09',14000,28]]);
  bill(2746650,'2026-09',[['2026-08',1200,2],['2026-09',2566,3]]);
  bill(2208085,'2026-09',[['2026-09',583,1]]);
  bill(2158208,'2026-09',[['2026-08',100000,21],['2026-09',240000,46]]);
  bill(223324,'2026-09',[['2026-09',180000,30]]);
  bill(2680091,'2026-09',[['2026-08',25000,8]]);
  const data={view:'channels',tab:'channel',month:demoStart,demoDate:demoStart+'-29',demoClock:'10:00:00',role:'operator',channels,bills,ruleVersions,recalculations:[],presets:[],presetSequence:0,notifications:[],approvalSequence:1,approvals:[{id:'AP-001',kind:'create',beforeRate:null,channelSnapshot:structuredClone(channels.find(c=>c.id===2831509)),channelId:2831509,rate:80,protection:noProtection(),reason:'长期合作渠道，承担独立团队的招募与运营成本，申请80%提成。',month:demoStart,status:'pending',applicant:'木豆',applicantId:'demo-mudou',created:'2026-10-28 10:00:00'}],filters:{settlement:{q:'',month:'2026-09',dateStart:'',dateEnd:''},channels:{q:'',status:'',dateStart:'',dateEnd:''}},page:1,pageSize:20};
  seedChangeHistory(data);
  data.channels.forEach(c=>{c.cooperationSequence=1;c.currentCycleId=c.id+'-C1';c.cycles=[{id:c.currentCycleId,sequence:1,start:c.created,end:c.active?null:demoStart+'-01 00:00:00'}];c.history.forEach(h=>h.cycleId=c.currentCycleId);});
  data.presets.forEach(p=>p.cycleId=data.channels.find(c=>c.id===p.channelId).currentCycleId);
  data.approvals.filter(a=>a.kind==='preset').forEach(a=>a.cycleId=data.channels.find(c=>c.id===a.channelId).currentCycleId);
  data.changeLogs.forEach(l=>l.cycleId=data.channels.find(c=>c.id===l.channelId)?.currentCycleId);
  data.bills.forEach(b=>b.parts.forEach(p=>p.cycleId=data.channels.find(c=>c.id===b.channelId).currentCycleId));
  data.approvals.forEach(a=>a.deadline=approvalDeadline(a));seedApprovalMessages(data);return data;
}
let state = buildSeed();
const channelById = id => state.channels.find(c=>c.id===Number(id));
const cooperationLocked=c=>c.resumptionPending===true||(c.origin==='new'&&c.status!=='effective'&&c.history.length===0);
const cooperationFilter=c=>c.active?'true':cooperationLocked(c)?'unstarted':'false';
function rateAt(c,month,cycleId=c?.currentCycleId){
  if(!c)return null;
  const exact=c.history.find(h=>h.month===month&&h.cycleId===cycleId);
  if(exact) return exact;
  if(month<demoStart||month>state.month) return null;
  const earlier=c.history.filter(h=>h.cycleId===cycleId&&h.month>=demoStart&&h.month<=month).sort((a,b)=>b.month.localeCompare(a.month));
  return earlier[0]||null;
}
function ruleVersionFor(month=state.month){
  return state.ruleVersions.filter(v=>v.effectiveMonth<=month).sort((a,b)=>b.effectiveMonth.localeCompare(a.effectiveMonth)||b.version-a.version)[0];
}
function tierForGmv(gmv,month=state.month){const tiers=ruleVersionFor(month).tiers;return tiers.find((t,i)=>(i===0?gmv>=t.min:gmv>t.min)&&(t.max===null||gmv<=t.max));}
function tierRate(gmv,month=state.month){return tierForGmv(gmv,month)?.rate??null;}
function calcPart(c,p){const h=p.cycleId?rateAt(c,p.pay,p.cycleId):null;return {...p,rate:h?.rate??null,source:h?.source??'未取得适用比例',level:h?.level,commission:h?Math.floor(p.base*Math.round(h.rate*100)/10000):null};}
function billData(b){const c=channelById(b.channelId),parts=b.parts.map(p=>calcPart(c,p));return {...b,c,parts,count:parts.reduce((s,p)=>s+p.count,0),base:parts.reduce((s,p)=>s+p.base,0),commission:parts.some(p=>p.commission===null)?null:parts.reduce((s,p)=>s+p.commission,0)};}
function company(c){return `<div class="company"><span class="avatar" style="background:linear-gradient(145deg,${c.color||'#dce8ff'},#f6f8ff)">${esc(c.name.slice(0,1).toUpperCase())}</span><div><b>${esc(c.name)}</b><span class="small">机构ID ${c.id}</span></div></div>`;}
function visibleChannels(){const f=state.filters.channels;return state.channels.filter(c=>(!f.q||`${c.id} ${c.name} ${c.phone}`.toLowerCase().includes(f.q.toLowerCase()))&&(!f.status||cooperationFilter(c)===f.status)&&(!f.dateStart||c.created.slice(0,10)>=f.dateStart)&&(!f.dateEnd||c.created.slice(0,10)<=f.dateEnd));}
function visibleBills(){const f=state.filters.settlement;return state.bills.map(billData).filter(b=>(!f.month||b.enter===f.month)&&(!f.q||`${b.c.id} ${b.c.name} ${b.c.phone}`.toLowerCase().includes(f.q.toLowerCase()))&&(!f.dateStart||b.created.slice(0,10)>=f.dateStart)&&(!f.dateEnd||b.created.slice(0,10)<=f.dateEnd));}
function filtered(){return state.view==='channels'?visibleChannels():state.tab==='slot'?slotRows():visibleBills();}
function paged(rows){return rows.slice((state.page-1)*state.pageSize,state.page*state.pageSize);}
function renderPager(rows){const pages=Math.max(1,Math.ceil(rows.length/state.pageSize));state.page=Math.min(state.page,pages);return `<div class="pager"><span>共 ${rows.length} 条</span><button data-action="page" data-value="${state.page-1}" ${state.page===1?'disabled':''} aria-label="上一页">‹</button>${Array.from({length:pages},(_,i)=>`<button data-action="page" data-value="${i+1}" class="${state.page===i+1?'active':''}">${i+1}</button>`).join('')}<button data-action="page" data-value="${state.page+1}" ${state.page===pages?'disabled':''} aria-label="下一页">›</button><select id="page-size" aria-label="每页条数">${[5,10,20].map(n=>`<option ${n===state.pageSize?'selected':''} value="${n}">${n} 条/页</option>`).join('')}</select></div>`;}
function renderFilter(){
  if(activeFilterKey()==='slots')return renderSlotFilter();
  const list=state.view==='channels',f=state.filters[state.view];
  return `<section class="card filter-card"><div class="tab-row">${list?'<button class="active" type="button">渠道列表</button>':`<button type="button" data-action="tab" data-value="channel" class="${state.tab==='channel'?'active':''}">渠道</button><button type="button" data-action="tab" data-value="slot" class="${state.tab==='slot'?'active':''}">推广位</button>`}<button type="button" class="reset-link" data-action="reset-filter">♢ 重置</button></div><form class="filters" id="filters"><div class="filter-control dates"><select aria-label="时间类型"><option>创建时间</option></select><input type="date" name="dateStart" value="${esc(f.dateStart)}" aria-label="开始日期"><span>—</span><input type="date" name="dateEnd" value="${esc(f.dateEnd)}" aria-label="结束日期"></div>${list?`<div class="filter-control"><span>合作状态${mark()}</span><select name="status" aria-label="合作状态"><option value="">全部</option><option value="true" ${f.status==='true'?'selected':''}>合作中</option><option value="false" ${f.status==='false'?'selected':''}>已终止</option><option value="unstarted" ${f.status==='unstarted'?'selected':''}>未开启</option></select></div>`:`<div class="filter-control"><span>达人钱包入账月份${mark()}</span><select name="month" aria-label="达人钱包入账月份"><option value="">全部月份</option>${[...new Set(state.bills.map(b=>b.enter))].sort().map(m=>`<option value="${m}" ${f.month===m?'selected':''}>${monthText(m)}</option>`).join('')}</select></div>`}<div class="filter-control search">${list?'':'<span>渠道信息'+mark('新增')+'</span>'}<input name="q" aria-label="渠道信息" placeholder="机构ID / 机构名称 / 手机号" value="${esc(f.q)}"></div><button class="btn primary" type="submit">筛选</button></form><p class="form-error" id="filter-error"></p></section>`;
}
function renderChannels(){
  const rows=visibleChannels(),pending=state.approvals.filter(a=>a.status==='pending').length;
  const body=paged(rows).map(c=>{
    const h=rateAt(c,state.month),a=state.approvals.find(a=>a.channelId===c.id&&a.status==='pending');
    return `<tr><td>${company(c)}</td><td><button class="switch ${c.active?'on':''}" data-action="toggle-coop" data-id="${c.id}" ${cooperationLocked(c)?'disabled':''} aria-label="${c.active?'终止':'开启'}${esc(c.name)}合作"></button><span class="small">${c.active?'合作中':cooperationLocked(c)?'未开启':'已终止'}</span></td><td class="channel-rate-cell"><span class="rate">${h?h.rate+'%':'—'}</span>${h?`<span class="small channel-mode">${activeProtection(h.protection,state.month)&&h.protection.mode==='fixed'?'固定比例':'自动匹配'}</span>`:''}${a?`<span class="small pending-rate">${h?(a.kind==='resume'?'恢复申请 ':'次月申请 ')+a.rate+'% · ':''}待审批</span>`:!h?'<span class="small">待生成</span>':c.status==='rejected'?'<span class="small rejected-rate">修改已驳回</span>':''}</td><td>${c.protect}天</td><td>${c.inviteProtect}天</td><td>${esc(c.created)}</td><td>${esc(c.updated)}</td><td><div class="operations"><button class="link" data-action="edit" data-id="${c.id}">编辑</button><button class="link" data-action="config" data-id="${c.id}">提成配置</button><button class="link" data-action="ip" data-id="${c.id}">可申请的IP</button></div></td></tr>`;
  }).join('');
  return `<section class="card"><div class="section-heading"><h1>数据列表</h1><div class="section-actions"><button class="btn" data-action="rule-config">提成档位配置${mark('新增')}</button><button class="link" data-action="approvals">提成修改审批 ${pending?tag(pending,'orange'):''}${mark('新增')}</button><button class="btn primary" data-action="create">＋ 新增渠道</button></div></div><div class="review-strip"><span>当前付款月 <b>${monthText(state.month)}</b></span><button class="link" data-action="policy">查看提成阶梯</button></div><div class="table-wrap"><table id="channels-table"><thead><tr><th>机构信息</th><th>合作状态</th><th>提成比例${mark('新增')}</th><th>渠道保护期</th><th>邀约保护期</th><th>创建时间</th><th>更新时间</th><th>操作</th></tr></thead><tbody>${body||'<tr><td colspan="8" class="empty">暂无符合条件的渠道</td></tr>'}</tbody></table></div>${renderPager(rows)}</section>`;
}
function renderSettlement(){
  if(state.tab==='slot')return renderSlots();
  const rows=visibleBills(),sum=rows.reduce((a,b)=>({count:a.count+b.count,base:a.base+b.base,commission:a.commission+(b.commission||0)}),{count:0,base:0,commission:0});
  return `<section class="card"><div class="section-heading"><h1>数据列表</h1><div class="section-actions"><button class="btn" data-action="rule-config">提成档位配置${mark('新增')}</button><button class="link muted" id="metric-explain">指标说明 ⓘ</button></div></div><div class="metrics"><div class="metric"><label>总订单</label><b>${sum.count}</b></div><div class="metric"><label>可分成金额</label><b>${money(sum.base)}</b></div><div class="metric"><label>总提成</label><b>${money(sum.commission)}</b></div></div><div class="review-strip"><span>当前月份 <b>${monthText(state.month)}</b> · 已生成账单</span></div><div class="table-wrap"><table id="settlement-table"><thead><tr><th>渠道信息</th><th>达人钱包入账月份${mark()}</th><th>付款月份／提成比例${mark()}</th><th>订单数</th><th>可分成金额</th><th>提成金额</th><th>创建时间</th><th>操作</th></tr></thead><tbody>${paged(rows).map(b=>`<tr><td>${company(b.c)}</td><td class="num">${monthText(b.enter)}</td><td><button class="link" data-action="bill" data-id="${b.id}">查看</button></td><td>${b.count}</td><td class="num">¥${money(b.base)}</td><td class="num">${b.commission===null?'—':'¥'+money(b.commission)}</td><td class="num">${b.created}</td><td><button class="link" data-action="orders" data-id="${b.id}">订单明细</button></td></tr>`).join('')||'<tr><td colspan="8" class="empty"><span>⌕</span>暂无符合条件的结算记录</td></tr>'}</tbody></table></div>${renderPager(rows)}</section>`;
}
function renderPRD(key){$('#page-prd').innerHTML=ChannelPRD.render(key==='settlement'&&state.tab==='slot'?'slots':key);}
function render(){
  $('#demo-month').textContent=`演示月份 ${monthText(state.month)}`;
  Object.assign($('#demo-date'),{value:state.demoDate,min:state.month+'-01',max:state.month+'-'+monthDays(state.month)});
  $('#demo-time').value=state.demoClock;
  $('#user-avatar').textContent=state.role==='approver'?'青':'木';
  $('#role').value=state.role;
  $('#preview-approval-messages').hidden=state.role!=='approver';
  document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===state.view));
  $('#page').innerHTML=renderFilter()+(state.view==='channels'?renderChannels():renderSettlement());
  renderPRD(currentModal||state.view);
}
function toast(t){clearTimeout(toastTimer);$('#toast').textContent=t;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,3200);}
function showDialog(title,body,footer='',kind='',key=''){
  hideProtectionHelp();
  const d=$('#main-dialog');
  if(!d.open)lastFocus=document.activeElement;
  d.className=kind;$('#dialog-title').textContent=title;$('#dialog-body').innerHTML=body;$('#dialog-footer').innerHTML=footer;
  currentModal=key;renderPRD(key||state.view);
  if(!d.open)d.showModal();
  d.scrollTop=0;
}
const closeButtons = `<button class="btn" data-close>关闭</button>`;
function confirmAction(title,body,onConfirm,button='确认'){
  modalContext={confirm:onConfirm};
  showDialog(title,body,`<button class="btn" data-close>取消</button><button class="btn primary" data-action="confirm">${button}</button>`,'',currentModal);
}
function showBill(id){
  const b=state.bills.find(x=>x.id===id);if(!b)return;
  const data=billData(b);
  showDialog('付款月份／提成比例',`<div class="detail-company">${company(data.c)}</div><div class="table-wrap"><table class="mini-table"><thead><tr><th>付款月份</th><th>提成比例</th><th>可分成金额</th><th>提成金额</th></tr></thead><tbody>${[...data.parts].sort((a,b)=>b.pay.localeCompare(a.pay)).map(p=>`<tr><td>${monthText(p.pay)}${p.pay<demoStart?'<span class="small">历史比例'+(p.level?' · '+p.level:'')+'</span>':''}</td><td><span class="rate" style="font-size:14px">${p.rate===null?'—':p.rate+'%'}</span></td><td>¥${money(p.base)}</td><td>${p.commission===null?'—':'¥'+money(p.commission)}</td></tr>`).join('')}</tbody></table></div>`,closeButtons,'','settlement');
}
function showConfig(id,tab='details'){
  const c=channelById(id)??auditRecords(id)[0]?.channelSnapshot;if(!c)return;
  const h=rateAt(c,state.month),targetMonth=nextMonth(state.month),pending=state.approvals.find(a=>a.channelId===c.id&&a.kind==='preset'&&a.status==='pending'),resuming=state.approvals.find(a=>a.channelId===c.id&&a.kind==='resume'&&a.status==='pending');
  modalContext={configChannelId:c.id,configTab:tab};
  const tabs=`<div class="pill-tabs config-tabs"><button type="button" data-action="config-tab" data-value="details" class="${tab==='details'?'active':''}">配置详情</button><button type="button" data-action="config-tab" data-value="changes" class="${tab==='changes'?'active':''}">变更记录</button></div>`;
  if(tab==='changes'){showDialog('提成配置',`<div class="detail-company">${company(c)}</div>${tabs}${renderChangeHistory(c.id)}`,closeButtons,'wide','config');return;}
  showDialog('提成配置',`<div class="detail-company">${company(c)}</div>${tabs}${resuming?'<div class="decision-card orange">恢复合作申请 '+resuming.rate+'% · 待审批；通过后用于新合作订单，首次生效月为审批通过当月。</div>':''}<h3 class="detail-heading">${c.active?'本月配置':'原合作配置（暂停执行）'} · ${monthText(c.active?state.month:(h?.month??state.month))}</h3>${configurationSummary(h)}<h3 class="detail-heading">次月配置 · ${monthText(targetMonth)}</h3><div class="decision-card next-preview">${nextConfigurationSummary(c)}${pending?'<br>另有'+pending.rate+'%待审批，尚未生效。':''}</div><h3 class="detail-heading">月度比例记录</h3><div class="table-wrap"><table class="mini-table"><thead><tr><th>付款月份</th><th>实际比例</th><th>执行方式／保护进度</th><th>保护起止月份</th><th>来源</th></tr></thead><tbody>${[...c.history].sort((a,b)=>b.month.localeCompare(a.month)||(c.cycles.find(x=>x.id===b.cycleId)?.sequence??0)-(c.cycles.find(x=>x.id===a.cycleId)?.sequence??0)).map(r=>`<tr><td>${monthText(r.month)}${c.cycles.length>1?'<span class="small">'+(r.cycleId===c.currentCycleId?'当前合作':'历史合作')+'</span>':''}</td><td>${r.rate}%</td><td>${r.protection?executionName(r.protection,r.month):'—'}<span class="small">${r.protection?protectionProgress(r.protection,r.month):'—'}</span></td><td>${r.protection?protectionRange(r.protection):'—'}</td><td>${esc(r.source)}${r.sourceMonth?'<span class="small">依据'+monthText(r.sourceMonth)+'业绩 · V'+r.ruleVersion+'</span>':''}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">暂无已生效配置</td></tr>'}</tbody></table></div>`,closeButtons,'wide','config');
}
function showOrders(id){
  const b=billData(state.bills.find(x=>x.id===id));let count=0;
  const orders=b.parts.flatMap(p=>Array.from({length:p.count},(_,i)=>{count++;return {id:`2026${String(b.c.id).slice(-5)}${String(count).padStart(5,'0')}`,pay:p.pay,base:Math.floor(p.base/p.count)+(i<p.base%p.count?1:0),rate:p.rate};}));
  showDialog('订单明细',`<div class="detail-company">${company(b.c)}</div><div class="review-strip">${monthText(b.enter)} 入账 · ${orders.length}笔模拟订单 · 实际可分成金额合计 ¥${money(b.base)}</div><div class="table-wrap" style="max-height:430px"><table class="mini-table"><thead><tr><th>订单编号</th><th>付款月份</th><th>适用比例</th><th>可分成金额</th></tr></thead><tbody>${orders.map(o=>`<tr><td>${o.id}</td><td>${monthText(o.pay)}</td><td>${o.rate}%</td><td>¥${money(o.base)}</td></tr>`).join('')}</tbody></table></div><p class="detail-tip">订单为账单核对用模拟记录。正式订单详情是否增加适用比例字段待评审。</p>`,closeButtons,'wide','settlement');
}
const availableCompanies=[{id:2831509,name:'木棉传媒'},{id:3895102,name:'星禾传媒'},{id:3895103,name:'海棠工作室'},{id:3895104,name:'晚风推广'},{id:3895105,name:'拾光文化'}];
const protectionHelp={
  protection:{title:'提成保护',text:'固定比例：保护期内维持约定比例，不自动升降，到期恢复自动匹配（随档调整）。自动匹配：按业绩选择随档调整、只升不降或只降不升；单向调整可设置有效期限，到期恢复随档调整。新预设的期限从生效月份起算。'},
  channel:{title:'渠道保护期',text:'邀约关系进入“即将失效”后，从保护开始时间起计算。保护期内未完成有效IP申请，邀约关系将自动失效。此处按天配置，不影响提成比例。'},
  invite:{title:'邀约保护期',text:'从邀约创建时间起计算。待生效邀约在保护期内未转为生效，邀约关系将自动失效。此处按天配置，不影响提成比例。'}
};
const helpButton=key=>`<button class="field-help" type="button" data-protection-help="${key}" aria-label="${protectionHelp[key].title}说明" aria-expanded="false">?</button>`;
function hideProtectionHelp(){
  document.querySelector('#protection-help-popover')?.remove();
  document.querySelectorAll('[data-protection-help]').forEach(b=>{b.setAttribute('aria-expanded','false');b.removeAttribute('aria-describedby');});
}
function toggleProtectionHelp(button){
  const wasOpen=button.getAttribute('aria-expanded')==='true';hideProtectionHelp();if(wasOpen)return;
  const info=protectionHelp[button.dataset.protectionHelp],box=document.createElement('aside');if(!info)return;
  box.id='protection-help-popover';box.className='protection-help-popover';box.setAttribute('role','tooltip');
  box.innerHTML=`<b>${esc(info.title)}</b><p>${esc(info.text)}</p>`;$('#main-dialog').append(box);
  button.setAttribute('aria-expanded','true');button.setAttribute('aria-describedby',box.id);
  const rect=button.getBoundingClientRect(),width=box.offsetWidth,height=box.offsetHeight;
  box.style.left=Math.max(12,Math.min(rect.left,window.innerWidth-width-12))+'px';
  box.style.top=(rect.bottom+10+height<window.innerHeight-12?rect.bottom+10:Math.max(12,rect.top-height-10))+'px';
}
function protectionFields(plan,baseMonth,requireSelection=false){
  const fixed=plan.mode==='fixed',auto=plan.mode!=='fixed',limited=plan.mode!=='none',months=plan.end?monthDistance(plan.start,plan.end)+1:3;
  return `<div class="form-field"><label class="required" for="execution-type">提成执行方式${helpButton('protection')}</label><select id="execution-type" name="executionType">${requireSelection?'<option value="" selected>请选择执行方式</option>':''}<option value="auto" ${auto&&!requireSelection?'selected':''}>自动匹配</option><option value="fixed" ${fixed&&!requireSelection?'selected':''}>固定比例</option></select></div><div class="form-field" id="adjustment-field" ${fixed||requireSelection?'hidden':''}><label class="required" for="adjustment-direction">升降方向</label><select id="adjustment-direction" name="adjustmentDirection"><option value="both" ${plan.mode==='none'?'selected':''}>随档调整</option><option value="upOnly" ${plan.mode==='upOnly'?'selected':''}>只升不降</option><option value="downOnly" ${plan.mode==='downOnly'?'selected':''}>只降不升</option></select></div><div id="protection-options" ${!limited||requireSelection?'hidden':''}><div class="form-field"><label class="required" id="term-label" for="protection-term">${fixed?'保护期限':'单向调整期限'}</label><select id="protection-term" name="protectionTerm"><option value="finite" ${!limited||plan.end?'selected':''}>固定月数</option><option value="permanent" ${limited&&plan.end===null?'selected':''}>永久</option></select></div><div class="form-field" id="protection-month-field" ${limited&&plan.end===null?'hidden':''}><label class="required" id="months-label" for="protection-months">${fixed?'保护月数':'单向调整月数'}</label><div class="input-unit"><input id="protection-months" name="protectionMonths" type="number" min="1" step="1" value="${requireSelection?'':months}" data-start="${baseMonth}"><span>个月</span></div></div><p class="form-help" id="protection-period"></p></div>`;
}
function configurationSummary(record,month=state.month){
  const p=record?.protection??noProtection();
  return `<div class="current-config"><div><span>提成比例</span><b>${record?record.rate+'%':'—'}</b></div><div><span>执行方式</span><b>${executionName(p,month)}</b></div><div><span>保护进度</span><b>${protectionProgress(p,month)}</b></div><p>${protectionRange(p)}</p></div>`;
}
function nextConfigurationSummary(c){
  const targetMonth=nextMonth(state.month),current=rateAt(c,state.month),preset=confirmedPreset(c,targetMonth);
  if(!c.active){const paused=[...state.presets].reverse().find(p=>p.channelId===c.id&&p.cycleId===c.currentCycleId&&p.status==='suspended');return paused?`已通过配置：<b>${paused.rate}%</b><span>${protectionNames[paused.protection.mode]} · 暂停执行（合作已终止）</span><span>恢复合作需重新配置比例和模式。</span>`:'合作已终止，配置暂停执行；恢复合作需重新配置比例和模式。';}
  if(preset)return `已确认的次月配置：<b>${preset.rate}%</b><span>${protectionNames[preset.protection.mode]}${preset.protection.mode==='none'?'':' · '+protectionProgress(preset.protection,targetMonth)+' · '+protectionRange(preset.protection)}</span>`;
  if(!current)return '暂无当前月生效配置';
  const plan=current.protection??noProtection(),limited=activeProtection(plan,targetMonth);
  if(limited&&plan.mode==='fixed')return `次月比例：<b>${current.rate}%</b><span>固定比例 · ${protectionProgress(plan,targetMonth)} · ${protectionRange(plan)}</span>`;
  return `按照提成档位自动匹配对应的提成比例${limited?'<span>'+protectionNames[plan.mode]+' · '+protectionProgress(plan,targetMonth)+' · '+protectionRange(plan)+'</span>':''}`;
}
function commissionFields(c){
  if(!c)return `<div class="form-field"><label class="required" for="initial-rate">初始提成比例${mark('新增')}</label><div class="input-unit"><input id="initial-rate" name="rate" type="number" min="0" max="100" step="0.01" value="50"><span>%</span></div></div><div class="decision-card" id="rate-decision"></div>${protectionFields(noProtection(),state.month)}<div class="form-field" id="reason-field" hidden><label class="required" for="apply-reason">申请原因</label><textarea id="apply-reason" name="reason"></textarea></div>`;
  const current=rateAt(c,state.month),targetMonth=nextMonth(state.month),preset=confirmedPreset(c,targetMonth),pending=state.approvals.find(a=>a.channelId===c.id&&a.status==='pending'),plan=preset?.protection??noProtection();
  let next=pending?`<div class="decision-card orange">已有待审批申请：${pending.rate}%${pending.kind==='preset'?' · '+monthText(pending.targetMonth)+'付款订单':''}<br>该申请处理完成前，不可重复提交次月配置。</div>`:!current?'<div class="decision-card">暂无当前月生效配置，暂不可预设次月比例。</div>':`<div class="next-preview" id="next-summary">${nextConfigurationSummary(c)}</div><div id="preset-fields" data-editing="false" hidden><div class="form-field"><label class="required" for="next-rate">次月预设比例</label><div class="input-unit"><input id="next-rate" name="rate" type="number" min="0" max="100" step="0.01" value="${preset?.rate??''}"><span>%</span></div></div>${protectionFields(plan,targetMonth,!preset)}<div class="form-field" id="reason-field" hidden><label class="required" for="apply-reason">变更原因</label><textarea id="apply-reason" name="reason"></textarea></div><div class="decision-card" id="rate-decision"></div></div>`;
  return `<div class="config-block"><h4>${c.active?'本月配置':'原合作配置（暂停执行）'} · ${monthText(c.active?state.month:(current?.month??state.month))} <span>只读</span></h4>${configurationSummary(current)}</div><div class="config-block"><h4 class="next-config-heading">次月配置 · ${monthText(targetMonth)}${current&&c.active&&!pending?'<button type="button" class="link" id="edit-next-config" data-action="edit-next-config">修改</button><button type="button" class="link" id="cancel-next-config" data-action="cancel-next-config" hidden>取消修改</button>':''}</h4>${next}${current&&!c.active?'<p class="form-help">合作已终止，暂不可预设次月配置。</p>':''}</div>`;
}
function showForm(id,resuming=false){
  const c=id?channelById(id):null;modalContext={editing:c?.id||null,resuming};
  showDialog(resuming?'恢复合作':c?'编辑渠道':'新增渠道',`<form id="channel-form" novalidate><section class="channel-form-section"><h3>基础信息</h3><div class="form-field"><label class="required" for="company-select">选择机构</label><select id="company-select" name="company" ${c?'disabled':''}><option value="">请选择机构</option>${(c?[c]:availableCompanies.filter(x=>!state.channels.some(c=>c.id===x.id))).map(x=>`<option value="${x.id}" ${c?'selected':''}>${esc(x.name)} · 机构ID ${x.id}</option>`).join('')}</select><p class="form-help">按机构ID选择，机构不可重复创建为渠道。</p></div><div class="form-field"><label>可申请的IP</label><input id="ip-search" placeholder="搜索IP名称" aria-label="搜索可申请的IP" style="margin-bottom:10px"><div class="ip-choices">${['纪广','潘夏彤','胡允','傅彭薄','王乐康'].map(n=>`<label class="ip-choice" data-ip-name="${n}"><input type="checkbox" name="ips" value="${n}" ${c?.ips.includes(n)?'checked':''}>${n}</label>`).join('')}</div><p class="small" id="ip-empty" hidden>没有匹配的IP</p></div><div class="form-field"><label class="required" for="coop-toggle">合作状态</label><input id="coop-status" type="hidden" name="active" value="${resuming||c?.active!==false?'true':'false'}" ${c&&!resuming&&(cooperationLocked(c)||c.requiresReconfiguration)?'disabled':''}><div class="cooperation-control"><button id="coop-toggle" class="switch" type="button" role="switch" aria-label="合作状态" aria-checked="false" data-action="toggle-form-coop"></button><span id="coop-status-text" class="small" style="display:inline-block;margin-left:9px"></span></div></div></section><section class="channel-form-section commission-section"><h3>提成配置</h3>${commissionFields(resuming?null:c)}</section><section class="channel-form-section"><h3>邀约与归属保护</h3><div class="form-grid"><div class="form-field"><label class="required" for="protect-days">渠道保护期${helpButton('channel')}</label><div class="input-unit"><input id="protect-days" name="protect" type="number" min="0" max="100" step="1" value="${c?.protect??7}"><span>天</span></div></div><div class="form-field"><label class="required" for="invite-days">邀约保护期${helpButton('invite')}</label><div class="input-unit"><input id="invite-days" name="inviteProtect" type="number" min="0" max="100" step="1" value="${c?.inviteProtect??7}"><span>天</span></div></div></div></section><p class="form-error" id="channel-form-error" role="alert"></p></form>`,`<button class="btn" data-close>取消</button><button class="btn primary" id="save-channel" type="submit" form="channel-form">${resuming?'恢复并生效':c?'保存':'保存并生效'}</button>`,'drawer','form');
  updateFormDecision();
}
function readProtection(form,baseMonth){
  const d=new FormData(form),execution=d.get('executionType'),direction=d.get('adjustmentDirection');
  if(!['auto','fixed'].includes(execution))return {error:'请选择提成执行方式。'};
  if(execution==='auto'&&direction==='both')return {value:noProtection()};
  const mode=execution==='fixed'?'fixed':direction,term=d.get('protectionTerm'),raw=String(d.get('protectionMonths')??'');
  if(!['fixed','upOnly','downOnly'].includes(mode))return {error:'请选择升降方向。'};
  if(term==='permanent')return {value:{mode,start:baseMonth,end:null}};
  if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)<1||Number(raw)>1200)return {error:'保护月数须为1～1200的整数。'};
  return {value:{mode,start:baseMonth,end:addMonths(baseMonth,Number(raw)-1)}};
}
function proposedConfig(form,c){
  const targetMonth=nextMonth(state.month),base=confirmedPreset(c,targetMonth),record=rateAt(c,state.month),beforeRate=base?.rate??record?.rate;
  const oldPlan=base?.protection??record?.protection??noProtection(),d=new FormData(form),raw=String(d.get('rate')??''),rate=Number(raw);
  if(!record)return {error:'暂无本月生效比例。'};
  if(!/^\d+(?:\.\d{1,2})?$/.test(raw)||rate<0||rate>100)return {error:'请填写0～100的比例，最多两位小数。'};
  const p=readProtection(form,targetMonth);
  if(p.error)return p;
  if(!c.active)return {error:'合作已终止，暂不可预设次月配置。'};
  const changedRate=rate!==beforeRate,changedProtection=JSON.stringify(p.value)!==JSON.stringify(oldPlan);
  return {rate,protection:p.value,beforeRate,beforeProtection:structuredClone(oldPlan),targetMonth,needsApproval:changedRate,changed:!base||changedRate||changedProtection};
}
function syncCooperationSwitch(){
  const input=$('#coop-status'),button=$('#coop-toggle');if(!input||!button)return;
  const on=input.value==='true';button.classList.toggle('on',on);button.disabled=input.disabled;
  button.setAttribute('aria-checked',String(on));$('#coop-status-text').textContent=on?'合作中':modalContext?.editing&&!modalContext.resuming&&channelById(modalContext.editing)?.requiresReconfiguration&&!channelById(modalContext.editing)?.resumptionPending?'已终止':input.disabled?'未开启（待审批）':'已终止';
}
function toggleFormCooperation(){
  const input=$('#coop-status');if(!input||input.disabled)return;
  input.value=input.value==='true'?'false':'true';syncCooperationSwitch();
}
function setPresetEditing(editing){
  const fields=$('#preset-fields');if(!fields)return;
  if(editing)modalContext.presetOriginalMarkup??=fields.innerHTML;
  else fields.innerHTML=modalContext.presetOriginalMarkup??fields.innerHTML;
  fields.dataset.editing=String(editing);fields.hidden=!editing;$('#next-summary').hidden=editing;
  $('#edit-next-config').hidden=editing;$('#cancel-next-config').hidden=!editing;
  $('#channel-form-error').textContent='';updateFormDecision();
}
function updateFormDecision(){
  const form=$('#channel-form');if(!form)return;syncCooperationSwitch();
  const editing=modalContext?.editing,c=editing?channelById(editing):null,existing=Boolean(c&&!modalContext.resuming),presetEditing=$('#preset-fields')?.dataset.editing==='true';
  const setting=$('#execution-type'),term=$('#protection-term');
  if(setting){
    const fixed=setting.value==='fixed',auto=setting.value==='auto',direction=$('#adjustment-direction').value;
    $('#adjustment-field').hidden=!auto;$('#protection-options').hidden=!(fixed||(auto&&direction!=='both'));$('#protection-month-field').hidden=term.value==='permanent';
    $('#term-label').textContent=fixed?'保护期限':'单向调整期限';$('#months-label').textContent=fixed?'保护月数':'单向调整月数';
    const p=readProtection(form,existing?nextMonth(state.month):state.month);$('#protection-period').textContent=p.error?'请填写有效月数':protectionRange(p.value);
  }
  if(existing&&!presetEditing){$('#save-channel').textContent='保存基础资料';return;}
  const raw=existing?$('#next-rate').value:$('#initial-rate').value,rate=Number(raw),proposal=existing?proposedConfig(form,c):null,review=existing?proposal.changed&&proposal.needsApproval:rate>50;
  $('#reason-field').hidden=!review;$('#save-channel').textContent=review?'提交审批':existing?'保存次月配置':modalContext.resuming?'恢复并生效':'保存并生效';
  if(existing)$('#rate-decision').textContent=proposal.error||(!proposal.changed?'次月配置未发生变更。':proposal.needsApproval?'提交后有7天审核期，超时自动生效。同月通过于次月生效；跨月通过或超时生效，覆盖生效月整月付款订单。':'模式与保护期无需审批，保存后于'+monthChinese(nextMonth(state.month))+'1日生效，当前月配置保持不变。');
  else{
    const coop=$('#coop-status');if(rate>50&&!coop.disabled)coop.dataset.normalValue=coop.value;
    if(rate<=50&&coop.disabled)coop.value=coop.dataset.normalValue||'true';if(rate>50)coop.value='false';coop.disabled=rate>50;
    syncCooperationSwitch();
    $('#rate-decision').textContent=modalContext.resuming?(rate>50?'提交后7天内审核，超时自动生效；恢复生效月的新合作订单使用新比例，旧合作订单保留原比例。':rate+'% · 保存后恢复合作，只用于新合作订单；旧订单保留原比例。'):(rate>50?'提交后7天内审核，超时自动生效并开启合作；渠道在审批通过后开启，初始比例适用于审批通过当月整月付款订单。':rate+'% · 保存后适用于付款时间在'+monthChinese(state.month)+'的渠道订单。');
  }
}
function demoTime(){return state.demoDate+' '+state.demoClock;}
function actor(){return state.role==='approver'?{name:'青椒',id:'demo-qingjiao'}:{name:'木豆',id:'demo-mudou'};}
function newApplication(data){const who=actor(),a={id:'AP-'+String(++state.approvalSequence).padStart(3,'0'),month:state.month,status:'pending',applicant:who.name,applicantId:who.id,created:demoTime(),...data};a.deadline=approvalDeadline(a);state.approvals.unshift(a);const log=addAuditLog(channelById(a.channelId),{...a,review:'pending',approvalId:a.id});if(a.kind==='preset')a.cycleId=channelById(a.channelId).currentCycleId;a.changeId=log.id;notifyApprovalCreated(a,state);return a;}
function savePreset(c,data,approvalId=null,confirmedAt=demoTime(),operator=actor().name){
  const previous=confirmedPreset(c,data.targetMonth);if(previous){previous.status='superseded';const log=state.changeLogs.find(l=>l.id===previous.changeId);if(log)addAuditEvent(log,'已被后续配置替换',confirmedAt,operator);}
  const preset={id:'PRE-'+(++state.presetSequence),channelId:c.id,cycleId:c.currentCycleId,targetMonth:data.targetMonth,rate:data.rate,protection:structuredClone(data.protection),status:'confirmed',confirmedAt,approvalId};
  state.presets.push(preset);attachPresetAudit(c,data,preset,approvalId,confirmedAt,operator);return preset;
}
function saveChannel(form){
  const d=new FormData(form),editing=modalContext?.editing,error=$('#channel-form-error'),protect=Number(d.get('protect')),invite=Number(d.get('inviteProtect'));
  if(['protect','inviteProtect'].some(k=>String(d.get(k)??'').trim()==='')||![protect,invite].every(n=>Number.isInteger(n)&&n>=0&&n<=100)){error.textContent='请填写0～100之间的整数渠道／邀约保护期。';return;}
  const ips=d.getAll('ips'),active=d.get('active')==='true',reason=String(d.get('reason')??'').trim();
  if(editing&&modalContext.resuming){saveResumption(form,channelById(editing),d,error);return;}
  if(editing){
    const c=channelById(editing),enabled=$('#preset-fields')?.dataset.editing==='true',proposal=enabled?proposedConfig(form,c):null;
    if(enabled&&proposal.error){error.textContent=proposal.error;return;}
    if(enabled&&state.approvals.some(a=>a.channelId===c.id&&a.status==='pending')){error.textContent='该渠道已有待审批申请。';return;}
    if(proposal?.changed&&proposal.needsApproval&&!reason){error.textContent='请填写变更原因。';return;}
    if(proposal?.changed&&!active){error.textContent='终止合作时不可同时预设次月配置。';return;}
    if(c.requiresReconfiguration&&active){error.textContent='请通过恢复合作重新配置比例与模式。';return;}
    const wasActive=c.active;
    Object.assign(c,{ips,active:cooperationLocked(c)?false:active,protect,inviteProtect:invite,updated:demoTime()});
    if(wasActive&&!c.active)closeTerminatedPlans(c);
    if(proposal?.changed){if(proposal.needsApproval)newApplication({kind:'preset',channelId:c.id,...proposal,reason,channelSnapshot:structuredClone(c)});else savePreset(c,{...proposal,reason});}
    $('#main-dialog').close();render();toast(proposal?.changed?(proposal.needsApproval?'次月配置申请已提交，当前月配置保持不变':'次月配置已保存，无需审批'):'基础资料已保存');return;
  }
  const id=Number(d.get('company')),raw=String(d.get('rate')??''),rate=Number(raw),p=readProtection(form,state.month);
  if(!id){error.textContent='请选择机构。';return;}
  if(state.channels.some(c=>c.id===id)){error.textContent='该机构已经是渠道，请勿重复创建。';return;}
  if(!/^\d+(?:\.\d{1,2})?$/.test(raw)||rate<0||rate>100){error.textContent='请填写0～100的比例，最多两位小数。';return;}
  if(p.error){error.textContent=p.error;return;}
  if(rate>50&&!reason){error.textContent='请填写申请原因。';return;}
  const profile=availableCompanies.find(c=>c.id===id);if(!profile)return;
  const c={...profile,origin:'new',phone:'13800009999',color:'#c9d9f1',rate:rate>50?null:rate,status:rate>50?'pending':'effective',ips,active:rate>50?false:active,protect,inviteProtect:invite,initialProtection:p.value,created:demoTime(),updated:demoTime(),history:rate>50?[]:[{month:state.month,rate,protection:p.value,source:'新增渠道初始约定'}],gmv:0};
  c.cooperationSequence=1;c.currentCycleId=c.id+'-C1';c.cycles=[{id:c.currentCycleId,sequence:1,start:c.active?c.created:null,end:null}];c.history.forEach(h=>h.cycleId=c.currentCycleId);
  state.channels.unshift(c);
  if(rate>50)newApplication({kind:'create',channelId:id,beforeRate:null,rate,protection:p.value,reason,channelSnapshot:structuredClone(c)});
  else{const log=addAuditLog(c,{kind:'create',beforeRate:null,rate,protection:p.value,reason,targetMonth:state.month});log.effectStatus='applied';addAuditEvent(log,'配置已生效');}
  state.view='channels';state.filters.channels={q:'',status:'',dateStart:'',dateEnd:''};state.page=1;$('#main-dialog').close();render();toast(rate>50?'申请已提交，审批通过前合作状态为未开启':'渠道已新增，初始比例当月生效');
}
function showApprovals(filter='pending',scope=null){
  processDueApprovals();
  modalContext={filter,approvalScope:scope};
  const list=state.approvals.filter(a=>(filter==='all'||a.status===filter)&&(!scope?.id||a.id===scope.id));
  showDialog('提成修改审批',`${scope?'<p class="form-help">'+'消息对应申请'+' <button class="link" data-action="approvals">查看全部审批</button></p>':''}<div class="pill-tabs"><span class="small">审批状态${mark('新增')}</span><button data-action="approval-filter" data-value="pending" class="${filter==='pending'?'active':''}">待审批</button><button data-action="approval-filter" data-value="all" class="${filter==='all'?'active':''}">全部记录</button></div>${list.map(a=>{
    const c=a.channelSnapshot||channelById(a.channelId),live=channelById(a.channelId),current=live?rateAt(live,state.month):null,statusNames={pending:'待审批',approved:a.approvalMethod==='timeout'?'系统超时通过':'已通过',rejected:a.approvalMethod==='termination'?'自动拒绝':'已驳回',expired:'历史已过期'},can=state.role==='approver';
    return `<article class="approval-row"><div class="approval-heading">${company(c)}${tag(statusNames[a.status],a.status==='pending'?'orange':a.status==='approved'?'green':'red')}</div><div class="approval-detail"><div><span>申请类型</span>${a.kind==='preset'?'次月预设':a.kind==='resume'?'恢复合作':'新增渠道'}</div><div><span>申请提成比例</span><strong class="rate">${a.rate}%</strong></div><div><span>调整前比例</span>${a.beforeRate===null?'—':a.beforeRate+'%'}</div><div><span>当前生效比例</span>${current?current.rate+'%':'—'}</div>${a.kind==='preset'?'<div><span>修改生效月份</span>'+monthText(a.targetMonth)+' · 整月付款订单</div>':'<div><span>提成比例适用月份</span>'+esc(a.effectiveMonth?monthText(a.effectiveMonth)+' · 整月':'审批通过当月')+'</div>'}<div><span>审核截止时间</span>${esc(approvalDeadline(a))}</div>${a.kind==='preset'&&a.effectiveMonth?'<div><span>实际修改生效月份</span>'+monthText(a.effectiveMonth)+' · 整月</div>':''}<div><span>申请人</span>${esc(a.applicant)}</div><div><span>执行方式</span>${protectionNames[a.protection.mode]}</div><div><span>保护期限</span>${protectionRange(a.protection)}</div>${a.beforeProtection?'<div><span>原保护安排</span>'+protectionNames[a.beforeProtection.mode]+' · '+protectionRange(a.beforeProtection)+'</div>':''}${a.approvedAt?'<div><span>通过时间</span>'+esc(a.approvedAt)+'</div><div><span>处理人／方式</span>'+esc(a.approver??'青椒')+' · '+(a.approvalMethod==='timeout'?'系统超时通过':'人工审批')+'</div>':''}</div><p>申请原因：${esc(a.reason)}</p>${a.status==='pending'?'<p class="form-help">'+('提交起7天内可人工审批，截止仍待审批则自动生效。'+(a.kind==='preset'?'跨月通过仍覆盖修改生效月份的整月付款订单。':'渠道在审批通过后开启，比例适用于审批通过当月整月付款订单。'))+'</p>':''}${a.rejectReason?'<p class="warning-text">驳回原因：'+esc(a.rejectReason)+'</p>':''}${a.status==='expired'?'<p class="warning-text">申请已过期，目标月份的生效比例保持不变。如需调整，请重新提交下一月份的配置申请。</p>':''}<div class="approval-record-link"><span class="small">${esc(a.created)}</span><button type="button" class="link" data-action="approval-changes" data-id="${a.channelId}">查看变更记录</button></div>${can&&a.status==='pending'?`<div class="approval-actions"><button class="link danger" data-action="approval-reject" data-id="${a.id}">驳回</button><button class="btn primary small" data-action="approval-approve" data-id="${a.id}">通过</button></div>`:''}</article>`;
  }).join('')||'<div class="empty">暂无待审批记录</div>'}`,closeButtons,'wide','approval');
}
function mayProcess(a){return Boolean(a&&a.status==='pending'&&state.role==='approver');}
function initialProtectionAt(protection,month){
  const p=structuredClone(protection);if(p.mode!=='none'){const count=p.end===null?null:monthDistance(p.start,p.end)+1;p.start=month;p.end=count===null?null:addMonths(month,count-1);}return p;
}
function applyResumption(c,rate,protection,active,time,source){
  c.cooperationSequence++;c.currentCycleId=c.id+'-C'+c.cooperationSequence;
  c.cycles.push({id:c.currentCycleId,sequence:c.cooperationSequence,start:time,end:active?null:time});
  c.history.push({cycleId:c.currentCycleId,month:time.slice(0,7),rate,protection:structuredClone(protection),source});
  Object.assign(c,{rate,initialProtection:structuredClone(protection),active,requiresReconfiguration:!active,resumptionPending:false,status:'effective',updated:time});delete c.stoppedAt;
}
function saveResumption(form,c,d,error){
  if(!c||c.active||c.resumptionPending){error.textContent='合作状态已变化，请刷新后重试。';return;}
  const raw=String(d.get('rate')??''),rate=Number(raw),p=readProtection(form,state.month),reason=String(d.get('reason')??'').trim();
  if(!/^\d+(?:\.\d{1,2})?$/.test(raw)||rate<0||rate>100){error.textContent='请填写0～100的比例，最多两位小数。';return;}
  if(p.error){error.textContent=p.error;return;}if(rate>50&&!reason){error.textContent='请填写申请原因。';return;}
  const before=rateAt(c,state.month),data={kind:'resume',channelId:c.id,beforeRate:before?.rate??c.rate,beforeProtection:structuredClone(before?.protection??c.initialProtection??noProtection()),rate,protection:p.value,targetMonth:null,reason};
  Object.assign(c,{ips:d.getAll('ips'),protect:Number(d.get('protect')),inviteProtect:Number(d.get('inviteProtect')),updated:demoTime()});
  if(rate>50){c.resumptionPending=true;newApplication({...data,channelSnapshot:structuredClone(c)});}
  else{const log=addAuditLog(c,{...data,targetMonth:state.month});applyResumption(c,rate,p.value,d.get('active')==='true',demoTime(),'恢复合作初始配置');log.afterCycleId=c.currentCycleId;log.effectStatus='applied';addAuditEvent(log,'恢复合作配置已生效');}
  $('#main-dialog').close();render();toast(rate>50?'恢复申请已提交，审批通过前合作保持未开启':'恢复配置已保存，新合作订单使用新比例');
}
function closeTerminatedPlans(c,time=demoTime()){
  c.requiresReconfiguration=true;c.stoppedAt??=time;
  const cycle=c.cycles?.find(x=>x.id===c.currentCycleId);if(cycle&&!cycle.end)cycle.end=time;
  state.presets.filter(p=>p.channelId===c.id&&p.status==='confirmed').forEach(p=>{p.status='suspended';p.suspendedAt=time;p.suspendReason='合作已终止';const log=state.changeLogs.find(l=>l.id===p.changeId);if(log)addAuditEvent(log,'配置生效，暂停执行：合作已终止',time,'系统');});
  state.approvals.filter(a=>a.channelId===c.id&&a.kind==='preset'&&a.status==='pending').forEach(a=>{
    a.status='rejected';a.rejectReason='合作已终止';a.rejectedAt=time;a.approver='系统';a.approvalMethod='termination';reviewAudit(a);
  });
}
function completeApproval(a,operator,method='manual',time=demoTime()){
  if(a.status!=='pending')return false;
  const c=channelById(a.channelId);if(!c)return false;
  if(a.kind==='preset'&&(!c.active||a.cycleId!==c.currentCycleId)){a.status='rejected';a.rejectReason='合作已终止';a.rejectedAt=time;a.approver='系统';a.approvalMethod='termination';reviewAudit(a);return false;}
  const effectiveMonth=approvalEffectiveMonth(a,time),p=initialProtectionAt(a.protection,effectiveMonth);
  a.status='approved';a.approver=operator;a.approvalMethod=method;a.approvedAt=time;a.effectiveMonth=effectiveMonth;a.effectiveAt=effectiveMonth+'-01 00:00:00';reviewAudit(a);
    if(a.kind==='preset'){
      const preset=savePreset(c,{...a,targetMonth:effectiveMonth,protection:p},a.id,time,operator);
      const log=state.changeLogs.find(l=>l.id===a.changeId);
      if(effectiveMonth<=time.slice(0,7)){
        state.presets.filter(x=>x!==preset&&x.channelId===c.id&&x.cycleId===c.currentCycleId&&x.targetMonth===effectiveMonth&&x.status==='applied').forEach(x=>{x.status='superseded';const old=state.changeLogs.find(l=>l.id===x.changeId);if(old)addAuditEvent(old,'已被后续通过配置替换',time,operator);});
        const record={cycleId:c.currentCycleId,month:effectiveMonth,rate:a.rate,protection:p,approvalId:a.id,presetId:preset.id,source:method==='timeout'?'七天审核期满自动生效':'跨月审批整月覆盖'};
        const index=c.history.findIndex(h=>h.cycleId===c.currentCycleId&&h.month===effectiveMonth);
        if(index<0)c.history.push(record);else c.history[index]=record;
        preset.status='applied';c.rate=a.rate;c.initialProtection=p;
        if(log){log.effectStatus='applied';addAuditEvent(log,'配置已生效，覆盖'+monthText(effectiveMonth)+'整月付款订单',time,operator);}
      }
      if(log){log.effectiveMonth=effectiveMonth;if(JSON.stringify(log.after.protection)!==JSON.stringify(p))log.effectiveAfter={rate:a.rate,protection:structuredClone(p)};}
    }
    else if(a.kind==='resume'){
      applyResumption(c,a.rate,p,true,time,'恢复合作审批生效');
      const log=state.changeLogs.find(l=>l.id===a.changeId);if(log){log.effectStatus='applied';log.effectiveMonth=effectiveMonth;log.afterCycleId=c.currentCycleId;if(JSON.stringify(log.after.protection)!==JSON.stringify(p))log.effectiveAfter={rate:a.rate,protection:structuredClone(p)};addAuditEvent(log,'恢复合作配置已生效，新合作订单按生效月配置计算',time,operator);}
    }
    else{
      c.cycles[0].start=time;c.history.push({cycleId:c.currentCycleId,month:effectiveMonth,rate:a.rate,protection:p,approvalId:a.id,source:method==='timeout'?'新增七天审核期满自动生效':'新增审批通过'});c.rate=a.rate;c.initialProtection=p;c.active=true;c.status='effective';
      const log=state.changeLogs.find(l=>l.id===a.changeId);if(log){log.effectStatus='applied';log.effectiveMonth=effectiveMonth;if(JSON.stringify(log.after.protection)!==JSON.stringify(p))log.effectiveAfter={rate:a.rate,protection:structuredClone(p)};addAuditEvent(log,'渠道已开启，比例适用'+monthText(effectiveMonth)+'整月付款订单',time,operator);}
    }
  c.updated=time;return true;
}
function processDueApprovals(time=demoTime(),inclusive=true){
  remindPendingApprovals(state,time);
  const ids=[];
  state.approvals.filter(a=>a.status==='pending'&&(inclusive?approvalDeadline(a)<=time:approvalDeadline(a)<time)).sort((a,b)=>approvalDeadline(a).localeCompare(approvalDeadline(b))||a.id.localeCompare(b.id)).forEach(a=>{if(completeApproval(a,'系统','timeout',approvalDeadline(a)))ids.push(a.id);});
  return ids;
}
function approve(id){
  const a=state.approvals.find(a=>a.id===id);if(!mayProcess(a))return;
  const c=channelById(a.channelId);if(!c)return;
  const valid=()=>{processDueApprovals();if(!mayProcess(a)){toast('该申请已处理，请查看最新结果');return false;}return true;};
  if(!valid())return;
  const effect=approvalEffectiveMonth(a,demoTime()),protection=initialProtectionAt(a.protection,effect);
  confirmAction('确认通过提成申请？',`<div class="detail-company">${company(c)}</div><div class="decision-card">确认后，${a.rate}%${a.kind==='preset'?'适用于付款时间在'+monthChinese(effect)+'整月的':'适用于审批通过当月整月付款的'}${a.kind==='resume'?'新合作订单，旧合作订单保留原比例':'渠道订单'}。${a.kind==='preset'?(effect<=state.month?'该目标月审批前后的订单均采用此比例，不按审批时间拆分。':'目标月1日起生效。'):''}${a.kind==='preset'?'':'同时开启合作。'}<br>执行方式：${protectionNames[protection.mode]} · ${protectionRange(protection)}</div>`,()=>{
    if(!valid())return;
    completeApproval(a,'青椒');
    c.updated=demoTime();render();showApprovals('all');toast(a.effectiveMonth>state.month?'审批已通过，等待次月生效':'审批已通过，按生效月整月比例执行');
  },'确认通过');
}
function reject(id){
  const a=state.approvals.find(a=>a.id===id);if(!mayProcess(a))return;
  modalContext={rejectId:id};showDialog('驳回提成申请',`<div class="detail-company">${company(a.channelSnapshot||channelById(a.channelId))}</div><div class="form-field"><label class="required" for="reject-reason">驳回原因</label><textarea id="reject-reason"></textarea></div><p class="form-error" id="reject-error"></p>`,`<button class="btn" data-close>取消</button><button class="btn primary" data-action="reject-submit">确认驳回</button>`,'','approval');
}
function submitRejection(){
  const reason=$('#reject-reason').value.trim();if(!reason){$('#reject-error').textContent='请填写驳回原因。';return;}
  const a=state.approvals.find(a=>a.id===modalContext.rejectId);if(!mayProcess(a))return;
  const c=channelById(a.channelId);a.channelSnapshot??=structuredClone(c);a.status='rejected';a.rejectReason=reason;a.rejectedAt=demoTime();a.approver='青椒';reviewAudit(a);
  if(a.kind==='resume'){c.resumptionPending=false;c.status='effective';}
  if(a.kind==='create'){
    state.channels=state.channels.filter(c=>c.id!==a.channelId);
    state.notifications.push({id:'rejection-'+a.id,kind:'create-rejected',approvalId:a.id,recipientId:a.applicantId,recipient:a.applicant,channelName:a.channelSnapshot.name,rate:a.rate,reason,created:a.rejectedAt,status:'待接入'});
  }
  render();showApprovals('all');toast(a.kind==='create'?'新增申请已驳回，可重新新增':a.kind==='resume'?'恢复申请已驳回，合作保持终止':'次月配置申请已驳回，当前配置及已确认的次月配置保持不变');
}
const gmvWan=n=>Number((n/1000000).toFixed(2)).toLocaleString('zh-CN',{maximumFractionDigits:2});
const gmvRangeText=(t,first=false)=>`${gmvWan(t.min)}${first?'（包含）':'（不含）'}－${t.max===null?'不限':gmvWan(t.max)+'（包含）'}万元`;
function showPolicy(){
  const version=ruleVersionFor();
  showDialog('提成阶梯',`<div class="rule-effective"><span>适用统计月：${monthText(state.month)} · V${version.version}</span><span>对应付款月：${monthText(nextMonth(state.month))}</span></div><div class="table-wrap"><table class="mini-table"><thead><tr><th>月度GMV区间</th><th>对应提成比例</th></tr></thead><tbody>${version.tiers.map((t,i)=>`<tr><td>${gmvRangeText(t,i===0)}</td><td><b class="rate">${t.rate}%</b></td></tr>`).join('')}</tbody></table></div>`,closeButtons,'','policy');
}
function simulationRows(){return state.channels.filter(c=>c.active&&(c.origin==='existing'||rateAt(c,state.month)));}
function showSimulation(){
  const rows=simulationRows();modalContext={simulation:true};
  showDialog('月度自动调档预览',`<div class="sim-header"><strong>${monthChinese(state.month)}业绩</strong><span class="muted">次月1日生成记录 · 适用${monthChinese(nextMonth(state.month))}付款订单 · V${ruleVersionFor().version}</span></div><div class="table-wrap"><table class="mini-table sim-table"><thead><tr><th>渠道</th><th>当前比例</th><th>本月GMV（元）</th><th>当前执行方式</th><th>匹配／下月比例</th></tr></thead><tbody>${rows.map(c=>`<tr><td>${esc(c.name)}</td><td>${rateAt(c,state.month)?rateAt(c,state.month).rate+'%':'—'}</td><td><input class="gmv-input" type="number" min="0" step="0.01" data-id="${c.id}" aria-label="${esc(c.name)}本月GMV" value="${c.gmv/100}"></td><td>${protectionText(c)}<span class="small">${protectionProgress(currentProtection(c))}</span></td><td class="sim-result" data-result="${c.id}"></td></tr>`).join('')}</tbody></table></div><p class="form-error" id="simulation-error" role="alert"></p>`,`<button class="btn" data-close>取消</button><button class="btn primary" data-action="simulate">进入${monthText(nextMonth(state.month))}并生成记录</button>`,'wide','simulation');
  updateSimulation();
}
function readGmv(input){const raw=input.value;return raw.trim()!==''&&/^\d+(\.\d{1,2})?$/.test(raw)&&Number.isSafeInteger(Math.round(Number(raw)*100))?Math.round(Number(raw)*100):null;}
function updateSimulation(){document.querySelectorAll('.gmv-input').forEach(input=>{
  const c=channelById(input.dataset.id),gmv=readGmv(input),result=$(`[data-result="${c.id}"]`);
  if(gmv===null){result.innerHTML='<span class="warning-text">请填写有效GMV</span>';return;}
  const d=monthlyDecision(c,gmv);
  result.innerHTML=`<span class="small">业绩匹配 ${d.matched===null?'未匹配':d.matched+'%'}</span><strong class="rate">${d.after}%</strong> ${tag(d.result,d.result==='降档'?'orange':d.result==='升档'?'green':'blue')}<span class="small">${d.reason}</span>`;
});}
function simulate(){
  const inputs=[...document.querySelectorAll('.gmv-input')];if(!inputs.length)return;
  if(inputs.some(i=>readGmv(i)===null)){$('#simulation-error').textContent='请完整填写非负GMV，最多两位小数。';return;}
  const sourceMonth=state.month,month=nextMonth(sourceMonth),version=ruleVersionFor(sourceMonth);
  if(state.recalculations.some(r=>r.month===month)){toast('该月份已生成，请勿重复执行');return;}
  const boundary=month+'-01 00:00:00',gmvs=new Map(inputs.map(i=>[Number(i.dataset.id),readGmv(i)]));
  const autoApprovedIds=processDueApprovals(boundary,false);
  const results=simulationRows().map(c=>{const gmv=gmvs.get(c.id)??c.gmv;return {c,gmv,...monthlyDecision(c,gmv,sourceMonth)};});
  results.forEach(r=>{
    r.c.history.push({cycleId:r.c.currentCycleId,month,rate:r.after,matchedRate:r.matched,sourceMonth,gmv:r.gmv,ruleVersion:version.version,protection:structuredClone(r.protection),presetId:r.presetId,source:r.result});
    if(r.presetId){const preset=state.presets.find(p=>p.id===r.presetId);preset.status='applied';const log=state.changeLogs.find(l=>l.id===preset.changeId);if(log)addAuditEvent(log,'配置已生效',month+'-01 00:00:00','系统');}
    r.c.gmv=0;r.c.rate=r.after;r.c.updated=`${month}-01 00:00:00`;if(r.c.status==='unconfigured')r.c.status='effective';
  });
  state.recalculations.push({sourceMonth,month,autoApprovedIds,ruleVersion:version.version,created:`${month}-01 00:00:00`,results:results.map(r=>({channelId:r.c.id,before:r.before,after:r.after,matched:r.matched,result:r.result,protection:structuredClone(r.protection)}))});
  state.channels.forEach(c=>c.gmv=0);
  state.month=month;state.demoDate=month+'-01';state.demoClock='00:00:00';autoApprovedIds.push(...processDueApprovals(boundary));render();
  showDialog(`${monthText(month)}比例记录已生成`,`<div class="sim-header"><span>依据${monthText(sourceMonth)}业绩 · ${monthText(month)}月1日生效 · ${autoApprovedIds.length}条申请已满7天，系统自动生效</span></div><div class="table-wrap"><table class="mini-table"><thead><tr><th>渠道</th><th>原比例</th><th>业绩匹配</th><th>本月生效</th><th>调整结果</th></tr></thead><tbody>${results.map(r=>`<tr><td>${esc(r.c.name)}</td><td>${r.before===null?'—':r.before+'%'}</td><td>${r.matched===null?'未匹配':r.matched+'%'}</td><td><b>${r.after}%</b></td><td>${tag(r.result,r.result==='降档'?'orange':'blue')}<span class="small">${r.reason}</span></td></tr>`).join('')}</tbody></table></div>`,`<button class="btn" data-close>关闭</button><button class="btn primary" data-action="next-simulation">继续演示下月</button>`,'wide','simulation');
}
function showIp(id){const c=channelById(id);showDialog('可申请的IP',`<div class="detail-company">${company(c)}</div><div class="table-wrap"><table class="mini-table"><thead><tr><th>可申请的IP</th><th>KOC分成比例</th><th>渠道奖励金比例</th></tr></thead><tbody>${c.ips.map((ip,i)=>`<tr><td>${esc(ip)}</td><td>70%</td><td>${i===0?'0.5':'0'}%</td></tr>`).join('')||'<tr><td colspan="3" class="empty">全部合作IP，具体配置复用线上</td></tr>'}</tbody></table></div><p class="detail-tip">上述为模拟配置，复用原型既有信息；本次新增渠道提成比例不替代这两类比例。</p>`,closeButtons,'','channels');}
function toggleCoop(id){
  const c=channelById(id);if(cooperationLocked(c)){toast('初始配置审批通过后才可开启合作');return;}
  if(!c.active){showForm(id,true);return;}
  confirmAction('确认终止合作？',`<div class="detail-company">${company(c)}</div><p>终止后，待审批的比例修改将自动拒绝；已通过配置保留但暂停执行。</p><p class="detail-tip">恢复合作需重新配置比例与模式；旧订单仍使用原合作批次的比例。</p>`,()=>{c.active=false;closeTerminatedPlans(c);$('#main-dialog').close();render();toast('合作已终止，待审修改已自动拒绝，已通过配置暂停执行');});
}

document.addEventListener('click',e=>{
  const help=e.target.closest('[data-protection-help]');if(help){e.preventDefault();toggleProtectionHelp(help);return;}
  if(!e.target.closest('#protection-help-popover'))hideProtectionHelp();
  const close=e.target.closest('[data-close]');if(close){$('#main-dialog').close();return;}
  const nav=e.target.closest('[data-nav]');if(nav){state.view=nav.dataset.nav;state.page=1;$('#metric-popover').hidden=true;render();return;}
  const b=e.target.closest('[data-action]');if(!b)return;
  const {action,id,value}=b.dataset;
  const actions={
    page:()=>{state.page=Number(value);render();},
    tab:()=>{state.tab=value;state.page=1;$('#metric-popover').hidden=true;render();},
    'reset-filter':()=>{state.filters[activeFilterKey()]=state.view==='channels'?{q:'',status:'',dateStart:'',dateEnd:''}:{q:'',slotQ:'',type:'',month:'',dateStart:'',dateEnd:''};state.page=1;render();},
    'slot-orders':()=>showSlotOrders(id),
    'config-tab':()=>showConfig(modalContext.configChannelId,value),'change-detail':()=>showChangeDetail(id),'approval-changes':()=>showConfig(Number(id),'changes'),
    'toggle-form-coop':toggleFormCooperation,
    'edit-next-config':()=>setPresetEditing(true),'cancel-next-config':()=>setPresetEditing(false),
    create:()=>showForm(),edit:()=>showForm(id),config:()=>showConfig(id),bill:()=>showBill(id),orders:()=>showOrders(id),ip:()=>showIp(id),policy:showPolicy,'rule-config':showRuleConfig,
    'approval-messages':showApprovalMessages,'message-approval':()=>showApprovals('all',{id}),
    approvals:()=>showApprovals(),'approval-filter':()=>showApprovals(value,modalContext?.approvalScope),'approval-approve':()=>approve(id),'approval-reject':()=>reject(id),
    confirm:()=>modalContext?.confirm?.(),
    'reject-submit':submitRejection,
    simulate,'next-simulation':showSimulation,'toggle-coop':()=>toggleCoop(id),'insert-tier':()=>insertTier(Number(b.dataset.index)),'remove-tier':()=>removeTier(Number(b.dataset.index))
  };actions[action]?.();
});
document.addEventListener('submit',e=>{
  if(e.target.id==='rules-form'){e.preventDefault();saveRules(e.target);}
  if(e.target.id==='channel-form'){e.preventDefault();saveChannel(e.target);}
  if(e.target.id==='filters'){e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(f.dateStart&&f.dateEnd&&f.dateStart>f.dateEnd){$('#filter-error').textContent='开始日期不能晚于结束日期。';return;}state.filters[activeFilterKey()]=f;state.page=1;$('#metric-popover').hidden=true;render();}
});
document.addEventListener('input',e=>{
  if(e.target.closest('#rules-form')){ruleDraft=readRuleDraft();updateRuleAddState();$('#rules-error').textContent='';}
  if(e.target.closest('#channel-form')){$('#channel-form-error').textContent='';updateFormDecision();}
  if(e.target.classList.contains('gmv-input'))updateSimulation();
  if(e.target.id==='ip-search'){const q=e.target.value.trim();let n=0;document.querySelectorAll('[data-ip-name]').forEach(c=>{c.hidden=!c.dataset.ipName.includes(q);if(!c.hidden)n++;});$('#ip-empty').hidden=n>0;}
});
document.addEventListener('change',e=>{
  if(e.target.closest('#channel-form'))updateFormDecision();
  if(e.target.id==='role'){state.role=e.target.value;if($('#main-dialog').open)$('#main-dialog').close();render();}
  if(e.target.id==='demo-date'){
    const value=e.target.value;if(value<state.month+'-01'||value>state.month+'-'+monthDays(state.month)){render();toast('请选择当前演示月份内的日期');return;}
    state.demoDate=value;processDueApprovals();if($('#main-dialog').open)$('#main-dialog').close();render();
  }
  if(e.target.id==='demo-time'){state.demoClock=e.target.value.length===5?e.target.value+':00':e.target.value;processDueApprovals();if($('#main-dialog').open)$('#main-dialog').close();render();}
  if(e.target.id==='page-size'){state.pageSize=Number(e.target.value);state.page=1;render();}
});
document.addEventListener('click',e=>{if(e.target.closest('#metric-explain')){$('#metric-popover').hidden=!$('#metric-popover').hidden;return;}if(!e.target.closest('#metric-popover'))$('#metric-popover').hidden=true;});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#protection-help-popover')){e.preventDefault();hideProtectionHelp();}$('#metric-popover').hidden=true;}});
$('#main-dialog').addEventListener('scroll',hideProtectionHelp,true);
window.addEventListener('resize',hideProtectionHelp);
$('#main-dialog').addEventListener('close',()=>{hideProtectionHelp();currentModal='';modalContext=null;ruleDraft=null;renderPRD(state.view);if(lastFocus?.isConnected)lastFocus.focus();});
$('#main-dialog').addEventListener('click',e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();});
$('#open-simulation').addEventListener('click',showSimulation);
$('#reset-demo').addEventListener('click',()=>confirmAction('重置演示数据？','<p>本页新增渠道、审批结果及升档记录将恢复为初始模拟数据，不影响真实系统。</p>',()=>{$('#main-dialog').close();state=buildSeed();render();toast('已恢复初始演示数据');},'重置演示'));
// 暴露只读快照供本地交互核验，不提供任何生产数据或接口。
window.ChannelDemo={snapshot:()=>structuredClone(state),billData:id=>billData(state.bills.find(b=>b.id===id)),rateAt:(id,m,cycleId)=>structuredClone(rateAt(channelById(id),m,cycleId)),partData:(id,part)=>structuredClone(calcPart(channelById(id),part)),tierRate,approvalDeadline,protectionProgress,preview:(id,gmv,m)=>structuredClone(monthlyDecision(channelById(id),gmv,m)),slotRows:()=>structuredClone(slotRows())};
render();
