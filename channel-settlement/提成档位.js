'use strict';
// 月度记录是事实；次月预设是计划，批准计划不会改写当月记录。
const addMonths=(month,count)=>{const [y,m]=month.split('-').map(Number),n=y*12+m-1+count;return Math.floor(n/12)+'-'+String(n%12+1).padStart(2,'0');};
const monthDistance=(a,b)=>{const [ay,am]=a.split('-').map(Number),[by,bm]=b.split('-').map(Number);return (by-ay)*12+bm-am;};
const protectionNames={none:'自动匹配',fixed:'固定比例',upOnly:'自动匹配 · 只升不降',downOnly:'自动匹配 · 只降不升'};
const noProtection=()=>({mode:'none',start:null,end:null});
const currentProtection=c=>rateAt(c,state.month)?.protection??c.initialProtection??noProtection();
const activeProtection=(p,month)=>p&&p.mode!=='none'&&p.start<=month&&(p.end===null||month<=p.end);
function protectionRange(p){return !p||p.mode==='none'?'按月自动匹配':monthText(p.start)+'—'+(p.end===null?'永久':monthText(p.end));}
function protectionProgress(p,month=state.month){
  if(!p||p.mode==='none')return '自动匹配';
  if(month<p.start)return '待生效';
  const total=p.end===null?null:monthDistance(p.start,p.end)+1;
  if(total!==null&&month>p.end)return '已到期';
  return '第'+(monthDistance(p.start,month)+1)+(total===null?'个月／永久':'／'+total+'个月');
}
const executionName=(p,month)=>activeProtection(p,month)?protectionNames[p.mode]:protectionNames.none;
const protectionText=c=>executionName(currentProtection(c),state.month);
const confirmedPreset=(c,month)=>[...state.presets].reverse().find(p=>p.channelId===c.id&&p.targetMonth===month&&p.cycleId===c.currentCycleId&&p.status==='confirmed');
function monthlyDecision(c,gmv,month=state.month){
  const targetMonth=nextMonth(month),current=rateAt(c,month),before=current?.rate??null,matched=tierRate(gmv,month),preset=confirmedPreset(c,targetMonth),plan=structuredClone(current?.protection??noProtection());
  if(preset)return {before,matched,after:preset.rate,protection:structuredClone(preset.protection),result:'人工配置',reason:'已确认的次月配置 · '+protectionNames[preset.protection.mode],presetId:preset.id};
  let after=matched,result=before===null?'首次生成':matched>before?'升档':matched<before?'降档':'保持';
  if(before!==null&&activeProtection(plan,targetMonth)){
    if(plan.mode==='fixed')after=before;
    if(plan.mode==='upOnly')after=Math.max(before,matched);
    if(plan.mode==='downOnly')after=Math.min(before,matched);
    if(after!==matched)result='维持原比例';
  }
  const reason=activeProtection(plan,targetMonth)?protectionNames[plan.mode]+' · '+protectionProgress(plan,targetMonth):plan.mode!=='none'?'保护已到期，按业绩匹配':'按业绩匹配';
  return {before,matched,after,protection:activeProtection(plan,targetMonth)?plan:noProtection(),result,reason,presetId:null};
}
let ruleDraft=null;
function editableRuleVersion(){return ruleVersionFor(state.month);}
function readRuleDraft(){
  if(!$('#rules-form'))return [];
  return [...document.querySelectorAll('.rule-row')].map((row,i,rows)=>({min:row.querySelector('[data-rule-field="min"]').value,max:i===rows.length-1?null:row.querySelector('[data-rule-field="max"]').value,rate:row.querySelector('[data-rule-field="rate"]').value}));
}
function renderRuleRows(){
  const canEdit=state.role==='approver';
  $('#rule-rows').innerHTML=ruleDraft.map((t,i)=>`<tr class="rule-row"><td><div class="rule-range"><div class="range-bound"><input data-rule-field="min" aria-label="第${i+1}档GMV下限" type="number" min="0" step="0.01" placeholder="100" value="${esc(t.min)}" ${i===0?'readonly':''} ${canEdit?'':'disabled'}><span>${i===0?'（包含）':'（不含）'}</span></div><span class="range-dash">－</span>${t.max===null?`<input class="range-unlimited" aria-label="第${i+1}档GMV上限" value="不限" readonly>`:`<div class="range-bound"><input data-rule-field="max" aria-label="第${i+1}档GMV上限" type="number" min="0" step="0.01" placeholder="1000" value="${esc(t.max)}" ${canEdit?'':'disabled'}><span>（包含）</span></div>`}</div></td><td><div class="input-unit"><input data-rule-field="rate" aria-label="第${i+1}档提成比例" type="number" min="0" max="100" step="0.01" value="${esc(t.rate)}" ${canEdit?'':'disabled'}><span>%</span></div></td><td class="rule-operation">${canEdit?`<button type="button" class="link" data-action="insert-tier" data-index="${i}">在此之前新增</button>${i>0?`<button type="button" class="link danger" data-action="remove-tier" data-index="${i}">删除</button>`:''}`:'—'}</td></tr>`).join('');
  updateRuleAddState();
}
function updateRuleAddState(){document.querySelectorAll('[data-action="insert-tier"]').forEach(b=>b.disabled=state.role!=='approver');}
function insertTier(index){
  if(state.role!=='approver')return;ruleDraft=readRuleDraft();
  const current=ruleDraft[index];if(!current)return;
  // 达到100%仅禁止在最高档后追加，中间档仍可拆分。
  ruleDraft.splice(index,0,{min:current.min,max:'',rate:''});current.min='';renderRuleRows();
}
function removeTier(index){
  if(state.role!=='approver')return;ruleDraft=readRuleDraft();if(index<=0||index>=ruleDraft.length)return;
  ruleDraft[index-1].max=ruleDraft[index].max;ruleDraft.splice(index,1);renderRuleRows();
}
function showRuleConfig(){
  const version=editableRuleVersion(),canEdit=state.role==='approver',effectiveMonth=state.month;
  ruleDraft=version.tiers.map(t=>({min:String(t.min/1000000),max:t.max===null?null:String(t.max/1000000),rate:String(t.rate)}));
  showDialog('提成档位配置',`<div class="rules-overview"><div><span class="small">统计指标</span><b>渠道月度GMV</b></div><div><span class="small">统计规则</span><b>付款自然月</b></div><div><span class="small">执行方式</span><b>按月自动调档</b></div></div><div class="rule-effective"><span>规则适用统计月：${monthText(effectiveMonth)}起</span><span>首次计算付款月：${monthText(nextMonth(effectiveMonth))}</span></div><form id="rules-form" novalidate><div class="table-wrap"><table class="mini-table rules-table"><thead><tr><th>月度GMV区间（万元）</th><th>提成比例</th><th>操作</th></tr></thead><tbody id="rule-rows"></tbody></table></div><p class="form-error" id="rules-error" role="alert"></p></form><details class="rules-history"><summary>规则变更记录 · 共${state.ruleVersions.length}条</summary><div class="table-wrap"><table class="mini-table"><thead><tr><th>修改时间</th><th>适用统计月</th><th>修改人</th><th>提成档位</th></tr></thead><tbody>${[...state.ruleVersions].sort((a,b)=>b.savedAt.localeCompare(a.savedAt)||b.version-a.version).map(v=>`<tr><td>${esc(v.savedAt)}</td><td>${monthText(v.effectiveMonth)}起</td><td>${esc(v.operator)}</td><td>${v.tiers.map(t=>`${gmvRangeText(t)}：${t.rate}%`).join('<br>')}</td></tr>`).join('')}</tbody></table></div></details>`,`<button class="btn" data-close>${canEdit?'取消':'关闭'}</button>${canEdit?'<button class="btn primary" form="rules-form" type="submit">保存规则</button>':''}`,'wide','rules');renderRuleRows();
}
function saveRules(){
  if(state.role!=='approver')return;ruleDraft=readRuleDraft();
  const error=$('#rules-error'),tiers=[],decimal=t=>t!==null&&/^\d+(?:\.\d{1,2})?$/.test(t);
  if(!ruleDraft.length){error.textContent='至少保留一个提成档位。';return;}
  for(const [i,t] of ruleDraft.entries()){
    if(!decimal(t.min)||(t.max!==null&&!decimal(t.max))){error.textContent='请完整填写非负GMV上下限，最多两位小数。';return;}
    const min=Math.round(Number(t.min)*1000000),max=t.max===null?null:Math.round(Number(t.max)*1000000),rate=Number(t.rate);
    if(!Number.isSafeInteger(min)||(max!==null&&!Number.isSafeInteger(max))){error.textContent='GMV范围过大，请调整。';return;}
    if(i===0&&min!==0){error.textContent='首档从0万元开始。';return;}
    if(max!==null&&min>=max){error.textContent=`第${i+1}档下限必须小于上限。`;return;}
    if(!decimal(t.rate)||rate<0||rate>100){error.textContent='提成比例须为0～100的数字，最多两位小数。';return;}
    if(rate===100&&i!==ruleDraft.length-1){error.textContent='100%须为最高档位。';return;}
    tiers.push({min,max,rate});
  }
  for(let i=1;i<tiers.length;i++){
    if(tiers[i-1].max!==tiers[i].min){error.textContent='GMV区间须首尾衔接，不能重叠或遗漏。';return;}
    if(tiers[i].rate<=tiers[i-1].rate){error.textContent='后一档提成比例须高于前一档。';return;}
  }
  if(JSON.stringify(tiers)===JSON.stringify(editableRuleVersion().tiers)){toast('规则没有变化');return;}
  const effectiveMonth=state.month,version=state.ruleVersions.at(-1).version+1;
  state.ruleVersions.push({version,effectiveMonth,operator:'青椒',savedAt:demoTime(),tiers});
  $('#main-dialog').close();render();toast(`提成档位已保存，将用于${monthChinese(effectiveMonth)}业绩统计`);
}
