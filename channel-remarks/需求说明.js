'use strict';
window.ChannelPRD = (() => {
  const content = `<h2>渠道备注 · 增量需求说明</h2><p>在业管渠道列表中增加内部备注，便于业务识别渠道。</p><h3>新增与编辑抽屉</h3><p>在选择机构下方新增“渠道备注”单行输入框，选填，最多 20 个字符。新增留空保存时使用机构名称；编辑回显已有备注，清空保存时同样使用机构名称。备注随抽屉确认操作保存。</p><h3>渠道列表</h3><p>机构信息单元格优先展示渠道备注，下方使用已有机构组件展示机构图标与机构名称，不单独展示机构 ID。存量无备注时展示机构名称。机构信息筛选增加渠道备注模糊匹配，与原有机构 ID、机构名称、手机号搜索并列。</p><h3>待确认</h3><p>机构名称超过 20 个字符时，留空使用机构名称与备注长度限制如何兼容，待业务确认。</p><h3>验收</h3><p>验证新增填写和留空、编辑修改和清空、20 字符输入上限、按备注及原有条件搜索，以及存量无备注的展示。</p><p>版本 V1.0：新增渠道备注交互及规则。</p>`;
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
