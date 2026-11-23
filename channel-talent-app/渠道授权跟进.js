// 渠道侧统一展示进度，原始链路及状态仅用于内部映射。
const channelStatuses = ['待审核', '待绑定', '已绑定', '已合作', '待清退', '待确认解绑', '已解绑', '绑定失败', '已驳回'];
let channelStatus = '待审核';
function channelProgress(record) {
  if (record.status === 'IP审核') return '待审核';
  if (record.chain === 'ip') return ({ '审核通过': '待绑定', '已绑定': '已合作' })[record.status] || record.status;
  return record.status;
}
const channelRecords = [
  ...channelStatuses.map(status => ({
    chain: 'self', status, name: '小林', account: 'xiaolin123', ip: '潮酷穿搭',
    times: { '申请时间': '2026-11-17', ...({
      '已合作': { '结算绑定时间': '2026-11-19' },
      '待清退': { '发起清退时间': '2026-11-19' },
      '待确认解绑': { '发起解绑时间': '2026-11-19' },
      '已解绑': { '解绑时间': '2026-11-19' },
      '绑定失败': { '失败时间': '2026-11-19' },
      '已驳回': { '驳回时间': '2026-11-19' }
    })[status] }
  })),
  { chain: 'self', status: '待绑定', name: '小夏', account: 'xiaoxia456', ip: '潮酷穿搭', times: { '申请时间': '2026-11-17', '账号绑定时间': '2026-11-18' } },
  { chain: 'self', status: '已绑定', name: '小夏', account: 'xiaoxia456', ip: '潮酷穿搭', times: { '申请时间': '2026-11-17', '四件套通过时间': '2026-11-18' } },
  ...['self', 'ip'].map(chain => ({ chain, status: 'IP审核', reviewStatus: '待审核', name: chain === 'self' ? '小周' : '小陈', account: chain === 'self' ? 'xiaozhou234' : 'xiaochen567', ip: '日常穿搭', times: { '申请时间': '2026-11-18' } })),
  ...['待审核', '审核通过', '已绑定', '已解绑', '已驳回'].map(status => ({
    chain: 'ip', status, name: '小雨', account: 'xiaoyu789', ip: '日常穿搭',
    times: { '申请时间': '2026-11-18', ...({
      '已绑定': { '绑定时间': '2026-11-19' },
      '已解绑': { '解绑时间': '2026-11-19' },
      '已驳回': { '驳回时间': '2026-11-19' }
    })[status] }
  }))
];
function channelTimeFields() {
  const nodeFields = {
    '待绑定': ['账号绑定时间'], '已绑定': ['四件套通过时间'],
    '已合作': ['结算绑定时间', '绑定时间'], '待清退': ['发起清退时间'],
    '待确认解绑': ['发起解绑时间'], '已解绑': ['解绑时间'],
    '绑定失败': ['失败时间'], '已驳回': ['驳回时间']
  };
  return ['申请时间', ...(nodeFields[channelStatus] || [])];
}
function selectChannelStatus(status) {
  channelStatus = status;
  board();
}
function board() {
  document.querySelector('#boardView').innerHTML = `
    <h2>达人授权跟进 <span class="review">新增</span></h2>
    <p class="muted">渠道 A · 查看本渠道邀约的达人</p>
    <div class="nav" aria-label="授权进度">${channelStatuses.map(status => `<button class="${status === channelStatus ? 'active' : ''}" onclick="selectChannelStatus('${status}')">${status}</button>`).join('')}</div>
    <form id="channel-filters" class="filter-groups" onsubmit="event.preventDefault();applyChannelFilters()">
      <div class="filter-group"><select id="channel-time-type" aria-label="时间类型">${channelTimeFields().map(field => `<option>${field}</option>`).join('')}</select><input type="date" id="date-from" aria-label="开始日期"><span>—</span><input type="date" id="date-to" aria-label="结束日期"></div>
      <div class="filter-group"><select aria-label="KOC筛选类型"><option>KOC信息</option></select><input type="search" id="koc-filter" placeholder="KOC昵称/抖音号/UID" aria-label="KOC信息"></div>
      <div class="filter-group"><select aria-label="IP筛选类型"><option>IP信息</option></select><input type="search" id="ip-filter" placeholder="IP昵称/抖音号/UID" aria-label="IP信息"></div>
      <span class="review">新增</span><div class="filter-actions"><button class="primary" type="submit">查询</button><button class="outline" type="button" onclick="resetChannelFilters()">重置</button></div>
    </form>
    <table class="table"><thead><tr>
      <th>☐　KOC信息 <span class="review">新增</span></th><th>IP信息 <span class="review">新增</span></th>
      <th>渠道信息 <span class="review">新增</span></th><th>渠道类型 <span class="review">新增</span></th>
      <th>结算账户截图 <span class="review">新增</span></th><th>样片 <span class="review">新增</span></th>
      <th>申请时间 <span class="review">新增</span></th>
    </tr></thead><tbody id="channel-rows"></tbody></table>
    <section data-followup-prd style="margin-top:36px;border-top:1px solid #e7edf4;padding-top:24px"></section>`;
  renderChannelRows(channelRecords.filter(record => channelProgress(record) === channelStatus));
  renderChannelFollowupPrd();
}
function renderChannelRows(records) {
  document.querySelector('#channel-rows').innerHTML = records.map(record => `<tr>
    <td><div class="identity"><input type="checkbox" aria-label="选择${record.name}" style="width:auto;margin:0"><span class="avatar">${record.name.slice(-1)}</span><span><b>${record.name}</b><small>抖音号：${record.account}</small></span></div></td>
    <td><div class="identity"><span class="avatar">${record.ip.slice(0, 1)}</span><b>${record.ip}</b></div></td>
    <td>渠道 A</td><td>渠道</td>
    <td><button class="outline" onclick="m('结算账户截图','<p>截图预览占位</p>')">查看截图</button></td>
    <td><button class="outline" onclick="m('样片','<p>样片预览占位</p>')">查看</button></td>
    <td>${record.times['申请时间']} 10:30:00</td>
  </tr>`).join('') || '<tr><td colspan="7" class="muted" style="text-align:center">暂无数据</td></tr>';
}
function applyChannelFilters() {
  const from = document.querySelector('#date-from').value;
  const to = document.querySelector('#date-to').value;
  if (from && to && from > to) { alert('开始日期不能晚于结束日期'); return; }
  const koc = document.querySelector('#koc-filter').value.trim();
  const ip = document.querySelector('#ip-filter').value.trim();
  const field = document.querySelector('#channel-time-type').value;
  renderChannelRows(channelRecords.filter(record => {
    const time = record.times[field];
    return channelProgress(record) === channelStatus &&
      (!(from || to) || Boolean(time)) && (!from || time >= from) && (!to || time <= to) &&
      (!koc || `${record.name} ${record.account}`.includes(koc)) && (!ip || record.ip.includes(ip));
  }));
}
function resetChannelFilters() {
  document.querySelector('#channel-filters').reset();
  renderChannelRows(channelRecords.filter(record => channelProgress(record) === channelStatus));
}
