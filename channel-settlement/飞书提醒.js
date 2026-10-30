'use strict';
// 仅生成本地消息样例；正式接收角色及飞书身份映射由研发接入。
const approvalReminderRoleId='xxx';
const approvalMonthEnd=month=>month+'-'+monthDays(month)+' 23:59:59';
function saveReminder(data,message){
  if(data.notifications.some(n=>n.id===message.id))return;
  data.notifications.push({...message,recipientRoleId:approvalReminderRoleId,recipient:'负责人（角色ID xxx）',status:'本地模拟'});
}
function notifyApprovalCreated(a,data){
  const c=a.channelSnapshot??data.channels.find(c=>c.id===a.channelId);
  saveReminder(data,{id:'approval-created-'+a.id+'-'+approvalReminderRoleId,kind:'approval-created',approvalKind:a.kind,approvalId:a.id,month:a.month,channelName:c.name,channelId:c.id,applicant:a.applicant,beforeRate:a.beforeRate,rate:a.rate,targetMonth:a.targetMonth??null,reason:a.reason,protection:structuredClone(a.protection),created:a.created});
}
function remindPendingApprovals(data,date){
  const cutoff=modificationCutoff(data.month);
  if(date<cutoff||date.slice(0,7)!==data.month)return;
  const pending=data.approvals.filter(a=>a.kind==='preset'&&a.status==='pending'&&a.month===data.month&&a.targetMonth===nextMonth(data.month)&&a.created.slice(0,10)<cutoff);
  if(!pending.length)return;
  saveReminder(data,{id:'approval-deadline-'+data.month+'-'+approvalReminderRoleId,kind:'approval-deadline',month:data.month,approvalIds:pending.map(a=>a.id),count:pending.length,deadline:approvalMonthEnd(data.month),created:cutoff+' 00:00:00'});
}
function seedApprovalMessages(data){
  data.approvals.filter(a=>a.month===data.month).forEach(a=>notifyApprovalCreated(a,data));
  remindPendingApprovals(data,data.demoDate);
}
function changeReminderDate(data,date){
  // 日期回退仅重置尚未到达节点的模拟汇总消息，便于重复演示边界。
  data.notifications=data.notifications.filter(n=>n.kind!=='approval-deadline'||n.month!==data.month||n.created.slice(0,10)<=date);
  remindPendingApprovals(data,date);
}
function approvalReminderMessages(){
  return state.notifications.filter(n=>n.recipientRoleId===approvalReminderRoleId&&(n.kind==='approval-deadline'||n.kind==='approval-created'&&n.approvalKind==='preset')&&n.created.slice(0,10)<=state.demoDate).sort((a,b)=>a.created.localeCompare(b.created)||a.id.localeCompare(b.id));
}
function showApprovalMessages(){
  if(state.role!=='approver'){toast('请切换负责人演示身份查看消息');return;}
  const messages=approvalReminderMessages();
  showDialog('负责人飞书消息',`<p class="form-help">提成修改提醒预览 · 接收角色ID xxx待确认</p><div class="approval-messages">${messages.map(m=>m.kind==='approval-created'?`<article class="reminder-card"><header><b>渠道提成修改待审批</b><span>${esc(m.created)}</span></header><div class="reminder-content"><p>您有新的渠道提成修改申请，请及时处理。</p><dl><dt>渠道</dt><dd>${esc(m.channelName)} · 机构ID ${m.channelId}</dd><dt>比例调整</dt><dd>${m.beforeRate}% → ${m.rate}%</dd><dt>申请人</dt><dd>${esc(m.applicant)}</dd><dt>适用付款月</dt><dd>${monthText(m.targetMonth)}</dd><dt>执行安排</dt><dd>${protectionNames[m.protection.mode]}${m.protection.mode==='none'?'':' · '+protectionRange(m.protection)}</dd><dt>申请原因</dt><dd>${esc(m.reason)}</dd></dl><p class="reminder-deadline">请于${esc(approvalMonthEnd(m.month))}前处理；月底未处理，系统将自动通过。</p><button class="btn primary" data-action="message-approval" data-id="${esc(m.approvalId)}">前往审批</button></div></article>`:`<article class="reminder-card deadline"><header><b>渠道提成修改审批即将到期</b><span>${esc(m.created)}</span></header><div class="reminder-content"><p>您有 <strong>${m.count}</strong> 条本月发起的提成修改审批待处理。</p><p>请于 <strong>${esc(m.deadline)}</strong> 前完成审批；月底未处理，系统将自动通过，并适用于付款时间在${monthChinese(nextMonth(m.month))}的渠道订单。</p><button class="btn primary" data-action="message-month" data-value="${m.month}">前往审批</button></div></article>`).join('')||'<div class="empty">暂无比例修改提醒</div>'}</div>`,closeButtons,'wide','approval');
}

