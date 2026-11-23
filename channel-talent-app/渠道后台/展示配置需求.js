(() => {
  const content = `
    <h2>PRD · 展示配置 <span class="display-prd-tag">新增</span></h2>
    <p>渠道后台「邀约管理」下新增独立的「展示配置」页面，渠道、一级及二级推广位均可配置自己的展示名称和头像。</p>
    <h3>字段与操作</h3>
    <div class="display-prd-table"><table>
      <thead><tr><th>新增项</th><th>交互规则</th></tr></thead>
      <tbody>
        <tr><td>展示名称</td><td>默认只读回显；点击编辑后使用单行输入框修改。保存时去除首尾空格，名称为空时提示「请输入展示名称」，停留在编辑状态。</td></tr>
        <tr><td>展示头像</td><td>默认回显当前头像，无头像时显示中性默认头像。编辑时可选择图片并立即预览；读取失败提示重新选择，保留原头像。图片未读取完成时不可保存。</td></tr>
        <tr><td>编辑</td><td>默认仅展示编辑按钮；点击后回填当前配置，名称和头像可修改，按钮切换为保存、取消。</td></tr>
        <tr><td>保存</td><td>校验通过后保存名称与头像；成功提示「保存成功」并返回只读状态，可再次编辑。失败保留本次输入和预览，提示重试。</td></tr>
        <tr><td>取消</td><td>放弃本次未保存的名称和头像，恢复已保存配置并返回只读状态。</td></tr>
      </tbody>
    </table></div>
    <h3>展示联动</h3>
    <p>保存后，达人通过谁的邀约码进入小程序，就展示该邀请者配置的名称和头像；业管渠道列表新增「达人端展示信息」列，只读回显配置。未保存的编辑不影响达人端或业管端。修改展示配置不改变内部渠道名称、头像及邀约归属。</p>
    <h3>待确认与演示范围</h3>
    <p>展示名称长度、首次未配置的名称取值、头像格式与大小限制、真实上传服务及已有小程序会话的刷新时机待确认。Demo 使用本地存储模拟保存，首次名称以当前演示身份回填；评审工具切换身份时放弃未保存的修改，各身份配置独立存储。</p>
    <p class="display-prd-version">版本记录：2026-11-20 补齐编辑、保存、取消交互与默认头像，PRD 在配置页下方直接展示，并与独立 PRD 共用内容。</p>`;
  const style = document.createElement('style');
  style.textContent = '.display-prd{font-size:14px;line-height:1.85;color:#53627a}.display-prd h2{color:#263b59;font-size:19px;margin:0 0 18px}.display-prd h3{font-size:15px;color:#344b6a;margin:24px 0 10px}.display-prd p{margin:10px 0}.display-prd-table{overflow-x:auto}.display-prd table{width:100%;border-collapse:collapse;font-size:13px;min-width:0}.display-prd th,.display-prd td{padding:13px 15px;text-align:left;border-bottom:1px solid #e7edf4;vertical-align:top}.display-prd th{background:#f4f7fc}.display-prd td:first-child{width:110px;white-space:nowrap;color:#344b6a}@media(max-width:680px){.display-prd th,.display-prd td{padding:11px 8px}.display-prd td:first-child{width:76px}}.display-prd-tag{font-size:11px;font-weight:400;border:1px solid #ffbc84;color:#ed7927;padding:2px 4px;border-radius:3px;vertical-align:middle;margin-left:5px}.display-prd-version{font-size:12px;color:#8793a7;border-top:1px solid #e7edf4;padding-top:14px}';
  document.head.appendChild(style);
  document.querySelectorAll('[data-display-prd]').forEach((element) => {
    element.classList.add('display-prd');
    element.innerHTML = content;
  });
})();
