'use strict';
// 人工配置的每次提交独立留存；后续审批及生效事件附加到同一记录。
const auditReviewNames={not_required:'无需审批',pending:'待审批',approved:'已通过',rejected:'已驳回',expired:'已过期'};
const auditEffectNames={confirmed:'待生效',applied:'已生效',superseded:'已替换',not_effective:'未生效',suspended:'暂停执行'};
function addAuditEvent(log,label,time=demoTime(),operator=actor().name){
  log.events.push({label,time,operator});
}
function addAuditLog(c,data){
  const who=data.applicant?{name:data.applicant,id:data.applicantId}:actor();
  const log={id:'CHG-'+String(++state.changeSequence).padStart(3,'0'),channelId:c.id,channelSnapshot:structuredClone(c),kind:data.kind??'preset',cycleId:c.currentCycleId,submittedAt:data.created??demoTime(),operator:who.name,operatorId:who.id,targetMonth:data.targetMonth??(data.kind==='create'||data.kind==='resume'?null:nextMonth(state.month)),before:data.beforeRate===null?null:{rate:data.beforeRate,protection:structuredClone(data.beforeProtection??currentProtection(c))},after:{rate:data.rate,protection:structuredClone(data.protection)},reason:data.reason??'',review:data.review??'not_required',approvalId:data.approvalId??null,presetId:null,effectStatus:'not_effective',events:[]};
  addAuditEvent(log,log.review==='pending'?'申请已提交':'配置已保存',log.submittedAt,log.operator);
  state.changeLogs.push(log);return log;
}
function reviewAudit(a){
  const log=state.changeLogs.find(l=>l.id===a.changeId);if(!log)return;
  log.review=a.status;log.approvalMethod=a.approvalMethod??'manual';log.reviewer=a.approver??null;log.reviewedAt=a.approvedAt??a.rejectedAt??a.expiredAt;log.rejectReason=a.rejectReason??null;
  addAuditEvent(log,a.status==='approved'?(a.approvalMethod==='timeout'?'系统超时通过':'审批通过'):a.status==='rejected'?(a.approvalMethod==='termination'?'自动拒绝：合作已终止':'审批驳回'):'申请过期',log.reviewedAt,a.approver??'系统');
}
function attachPresetAudit(c,data,preset,approvalId,time,operator){
  const log=approvalId?state.changeLogs.find(l=>l.approvalId===approvalId):addAuditLog(c,{...data,kind:'preset',review:'not_required'});
  if(!log)return;
  log.presetId=preset.id;log.effectStatus='confirmed';preset.changeId=log.id;
  addAuditEvent(log,'配置已确认，等待生效',time,operator);
}
function auditReviewText(log){return log.review==='approved'&&log.approvalMethod==='timeout'?'系统超时通过':log.review==='rejected'&&log.approvalMethod==='termination'?'自动拒绝':auditReviewNames[log.review];}
function auditEffect(log){
  const preset=log.presetId?state.presets.find(p=>p.id===log.presetId):null;
  return preset?.status??log.effectStatus;
}
function auditConfigText(config){
  if(!config)return '<span class="muted">首次配置</span>';
  const p=config.protection??noProtection();
  return `<strong>${config.rate}%</strong><span class="small">${esc(protectionNames[p.mode])}</span>${p.mode==='none'?'':`<span class="small">${esc(protectionRange(p))}</span>`}`;
}
function auditRecords(id){return state.changeLogs.filter(l=>l.channelId===Number(id)).sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt)||Number(b.id.slice(4))-Number(a.id.slice(4)));}
function renderChangeHistory(id){
  const records=auditRecords(id);
  return `<div class="audit-count">共 ${records.length} 条变更记录</div><div class="table-wrap"><table class="mini-table audit-table"><thead><tr><th>提交时间／操作人</th><th>适用付款月</th><th>变更内容</th><th>审批状态</th><th>生效状态</th><th>操作</th></tr></thead><tbody>${records.map(log=>{
    const effect=auditEffect(log),target=log.effectiveMonth??log.targetMonth;
    return `<tr data-change-id="${log.id}"><td>${esc(log.submittedAt)}<span class="small">${esc(log.operator)}</span></td><td>${target?monthText(target):'审批通过当月'}</td><td><div class="audit-diff"><div><label>修改前</label>${auditConfigText(log.before)}</div><div><label>修改后</label>${auditConfigText(log.after)}</div></div></td><td>${tag(auditReviewText(log),log.review==='pending'?'orange':log.review==='rejected'||log.review==='expired'?'red':'blue')}</td><td>${tag(auditEffectNames[effect],effect==='applied'?'green':effect==='confirmed'?'blue':'')}</td><td><button class="link" data-action="change-detail" data-id="${log.id}">查看详情</button></td></tr>`;
  }).join('')||'<tr><td colspan="6" class="empty">暂无人工配置变更记录</td></tr>'}</tbody></table></div>`;
}
function showChangeDetail(id){
  const log=state.changeLogs.find(l=>l.id===id);if(!log)return;
  const c=channelById(log.channelId)??log.channelSnapshot;modalContext={configChannelId:log.channelId,configTab:'changes'};
  showDialog('变更记录详情',`<div class="detail-company">${company(c)}</div><div class="approval-detail"><div><span>记录编号</span>${esc(log.id)}</div><div><span>操作人</span>${esc(log.operator)}</div><div><span>提交时间</span>${esc(log.submittedAt)}</div><div><span>适用付款月</span>${log.effectiveMonth||log.targetMonth?monthText(log.effectiveMonth??log.targetMonth):'审批通过当月'}</div><div><span>审批状态</span>${auditReviewText(log)}</div><div><span>生效状态</span>${auditEffectNames[auditEffect(log)]}</div></div><div class="audit-detail-diff"><div><h3>修改前</h3>${auditConfigText(log.before)}</div><div><h3>修改后</h3>${auditConfigText(log.after)}</div></div>${log.effectiveAfter?'<div class="decision-card">实际生效配置：'+auditConfigText(log.effectiveAfter)+'</div>':''}<p class="detail-tip">变更原因：${esc(log.reason)||'未填写'}</p>${log.rejectReason?'<p class="warning-text">驳回原因：'+esc(log.rejectReason)+'</p>':''}<h3 class="detail-heading">处理过程</h3><div class="history-list">${log.events.map(e=>`<div><span></span><p>${esc(e.label)}<small>${esc(e.time)} · ${esc(e.operator)}</small></p></div>`).join('')}</div>`,`<button class="btn" data-action="config-tab" data-value="changes">返回变更记录</button>${closeButtons}`,'wide','config');
}
function seedChangeHistory(data){
  const c=data.channels.find(c=>c.id===2680097),none=noProtection(),config=(rate,protection=none)=>({rate,protection:structuredClone(protection)});
  c.history=[{month:'2026-08',rate:30,source:'历史比例记录'},{month:'2026-09',rate:40,source:'历史比例记录'},{month:'2026-10',rate:45,protection:none,source:'人工配置'}];
  data.changeLogs=[];data.changeSequence=0;
  const record=(opts)=>{
    const log={id:'CHG-'+String(++data.changeSequence).padStart(3,'0'),channelId:c.id,channelSnapshot:structuredClone(c),kind:'preset',submittedAt:opts.created,operator:'木豆',operatorId:'demo-mudou',targetMonth:opts.targetMonth,before:opts.before,after:opts.after,reason:opts.reason,review:opts.review??'not_required',effectStatus:'not_effective',approvalId:null,presetId:null,events:[{label:opts.review&&opts.review!=='not_required'?'申请已提交':'配置已保存',time:opts.created,operator:'木豆'}]};
    if(opts.presetStatus){
      const preset={id:'PRE-'+(++data.presetSequence),channelId:c.id,targetMonth:opts.targetMonth,rate:opts.after.rate,protection:structuredClone(opts.after.protection),status:opts.presetStatus,confirmedAt:opts.created,approvalId:null,changeId:log.id};
      data.presets.push(preset);log.presetId=preset.id;log.effectStatus=opts.presetStatus;
      log.events.push({label:'配置已确认，等待生效',time:opts.created,operator:'木豆'});
      if(opts.presetStatus==='applied')log.events.push({label:'配置已生效',time:opts.targetMonth+'-01 00:00:00',operator:'系统'});
      if(opts.presetStatus==='superseded')log.events.push({label:'已被后续配置替换',time:'2026-08-25 10:00:00',operator:'木豆'});
    }
    if(opts.review){
      const a={id:'AP-HIS-'+log.id,kind:'preset',channelId:c.id,channelSnapshot:structuredClone(c),beforeRate:opts.before.rate,beforeProtection:structuredClone(opts.before.protection),rate:opts.after.rate,protection:structuredClone(opts.after.protection),targetMonth:opts.targetMonth,reason:opts.reason,month:opts.created.slice(0,7),status:opts.review,applicant:'木豆',applicantId:'demo-mudou',created:opts.created,changeId:log.id};
      log.approvalId=a.id;
      if(opts.review!=='pending'){
        log.reviewer=opts.review==='expired'?null:'青椒';log.reviewedAt=opts.handled;log.rejectReason=opts.rejectReason??null;
        a.approver=log.reviewer;if(opts.review==='approved')a.approvedAt=opts.handled;if(opts.review==='rejected'){a.rejectedAt=opts.handled;a.rejectReason=opts.rejectReason;}if(opts.review==='expired')a.expiredAt=opts.handled;
        log.events.push({label:opts.review==='approved'?'审批通过':opts.review==='rejected'?'审批驳回':'申请过期',time:opts.handled,operator:log.reviewer??'系统'});
      }
      data.approvals.push(a);
    }
    data.changeLogs.push(log);return log;
  };
  record({created:'2026-08-20 09:30:00',targetMonth:'2026-09',before:config(30),after:config(35),presetStatus:'superseded',reason:'调整9月合作比例'});
  record({created:'2026-08-25 10:00:00',targetMonth:'2026-09',before:config(35),after:config(40),presetStatus:'applied',reason:'确认9月合作比例'});
  record({created:'2026-09-20 14:00:00',targetMonth:'2026-10',before:config(40),after:config(80,{mode:'fixed',start:'2026-10',end:'2026-12'}),review:'rejected',handled:'2026-09-21 11:00:00',rejectReason:'合作投入尚未确认，暂不调整',reason:'申请三个月固定合作比例'});
  record({created:'2026-09-23 10:00:00',targetMonth:'2026-10',before:config(40),after:config(45),presetStatus:'applied',reason:'重新确认10月合作方案'});
  record({created:'2026-09-26 15:30:00',targetMonth:'2026-10',before:config(45),after:config(70),review:'expired',handled:'2026-10-01 00:00:00',reason:'申请提高10月合作比例'});
  record({created:'2026-10-18 10:00:00',targetMonth:'2026-11',before:config(45),after:config(50),presetStatus:'confirmed',reason:'提前确认11月合作比例'});
  record({created:'2026-10-20 16:00:00',targetMonth:'2026-11',before:config(50),after:config(60),review:'pending',reason:'申请追加团队招募支持'});
  // 首行渠道补充一条与10月当前固定方案一致的历史审批，方便直接查看。
  const sena=data.channels.find(x=>x.id===1536835),first={id:'CHG-'+String(++data.changeSequence).padStart(3,'0'),channelId:sena.id,channelSnapshot:structuredClone(sena),kind:'preset',submittedAt:'2026-09-22 10:00:00',operator:'木豆',operatorId:'demo-mudou',targetMonth:'2026-10',before:config(30),after:config(30,{mode:'fixed',start:'2026-10',end:'2026-12'}),reason:'约定10月至12月固定比例',review:'approved',reviewer:'青椒',reviewedAt:'2026-09-23 11:00:00',effectStatus:'applied',approvalId:'AP-HIS-SENA',presetId:null,events:[{label:'申请已提交',time:'2026-09-22 10:00:00',operator:'木豆'},{label:'审批通过',time:'2026-09-23 11:00:00',operator:'青椒'},{label:'配置已生效',time:'2026-10-01 00:00:00',operator:'系统'}]};
  data.changeLogs.push(first);
  data.approvals.push({id:first.approvalId,kind:'preset',channelId:sena.id,channelSnapshot:structuredClone(sena),beforeRate:30,beforeProtection:none,rate:30,protection:structuredClone(first.after.protection),targetMonth:'2026-10',reason:first.reason,month:'2026-09',status:'approved',applicant:'木豆',applicantId:'demo-mudou',created:first.submittedAt,approvedAt:first.reviewedAt,approver:'青椒',changeId:first.id});
  const a=data.approvals.find(x=>x.id==='AP-001'),channel=a.channelSnapshot;
  const pending={id:'CHG-'+String(++data.changeSequence).padStart(3,'0'),channelId:a.channelId,channelSnapshot:structuredClone(channel),kind:'create',submittedAt:a.created,operator:a.applicant,operatorId:a.applicantId,targetMonth:null,before:null,after:config(a.rate,a.protection),reason:a.reason,review:'pending',approvalId:a.id,presetId:null,effectStatus:'not_effective',events:[{label:'申请已提交',time:a.created,operator:a.applicant}]};
  a.changeId=pending.id;data.changeLogs.push(pending);
}
