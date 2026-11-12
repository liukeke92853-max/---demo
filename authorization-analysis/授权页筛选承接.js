/* 仅在从转化分析进入时承接查询条件，授权页自身的业务操作继续使用原实现。 */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('fromAnalysis')!=='1')return;
  const keys=['start','end','chain','source','channel','mentor','ip'];
  const incoming=Object.fromEntries(keys.map(key=>[key,params.get(key)||'']));
  const safeText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00+08:00'));
  if(!validDate(incoming.start)||!validDate(incoming.end)||incoming.start>incoming.end)return;
  if(!['自主绑定KOC','IP绑定KOC'].includes(incoming.chain))return;
  if(incoming.source==='平台达人')incoming.channel='';
  if(incoming.channel)incoming.source='渠道达人';
  let enabled=true,landed=false,needsTabReveal=false;
  const scope=AnalysisDrill.fromParams(params);
  const plan=AnalysisDrill.route(scope,incoming.chain);
  const requested=plan.targets.find(d=>d.tab===params.get('targetTab')&&(d.sub||'')===(params.get('targetSubtab')||'')&&(d.status||'')===(params.get('targetStatus')||''));
  if(requested)plan.primary=requested;
  const asOf=Number(params.get('asOf'))>0?Number(params.get('asOf')):Date.now();
  let allowed=new Set();
  state.page=incoming.chain==='IP绑定KOC'?'ipbind':'auth';
  state.mentorFilter=incoming.mentor;
  const bar=document.createElement('section');bar.className='analysis-filter-context';
  document.querySelector('.main').prepend(bar);
  const style=document.createElement('style');
  style.textContent='.analysis-filter-context{padding:14px 18px;background:#fff;border:1px solid #e7ebf2;border-radius:8px;margin-bottom:16px;color:#667b98;font-size:12px}.analysis-filter-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap}.analysis-filter-head a{margin-left:auto;color:#2468f2;text-decoration:none}.analysis-filter-head button{border:0;color:#2468f2;background:none;cursor:pointer;font:inherit}.analysis-filter-values{display:flex;gap:9px;flex-wrap:wrap;margin-top:10px}.analysis-filter-values span{padding:3px 8px;background:#f2f6ff;border-radius:4px}.analysis-filter-context i{font-size:10px;color:#8398b8;background:#edf2fb;padding:1px 4px;border-radius:3px;font-style:normal}.filters input:first-child{min-width:330px}';
  document.head.append(style);
  const originalMatches=matchesMentor;
  const baselineApplyTime={auth:'2026-09-14 14:17:55',ipbind:ipBindTimeMeta.review.value};
  function matchesGlobal(item){
    if(!enabled)return true;
    // 本地授权页申请时间原为固定展示值，承接时沿用其已展示日期，不以通过时间替代。
    const time=Date.parse(baselineApplyTime[state.page].replace(' ','T')+'+08:00');
    const begin=Date.parse(incoming.start+'T00:00:00+08:00'),end=Date.parse(incoming.end+'T00:00:00+08:00')+86400000;
    if(time<begin||time>=end)return false;
    if(incoming.ip&&item.ip!==incoming.ip)return false;
    // 原授权快照未提供来源和渠道映射，不将缺失值冒充为平台或某个渠道。
    if(incoming.source||incoming.channel)return false;
    return true;
  }
  function normalize(item){
    const status=item.status;
    let outcome='active',node=null;
    if(status==='待审核')node=item.qualification==='已通过'?'sample':'qualification';
    else if(status==='待分配导师')node='mentor';
    else if(['导师审核中','IP审核中'].includes(status))node=item.ipReview==='已驳回待修改'?'ipRevise':item.ipReview==='待提交'?'ipSubmit':'ipReview';
    else if(item.binding==='待账号绑定'||status==='待账号绑定')node='account';
    else if(item.binding==='待结算绑定'||status==='待结算绑定')node='settlement';
    else if(state.page==='ipbind'&&status==='审核通过')node='uid';
    else if(state.page==='ipbind'&&status==='已绑定')node='cooperation';
    else if(status==='已绑定')node=item.fourPiece==='已通过'&&item.needUid?'uid':item.fourPiece==='已驳回待修改'?'fourRevise':item.fourPiece==='待提交资料'?'fourSubmit':'fourReview';
    else if(status==='已合作')node='cooperation';
    else if(['待清退','待确认解绑'].includes(status))outcome='unbinding';
    else if(status==='已解绑')outcome='exited';
    else if(status==='绑定失败')outcome='ended';
    else if(['已驳回','审核驳回'].includes(status))outcome='ended';
    // 原授权样本缺少本轮状态进入时间、解绑发起环节和合作历史，不从通过时间或当前Tab反推。
    return {raw:item,chain:state.page==='ipbind'?'IP绑定KOC':'自主绑定KOC',accountId:item.phone||item.id,appliedAt:Date.parse(baselineApplyTime[state.page].replace(' ','T')+'+08:00'),node,outcome,mentor:item.mentor==='—'?'未分配':item.mentor,ip:item.ip,source:null,channel:null,episodes:[{entered:null}],exitSource:null,exitNode:null,reason:outcome==='ended'?item.reviewRejectReason||'':'',reached:status==='已合作'||state.page==='ipbind'&&status==='已绑定'?{cooperated:true}:{},historyComplete:false,nativeTab:({'已驳回':'rejected','审核驳回':'rejected','已解绑':'unbinded','待清退':'cleanup','待确认解绑':'unbind','绑定失败':'failed'})[status]};
  }
  function prepareScope(){
    if(!enabled||state.page==='materials')return;
    const records=(state.page==='ipbind'?ipBindData:data).filter(item=>matchesGlobal(item)&&originalMatches(item,state.mentorFilter)).map(normalize);
    const selected=AnalysisDrill.select(records,scope,asOf).rows;
    allowed=new Set(selected.map(row=>row.raw));
    if(!landed&&plan.primary){
      const target=plan.primary;
      if(state.page==='auth')state.tab=target.tab;
      else state.ipBindTab=target.tab;
      if(target.sub==='qualification'||target.sub==='sample'){state.subtab=target.sub;state.ipBindReviewSubtab=target.sub;}
      if(target.sub==='fourPiece'||target.sub==='uid')state.boundSubtab=target.sub;
      landed=true;
      needsTabReveal=true;
    }
  }
  // 在无匹配数据时也按入口映射定位，不由第一条数据或默认“待审核”决定目标Tab。
  const baseInTab=inTab;
  inTab=function(item){
    if(!enabled)return baseInTab(item);
    return allowed.has(item)&&originalMatches(item,state.mentorFilter)&&AnalysisDrill.matchesDestination(normalize(item),state.tab,state.tab==='bound'?state.boundSubtab:state.tab==='review'?state.subtab:'');
  };
  const initialIpTabs=ipBindTabs.slice();
  // 补回已有增量需求确认的线上“审核通过”节点；不把自主绑定的后续Tab套到IP链路。
  if(!ipBindTabs.some(([tab])=>tab==='approved'))ipBindTabs.splice(ipBindTabs.findIndex(([tab])=>tab==='bound'),0,['approved','审核通过']);
  ipBindTimeMeta.approved={label:'通过时间',filter:'通过时间　开始日期　—　结束日期'};
  function matchesCurrent(item,tab,sub=''){return allowed.has(item)&&originalMatches(item,state.mentorFilter)&&AnalysisDrill.matchesDestination(normalize(item),tab,sub);}
  function paintSubtabs(){
    if(!enabled)return;
    const ip=state.page==='ipbind',tab=ip?state.ipBindTab:state.tab,records=ip?ipBindData:data,box=document.querySelector('#subtabs');
    const mainTabs=document.querySelector('#tabs'),attribute=ip?'data-ipbind-tab':'data-tab';
    const accountButton=mainTabs.querySelector('['+attribute+'="account"]'),settlementButton=mainTabs.querySelector('['+attribute+'="settlement"]');
    if(accountButton&&settlementButton){
      const total=records.filter(r=>matchesCurrent(r,'account')||matchesCurrent(r,'settlement')).length;
      accountButton.textContent='待绑定（'+total+'）';accountButton.classList.toggle('active',['account','settlement'].includes(tab));settlementButton.remove();
    }
    const ipButton=mainTabs.querySelector('[data-tab="mentorIpReview"]');if(ipButton)ipButton.textContent=ipButton.textContent.replace('导师IP审核','IP审核');
    if(['account','settlement'].includes(tab)){
      box.hidden=false;box.innerHTML=[['account','账号绑定'],['settlement','结算绑定']].map(([id,label])=>'<button class="subtab '+(tab===id?'active':'')+'" '+attribute+'="'+id+'">'+label+'（'+records.filter(r=>matchesCurrent(r,id)).length+'）</button>').join('');
    }else if(tab==='review'){
      const selected=ip?state.ipBindReviewSubtab:state.subtab;box.hidden=false;
      box.innerHTML=[['qualification','资质审核'],['sample','样片审核']].map(([id,label])=>'<button class="subtab '+(selected===id?'active':'')+'" '+(ip?'data-ipbind-review-subtab':'data-subtab')+'="'+id+'">'+label+'（'+records.filter(r=>matchesCurrent(r,tab,id)).length+'）</button>').join('');
    }else if(tab==='bound'&&!ip){
      box.hidden=false;box.innerHTML=[['fourPiece','四件套审核'],['uid','UID绑定']].map(([id,label])=>'<button class="subtab '+(state.boundSubtab===id?'active':'')+'" data-bound-subtab="'+id+'">'+label+'（'+records.filter(r=>matchesCurrent(r,tab,id)).length+'）</button>').join('');
    }
    if(ip&&tab==='approved'){
      const list=records.filter(r=>matchesCurrent(r,tab));
      document.querySelector('#table').innerHTML=ipBindTable(list,()=> '—',false);document.querySelector('#total').textContent=list.length;
    }
  }

  matchesMentor=function(item,filter=state.mentorFilter){return originalMatches(item,filter)&&(!enabled||allowed.has(item));};
  function returnURL(){
    const url=new URL('./index.html',location.href);
    url.search=new URLSearchParams({...incoming,analysisTab:params.get('analysisTab')||'overview'}).toString();
    return url.href;
  }
  const originalRender=render;
  render=function(){
    prepareScope();
    originalRender();
    bar.hidden=state.page==='materials';if(bar.hidden)return;
    const dateField=document.querySelector('.filters input[readonly]');
    if(enabled)dateField.value='申请时间　'+incoming.start+'　—　'+incoming.end;
    const ipField=document.querySelector('input[placeholder="IP昵称 / 抖音号 / UID"]');
    ipField.value=enabled?incoming.ip:'';
    bar.dataset.scope=JSON.stringify(scope);
    bar.innerHTML='<div class="analysis-filter-head"><b>筛选条件 <i>新增</i></b><a href="'+safeText(returnURL())+'">返回转化分析</a>'+(enabled?'<button id="clear-analysis-filters">清除分析筛选</button>':'')+'</div><div class="analysis-filter-values">'+(enabled?'<span>明细范围：'+safeText(AnalysisDrill.describe(scope))+'</span><span>目标Tab：'+safeText(AnalysisDrill.routeLabel(plan))+'</span><span>申请时间：'+safeText(incoming.start)+' 至 '+safeText(incoming.end)+'</span>'+[['source','来源'],['channel','渠道'],['mentor','导师'],['ip','IP']].filter(([key])=>incoming[key]).map(([key,label])=>'<span>'+label+'：'+safeText(incoming[key])+'</span>').join(''):'<span>已清除分析页带入的筛选条件</span>')+'</div>';
    if(enabled){
      if(state.page==='auth'){
        const saved=state.tab;
        for(const button of document.querySelectorAll('#tabs [data-tab]')){state.tab=button.dataset.tab;const count=data.filter(item=>matchesCurrent(item,state.tab)).length;button.textContent=button.textContent.replace(/（[^）]*）/,'（'+count+'）');}
        state.tab=saved;
      }else if(state.page==='ipbind'){
        for(const button of document.querySelectorAll('[data-ipbind-tab]')){const count=ipBindData.filter(item=>matchesCurrent(item,button.dataset.ipbindTab)).length;button.textContent=button.textContent.replace(/（[^）]*）/,'（'+count+'）');}
      }
    }
    paintSubtabs();
    const notes=document.createElement('section');notes.className='prd-section';notes.innerHTML='<h3>新增｜分析页筛选承接</h3><p>从转化分析进入时，使用申请时间区间，并带入申请链路、来源、渠道、导师和IP筛选。切换状态节点仍保留带入条件；不以节点通过时间替换申请时间。清除分析筛选后恢复授权页原查询范围；返回分析保留原日期、链路和分析页签。当前明细范围按入口传入的状态、节点、停留时长、结束分类或原因取交集；缺少状态进入时间或发起环节的记录不猜测匹配。</p>';
    const mapping=document.createElement('p');mapping.textContent='当前入口目标：'+AnalysisDrill.routeLabel(plan)+'。终止型申请驳回进入已驳回；IP或四件套驳回待修改分别保留在对应审核Tab；绑定失败进入绑定失败，已解绑进入已解绑。空结果不改变目标Tab；缺少原发起环节和进入时间时不反推。';notes.append(mapping);document.querySelector('#prd-notes').replaceChildren(notes);
    if(needsTabReveal){const tabs=document.querySelector('#tabs'),active=tabs.querySelector('.active');if(active){const a=active.getBoundingClientRect(),t=tabs.getBoundingClientRect();tabs.scrollLeft+=a.left-t.left-(t.width-a.width)/2;}needsTabReveal=false;}
  };
  bar.addEventListener('click',event=>{
    if(event.target.id!=='clear-analysis-filters')return;
    enabled=false;state.mentorFilter='';
    ipBindTabs.splice(0,ipBindTabs.length,...initialIpTabs);delete ipBindTimeMeta.approved;
    if(!initialIpTabs.some(([id])=>id===state.ipBindTab))state.ipBindTab='review';
    const dateField=document.querySelector('.filters input[readonly]');dateField.value='申请时间　开始日期　—　结束日期';
    render();
  });
  document.querySelector('#mentor-filter').addEventListener('change',event=>{incoming.mentor=event.target.value;render();});
  document.querySelector('input[placeholder="IP昵称 / 抖音号 / UID"]').addEventListener('change',event=>{incoming.ip=event.target.value.trim();render();});
  render();
})();
