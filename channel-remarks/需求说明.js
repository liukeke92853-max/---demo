'use strict';
window.ChannelPRD = (() => {
  const content = `<h2>渠道别名 · 增量需求说明</h2><p>在业管渠道列表中增加内部别名，便于业务识别渠道。</p><h3>新增与编辑抽屉</h3><p>在选择机构下方新增“渠道别名”单行输入框，选填，最多 20 个字符。新增留空保存时使用机构名称；编辑回显已有别名，清空保存时同样使用机构名称。别名随抽屉确认操作保存。</p><h3>渠道列表</h3><p>机构信息单元格展示机构名称，下方显示“别名：xxx”和 ID 图标；点击或悬浮图标展示具体机构 ID。存量无别名时展示机构名称。机构信息筛选增加渠道别名模糊匹配，与原有机构 ID、机构名称、手机号搜索并列。</p><h3>待确认</h3><p>机构名称超过 20 个字符时，留空使用机构名称与别名长度限制如何兼容，待业务确认。</p><h3>验收</h3><p>验证新增填写和留空、编辑修改和清空、20 字符输入上限、按别名及原有条件搜索，以及存量无别名的展示。</p><p>版本 V1.0：新增渠道别名交互及规则。</p>`;
  return {render: key => key === 'channels' ? content : '' , content};
})();
document.addEventListener('DOMContentLoaded',()=>{
  const surface=document.querySelector('#demo-surface'),full=document.querySelector('#full-prd');
  full.innerHTML=ChannelPRD.content;
  document.querySelectorAll('[data-review-view]').forEach(button=>button.addEventListener('click',()=>{
    const prd=button.dataset.reviewView==='prd';surface.hidden=prd;full.hidden=!prd;
    document.querySelectorAll('[data-review-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  }));
});
