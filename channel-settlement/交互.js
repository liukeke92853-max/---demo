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
const cutover = '2026-11';
let currentModal = '', modalContext = null, lastFocus = null, toastTimer;
function buildSeed(){
  const ruleVersions=[{version:1,effectiveMonth:cutover,operator:'初始演示配置',savedAt:'2026-11-21 10:00:00',tiers:[
    {level:'L1',min:0,max:100000000,rate:50},
    {level:'L2',min:100000000,max:200000000,rate:70},
    {level:'L3',min:200000000,max:300000000,rate:80},
    {level:'L4',min:300000000,max:null,rate:100}
  ]}];
  const profiles = [
    {id:1536835,name:'sena',color:'#d5c6a8',rate:30,gmv:100000000},
    {id:2746650,name:'抖音运营',color:'#b3bfcf',rate:50,gmv:200000000},
    {id:2208085,name:'Douboss_8752',color:'#d0c3e1',rate:20,gmv:300000000},
    {id:2158208,name:'青禾工作室',color:'#bbd5c7',rate:70,gmv:170000000},
    {id:223324,name:'王泽',color:'#b8cbe7',rate:100,gmv:350000000},
    {id:2831509,name:'木棉传媒',color:'#efd0ba',rate:null,gmv:0},
    {id:2680091,name:'暖阳推广',color:'#c6d6e4',rate:30,gmv:0,active:false},
    {id:2680092,name:'远川传媒',color:'#d6cde6',rate:null,gmv:170000000,active:true}
  ];
  const channels=profiles.map((p,i)=>({...p,origin:p.id===2831509?'new':'existing',active:p.id!==2831509&&p.active!==false,phone:`1380000${String(i+1).padStart(4,'0')}`,ips:i%2?['纪广','王乐康']:['纪广','胡允'],protect:7,inviteProtect:7,created:`2026-08-${String(6+i).padStart(2,'0')} 15:30:00`,updated:'2026-11-01 00:00:00',status:p.rate===null?(p.id===2831509?'pending':'unconfigured'):'effective',history:p.rate===null?[]:[
    {month:'2026-08',rate:20,source:'历史旧规则',level:'L1'},
    {month:'2026-09',rate:i%2?30:50,source:'历史旧规则',level:i%2?'L3':'L5'},
    {month:'2026-10',rate:i%2?30:50,source:'历史旧规则',level:i%2?'L3':'L5'},
    {month:'2026-11',rate:p.rate,source:p.rate>50?'高比例审批通过（模拟）':'切换月初始配置（模拟）'}
  ]}));
  const bills=[];
  const bill=(id,enter,parts)=>bills.push({id:`${id}-${enter}`,channelId:id,enter,parts:parts.map(([pay,base,count])=>({pay,base,count})),created:`${nextMonth(enter)}-01 00:00:42`});
  bill(1536835,'2026-10',[['2026-08',5000,7],['2026-09',8000,12],['2026-10',13115,25]]);
  bill(1536835,'2026-11',[['2026-10',12115,16],['2026-11',14000,28]]);
  bill(2746650,'2026-11',[['2026-10',1200,2],['2026-11',2566,3]]);
  bill(2208085,'2026-11',[['2026-11',583,1]]);
  bill(2158208,'2026-11',[['2026-10',100000,21],['2026-11',240000,46]]);
  bill(223324,'2026-11',[['2026-11',180000,30]]);
  bill(2680091,'2026-11',[['2026-10',25000,8]]);
  bill(1536835,'2026-12',[['2026-10',10000,4],['2026-11',20000,6]]);
  bill(1536835,'2027-01',[['2026-11',10000,2]]);
  return {view:'settlement',tab:'channel',month:'2026-11',role:'operator',channels,bills,ruleVersions,recalculations:[],rateChanges:[],notifications:[],approvalSequence:1,approvals:[{id:'AP-001',kind:'create',beforeRate:null,channelSnapshot:structuredClone(channels.find(c=>c.id===2831509)),channelId:2831509,rate:80,reason:'长期合作渠道，承担独立团队的招募与运营成本，申请80%提成。',month:'2026-11',status:'pending',applicant:'木豆',applicantId:'demo-mudou',created:'2026-11-21 10:00:00'}],filters:{settlement:{q:'',month:'2026-11',dateStart:'',dateEnd:''},channels:{q:'',status:'',dateStart:'',dateEnd:''}},page:1,pageSize:20};
}
let state = buildSeed();
const channelById = id => state.channels.find(c=>c.id===Number(id));
const cooperationLocked=c=>c.origin==='new'&&c.status!=='effective'&&c.history.length===0;
const cooperationFilter=c=>c.active?'true':cooperationLocked(c)?'unstarted':'false';
function rateAt(c,month){
  if(!c)return null;
  const exact=c.history.find(h=>h.month===month);
  if(exact) return exact;
  if(month<cutover||month>state.month) return null;
  const earlier=c.history.filter(h=>h.month>=cutover&&h.month<=month).sort((a,b)=>b.month.localeCompare(a.month));
  return earlier[0]||null;
}
function ruleVersionFor(month=state.month){
  return state.ruleVersions.filter(v=>v.effectiveMonth<=month).sort((a,b)=>b.effectiveMonth.localeCompare(a.effectiveMonth)||b.version-a.version)[0];
}
function tierForGmv(gmv,month=state.month){const tiers=ruleVersionFor(month).tiers;return gmv===0?tiers[0]:tiers.find(t=>gmv>t.min&&(t.max===null||gmv<=t.max));}
function tierRate(gmv,month=state.month){return tierForGmv(gmv,month)?.rate??0;}
function upgradedRate(rate,gmv,month=state.month){return Math.max(rate,tierRate(gmv,month));}
function levelForRate(rate,month=state.month){return ruleVersionFor(month).tiers.filter(t=>t.rate<=rate).at(-1)?.level||'L1';}
function calcPart(c,p){const h=rateAt(c,p.pay);return {...p,rate:h?.rate??null,source:h?.source??'未取得适用比例',level:h?.level,commission:h?Math.floor(p.base*Math.round(h.rate*100)/10000):null};}
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
  return `<section class="card filter-card"><div class="tab-row">${list?'<button class="active" type="button">渠道列表</button>':`<button type="button" data-action="tab" data-value="channel" class="${state.tab==='channel'?'active':''}">渠道</button><button type="button" data-action="tab" data-value="slot" class="${state.tab==='slot'?'active':''}">推广位</button>`}<button type="button" class="reset-link" data-action="reset-filter">♢ 重置</button></div><form class="filters" id="filters"><div class="filter-control dates"><select aria-label="时间类型"><option>创建时间</option></select><input type="date" name="dateStart" value="${esc(f.dateStart)}" aria-label="开始日期"><span>—</span><input type="date" name="dateEnd" value="${esc(f.dateEnd)}" aria-label="结束日期"></div>${list?`<div class="filter-control"><span>合作状态${mark()}</span><select name="status" aria-label="合作状态"><option value="">全部</option><option value="true" ${f.status==='true'?'selected':''}>合作中</option><option value="false" ${f.status==='false'?'selected':''}>已终止</option><option value="unstarted" ${f.status==='unstarted'?'selected':''}>未开启</option></select></div>`:`<div class="filter-control"><span>入账月份</span><select name="month" aria-label="入账月份"><option value="">全部月份</option>${['2026-10','2026-11','2026-12','2027-01'].map(m=>`<option value="${m}" ${f.month===m?'selected':''}>${monthText(m)}</option>`).join('')}</select></div>`}<div class="filter-control search"><input name="q" aria-label="渠道信息" placeholder="机构ID / 机构名称 / 手机号" value="${esc(f.q)}"></div><button class="btn primary" type="submit">筛选</button></form><p class="form-error" id="filter-error"></p></section>`;
}
function renderChannels(){
  const rows=visibleChannels(),pending=state.approvals.filter(a=>a.status==='pending').length;
  const body=paged(rows).map(c=>{const h=rateAt(c,state.month),a=state.approvals.find(a=>a.channelId===c.id&&a.status==='pending');return `<tr><td>${company(c)}</td><td><button class="switch ${c.active?'on':''}" data-action="toggle-coop" data-id="${c.id}" ${cooperationLocked(c)?'disabled':''} aria-label="${c.active?'终止':'开启'}${esc(c.name)}合作"></button><span style="margin-left:7px;font-size:11px;color:#8e99aa">${c.active?'合作中':cooperationLocked(c)?'未开启':'已终止'}</span></td><td>${c.ips.map(esc).join('、')||'全部合作IP'}</td><td><span class="rate">${h?h.rate+'%':'—'}</span>${h?`<span class="small">${monthText(state.month)} 付款订单</span>`:''}</td><td>${tag(c.status==='pending'?'待审批':c.status==='rejected'?'已驳回':c.status==='unconfigured'?'待核算':'已生效',c.status==='pending'?'orange':c.status==='rejected'?'red':'green')}${a?`<span class="small">申请 ${a.rate}%</span>`:''}</td><td>${c.protect}天<span class="small">邀约 ${c.inviteProtect}天</span></td><td>${esc(c.updated)}</td><td><div class="operations"><button class="link" data-action="edit" data-id="${c.id}">编辑</button><button class="link" data-action="config" data-id="${c.id}">查看配置</button>${h?`<button class="link" data-action="rate-edit" data-id="${c.id}">修改提成${mark('新增')}</button>`:''}<button class="link" data-action="ip" data-id="${c.id}">可申请的IP</button></div></td></tr>`;}).join('');
  return `<section class="card"><div class="section-heading"><h1>数据列表</h1><div class="section-actions"><button class="link" data-action="approvals">提成修改审批 ${pending?tag(pending,'orange'):''}${mark('新增')}</button><button class="btn primary" data-action="create">＋ 新增渠道</button></div></div><div class="review-strip"><span>当前付款月 <b>${monthText(state.month)}</b> · 比例配置不依赖入账账单生成</span><button class="link" style="font-size:11px" data-action="policy">查看升档规则</button></div><div class="table-wrap"><table id="channels-table"><thead><tr><th>机构信息</th><th>合作状态</th><th>可申请的IP</th><th>生效提成比例${mark('新增')}</th><th>配置状态${mark('新增')}</th><th>渠道保护期</th><th>更新时间</th><th>操作</th></tr></thead><tbody>${body||'<tr><td colspan="8" class="empty"><span>⌕</span>暂无符合条件的渠道，请调整筛选条件</td></tr>'}</tbody></table></div>${renderPager(rows)}</section>`;
}
function renderSettlement(){
  if(state.tab==='slot')return renderSlots();
  const rows=visibleBills(),sum=rows.reduce((a,b)=>({count:a.count+b.count,base:a.base+b.base,commission:a.commission+(b.commission||0)}),{count:0,base:0,commission:0});
  return `<section class="card"><div class="section-heading"><h1>数据列表</h1><div class="section-actions"><button class="btn" data-action="rule-config">等级规则配置${mark('新增')}</button><button class="link muted" id="metric-explain">指标说明 ⓘ</button></div></div><div class="metrics"><div class="metric"><label>总订单</label><b>${sum.count}</b></div><div class="metric"><label>可分成金额</label><b>${money(sum.base)}</b></div><div class="metric"><label>总提成</label><b>${money(sum.commission)}</b></div></div><div class="review-strip"><span>新规则自 <b>2026.11</b> 付款月起切换；更早付款的订单保留历史比例</span><span>以下为模拟账单，含延迟入账示例</span></div><div class="table-wrap"><table id="settlement-table"><thead><tr><th>渠道信息</th><th>入账月份</th><th>付款月份／提成比例${mark()}</th><th>订单数</th><th>可分成金额</th><th>提成金额</th><th>创建时间</th><th>操作</th></tr></thead><tbody>${paged(rows).map(b=>`<tr><td>${company(b.c)}</td><td class="num">${monthText(b.enter)}</td><td><button class="link" data-action="bill" data-id="${b.id}">查看</button></td><td>${b.count}</td><td class="num">¥${money(b.base)}</td><td class="num">${b.commission===null?'—':'¥'+money(b.commission)}</td><td class="num">${b.created}</td><td><button class="link" data-action="orders" data-id="${b.id}">订单明细</button></td></tr>`).join('')||'<tr><td colspan="8" class="empty"><span>⌕</span>暂无符合条件的结算记录</td></tr>'}</tbody></table></div>${renderPager(rows)}</section>`;
}
function renderPRD(key){$('#page-prd').innerHTML=ChannelPRD.render(key==='settlement'&&state.tab==='slot'?'slots':key);}
function render(){
  $('#demo-month').textContent=`演示月份 ${monthText(state.month)}`;
  $('#user-avatar').textContent=state.role==='approver'?'青':'木';
  $('#role').value=state.role;
  document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===state.view));
  $('#page').innerHTML=renderFilter()+(state.view==='channels'?renderChannels():renderSettlement());
  renderPRD(currentModal||state.view);
}
function toast(t){clearTimeout(toastTimer);$('#toast').textContent=t;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,3200);}
function showDialog(title,body,footer='',kind='',key=''){
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
  showDialog('付款月份／提成比例',`<div class="detail-company">${company(data.c)}</div><div class="table-wrap"><table class="mini-table"><thead><tr><th>付款月份</th><th>提成比例</th><th>可分成金额</th><th>提成金额</th></tr></thead><tbody>${[...data.parts].sort((a,b)=>b.pay.localeCompare(a.pay)).map(p=>`<tr><td>${monthText(p.pay)}${p.pay<cutover?'<span class="small">历史旧规则'+(p.level?' · '+p.level:'')+'</span>':''}</td><td><span class="rate" style="font-size:14px">${p.rate}%</span></td><td>¥${money(p.base)}</td><td>¥${money(p.commission)}</td></tr>`).join('')}</tbody></table></div>`,closeButtons,'','settlement');
}
function showConfig(id){const c=channelById(id),a=state.approvals.find(a=>a.channelId===c.id&&a.status==='pending')||state.approvals.find(a=>a.channelId===c.id&&!(a.kind==='create'&&a.status==='rejected'));showDialog('提成配置',`<div class="detail-company">${company(c)}</div>${a&&a.status!=='approved'?`<div class="decision-card orange">${a.status==='pending'?'申请中':'申请已驳回'}：${a.rate}%${a.rejectReason?'<br>驳回原因：'+esc(a.rejectReason):''}<br>申请比例尚未生效</div>`:''}<div class="table-wrap"><table class="mini-table"><thead><tr><th>适用付款月份</th><th>提成比例</th><th>来源</th></tr></thead><tbody>${[...c.history].sort((a,b)=>b.month.localeCompare(a.month)).map(h=>`<tr><td>${monthText(h.month)}</td><td>${h.rate}%</td><td>${esc(h.source)}${h.level?' · '+h.level:''}</td></tr>`).join('')||'<tr><td colspan="3" class="empty">暂无已生效配置</td></tr>'}</tbody></table></div>`,closeButtons,'','channels');}
function showOrders(id){
  const b=billData(state.bills.find(x=>x.id===id));let count=0;
  const orders=b.parts.flatMap(p=>Array.from({length:p.count},(_,i)=>{count++;return {id:`2026${String(b.c.id).slice(-5)}${String(count).padStart(5,'0')}`,pay:p.pay,base:Math.floor(p.base/p.count)+(i<p.base%p.count?1:0),rate:p.rate};}));
  showDialog('订单明细',`<div class="detail-company">${company(b.c)}</div><div class="review-strip">${monthText(b.enter)} 入账 · ${orders.length}笔模拟订单 · 实际可分成金额合计 ¥${money(b.base)}</div><div class="table-wrap" style="max-height:430px"><table class="mini-table"><thead><tr><th>订单编号</th><th>付款月份</th><th>适用比例</th><th>可分成金额</th></tr></thead><tbody>${orders.map(o=>`<tr><td>${o.id}</td><td>${monthText(o.pay)}</td><td>${o.rate}%</td><td>¥${money(o.base)}</td></tr>`).join('')}</tbody></table></div><p class="detail-tip">订单为账单核对用模拟记录。正式订单详情是否增加适用比例字段待评审。</p>`,closeButtons,'wide','settlement');
}
const availableCompanies=[{id:2831509,name:'木棉传媒'},{id:3895102,name:'星禾传媒'},{id:3895103,name:'海棠工作室'},{id:3895104,name:'晚风推广'},{id:3895105,name:'拾光文化'}];
function showForm(id){
  const c=id?channelById(id):null;
  modalContext={editing:c?.id||null};
  const h=c?rateAt(c,state.month):null;
  showDialog(c?'编辑渠道':'新增渠道',`<form id="channel-form" novalidate><div class="form-field"><label class="required" for="company-select">选择机构</label><select id="company-select" name="company" ${c?'disabled':''}><option value="">请选择机构</option>${(c?[c]:availableCompanies.filter(x=>!state.channels.some(c=>c.id===x.id))).map(x=>`<option value="${x.id}" ${c?'selected':''}>${esc(x.name)} · 机构ID ${x.id}</option>`).join('')}</select><p class="form-help">按机构ID选择，机构不可重复创建为渠道。</p></div><div class="form-field"><label>可申请的IP</label><input id="ip-search" placeholder="搜索IP名称" aria-label="搜索可申请的IP" style="margin-bottom:10px"><div class="ip-choices">${['纪广','潘夏彤','胡允','傅彭薄','王乐康'].map(n=>`<label class="ip-choice" data-ip-name="${n}"><input type="checkbox" name="ips" value="${n}" ${c?.ips.includes(n)?'checked':''}>${n}</label>`).join('')}</div><p class="small" id="ip-empty" hidden>没有匹配的IP</p></div><div class="form-field"><label class="required" for="initial-rate">${c?'当前生效提成比例':'初始提成比例'}${mark('新增')}</label><div class="input-unit"><input id="initial-rate" name="rate" type="number" inputmode="decimal" min="0" max="100" step="0.01" placeholder="请输入提成比例" ${c?`disabled value="${h?.rate??''}"`:'value="50"'}><span>%</span></div><p class="form-help" id="rate-month-help">适用付款月份：${monthText(state.month)}${c?' · 此处只读':''}</p></div><div class="form-field" id="reason-field" hidden><label class="required" for="apply-reason">申请原因</label><textarea id="apply-reason" name="reason" placeholder="请说明申请超过50%提成比例的原因"></textarea></div>${c?`<div class="decision-card" style="margin-bottom:20px">${h?`${h.rate}%`:'尚无生效比例'}<br>此处仅保存基础资料，不变更已有提成配置。</div>`:'<div class="decision-card" id="rate-decision" style="margin-bottom:20px">填写初始比例后显示生效方式。</div>'}<div class="form-grid"><div class="form-field"><label class="required" for="protect-days">渠道保护期</label><div class="input-unit"><input id="protect-days" name="protect" type="number" min="0" max="100" step="1" value="${c?.protect??7}"><span>天</span></div></div><div class="form-field"><label class="required" for="invite-days">邀约保护期</label><div class="input-unit"><input id="invite-days" name="inviteProtect" type="number" min="0" max="100" step="1" value="${c?.inviteProtect??7}"><span>天</span></div></div></div><div class="form-field"><label class="required" for="coop-status">合作状态</label><select id="coop-status" name="active" ${c&&cooperationLocked(c)?'disabled':''}><option value="true" ${c?.active!==false?'selected':''}>合作中</option><option value="false" ${c?.active===false?'selected':''}>${c&&cooperationLocked(c)?'未开启':'终止合作'}</option></select></div><p class="form-error" id="channel-form-error" role="alert"></p></form>`,`<button class="btn" data-close>取消</button><button class="btn primary" id="save-channel" type="submit" form="channel-form">${c?'保存基础资料':'保存并生效'}</button>`,'drawer','form');
  if(!c)updateRateDecision();
}
function updateRateDecision(){
  if(!$('#rate-decision'))return;
  const raw=$('#initial-rate').value,rate=Number(raw),special=raw!==''&&Number.isFinite(rate)&&rate>50;
  const coop=$('#coop-status');
  if(special&&!coop.disabled)coop.dataset.normalValue=coop.value;
  if(!special&&coop.disabled)coop.value=coop.dataset.normalValue||'true';
  if(special)coop.value='false';
  coop.disabled=special;
  coop.querySelector('[value="false"]').textContent=special?'未开启（待审批）':'终止合作';
  $('#reason-field').hidden=!special;
  $('#rate-month-help').textContent=`${special?'申请月份':'适用付款月份'}：${monthText(state.month)}`;
  $('#rate-decision').classList.toggle('orange',special);
  $('#rate-decision').innerHTML=raw===''?'填写初始比例后显示生效方式。':special?`<strong>${esc(raw)}% · 审批通过后生效</strong><br>合作暂不开启；审批通过后开启合作，适用于通过时间当月的付款订单。后续统一参与月末自动升档。`:`<strong>${esc(raw)}% · 保存后直接生效</strong><br>月末按当月GMV判断是否升档，只升不降。`;
  $('#save-channel').textContent=special?'提交审批':'保存并生效';
}
function saveChannel(form){
  const d=new FormData(form),editing=modalContext?.editing,error=$('#channel-form-error');
  const protect=Number(d.get('protect')),invite=Number(d.get('inviteProtect'));
  if(['protect','inviteProtect'].some(k=>String(d.get(k)??'').trim()==='')||![protect,invite].every(n=>Number.isInteger(n)&&n>=0&&n<=100)){error.textContent='请填写0～100之间的整数保护期。';return;}
  const ips=d.getAll('ips'),active=d.get('active')==='true';
  if(editing){const c=channelById(editing);Object.assign(c,{ips,active:cooperationLocked(c)?false:active,protect,inviteProtect:invite,updated:`${state.month}-21 10:30:00`});$('#main-dialog').close();render();toast('基础资料已保存，提成配置保持不变');return;}
  const companyId=Number(d.get('company')),raw=String(d.get('rate')??''),rate=Number(raw),reason=String(d.get('reason')??'').trim();
  if(!companyId){error.textContent='请选择机构。';return;}
  if(state.channels.some(c=>c.id===companyId)){error.textContent='该机构已经是渠道，请勿重复创建。';return;}
  if(raw.trim()===''||!Number.isFinite(rate)||rate<0||rate>100||!/^(?:\d+)(?:\.\d{1,2})?$/.test(raw)){error.textContent='请填写0～100的数字，最多保留两位小数（Demo校验范围）。';return;}
  if(rate>50&&!reason){error.textContent='超过50%的提成比例须填写申请原因。';return;}
  const profile=availableCompanies.find(c=>c.id===companyId);if(!profile)return;
  const c={...profile,origin:'new',phone:'13800009999',color:'#c9d9f1',rate:rate>50?null:rate,status:rate>50?'pending':'effective',ips,active:rate>50?false:active,protect,inviteProtect:invite,created:`${state.month}-21 10:30:00`,updated:`${state.month}-21 10:30:00`,history:rate>50?[]:[{month:state.month,rate,source:'新增渠道初始配置'}],gmv:0};
  state.channels.unshift(c);
  if(rate>50)state.approvals.unshift({id:`AP-${String(++state.approvalSequence).padStart(3,'0')}`,kind:'create',beforeRate:null,channelSnapshot:structuredClone(c),channelId:companyId,rate,reason,month:state.month,status:'pending',applicant:'木豆',applicantId:'demo-mudou',created:c.created});
  state.view='channels';state.filters.channels={q:'',status:'',dateStart:'',dateEnd:''};state.page=1;$('#main-dialog').close();render();toast(rate>50?'申请已提交，合作待审批通过后开启':'渠道已新增，初始提成比例已生效');
}
function demoTime(){const time=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',dateStyle:'short',timeStyle:'medium'}).format(new Date());return state.month+time.slice(7);}
function updateConfigStatus(c,fallback){c.status=state.approvals.some(a=>a.channelId===c.id&&a.status==='pending')?'pending':fallback;}
function writeManualRate(c,month,rate,source,approvalId=null){
  const before=rateAt(c,month),record={month,rate,source,level:levelForRate(rate,month),approvalId};
  const index=c.history.findIndex(h=>h.month===month);if(index<0)c.history.push(record);else c.history[index]=record;
  state.rateChanges.push({channelId:c.id,month,before:before?structuredClone(before):null,after:structuredClone(record),time:demoTime(),approvalId});
  c.rate=rate;c.updated=demoTime();
}
function showRateEdit(id){
  const c=channelById(id),h=rateAt(c,state.month);if(!h)return;
  modalContext={rateChannelId:c.id};
  showDialog('修改提成比例',`<form id='rate-form' novalidate><div class='detail-company'>${company(c)}</div><div class='form-field'><label>当前生效提成比例</label><div class='rate'>${h.rate}%</div></div><div class='form-field'><label class='required' for='target-rate'>修改后提成比例</label><div class='input-unit'><input id='target-rate' name='rate' type='number' min='0' max='100' step='0.01' value='${h.rate}' data-original='${h.rate}'><span>%</span></div></div><div class='form-field' id='rate-reason-field' hidden><label class='required' for='rate-reason'>申请原因</label><textarea id='rate-reason' name='reason' placeholder='请说明修改提成比例的原因'></textarea></div><div class='decision-card' id='rate-edit-decision'></div><p class='form-error' id='rate-edit-error' role='alert'></p></form>`,`<button class='btn' data-close>取消</button><button class='btn primary' id='save-rate' form='rate-form' type='submit'>保存</button>`,'','rateChange');
  updateRateEdit();
}
function updateRateEdit(){
  const input=$('#target-rate'),raw=input.value,rate=Number(raw),changed=raw!==''&&rate!==Number(input.dataset.original),needsApproval=changed&&rate>50;
  $('#rate-reason-field').hidden=!needsApproval;
  $('#rate-edit-decision').textContent=!changed?'修改后请保存。':needsApproval?'审批通过前按当前生效比例执行；通过后适用于通过时间当月付款订单。':'保存后适用于本月整月付款订单。';
  $('#save-rate').textContent=needsApproval?'提交审批':'保存并生效';
}
function saveRateEdit(form){
  const c=channelById(modalContext?.rateChannelId);if(!c)return;
  const h=rateAt(c,state.month),d=new FormData(form),raw=String(d.get('rate')??''),rate=Number(raw),reason=String(d.get('reason')??'').trim(),error=$('#rate-edit-error');
  if(!h){error.textContent='暂无生效比例，不能修改。';return;}
  if(!/^\d+(?:\.\d{1,2})?$/.test(raw)||rate<0||rate>100){error.textContent='请填写0～100的数字，最多保留两位小数。';return;}
  if(rate===h.rate){toast('提成比例没有变化');return;}
  if(rate<h.rate){error.textContent='修改后比例不得低于当前生效比例。';return;}
  if(rate>50&&!reason){error.textContent='超过50%的目标比例须填写申请原因。';return;}
  if(rate>50){
    state.approvals.unshift({id:`AP-${String(++state.approvalSequence).padStart(3,'0')}`,kind:'change',beforeRate:h.rate,channelId:c.id,rate,reason,month:state.month,status:'pending',applicant:'木豆',applicantId:'demo-mudou',created:demoTime()});
    c.status='pending';c.updated=demoTime();
  }else{
    writeManualRate(c,state.month,rate,'人工修改直接生效');updateConfigStatus(c,'effective');
  }
  $('#main-dialog').close();render();toast(rate>50?'修改申请已提交，原比例继续生效':'提成比例已修改，本月整月生效');
}
function showApprovals(filter='pending'){
  modalContext={filter};
  const list=state.approvals.filter(a=>filter==='all'||a.status===filter),can=state.role==='approver';
  showDialog('提成修改审批',`<div class='pill-tabs'><span class='small'>审批状态${mark('新增')}</span><button data-action='approval-filter' data-value='pending' class='${filter==='pending'?'active':''}'>待审批</button><button data-action='approval-filter' data-value='all' class='${filter==='all'?'active':''}'>全部记录</button></div>${list.map(a=>{const live=channelById(a.channelId),c=a.channelSnapshot||live,h=live&&!(a.kind==='create'&&a.status==='rejected')?rateAt(live,state.month):null;return `<article class='approval-row'><div class='approval-heading'>${company(c)}${tag(a.status==='pending'?'待审批':a.status==='approved'?'已通过':'已驳回',a.status==='pending'?'orange':a.status==='approved'?'green':'red')}</div><div class='approval-detail'><div><span>申请类型</span>${a.kind==='change'?'修改提成':'新增渠道'}</div><div><span>申请提成比例</span><strong class='rate'>${a.rate}%</strong></div><div><span>申请时原比例</span>${a.beforeRate===null?'—':a.beforeRate+'%'}</div><div><span>当前生效比例</span>${h?h.rate+'%':'—'}</div><div><span>申请月份</span>${monthText(a.month)}</div><div><span>申请人</span>${esc(a.applicant)}</div>${a.effectiveMonth?`<div><span>生效付款月份</span>${monthText(a.effectiveMonth)}</div><div><span>通过时间</span>${esc(a.approvedAt)}</div>`:''}</div><p>申请原因：${esc(a.reason)}</p>${a.rejectReason?`<p class='warning-text'>驳回原因：${esc(a.rejectReason)}</p>`:''}<div class='small'>${esc(a.created)}</div>${can&&a.status==='pending'?`<div class='approval-actions'><button class='link danger' data-action='approval-reject' data-id='${a.id}'>驳回</button><button class='btn primary small' data-action='approval-approve' data-id='${a.id}'>通过</button></div>`:''}</article>`;}).join('')||'<div class="empty">暂无待审批记录</div>'}`,closeButtons,'wide','approval');
}
function approve(id){
  const a=state.approvals.find(a=>a.id===id);if(!a||a.status!=='pending'||state.role!=='approver')return;
  const canApprove=()=>{const current=rateAt(channelById(a.channelId),state.month);if(current&&a.rate<current.rate){toast(`当前生效比例已为${current.rate}%，不能通过更低比例的申请`);return false;}return true;};
  if(!canApprove())return;
  confirmAction('确认通过提成申请？',`<div class='detail-company'>${company(channelById(a.channelId))}</div><div class='decision-card'>确认后，<strong>${a.rate}%</strong>提成比例生效，适用于付款时间在${monthChinese(state.month)}的渠道订单。<br>${a.kind==='create'?'同时开启渠道合作；':''}后续统一参与月末自动升档。</div>`,()=>{
    if(a.status!=='pending'||state.role!=='approver'||!canApprove())return;
    const c=channelById(a.channelId);a.status='approved';a.approver='青椒';a.approvedAt=demoTime();a.effectiveMonth=state.month;
    writeManualRate(c,a.effectiveMonth,a.rate,'审批通过 · 青椒（模拟）',a.id);
    if(a.kind==='create')c.active=true;
    updateConfigStatus(c,'effective');render();showApprovals('all');toast(a.kind==='create'?'审批通过，合作已开启，提成比例已生效':'审批通过，新比例适用于通过时间当月订单');
  },'确认通过');
}
function reject(id){const a=state.approvals.find(a=>a.id===id);if(!a||a.status!=='pending'||state.role!=='approver')return;modalContext={rejectId:id};showDialog('驳回提成申请',`<div class="detail-company">${company(channelById(a.channelId))}</div><div class="form-field"><label class="required" for="reject-reason">驳回原因</label><textarea id="reject-reason" placeholder="请填写驳回原因"></textarea></div><p class="form-error" id="reject-error"></p>`,`<button class="btn" data-close>取消</button><button class="btn primary" data-action="reject-submit">确认驳回</button>`,'','approval');}
function submitRejection(){
  const reason=$('#reject-reason').value.trim();if(!reason){$('#reject-error').textContent='请填写驳回原因。';return;}
  const a=state.approvals.find(a=>a.id===modalContext.rejectId);if(!a||a.status!=='pending'||state.role!=='approver')return;
  const c=channelById(a.channelId);a.channelSnapshot??=structuredClone(c);a.status='rejected';a.rejectReason=reason;a.rejectedAt=demoTime();a.approver='青椒';
  if(a.kind==='create'){
    state.channels=state.channels.filter(channel=>channel.id!==a.channelId);
    // 仅记录待接入的本地消息事件，不发送真实飞书消息，不伪造发送成功。
    state.notifications.push({id:'rejection-'+a.id,kind:'create-rejected',title:'渠道新增申请已驳回',approvalId:a.id,recipientId:a.applicantId,recipient:a.applicant,channelName:a.channelSnapshot.name,rate:a.rate,reason,content:`${a.channelSnapshot.name}的渠道新增申请已驳回。驳回原因：${reason}。可重新发起新增。`,created:a.rejectedAt,status:'待接入'});
  }else updateConfigStatus(c,'rejected');
  render();showApprovals('all');toast(a.kind==='create'?'新增申请已驳回，可重新发起新增':'申请已驳回，原比例继续生效');
}
const gmvWan=n=>Number((n/1000000).toFixed(2)).toLocaleString('zh-CN',{maximumFractionDigits:2});
const gmvRangeText=t=>`${gmvWan(t.min)}（不含）－${t.max===null?'不限':gmvWan(t.max)+'（包含）'}万元`;
function showPolicy(){
  const version=ruleVersionFor();
  showDialog('渠道月度升档规则',`<div class="decision-card">月末按当月GMV及最新等级规则统一核算，适用于当月付款订单。<br>所有渠道只升不降，原比例更高则保持。</div><div class="policy-grid">${version.tiers.map(t=>`<div><small>${esc(t.level)} · ${gmvRangeText(t)}</small><b>${t.rate}%</b><p>原比例更高则保持</p></div>`).join('')}</div>`,closeButtons,'wide','simulation');
}
function simulationRows(){return state.channels.filter(c=>c.origin==='existing'||rateAt(c,state.month));}
function showSimulation(){
  const rows=simulationRows();modalContext={simulation:true};
  showDialog('演示当月月末重算',`<div class="sim-header"><strong>${monthChinese(state.month)}月末</strong><span class="muted">按当月GMV重算，适用于当月付款订单</span></div><div class="table-wrap"><table class="mini-table sim-table"><thead><tr><th>渠道</th><th>原提成比例</th><th>当月GMV（元）</th><th>本月比例预览</th></tr></thead><tbody>${rows.map(c=>`<tr><td>${esc(c.name)}</td><td>${rateAt(c,state.month)?rateAt(c,state.month).rate+'%':'—'}</td><td><input class="gmv-input" type="number" min="0" step="0.01" data-id="${c.id}" aria-label="${esc(c.name)}本月GMV" value="${c.gmv/100}"></td><td class="sim-result" data-result="${c.id}"></td></tr>`).join('')}</tbody></table></div><p class="form-error" id="simulation-error" role="alert"></p>`,`<button class="btn" data-close>取消</button><button class="btn primary" data-action="simulate">重算${monthText(state.month)}比例</button>`,'wide','simulation');
  updateSimulation();
}
function readGmv(input){const raw=input.value;return raw.trim()!==''&&/^\d+(\.\d{1,2})?$/.test(raw)&&Number.isSafeInteger(Math.round(Number(raw)*100))?Math.round(Number(raw)*100):null;}
function updateSimulation(){document.querySelectorAll('.gmv-input').forEach(input=>{const c=channelById(input.dataset.id),before=rateAt(c,state.month)?.rate??null,gmv=readGmv(input),result=$(`[data-result="${c.id}"]`);if(gmv===null){result.innerHTML='<span class="warning-text">请填写有效GMV</span>';return;}const after=upgradedRate(before??0,gmv);result.innerHTML=`<strong class="rate">${after}%</strong> ${tag(before===null?'首次定级':after>before?'升档':'保持',before===null||after>before?'green':'blue')}<span class="small">${levelForRate(after)} · GMV匹配${tierForGmv(gmv).level}</span>`;});}
function simulate(){
  const inputs=[...document.querySelectorAll('.gmv-input')];if(!inputs.length)return;
  if(inputs.some(i=>readGmv(i)===null)){$('#simulation-error').textContent='请完整填写非负GMV，最多两位小数。';return;}
  const month=state.month,version=ruleVersionFor(month),results=inputs.map(i=>{const c=channelById(i.dataset.id),record=rateAt(c,month),before=record?.rate??null,gmv=readGmv(i),after=upgradedRate(before??0,gmv,month);return {c,before,after,gmv,level:levelForRate(after,month),beforeRecord:record?structuredClone(record):null};});
  const signature=JSON.stringify({month,ruleVersion:version.version,results:results.map(r=>({id:r.c.id,gmv:r.gmv,rate:r.after,level:r.level}))});
  if(state.recalculations.at(-1)?.signature===signature&&results.every(r=>r.before===r.after&&r.beforeRecord?.ruleVersion===version.version&&r.beforeRecord?.gmv===r.gmv)){toast('本月重算结果无变化');return;}
  results.forEach(r=>{
    const history={month,rate:r.after,level:r.level,gmv:r.gmv,ruleVersion:version.version,source:r.before===null?'月末按规则首次定级':r.after>r.before?'月末自动升档':'月末核算，原比例保持'};
    const index=r.c.history.findIndex(h=>h.month===month);if(index<0)r.c.history.push(history);else r.c.history[index]=history;
    r.c.gmv=r.gmv;r.c.rate=r.after;if(r.c.status==='unconfigured')updateConfigStatus(r.c,'effective');
  });
  state.recalculations.push({month,ruleVersion:version.version,signature,results:results.map(r=>({channelId:r.c.id,beforeRecord:r.beforeRecord,after:r.after,gmv:r.gmv,level:r.level}))});
  render();
  showDialog(`${monthText(month)}月末重算完成`,`<div class="table-wrap"><table class="mini-table"><thead><tr><th>渠道</th><th>当月GMV</th><th>原比例</th><th>本月生效比例</th><th>等级</th></tr></thead><tbody>${results.map(r=>`<tr><td>${esc(r.c.name)}</td><td>¥${money(r.gmv)}</td><td>${r.before===null?'—':r.before+'%'}</td><td><b>${r.after}%</b> ${tag(r.before===null?'首次定级':r.after>r.before?'升档':'保持',r.before===null||r.after>r.before?'green':'blue')}</td><td>${r.level}</td></tr>`).join('')}</tbody></table></div>`,`<button class="btn" data-close>关闭</button><button class="btn primary" data-action="advance-month">进入下月演示</button>`,'wide','simulation');
}
function showIp(id){const c=channelById(id);showDialog('可申请的IP',`<div class="detail-company">${company(c)}</div><div class="table-wrap"><table class="mini-table"><thead><tr><th>可申请的IP</th><th>KOC分成比例</th><th>渠道奖励金比例</th></tr></thead><tbody>${c.ips.map((ip,i)=>`<tr><td>${esc(ip)}</td><td>70%</td><td>${i===0?'0.5':'0'}%</td></tr>`).join('')||'<tr><td colspan="3" class="empty">全部合作IP，具体配置复用线上</td></tr>'}</tbody></table></div><p class="detail-tip">上述为模拟配置，复用原型既有信息；本次新增渠道提成比例不替代这两类比例。</p>`,closeButtons,'','channels');}
function toggleCoop(id){const c=channelById(id);if(cooperationLocked(c)){toast('初始提成修改审批通过后才可开启合作');return;}const next=!c.active;confirmAction(next?'确认开启合作？':'确认终止合作？',`<div class="detail-company">${company(c)}</div><p>${next?'合作开启后将打开渠道邀请及分成权限。':'合作终止后将关闭渠道邀请及分成权限。'}</p><p class="detail-tip">复用既有合作状态操作，不修改历史付款订单对应比例。</p>`,()=>{c.active=next;$('#main-dialog').close();render();toast(next?'合作已开启':'合作已终止');});}
document.addEventListener('click',e=>{
  const close=e.target.closest('[data-close]');if(close){$('#main-dialog').close();return;}
  const nav=e.target.closest('[data-nav]');if(nav){state.view=nav.dataset.nav;state.page=1;$('#metric-popover').hidden=true;render();return;}
  const b=e.target.closest('[data-action]');if(!b)return;
  const {action,id,value}=b.dataset;
  const actions={
    page:()=>{state.page=Number(value);render();},
    tab:()=>{state.tab=value;state.page=1;$('#metric-popover').hidden=true;render();},
    'reset-filter':()=>{state.filters[activeFilterKey()]=state.view==='channels'?{q:'',status:'',dateStart:'',dateEnd:''}:{q:'',slotQ:'',type:'',month:'',dateStart:'',dateEnd:''};state.page=1;render();},
    'slot-orders':()=>showSlotOrders(id),
    create:()=>showForm(),edit:()=>showForm(id),config:()=>showConfig(id),'rate-edit':()=>showRateEdit(id),bill:()=>showBill(id),orders:()=>showOrders(id),ip:()=>showIp(id),policy:showPolicy,'rule-config':showRuleConfig,
    approvals:()=>showApprovals(),'approval-filter':()=>showApprovals(value),'approval-approve':()=>approve(id),'approval-reject':()=>reject(id),
    confirm:()=>modalContext?.confirm?.(),
    'reject-submit':submitRejection,
    simulate,'advance-month':()=>{state.month=nextMonth(state.month);$('#main-dialog').close();render();toast('已进入下一演示月');},'toggle-coop':()=>toggleCoop(id),'add-rule-level':addRuleLevel,'remove-rule-level':()=>removeRuleLevel(Number(b.dataset.index))
  };actions[action]?.();
});
document.addEventListener('submit',e=>{
  if(e.target.id==='rules-form'){e.preventDefault();saveRules(e.target);}
  if(e.target.id==='channel-form'){e.preventDefault();saveChannel(e.target);}
  if(e.target.id==='rate-form'){e.preventDefault();saveRateEdit(e.target);}
  if(e.target.id==='filters'){e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(f.dateStart&&f.dateEnd&&f.dateStart>f.dateEnd){$('#filter-error').textContent='开始日期不能晚于结束日期。';return;}state.filters[activeFilterKey()]=f;state.page=1;$('#metric-popover').hidden=true;render();}
});
document.addEventListener('input',e=>{
  if(e.target.closest('#rules-form')){ruleDraft=readRuleDraft();updateRuleAddState();$('#rules-error').textContent='';}
  if(e.target.id==='initial-rate')updateRateDecision();
  if(e.target.closest('#rate-form'))$('#rate-edit-error').textContent='';
  if(e.target.id==='target-rate')updateRateEdit();
  if(e.target.classList.contains('gmv-input'))updateSimulation();
  if(e.target.id==='ip-search'){const q=e.target.value.trim();let n=0;document.querySelectorAll('[data-ip-name]').forEach(c=>{c.hidden=!c.dataset.ipName.includes(q);if(!c.hidden)n++;});$('#ip-empty').hidden=n>0;}
});
document.addEventListener('change',e=>{
  if(e.target.id==='role'){state.role=e.target.value;if($('#main-dialog').open)$('#main-dialog').close();render();}
  if(e.target.id==='page-size'){state.pageSize=Number(e.target.value);state.page=1;render();}
});
document.addEventListener('click',e=>{if(e.target.closest('#metric-explain')){$('#metric-popover').hidden=!$('#metric-popover').hidden;return;}if(!e.target.closest('#metric-popover'))$('#metric-popover').hidden=true;});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#metric-popover').hidden=true;});
$('#main-dialog').addEventListener('close',()=>{currentModal='';modalContext=null;ruleDraft=null;renderPRD(state.view);if(lastFocus?.isConnected)lastFocus.focus();});
$('#main-dialog').addEventListener('click',e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();});
$('#open-simulation').addEventListener('click',showSimulation);
$('#reset-demo').addEventListener('click',()=>confirmAction('重置演示数据？','<p>本页新增渠道、审批结果及升档记录将恢复为初始模拟数据，不影响真实系统。</p>',()=>{$('#main-dialog').close();state=buildSeed();render();toast('已恢复初始演示数据');},'重置演示'));
// 暴露只读快照供本地交互核验，不提供任何生产数据或接口。
window.ChannelDemo={snapshot:()=>structuredClone(state),billData:id=>billData(state.bills.find(b=>b.id===id)),rateAt:(id,m)=>structuredClone(rateAt(channelById(id),m)),tierRate,upgradedRate,slotRows:()=>structuredClone(slotRows())};
render();
