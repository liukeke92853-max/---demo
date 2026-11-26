'use strict';
window.QuotaRules=Object.freeze({
 dayMax:600,
 monthMax:6000,
 monthlyMax:10000,
 initialDate:'2026-11-25',
 defaultPeriod:'day',
 quotaHelp:Object.freeze(['按KOC所属机构＋IP共享，同一共享范围的KOC显示相同额度。','剩余＝基础额度＋本周期有效追加－已用。']),
 periodLabel:period=>period==='day'?'今日':'当月',
 completeStage:mode=>mode==='self'?'cooperated':'bound',
 stages:{
  self:[['review','待审核'],['mentor','待分配导师'],['ipReview','IP审核'],['binding','待绑定'],['bound','已绑定'],['cooperated','已合作'],['clearing','待清退'],['unbinding','待确认解绑'],['unbound','已解绑']],
  ip:[['review','待审核'],['mentor','待分配导师'],['ipReview','IP审核'],['approved','审核通过'],['bound','已绑定'],['unbound','已解绑']]
 }
});
