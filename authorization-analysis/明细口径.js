/* 看板入口与授权页共用的明细筛选口径；传入已完成全局筛选的申请记录。 */
(()=>{
  const ended=r=>r.nativeTab==='failed'||r.endKind==='failed'||['ended','exited','transfer'].includes(r.outcome);
  const unique=rows=>[...new Map([...rows].sort((a,b)=>(a.appliedAt||0)-(b.appliedAt||0)).map(r=>[r.accountId,r])).values()];
  const nodes={qualification:['申请审核','内部审核'],sample:['申请审核','内部审核'],mentor:['导师分配','内部处理'],ipSubmit:['IP审核','达人操作'],ipReview:['IP审核','内部审核'],ipRevise:['IP审核','达人操作'],account:['账号绑定','达人操作'],settlement:['结算绑定','达人操作'],fourSubmit:['四件套审核','达人操作'],fourReview:['四件套审核','内部审核'],fourRevise:['四件套审核','达人操作'],uid:['UID绑定','内部处理'],cooperation:['已合作','已完成']};
  const buckets={qualification:'apply',sample:'apply',mentor:'approved',ipSubmit:'approved',ipReview:'ipSubmitted',ipRevise:'ipSubmitted',account:'ipPassed',settlement:'account',fourSubmit:'settlement',fourReview:'settlement',fourRevise:'settlement',uid:'fourPassed',cooperation:'cooperated'};
  const milestoneLabels={apply:'提交申请',approved:'申请审核通过',ipSubmitted:'确认IP并提交',ipPassed:'IP审核通过',account:'账号绑定完成',settlement:'结算绑定完成',fourPassed:'四件套审核通过',cooperated:'进入已合作'};
  const nodeLabels={qualification:'资质审核',sample:'样片审核',mentor:'待分配导师',ipSubmit:'IP审核 · 待提交',ipReview:'IP审核 · 待审核',ipRevise:'IP审核 · 驳回待修改',account:'账号绑定',settlement:'结算绑定',fourSubmit:'四件套 · 待提交资料',fourReview:'四件套 · 待审核',fourRevise:'四件套 · 驳回待修改',uid:'UID绑定',cooperation:'已合作'};
  const currentBucket=r=>r.chain==='IP绑定KOC'&&r.node==='uid'?'ipPassed':buckets[r.node];
  const active=r=>!ended(r)&&r.outcome==='active'&&r.node!=='cooperation';
  const lossGroup=r=>r.outcome==='transfer'?'transfer':r.reached?.cooperated?'after':r.historyComplete===false?null:'before';
  const inLoss=(r,range)=>ended(r)&&(range==='all'||!range||lossGroup(r)===range);
  function ageBucket(r,asOf){const entered=r.episodes?.at(-1)?.entered;if(!Number.isFinite(entered))return null;const hours=(asOf-entered)/3600000;return hours<0?null:hours<24?0:hours<72?1:hours<=168?2:3;}
  function select(records,scope={},asOf){
    const {type='total',key='',value='',range='all'}=scope;
    const accounts=unique(records),applications=['loss-type','loss-stage','loss-reason','loss-all'].includes(type);
    const base=applications?records:accounts;
    let rows;
    switch(type){
      case 'total':rows=accounts;break;
      case 'processing':rows=accounts.filter(r=>active(r)||r.outcome==='unbinding');break;
      case 'ended':rows=accounts.filter(ended);break;
      case 'current-coop':rows=accounts.filter(r=>!ended(r)&&r.outcome==='active'&&r.node==='cooperation');break;
      case 'pending':rows=accounts.filter(r=>r.outcome==='unbinding');break;
      case 'stock':rows=accounts.filter(r=>!ended(r)&&r.outcome==='active'&&currentBucket(r)===key);break;
      case 'ended-stage':rows=accounts.filter(r=>ended(r)&&currentBucket({...r,node:r.exitNode||r.node})===key);break;
      case 'owner':rows=accounts.filter(r=>active(r)&&nodes[r.node]?.[1]===value);break;
      case 'backlog':rows=accounts.filter(r=>active(r)&&nodes[r.node]?.[0]===value);break;
      case 'age':rows=accounts.filter(r=>active(r)&&nodes[r.node]?.[0]===value&&ageBucket(r,asOf)===Number(key));break;
      case 'node':rows=accounts.filter(r=>active(r)&&r.node===key);break;
      case 'group':rows=accounts.filter(r=>(r[key]||'—')===value);break;
      case 'group-ended':rows=accounts.filter(r=>ended(r)&&(r[key]||'—')===value);break;
      case 'loss-type':rows=base.filter(r=>key==='pending'?r.outcome==='unbinding':ended(r)&&lossGroup(r)===key);break;
      case 'loss-stage':rows=base.filter(r=>inLoss(r,range)&&r.exitSource===value);break;
      case 'loss-reason':rows=base.filter(r=>inLoss(r,range)&&(r.reason||'未记录原因')===value);break;
      case 'loss-all':rows=base.filter(r=>inLoss(r,range));break;
      default:rows=[];
    }
    return {rows,grain:applications?'application':'account'};
  }
  function describe(s={}){
    const labels={total:'申请账号',processing:'当前处理中',ended:'当前已结束','current-coop':'当前合作中',pending:'解绑处理中'};
    if(labels[s.type])return labels[s.type];
    if(['stock','ended-stage'].includes(s.type))return (s.type==='stock'?'当前停留：':'从此结束：')+(milestoneLabels[s.key]||s.key)+'之后';
    if(s.type==='owner')return '等待'+s.value;
    if(s.type==='backlog')return '当前积压：'+s.value;
    if(s.type==='age')return s.value+' · '+['不足1天','1至不足3天','3至7天','超过7天'][s.key];
    if(s.type==='node')return '当前积压：'+(nodeLabels[s.key]||s.key);
    if(s.type==='group'||s.type==='group-ended')return (s.type==='group-ended'?'当前已结束 · ':'')+'分组：'+s.value;
    if(s.type==='loss-type')return {before:'合作前结束',after:'合作后结束',transfer:'转绑IP方MCN',pending:'解绑处理中'}[s.key]||'';
    const range={all:'全部结束申请',before:'合作前结束',after:'合作后结束',transfer:'转绑IP方MCN'}[s.range||'all'];
    if(s.type==='loss-stage')return range+' · 发起环节：'+s.value;
    if(s.type==='loss-reason')return range+' · 原因：'+s.value;
    return range;
  }
  function fromParams(params){return {type:params.get('scope')||'total',key:params.get('scopeKey')||'',value:params.get('scopeValue')||'',range:params.get('lossScope')||'all'};}
  const destinations=[
    {id:'qualification',tab:'review',sub:'qualification',label:'待审核 / 资质审核',status:'待审核'},
    {id:'sample',tab:'review',sub:'sample',label:'待审核 / 样片审核',status:'待审核'},
    {id:'mentor',tab:'mentor',label:'待分配导师'},
    {id:'ipSubmit',tab:'ipReview',label:'IP审核',status:'待提交'},
    {id:'ipReview',tab:'ipReview',label:'IP审核',status:'待审核'},
    {id:'ipRevise',tab:'ipReview',label:'IP审核',status:'已驳回待修改'},
    {id:'account',tab:'account',sub:'account',label:'待绑定 / 账号绑定'},
    {id:'settlement',tab:'settlement',sub:'settlement',label:'待绑定 / 结算绑定'},
    {id:'fourSubmit',tab:'bound',sub:'fourPiece',label:'已绑定 / 四件套审核',status:'待提交资料'},
    {id:'fourReview',tab:'bound',sub:'fourPiece',label:'已绑定 / 四件套审核',status:'待审核'},
    {id:'fourRevise',tab:'bound',sub:'fourPiece',label:'已绑定 / 四件套审核',status:'已驳回待修改'},
    {id:'uid',tab:'bound',sub:'uid',label:'已绑定 / UID绑定'},
    {id:'cooperation',tab:'cooperation',label:'已合作'},
    {id:'cleanup',tab:'cleanup',label:'待清退'},
    {id:'unbind',tab:'unbind',label:'待确认解绑'},
    {id:'unbinded',tab:'unbinded',label:'已解绑'},
    {id:'failed',tab:'failed',label:'绑定失败'},
    {id:'rejected',tab:'rejected',label:'已驳回'}
  ];
  const byId=id=>destinations.find(d=>d.id===id);
  const ipNodeIds=['qualification','sample','mentor','ipSubmit','ipReview','ipRevise','uid','cooperation'];
  function destination(id,chain){
    const d=byId(id);if(!d)return null;
    if(chain==='IP绑定KOC'){
      if(['account','settlement','fourSubmit','fourReview','fourRevise','cleanup','unbind','failed'].includes(id))return null;
      if(id==='uid')return {...d,tab:'approved',sub:'',label:'审核通过（待UID绑定）'};
      if(id==='cooperation')return {...d,tab:'bound',sub:'',label:'已绑定'};
    }
    return {...d,tab:d.tab==='ipReview'&&chain!=='IP绑定KOC'?'mentorIpReview':d.tab};
  }
  const originNodes={申请审核:['qualification','sample'],导师分配:['mentor'],IP审核:['ipSubmit','ipReview','ipRevise'],账号绑定:['account'],结算绑定:['settlement'],四件套审核:['fourSubmit','fourReview','fourRevise'],UID绑定:['uid'],已合作:['cooperation']};
  function route(scope={},chain='自主绑定KOC',records,asOf){
    let ids=[];
    switch(scope.type){
      case 'node':ids=[scope.key];break;
      case 'stock':ids=chain==='IP绑定KOC'&&scope.key==='ipPassed'?['uid']:Object.keys(buckets).filter(id=>buckets[id]===scope.key);break;
      case 'owner':ids=Object.keys(nodes).filter(id=>nodes[id][1]===scope.value&&id!=='cooperation');break;
      case 'backlog':case 'age':ids=originNodes[scope.value]||[];break;
      case 'current-coop':ids=['cooperation'];break;
      case 'pending':ids=['cleanup','unbind'];break;
      case 'processing':ids=[...Object.keys(nodes).filter(id=>id!=='cooperation'),'cleanup','unbind'];break;
      case 'ended':case 'group-ended':ids=['rejected','failed','unbinded'];break;
      case 'ended-stage':ids=scope.key==='cooperated'?['unbinded']:['rejected','failed','unbinded'];break;
      case 'loss-type':ids=scope.key==='pending'?['cleanup','unbind']:scope.key==='before'?['rejected','failed','unbinded']:['unbinded'];break;
      case 'loss-stage':ids=['after','transfer'].includes(scope.range)?['unbinded']:['rejected','failed','unbinded'];break;
      case 'loss-reason':case 'loss-all':ids=['after','transfer'].includes(scope.range)||scope.value==='所选IP要求绑定IP方MCN'?['unbinded']:['rejected','failed','unbinded'];break;
      default:ids=destinations.map(d=>d.id);
    }
    const targets=ids.map(id=>destination(id,chain)).filter(Boolean);
    const matches=records?select(records,scope,asOf).rows:[];
    const primary=targets.find(d=>matches.some(r=>{const current=location(r);return current&&current.tab===d.tab&&(!d.sub||current.sub===d.sub)&&(!d.status||current.status===d.status);}));
    return {menu:chain,targets,primary:primary||targets[0]||null};
  }
  function location(record){
    // 已驳回是独立终态；待修改仍在IP/四件套审核内，绑定失败不冒充驳回。
    if(record.nativeTab)return {tab:record.nativeTab};
    if(record.endKind==='failed')return destination('failed',record.chain);
    if(record.outcome==='unbinding')return destination(record.unbindStep==='cleanup'?'cleanup':'unbind',record.chain);
    if(['exited','transfer'].includes(record.outcome))return destination('unbinded',record.chain);
    if(record.outcome==='ended')return destination(record.endKind==='failed'?'failed':'rejected',record.chain);
    return destination(record.node,record.chain);
  }
  function matchesDestination(record,tab,sub=''){
    const d=location(record);if(!d)return false;
    return (d.tab==='ipReview'?['ipReview','mentorIpReview'].includes(tab):d.tab===tab)&&(!d.sub||!sub||d.sub===sub);
  }
  function routeLabel(plan){return [...new Set(plan.targets.map(d=>d.label+(d.status?'（'+d.status+'）':'')))].join('；');}
  globalThis.AnalysisDrill={select,describe,fromParams,unique,currentBucket,lossGroup,ageBucket,isEnded:ended,isActive:active,nodes,destinations,destination,ipNodeIds,originNodes,route,location,matchesDestination,routeLabel};
})();
