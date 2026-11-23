const followupPrdStyle = document.createElement('style');
followupPrdStyle.textContent = '[data-followup-prd]{font-size:14px;line-height:1.8}[data-followup-prd] th,[data-followup-prd] td{text-align:left;padding:12px 14px;border-bottom:1px solid #e7edf4;vertical-align:top}[data-followup-prd] th{background:#f4f7fc;color:#53627a}[data-followup-prd] td:first-child{width:30%}';
document.head.appendChild(followupPrdStyle);
function renderChannelFollowupPrd() {
  document.querySelectorAll('[data-followup-prd]').forEach(element => {
    element.innerHTML = `<h2>PRD · 渠道授权进度合并 <span style="color:#ee6e27;font-size:11px;border:1px solid #ffb074;border-radius:4px;padding:1px 4px">改造</span></h2>
      <p>渠道后台移除「自主绑定KOC／IP绑定KOC」切换入口，两条链路的达人在同一套进度页签中展示，不增加链路字段。底层仍保留原申请链路与状态，业管操作和业务流转规则不变。</p>
      <table style="width:100%;border-collapse:collapse"><thead><tr><th>原链路及状态</th><th>渠道端展示</th></tr></thead><tbody>
      <tr><td>两条链路 · IP审核（待审核）</td><td>待审核，与初步资料审核合并展示；业管IP审核仍保留</td></tr>
      <tr><td>IP绑定KOC · 审核通过</td><td>待绑定页签</td></tr>
      <tr><td>IP绑定KOC · 已绑定</td><td>已合作，沿用已确认合作完成映射</td></tr>
      <tr><td>两条链路 · 待审核、已解绑、已驳回</td><td>分别合并到同名页签</td></tr>
      <tr><td>自主绑定KOC · 其他状态</td><td>保持原进度归属；待绑定包含账号绑定、结算绑定，已绑定包含四件套审核、UID绑定；不再通过列表列展示具体进度</td></tr>
      </tbody></table>
      <p>不再设置区分链路的绑定子页签；列表按原记录展示，不重复创建申请。移除列表「当前进度」列，进度通过上方状态页签区分；不展示待分配导师、IP审核和操作列；其中IP审核数据合并到待审核，不能只隐藏页签而遗漏记录。</p>
      <p>合并列表默认按申请时间筛选；有依据的节点时间可按状态选择，使用原链路实际时间字段，缺失时间不猜测。IP绑定的绑定时间不冒充自主绑定的结算绑定时间。其他原链路可选时间类型仍待研发对照业管核实。</p>
      <p style="font-size:12px;color:#8793a7">版本记录：2026-11-20 合并渠道侧链路展示，审核通过并入待绑定；Demo 使用模拟记录，未接生产。</p>${channelStateMappingContent}`;
  });
}
renderChannelFollowupPrd();
