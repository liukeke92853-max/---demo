'use strict';
// 仅生成本地消息样例；正式接收角色及飞书身份映射由研发接入。
const approvalReminderRoleId='xxx';
function saveReminder(data,message){
  if(data.notifications.some(n=>n.id===message.id))return;
  data.notifications.push({...message,recipientRoleId:approvalReminderRoleId,recipient:'负责人（角色ID xxx）',status:'本地模拟'});
}
function notifyApprovalCreated(a,data){
  const c=a.channelSnapshot??data.channels.find(c=>c.id===a.channelId);
  saveReminder(data,{id:'approval-created-'+a.id+'-'+approvalReminderRoleId,kind:'approval-created',approvalKind:a.kind,approvalId:a.id,month:a.month,channelName:c.name,channelId:c.id,applicant:a.applicant,beforeRate:a.beforeRate,rate:a.rate,targetMonth:a.targetMonth??null,reason:a.reason,protection:structuredClone(a.protection),deadline:approvalDeadline(a),created:a.created});
}
function remindPendingApprovals(data,time){
  data.approvals.filter(a=>a.status==='pending'&&shiftTime(approvalDeadline(a),-1)<=time).forEach(a=>{
    const c=a.channelSnapshot??data.channels.find(c=>c.id===a.channelId);
    saveReminder(data,{id:'approval-deadline-'+a.id+'-'+approvalReminderRoleId,kind:'approval-deadline',approvalKind:a.kind,approvalId:a.id,month:a.month,channelName:c.name,channelId:c.id,rate:a.rate,deadline:approvalDeadline(a),created:shiftTime(approvalDeadline(a),-1)});
  });
}
function seedApprovalMessages(data){
  data.approvals.filter(a=>a.month===data.month).forEach(a=>notifyApprovalCreated(a,data));
  remindPendingApprovals(data,data.demoDate+' '+data.demoClock);
}
function approvalReminderMessages(){
  return state.notifications.filter(n=>n.recipientRoleId===approvalReminderRoleId&&['approval-created','approval-deadline'].includes(n.kind)&&n.created<=demoTime()).sort((a,b)=>a.created.localeCompare(b.created)||a.id.localeCompare(b.id));
}
function showApprovalMessages(){
  if(state.role!=='approver'){toast('请切换负责人演示身份查看消息');return;}
  const messages=approvalReminderMessages(),kindText=kind=>kind==='preset'?'提成修改':kind==='resume'?'恢复合作':'新增渠道';
  showDialog('负责人飞书消息',`<p class="form-help">审批提醒预览 · 接收角色ID xxx待确认</p><div class="approval-messages">${messages.map(m=>m.kind==='approval-created'?`<article class="reminder-card"><header><b>渠道${kindText(m.approvalKind)}待审批</b><span>${esc(m.created)}</span></header><div class="reminder-content"><p>您有新的渠道审批申请，请及时处理。</p><dl><dt>渠道</dt><dd>${esc(m.channelName)} · 机构ID ${m.channelId}</dd><dt>申请比例</dt><dd>${m.beforeRate===null?'':m.beforeRate+'% → '}${m.rate}%</dd><dt>申请人</dt><dd>${esc(m.applicant)}</dd><dt>提成比例适用月份</dt><dd>${m.targetMonth?monthText(m.targetMonth):'审批通过当月'}</dd><dt>执行安排</dt><dd>${protectionNames[m.protection.mode]}${m.protection.mode==='none'?'':' · '+protectionRange(m.protection)}</dd><dt>申请原因</dt><dd>${esc(m.reason)}</dd></dl><p class="reminder-deadline">审核截止：${esc(m.deadline)}。提交起7天未处理，系统自动通过；比例修改跨月通过仍覆盖目标月整月；新增渠道在审批通过后开启，比例适用于审批通过当月整月付款订单。</p><button class="btn primary" data-action="message-approval" data-id="${esc(m.approvalId)}">前往审批</button></div></article>`:`<article class="reminder-card deadline"><header><b>渠道${kindText(m.approvalKind)}审批即将到期</b><span>${esc(m.created)}</span></header><div class="reminder-content"><p>${esc(m.channelName)}（机构ID ${m.channelId}）的 ${m.rate}% 申请将在1天后到期。</p><p>审核截止：<strong>${esc(m.deadline)}</strong>。届时仍未处理，系统将自动通过。比例修改跨月通过仍覆盖目标月整月；新增渠道在审批通过后开启，比例适用于审批通过当月整月付款订单。</p><button class="btn primary" data-action="message-approval" data-id="${esc(m.approvalId)}">前往审批</button></div></article>`).join('')||'<div class="empty">暂无审批提醒</div>'}</div>`,closeButtons,'wide','approval');
}

