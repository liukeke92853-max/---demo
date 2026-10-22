'use strict';
// 全部等级均配置数值比例；L1默认50%，按月末最新规则统一只升不降。
let ruleDraft=null;
function readRuleDraft(){
  if(!document.querySelector('#rules-form'))return [];
  return [...document.querySelectorAll('.rule-row')].map((row,i,rows)=>({
    min:row.querySelector('[data-rule-field="min"]').value,
    max:i===rows.length-1?null:row.querySelector('[data-rule-field="max"]').value,
    rate:row.querySelector('[data-rule-field="rate"]').value
  }));
}
function draftHasFullRate(){return ruleDraft?.some(t=>t.rate.trim()!==''&&Number(t.rate)===100);}
function renderRuleRows(){
  const canEdit=state.role==='approver';
  $('#rule-rows').innerHTML=ruleDraft.map((t,i)=>`<tr class="rule-row"><td><span class="rule-level">L${i+1}</span>${i===0?'<span class="small">默认等级</span>':''}</td><td><div class="rule-range"><div class="range-bound"><input data-rule-field="min" aria-label="L${i+1}GMV下限" type="number" min="0" step="0.01" placeholder="100" value="${esc(t.min)}" ${i===0?'readonly':''} ${canEdit?'':'disabled'}><span>（不含）</span></div><span class="range-dash">－</span>${t.max===null?`<input class="range-unlimited" aria-label="L${i+1}GMV上限" value="不限" readonly ${canEdit?'':'disabled'}>`:`<div class="range-bound"><input data-rule-field="max" aria-label="L${i+1}GMV上限" type="number" min="0" step="0.01" placeholder="1000" value="${esc(t.max)}" ${canEdit?'':'disabled'}><span>（包含）</span></div>`}</div></td><td><div class="input-unit"><input data-rule-field="rate" aria-label="L${i+1}提成比例" type="number" min="0" max="100" step="0.01" placeholder="请输入" value="${esc(t.rate)}" ${canEdit?'':'disabled'}><span>%</span></div></td><td class="rule-operation">${canEdit&&i>0&&i===ruleDraft.length-1?`<button type="button" class="link danger" data-action="remove-rule-level" data-index="${i}">删除</button>`:'—'}</td></tr>`).join('');
  updateRuleAddState();
}
function updateRuleAddState(){
  const add=$('#add-rule-level');if(!add)return;
  const reached=draftHasFullRate();
  add.disabled=state.role!=='approver'||reached;
}
function addRuleLevel(){
  if(state.role!=='approver')return;
  ruleDraft=readRuleDraft();if(draftHasFullRate())return;
  // 新增时不补造GMV门槛，原末级上限与新等级下限留给配置人填写。
  ruleDraft.at(-1).max='';
  ruleDraft.push({min:'',max:null,rate:''});
  renderRuleRows();$('#rules-error').textContent='';
}
function removeRuleLevel(index){
  if(state.role!=='approver')return;
  ruleDraft=readRuleDraft();
  if(index!==ruleDraft.length-1||index===0)return;
  ruleDraft.pop();ruleDraft.at(-1).max=null;
  renderRuleRows();$('#rules-error').textContent='';
}
function showRuleConfig(){
  const version=ruleVersionFor(),canEdit=state.role==='approver';
  ruleDraft=version.tiers.map(t=>({min:String(t.min/1000000),max:t.max===null?null:String(t.max/1000000),rate:String(t.rate)}));
  showDialog('等级规则配置',`<div class="rules-overview"><div><span class="small">统计指标</span><b>渠道月度GMV</b></div><div><span class="small">统计规则</span><b>付款自然月</b></div><div><span class="small">调整方式</span><b>只升不降</b></div></div><form id="rules-form" novalidate><div class="table-wrap"><table class="mini-table rules-table"><thead><tr><th>等级</th><th>月度GMV区间（万元）</th><th>提成比例</th><th>操作</th></tr></thead><tbody id="rule-rows"></tbody></table></div><div class="rules-add-bar"><button id="add-rule-level" type="button" class="btn" data-action="add-rule-level" ${canEdit?'':'disabled'}>＋ 新增等级</button></div><p class="form-error" id="rules-error" role="alert"></p></form><details class="rules-history"><summary>规则变更记录 · 共${state.ruleVersions.length}版</summary><div class="table-wrap"><table class="mini-table"><thead><tr><th>版本</th><th>演示适用月</th><th>修改人</th><th>等级与范围</th></tr></thead><tbody>${[...state.ruleVersions].reverse().map(v=>`<tr><td>V${v.version}</td><td>${monthText(v.effectiveMonth)}</td><td>${esc(v.operator)}<span class="small">${esc(v.savedAt)}</span></td><td>${v.tiers.map(t=>`${esc(t.level)}：${gmvRangeText(t)}，${t.rate+'%'}`).join('<br>')}</td></tr>`).join('')}</tbody></table></div></details>`,`<button class="btn" data-close>${canEdit?'取消':'关闭'}</button>${canEdit?'<button class="btn primary" form="rules-form" type="submit">保存规则</button>':''}`,'wide','rules');
  renderRuleRows();
}
function saveRules(){
  if(state.role!=='approver')return;
  ruleDraft=readRuleDraft();
  const error=$('#rules-error'),tiers=[],decimal=t=>t!==null&&/^\d+(?:\.\d{1,2})?$/.test(t);
  if(ruleDraft.length===0){error.textContent='至少保留默认L1等级。';return;}
  for(const [i,t] of ruleDraft.entries()){
    if(!decimal(t.min)||(t.max!==null&&!decimal(t.max))){error.textContent='请完整填写非负GMV上下限，最多两位小数。';return;}
    const min=Math.round(Number(t.min)*1000000),max=t.max===null?null:Math.round(Number(t.max)*1000000),rate=Number(t.rate);
    if(!Number.isSafeInteger(min)||(max!==null&&!Number.isSafeInteger(max))){error.textContent='GMV范围过大，请调整。';return;}
    if(i===0&&min!==0){error.textContent='默认L1从0万元开始。';return;}
    if(max!==null&&min>=max){error.textContent=`L${i+1}下限必须小于上限。`;return;}
    if(!decimal(t.rate)||rate<0||rate>100){error.textContent='提成比例须为0～100的数字，最多两位小数。';return;}
    if(rate===100&&i!==ruleDraft.length-1){error.textContent='100%比例须为最后一个等级，请先删除之后的等级。';return;}
    tiers.push({level:`L${i+1}`,min,max,rate});
  }
  for(let i=1;i<tiers.length;i++){
    if(tiers[i-1].max!==tiers[i].min){error.textContent='GMV区间须首尾衔接，不能重叠或遗漏；上一档上限须等于下一档下限。';return;}
    if(tiers[i].rate<tiers[i-1].rate){error.textContent='高等级提成比例不能低于上一等级。';return;}
  }
  if(JSON.stringify(tiers)===JSON.stringify(ruleVersionFor().tiers)){toast('规则没有变化');return;}
  const time=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',dateStyle:'short',timeStyle:'medium'}).format(new Date());
  state.ruleVersions.push({version:state.ruleVersions.at(-1).version+1,effectiveMonth:state.month,operator:'青椒（模拟）',savedAt:time,tiers});
  $('#main-dialog').close();render();toast('等级规则已保存，本月月末重算将使用最新规则');
}
