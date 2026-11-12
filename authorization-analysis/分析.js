const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mark='<i class="new">新增</i>';
const defaults={start:'2026-10-01',end:'2026-10-31',chain:'自主绑定KOC',source:'',channel:'',mentor:'',ip:''};
let state={filters:{...defaults},tab:'overview',dimension:'source',lossScope:'all',mode:'demo'};
let model;
const unique=AnalysisDrill.unique;
const rate=(a,b)=>b?(100*a/b).toFixed(1)+'%':'—';
const number=n=>n.toLocaleString('zh-CN');
const hours=h=>h==null?'—':h<24?h.toFixed(1)+'小时':(h/24).toFixed(1)+'天';
const isEnded=AnalysisDrill.isEnded;
const isProcessing=r=>!isEnded(r)&&(r.outcome==='unbinding'||AnalysisDrill.isActive(r));
const isCurrentCoop=r=>!isEnded(r)&&r.outcome==='active'&&r.node==='cooperation';
const ageHours=r=>Math.max(0,(AS_OF-r.episodes.at(-1).entered)/HOUR);
const ageBucket=r=>ageHours(r)<24?0:ageHours(r)<72?1:ageHours(r)<=168?2:3;
const currentBucket=AnalysisDrill.currentBucket;
const scopeLoss=rows=>rows.filter(r=>state.lossScope==='all'||state.lossScope==='transfer'&&r.outcome==='transfer'||state.lossScope==='before'&&r.outcome!=='transfer'&&!r.reached.cooperated||state.lossScope==='after'&&r.outcome!=='transfer'&&!!r.reached.cooperated);
const bindingRows=(records,chain)=>unique(records.filter(r=>chain==='IP绑定KOC'?r.reached.cooperated:r.reached.account&&r.reached.settlement));
const metricRows=key=>key==='total'?model.accounts:key==='mcn'?bindingRows(model.records,state.filters.chain):key==='cooperation'?unique(model.records.filter(r=>r.reached.cooperated)):key==='processing'?model.accounts.filter(isProcessing):model.accounts.filter(isEnded);
function conversionStats(records,chain){
  const binding=bindingRows(records,chain).length,cooperation=unique(records.filter(r=>r.reached.cooperated)).length;
  const bindingPrevious=unique(records.filter(r=>r.reached.ipPassed)).length;
  return {application:unique(records).length,binding,cooperation,bindingPrevious,cooperationPrevious:chain==='IP绑定KOC'?bindingPrevious:binding};
}
function conversionRates(key,stats){
  const binding=key==='mcn',n=binding?stats.binding:stats.cooperation,previous=binding?stats.bindingPrevious:stats.cooperationPrevious;
  const prefix=binding?'绑定':'合作';
  return `<div class="conversion-rates" data-conversion="${key}"><div class="conversion-row" data-rate-kind="application"><span>申请转化率 ${help('申请转化率',prefix+'申请转化率')}</span><b>${rate(n,stats.application)}</b></div><div class="conversion-row" data-rate-kind="previous"><span>前一节点转化率 ${help('前一节点转化率',prefix+'前一节点转化率')}</span><b>${rate(n,previous)}</b></div></div>`;
}
function calculate(filters){
  const begin=Date.parse(filters.start+'T00:00:00+08:00'),end=Date.parse(filters.end+'T00:00:00+08:00')+DAY;
  const records=analyticsData.filter(r=>r.appliedAt>=begin&&r.appliedAt<end&&r.appliedAt<=AS_OF&&['chain','source','channel','mentor','ip'].every(k=>!filters[k]||r[k]===filters[k]));
  const accounts=unique(records);
  return {records,accounts,ended:records.filter(isEnded),pending:accounts.filter(r=>!isEnded(r)&&r.outcome==='unbinding'),active:accounts.filter(AnalysisDrill.isActive)};
}
function empty(text='当前条件下暂无数据'){return '<div class="empty"><i class="empty-icon"></i>'+esc(text)+'</div>';}
function statNumber(n){return `<span class="stat-num">${number(n)}</span>`;}
function help(label,key=label){
  const note=metricNotes[key];
  return note?`<button type="button" class="metric-help" data-help="${esc(note)}" aria-label="${esc(label)}统计说明">?</button>`:'';
}
const tooltip=document.createElement('div');tooltip.id='metric-tooltip';tooltip.className='metric-tooltip';tooltip.role='tooltip';tooltip.hidden=true;document.body.append(tooltip);
let activeHelp=null,helpTimer=null;
function hideHelp(){clearTimeout(helpTimer);if(activeHelp)activeHelp.removeAttribute('aria-describedby');activeHelp=null;tooltip.hidden=true;}
function showHelp(trigger){
  clearTimeout(helpTimer);if(activeHelp&&activeHelp!==trigger)activeHelp.removeAttribute('aria-describedby');
  activeHelp=trigger;tooltip.textContent=trigger.dataset.help;tooltip.hidden=false;trigger.setAttribute('aria-describedby',tooltip.id);
  const rect=trigger.getBoundingClientRect(),box=tooltip.getBoundingClientRect();
  tooltip.style.left=Math.max(12,Math.min(rect.left+rect.width/2-box.width/2,innerWidth-box.width-12))+'px';
  const below=rect.bottom+8;
  tooltip.style.top=Math.max(12,below+box.height<=innerHeight-12?below:rect.top-box.height-8)+'px';
}
function deferHelpClose(){clearTimeout(helpTimer);helpTimer=setTimeout(hideHelp,120);}

function authorizationURL(scope={type:'total'}){
  const url=new URL('./授权流程.html',location.href);
  const destination=AnalysisDrill.route(scope,state.filters.chain,model.records,AS_OF).primary;
  url.search=new URLSearchParams({fromAnalysis:'1',dateType:'apply',...state.filters,analysisTab:state.tab,scope:scope.type,scopeKey:scope.key||'',scopeValue:scope.value||'',lossScope:scope.range||'all',asOf:String(AS_OF),targetTab:destination?.tab||'',targetSubtab:destination?.sub||'',targetStatus:destination?.status||''}).toString();
  return url.href;
}
function linkAttrs(scope){return `href="${esc(authorizationURL(scope))}" data-drill="${esc(JSON.stringify(scope))}" aria-label="查看${esc(AnalysisDrill.describe(scope))}明细"`;}
function statLink(n,scope){return n?`<a class="stat-link" ${linkAttrs(scope)}>${number(n)}</a>`:statNumber(n);}
function detailLink(n,scope){return n?`<a class="detail-link" ${linkAttrs(scope)}>查看明细 ›</a>`:'<span class="detail-disabled">查看明细</span>';}
function restoreFilters(){
  const params=new URLSearchParams(location.search);
  for(const key of Object.keys(defaults)){
    const value=params.get(key),control=$('#'+key);
    if(value!==null&&(!control.options||[...control.options].some(o=>o.value===value)))control.value=value;
  }
  if(['overview','efficiency','loss'].includes(params.get('analysisTab')))state.tab=params.get('analysisTab');
  $('#channel').disabled=$('#source').value==='平台达人';
}

function buildTable(head,rows){return `<table class="data-table"><thead><tr>${head.map(h=>`<th>${h} ${help(h)} ${mark}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${head.length}">${empty()}</td></tr>`}</tbody></table>`;}
function render(){
  hideHelp();
  model=calculate(state.filters);
  const total=model.accounts.length;
  const cards=[['total','申请账号数','申请记录 '+model.records.length+' 条 '+help('申请记录数')],['mcn',state.filters.chain==='IP绑定KOC'?'已绑定完成':'MCN绑定完成',state.filters.chain==='IP绑定KOC'?'后台已绑定成功':'账号及结算均已完成'],['cooperation','已合作转化','曾进入已合作'],['processing','当前处理中','含解绑处理中'],['ended','当前已结束','按本批最新申请判断']];
  $('#metrics').hidden=state.tab!=='overview';
  $('#metrics').innerHTML=state.tab==='overview'?cards.map(([key,label,caption])=>{const n=metricRows(key).length;return `<article class="metric"><span class="label">${label} ${help(label)} ${mark}</span><strong>${number(n)}<small>人</small></strong><span class="caption">${key==='processing'?`<span class="rate">${rate(n,total)}</span>`:''}${caption}</span>${['mcn','cooperation'].includes(key)?conversionRates(key,conversionStats(model.records,state.filters.chain)):''}${['total','processing','ended'].includes(key)?detailLink(n,{type:key}):''}</article>`;}).join(''):'';
  document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===state.tab);b.setAttribute('aria-selected',String(b.dataset.tab===state.tab));});
  $('#content').innerHTML=({overview:renderOverview,efficiency:renderEfficiency,loss:renderLoss}[state.tab])();
  renderPRD();
}
function renderOverview(){
  const total=model.accounts.length;
  const ipChain=state.filters.chain==='IP绑定KOC',steps=ipChain?ipMilestones:milestones;
  const funnel=steps.map((m,i)=>{
    const reaches=unique(model.records.filter(r=>r.reached[m.key]));
    const prev=i?unique(model.records.filter(r=>r.reached[steps[i-1].key])).length:total;
    const stock=model.accounts.filter(r=>!isEnded(r)&&r.outcome==='active'&&currentBucket(r)===m.key).length;
    const ended=unique(model.accounts.filter(r=>isEnded(r)&&currentBucket(r)===m.key)).length;
    return `<tr><td><div class="funnel-stage"><span class="stage-index">${i+1}</span><div class="stage-track"><div class="stage-fill" style="width:${total?reaches.length/total*100:0}%"></div><div class="stage-name"><b>${m.label}</b>${statNumber(reaches.length)}</div></div></div></td><td>${i?rate(reaches.length,prev):'—'}</td><td>${statLink(stock,{type:'stock',key:m.key})}</td><td>${statLink(ended,{type:'ended-stage',key:m.key})}</td></tr>`;
  }).join('');
  const four=unique(model.records.filter(r=>r.reached.fourPassed));
  const need=four.filter(r=>r.needUid),noNeed=four.filter(r=>!r.needUid);
  const uid=unique(model.records.filter(r=>r.reached.uid));
  const groups=groupAccounts(state.dimension);
  const dimLabels={source:'达人来源',channel:'所属渠道',mentor:'所属导师',ip:'合作IP'};
  const comparison=groups.map(([key,records])=>{
    const s=conversionStats(records,state.filters.chain),a=s.application,b=s.binding,c=s.cooperation,e=unique(records).filter(isEnded).length;
    return `<tr><td><b>${esc(key)}</b></td><td>${statLink(a,{type:'group',key:state.dimension,value:key==='无所属渠道'?'—':key})}</td><td class="right">${number(b)}</td><td class="right">${rate(b,a)}</td><td class="right">${rate(b,s.bindingPrevious)}</td><td class="right">${number(c)}</td><td class="right">${rate(c,a)}</td><td class="right">${rate(c,s.cooperationPrevious)}</td><td class="right">${statLink(e,{type:'group-ended',key:state.dimension,value:key==='无所属渠道'?'—':key})}</td></tr>`;
  }).join('');
  return `<section class="card"><div class="section-head"><div><h2>授权漏斗转化 ${mark}</h2><p>统计本批账号曾经到达的节点</p></div><span class="pill">${esc(state.filters.chain)}</span></div><div class="funnel-wrap"><table class="funnel"><thead><tr><th>节点 / 到达账号 ${help('节点 / 到达账号')} ${mark}</th><th>上步转化 ${help('上步转化')} ${mark}</th><th>当前停留 ${help('当前停留')} ${mark}</th><th>从此结束 ${help('从此结束')} ${mark}</th></tr></thead><tbody>${funnel}</tbody></table></div>${ipChain?'':`<div class="branch"><b>UID分支</b><span>四件套通过后需UID ${help('四件套通过后需UID')} ${statNumber(need.length)} 人</span><span>已完成UID ${help('已完成UID')} ${statNumber(uid.length)} 人</span><span>无需UID ${help('无需UID')} ${statNumber(noNeed.length)} 人</span></div>`}<div class="funnel-footer"><p class="annotation funnel-note">当前停留按正在等待的环节归入上一已完成节点；IP驳回待修改仍在流程中。</p><div class="funnel-followup"><span>解绑处理中 ${help('解绑处理中','解绑处理中人数')} ${statLink(model.pending.length,{type:'pending'})} 人</span><span>当前合作中 ${help('当前合作中')} ${statLink(model.accounts.filter(isCurrentCoop).length,{type:'current-coop'})} 人</span></div></div></section><section class="card"><div class="section-head"><div><h2>分组转化对比 ${mark}</h2><p>同一批申请、同一观察截止时间</p></div><label>对比维度<select id="dimension">${Object.entries(dimLabels).map(([k,v])=>`<option value="${k}" ${state.dimension===k?'selected':''}>${v}</option>`).join('')}</select></label></div><div class="table-scroll">${buildTable([dimLabels[state.dimension],'申请账号',ipChain?'已绑定完成':'MCN绑定完成','绑定申请转化率','绑定前一节点转化率','已合作','合作申请转化率','合作前一节点转化率','当前已结束'],comparison)}</div></section>`;
}
function groupAccounts(key){
  const groups=new Map();
  for(const a of model.accounts){const value=a[key]==='—'?'无所属渠道':a[key];if(!groups.has(value))groups.set(value,new Set());groups.get(value).add(a.accountId);}
  return [...groups].map(([name,ids])=>[name,model.records.filter(r=>ids.has(r.accountId))]).sort((a,b)=>unique(b[1]).length-unique(a[1]).length);
}
function completedEpisodes(node){return model.records.flatMap(r=>r.episodes.filter(e=>e.node===node&&e.exited!=null&&['完成','驳回'].includes(e.result)).map(e=>({...e,record:r,hours:(e.exited-e.entered)/HOUR})));}
function median(values){if(!values.length)return null;const a=[...values].sort((a,b)=>a-b);return a.length%2?a[Math.floor(a.length/2)]:(a[a.length/2-1]+a[a.length/2])/2;}
function renderEfficiency(){
  const owners=['达人操作','内部审核','内部处理'];
  const kpis=owners.map(owner=>{const count=model.active.filter(r=>nodeDefs[r.node].owner===owner).length;return `<div class="sub-kpi"><span class="label">等待${owner} ${help('等待'+owner)} ${mark}</span><strong>${count}<small>人</small></strong>${detailLink(count,{type:'owner',value:owner})}</div>`;}).join('');
  const groups=state.filters.chain==='IP绑定KOC'?['申请审核','导师分配','IP审核','UID绑定']:['申请审核','导师分配','IP审核','账号绑定','结算绑定','四件套审核','UID绑定'];
  const ages=['不足1天','1至不足3天','3至7天','超过7天'];
  const max=Math.max(1,...groups.map(g=>model.active.filter(r=>nodeDefs[r.node].group===g).length));
  const backlog=groups.map(group=>{
    const rows=model.active.filter(r=>nodeDefs[r.node].group===group);
    return `<div class="backlog-row"><div class="backlog-label"><span>${group}</span>${statLink(rows.length,{type:'backlog',value:group})}</div><div class="age-track">${rows.length?ages.map((label,k)=>{const n=rows.filter(r=>ageBucket(r)===k).length;return n?`<a ${linkAttrs({type:'age',key:String(k),value:group})} class="age-segment age-${k}" style="width:${n/max*100}%" title="${group} · ${label}：${n}人" aria-label="${group}，${label}，${n}人">${n}</a>`:'';}).join(''):'<span class="backlog-empty">无当前积压</span>'}</div></div>`;
  }).join('');
  const workload=owners.map(owner=>{const n=model.active.filter(r=>nodeDefs[r.node].owner===owner).length;return `<div class="bar-row"><span class="bar-label">等待${owner} ${help('等待'+owner)}</span><div class="bar-track"><div class="bar-value" style="width:${model.active.length?n/model.active.length*100:0}%"></div></div>${statLink(n,{type:'owner',value:owner})}</div>`;}).join('');
  const efficiency=Object.entries(nodeDefs).filter(([k])=>k!=='cooperation'&&(state.filters.chain!=='IP绑定KOC'||AnalysisDrill.ipNodeIds.includes(k))).map(([key,n])=>{
    const waiting=model.active.filter(r=>r.node===key),episodes=completedEpisodes(key),durations=episodes.map(e=>e.hours);
    const rejects=episodes.filter(e=>e.result==='驳回');
    return `<tr><td class="node-cell"><b>${n.label}</b><small>${n.owner}</small></td><td class="right">${statLink(waiting.length,{type:'node',key})}</td><td class="right">${waiting.length?hours(Math.max(...waiting.map(ageHours))):'—'}</td><td class="right">${statNumber(episodes.length)}<small>轮次</small></td><td class="right">${hours(median(durations))}</td><td class="right">${statNumber(rejects.length)}<small>次</small></td></tr>`;
  }).join('');
  return `<section class="card"><div class="section-head"><div><h2>当前等待分布 ${mark}</h2><p>仅统计尚在等待流转的账号；已合作与已结束不混入积压</p></div><span class="pill">当前积压 ${model.active.length} 人 ${help('当前积压')}</span></div><div class="sub-kpis">${kpis}</div><div class="two-col" style="gap:28px"><div><div class="section-head"><h3>节点停留时长 ${help('节点停留时长')} ${mark}</h3></div><div class="legend" style="margin-bottom:20px">${ages.map((a,k)=>`<span><i class="age-${k}"></i>${a} ${help(a)}</span>`).join('')}</div>${backlog}</div><div><h3 style="margin-bottom:15px">等待类型占比 ${help('等待类型占比')} ${mark}</h3>${workload}<div class="branch" style="margin-top:25px"><span>解绑处理中 ${help('解绑处理中','解绑处理中人数')} ${statLink(model.pending.length,{type:'pending'})} 人</span></div><p class="annotation">IP待提交、驳回待修改需达人操作；IP待审核需内部审核。两种等待分别计算本轮停留。</p></div></div></section><section class="card"><div class="section-head"><div><h2>节点处理效率 ${mark}</h2><p>完成耗时按每轮真实进入和处理时间计算，驳回与重提保留完整轮次</p></div><span class="minor-label">耗时中位数</span></div><div class="table-scroll">${buildTable(['节点 / 等待类型','当前积压','最长停留','已处理轮次','耗时中位数','驳回次数'],efficiency)}</div><p class="annotation">仅完整处理轮次参与耗时计算；终止或解绑中断的轮次不混入。超过7天的停留不直接视为流失。</p></section>`;
}
const lossGroup=AnalysisDrill.lossGroup;
function renderLoss(){
  const rows=scopeLoss(model.ended),count=rows.length;
  const defs=[['before','合作前结束'],['after','合作后结束'],['transfer','转绑IP方MCN'],['pending','解绑处理中']];
  const kpis=defs.map(([key,label])=>{const n=key==='pending'?model.records.filter(r=>r.outcome==='unbinding').length:model.ended.filter(r=>lossGroup(r)===key).length;return `<div class="sub-kpi"><span class="label">${label} ${help(label)} ${mark}</span><strong>${n}<small>条申请</small></strong>${detailLink(n,{type:'loss-type',key})}</div>`;}).join('');
  const stageNames=state.filters.chain==='IP绑定KOC'?['申请审核','导师分配','IP审核','UID绑定','已合作']:['申请审核','导师分配','IP审核','账号绑定','结算绑定','四件套审核','UID绑定','已合作'];
  const stageChart=stageNames.map(group=>{const n=rows.filter(r=>r.exitSource===group).length;return `<div class="bar-row loss"><span class="bar-label">${group}</span><div class="bar-track"><div class="bar-value" style="width:${count?n/count*100:0}%"></div></div>${statLink(n,{type:'loss-stage',value:group,range:state.lossScope})}</div>`;}).join('');
  const reasonNames=[...new Set(rows.map(r=>r.reason||'未记录原因'))].sort((a,b)=>rows.filter(r=>r.reason===b).length-rows.filter(r=>r.reason===a).length);
  const reasons=reasonNames.map(reason=>{const n=rows.filter(r=>(r.reason||'未记录原因')===reason).length;return `<div class="bar-row ${reason==='所选IP要求绑定IP方MCN'?'transfer':'loss'}"><span class="bar-label">${esc(reason)}</span><div class="bar-track"><div class="bar-value" style="width:${count?n/count*100:0}%"></div></div>${statLink(n,{type:'loss-reason',value:reason,range:state.lossScope})}</div>`;}).join('');
  return `<section class="card"><div class="section-head"><div><h2>申请结束与机构退出 ${mark}</h2></div><label>结束范围<select id="loss-scope"><option value="all">全部结束申请</option><option value="before" ${state.lossScope==='before'?'selected':''}>合作前结束</option><option value="after" ${state.lossScope==='after'?'selected':''}>合作后结束</option><option value="transfer" ${state.lossScope==='transfer'?'selected':''}>转绑IP方MCN</option></select></label></div><div class="sub-kpis loss-kpis">${kpis}</div><p class="annotation">当前结束范围 ${help('当前结束范围')}：${statLink(count,{type:'loss-all',range:state.lossScope})} 条申请</p></section><div class="two-col"><section class="card"><div class="section-head"><div><h2>发生在哪个环节 ${help('发生在哪个环节')} ${mark}</h2><p>归属解除绑定或结束申请的发起环节</p></div><span class="minor-label">条申请</span></div>${count?stageChart:empty()}</section><section class="card"><div class="section-head"><div><h2>为什么结束 ${help('为什么结束')} ${mark}</h2><p>使用该次申请实际记录的原因</p></div><span class="minor-label">条申请</span></div><div class="reason-list">${count?reasons:empty()}</div></section></div>`;
}
function applyFilters(){
  const next=Object.fromEntries(Object.keys(defaults).map(k=>[k,$('#'+k).value]));
  if(!next.start||!next.end){$('#filter-error').textContent='请选择完整的申请日期范围';return;}
  if(next.start>next.end){$('#filter-error').textContent='开始日期不能晚于结束日期';return;}
  if(next.end>'2026-11-05'){$('#filter-error').textContent='结束日期不能晚于统计截止日期';return;}
  $('#filter-error').textContent='';state.filters=next;render();
}
function ruleHTML(key){const rule=ruleSections[key];return `<article><h2>${rule.title} ${mark}</h2>${rule.sections.map(([title,body])=>`<h3>${title}</h3>${Array.isArray(body)?`<div class="table-scroll"><table class="data-table"><tbody>${body.map(([field,desc])=>`<tr><td style="width:180px"><b>${esc(field)}</b></td><td>${esc(desc)}</td></tr>`).join('')}</tbody></table></div>`:`<p>${esc(body)}</p>`}`).join('')}</article>`;}
function renderPRD(){
  $('#page-prd').innerHTML=`<header><div><h2>PRD｜${ruleSections[state.tab].title}</h2><p>V1.0 · 页面级需求说明 · 与完整说明共用规则</p></div><span class="pill">本期新增</span></header>${ruleHTML(state.tab)}<details><summary>查看全局口径与明细跳转规则</summary>${ruleHTML('common')}${ruleHTML('detail')}${ruleHTML('routeMapping')}</details><details><summary>数据接入与待确认事项</summary>${ruleHTML('pending')}</details>`;
  $('#full-prd').innerHTML=`<header><div><h2>达人转化分析 · 完整需求说明</h2><p>V1.0 · 2026-11-05 · 本次新增独立分析页，模拟数据仅用于交互评审</p></div><span class="pill">新增需求</span></header>${Object.keys(ruleSections).map(ruleHTML).join('<hr style="border:0;border-top:1px solid #e8edf4;margin:30px 0">')}`;
}
function switchMode(mode){state.mode=mode;$('#business').hidden=mode==='prd';$('#full-prd').hidden=mode!=='prd';document.body.classList.toggle('prd-mode',mode==='prd');$('#mode-demo').classList.toggle('selected',mode==='demo');$('#mode-prd').classList.toggle('selected',mode==='prd');window.scrollTo({top:0,behavior:'smooth'});}
$('#filters').addEventListener('submit',e=>{e.preventDefault();applyFilters();});
$('#source').addEventListener('change',()=>{const platform=$('#source').value==='平台达人';$('#channel').disabled=platform;if(platform)$('#channel').value='';});
$('#channel').addEventListener('change',()=>{if($('#channel').value)$('#source').value='渠道达人';});
$('#reset').addEventListener('click',()=>{for(const [k,v]of Object.entries(defaults))$('#'+k).value=v;$('#channel').disabled=false;applyFilters();});
$('#mode-demo').addEventListener('click',()=>switchMode('demo'));
$('#mode-prd').addEventListener('click',()=>switchMode('prd'));
document.addEventListener('change',e=>{
  if(e.target.id==='dimension'){state.dimension=e.target.value;render();}
  if(e.target.id==='loss-scope'){state.lossScope=e.target.value;render();}
});
document.addEventListener('click',e=>{
  const tab=e.target.closest('[data-tab]');
  if(tab){state.tab=tab.dataset.tab;render();return;}

});
restoreFilters();applyFilters();

document.addEventListener('pointerover',event=>{const trigger=event.target.closest('.metric-help');if(trigger&&event.pointerType!=='touch')showHelp(trigger);if(tooltip.contains(event.target))clearTimeout(helpTimer);});
document.addEventListener('pointerout',event=>{const trigger=event.target.closest('.metric-help');if((trigger||tooltip.contains(event.target))&&!trigger?.contains(event.relatedTarget)&&!tooltip.contains(event.relatedTarget))deferHelpClose();});
document.addEventListener('focusin',event=>{const trigger=event.target.closest('.metric-help');if(trigger)showHelp(trigger);});
document.addEventListener('focusout',event=>{if(event.target.closest('.metric-help'))deferHelpClose();});
document.addEventListener('click',event=>{const trigger=event.target.closest('.metric-help');if(trigger)showHelp(trigger);else if(!tooltip.contains(event.target))hideHelp();});
document.addEventListener('keydown',event=>{if(event.key==='Escape')hideHelp();});
function repositionHelp(){
  if(!activeHelp)return;
  const rect=activeHelp.getBoundingClientRect();
  if(!activeHelp.isConnected||rect.bottom<0||rect.top>innerHeight)hideHelp();else showHelp(activeHelp);
}
window.addEventListener('resize',repositionHelp);
window.addEventListener('scroll',repositionHelp,true);
