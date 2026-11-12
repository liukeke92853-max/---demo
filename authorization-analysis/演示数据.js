/* 仅用于需求评审的固定模拟数据；所有图表与明细均从这些申请事件计算。 */
const AS_OF = Date.parse('2026-11-05T18:00:00+08:00');
const HOUR = 3600000;
const DAY = 24 * HOUR;
const nodeDefs = {
  qualification:{label:'资质审核',group:'申请审核',owner:'内部审核'},
  sample:{label:'样片审核',group:'申请审核',owner:'内部审核'},
  mentor:{label:'待分配导师',group:'导师分配',owner:'内部处理'},
  ipSubmit:{label:'IP审核 · 待提交',group:'IP审核',owner:'达人操作'},
  ipReview:{label:'IP审核 · 待审核',group:'IP审核',owner:'内部审核'},
  ipRevise:{label:'IP审核 · 驳回待修改',group:'IP审核',owner:'达人操作'},
  account:{label:'账号绑定',group:'账号绑定',owner:'达人操作'},
  settlement:{label:'结算绑定',group:'结算绑定',owner:'达人操作'},
  fourSubmit:{label:'四件套 · 待提交资料',group:'四件套审核',owner:'达人操作'},
  fourReview:{label:'四件套 · 待审核',group:'四件套审核',owner:'内部审核'},
  fourRevise:{label:'四件套 · 驳回待修改',group:'四件套审核',owner:'达人操作'},
  uid:{label:'UID绑定',group:'UID绑定',owner:'内部处理'},
  cooperation:{label:'已合作',group:'已合作',owner:'已完成'}
};
const milestones = [
  {key:'apply',label:'提交申请',group:'申请审核'},
  {key:'approved',label:'申请审核通过',group:'导师分配'},
  {key:'ipSubmitted',label:'确认IP并提交',group:'IP审核'},
  {key:'ipPassed',label:'IP审核通过',group:'账号绑定'},
  {key:'account',label:'账号绑定完成',group:'结算绑定'},
  {key:'settlement',label:'结算绑定完成',group:'四件套审核'},
  {key:'fourPassed',label:'四件套审核通过',group:'UID绑定'},
  {key:'cooperated',label:'进入已合作',group:'已合作'}
];
const ipMilestones=[milestones[0],milestones[1],milestones[2],{key:'ipPassed',label:'IP审核通过（待UID绑定）',group:'UID绑定'},{key:'cooperated',label:'已绑定（小程序已合作）',group:'已合作'}];
const names=['沐光日常','晨妍穿搭','拾光小铺','南风日记','小鹿食记','米粒日常','阿橘穿搭','晴川日记','清风拂面','小麦同学','晚风知我意','青柠日记','七月慢慢','发发呀','陶子','林燕晴','热心宇宙人','六月雪','小公主','橙子好物','可可生活','一只小丸子','小城故事','甜甜的梨','夏日晴空','山茶花开','小鹿慢跑','木木穿搭','粒粒星光','川川好物','浅夏时光','时光慢慢'];
function randomFor(seed){let x=seed>>>0;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296;};}
function makeApplication(index, forcedStart, forcedChain){
  const rnd=randomFor(index*177+31);
  const appliedAt=forcedStart ?? Date.parse('2026-10-01T09:00:00+08:00')+Math.floor(rnd()*35)*DAY+Math.floor(rnd()*8)*HOUR;
  const chain=forcedChain||(index%3===0?'IP绑定KOC':'自主绑定KOC');
  const source=index%4===0?'平台达人':'渠道达人';
  const initialIP=chain==='自主绑定KOC'&&index%6===1?'暂无意向':['小咖吃喝','好好生活','老琴私服'][Math.floor(index/5)%3];
  const needUid=chain==='IP绑定KOC'||index%4!==1;
  const plannedMentor=['甜梨','林老师','周老师'][Math.floor(index/4)%3];
  const r={id:'apply-'+index,accountId:'account-'+index,name:names[index%names.length]+(index>=names.length?'·'+['生活号','穿搭号','好物号','分享号','日常号','精选号','食记号'][Math.floor(index/names.length)-1] : ''),douyin:'dy'+(825100+index),chain,source,channel:source==='平台达人'?'—':index%2?'光鳍联盟':'星河机构',mentor:'未分配',ip:initialIP,initialIP,appliedAt,needUid,events:[{at:appliedAt,label:'提交达人授权申请',detail:'来源：'+source+'；申请链路：'+chain}],episodes:[],reached:{apply:appliedAt},outcome:'active',reason:'',exitSource:'',exitAt:null,rejectCount:0};
  let time=appliedAt;
  const route=[['qualification'],['sample'],['mentor'],['ipSubmit']];
  if(index%5===0)route.push(['ipReview','reject'],['ipRevise']);
  route.push(['ipReview']);
  if(chain!=='IP绑定KOC'){
    route.push(['account'],['settlement'],['fourSubmit']);
    if(index%7===0)route.push(['fourReview','reject'],['fourRevise']);
    route.push(['fourReview']);
  }
  if(needUid)route.push(['uid']);
  route.push(['cooperation']);
  const bucket=Math.floor(rnd()*100);
  const target=chain==='IP绑定KOC'?(bucket<8?'qualification':bucket<16?'sample':bucket<24?'mentor':bucket<40?'ipSubmit':bucket<50&&index%5===0?'ipRevise':bucket<64?'ipReview':bucket<83?'uid':'cooperation'):(bucket<6?'qualification':bucket<12?'sample':bucket<18?'mentor':bucket<29?'account':bucket<39?'settlement':bucket<47?'ipSubmit':bucket<53&&index%5===0?'ipRevise':bucket<61?'ipReview':bucket<68?'fourSubmit':bucket<75?'fourReview':bucket<79&&index%7===0?'fourRevise':bucket<83&&needUid?'uid':'cooperation');
  for(let pos=0;pos<route.length;pos++){
    const [node,result]=route[pos];
    const ep={node,group:nodeDefs[node].group,owner:nodeDefs[node].owner,entered:time,exited:null,result:null};
    r.episodes.push(ep);
    r.node=node;
    if(node==='cooperation'){
      r.reached.cooperated=time;
      r.events.push({at:time,label:'进入已合作',detail:needUid?'UID绑定完成，进入已合作':'该IP无需UID绑定，四件套通过后进入已合作'});
    }
    const duration=(2+Math.floor(rnd()*29))*HOUR;
    const next=time+duration;
    const isTarget=node===target&&!(node==='ipReview'&&result==='reject')&&!(node==='fourReview'&&result==='reject');
    if(isTarget||node==='cooperation'||next>AS_OF)break;
    ep.exited=next;ep.result=result==='reject'?'驳回':'完成';
    if(node==='mentor')r.mentor=plannedMentor;
    if(node==='ipSubmit'&&r.ip==='暂无意向')r.ip=['小咖吃喝','好好生活'][index%2];
    const map={sample:['approved','申请审核通过'],account:['account','账号绑定完成'],settlement:['settlement','结算绑定完成'],ipSubmit:['ipSubmitted','确认意向IP并提交审核'],ipRevise:['ipSubmitted','修改意向IP后重新提交'],ipReview:['ipPassed','IP审核通过'],fourReview:['fourPassed','四件套审核通过'],uid:['uid','UID绑定完成']};
    if(result==='reject'){
      r.rejectCount++;
      const reason=node==='ipReview'?'账号不满足 IP 要求，请重新选择意向 IP':'未按照 IP 要求修改四件套，请根据素材修改';
      r.events.push({at:next,label:node==='ipReview'?'IP审核驳回':'四件套审核驳回',detail:reason});
    }else if(map[node]){
      const [key,label]=map[node];
      r.reached[key]??=next;
      r.events.push({at:next,label,detail:node==='ipRevise'?'原意向IP：'+r.ip+'；修改为：好好生活':node==='ipReview'?'审核导师：'+r.mentor:node==='account'?'完成我方MCN账号绑定':undefined});
      if(node==='ipRevise')r.ip='好好生活';
    }else{
      r.events.push({at:next,label:{qualification:'资质审核通过',mentor:'分配导师',fourSubmit:'提交四件套审核信息',fourRevise:'修改四件套后重新提交'}[node]||nodeDefs[node].label+'完成',detail:node==='mentor'?'所属导师：'+r.mentor:undefined});
    }
    time=next;
  }
  const current=r.episodes.at(-1);
  const endTime=current.entered+(3+Math.floor(rnd()*65))*HOUR;
  if(index%5===2&&endTime<AS_OF){
    r.exitSource=current.group;r.exitNode=current.node;r.exitAt=endTime;
    const hasMcn=chain==='IP绑定KOC'?!!r.reached.cooperated:!!r.reached.account;
    const transfer=(chain==='IP绑定KOC'?hasMcn:!!r.reached.settlement)&&index%4===2;
    r.reason=transfer?'所选IP要求绑定IP方MCN':index%9===2?'联系不上达人':index%9===7?'未记录原因':'达人主动放弃';
    if(['account','settlement'].includes(r.node)&&index%2===0&&current.entered+8*DAY<AS_OF){r.reason='超时未流转';r.exitAt=current.entered+8*DAY;}
    r.outcome=transfer?'transfer':hasMcn?'exited':'ended';
    if(r.outcome==='ended')r.endKind='rejected';
    // 账号绑定失败为终止，归入结束；保留实际失败环节、原因及时间。
    if(r.outcome==='ended'&&r.node==='account'){
      r.endKind='failed';r.reason='达人拒绝账号绑定';
    }
    r.events.push({at:r.exitAt,label:hasMcn?'发起解除绑定':'结束授权申请',detail:'发起环节：'+r.exitSource+'；原因：'+r.reason});
    const initiatedAt=r.exitAt;
    const completed=initiatedAt+(4+index%15)*HOUR;
    if(hasMcn&&index%15===7){
      r.outcome='unbinding';r.exitAt=null;r.unbindAt=initiatedAt;
      current.exited=initiatedAt;current.result='解绑中断';
      r.events.push({at:initiatedAt,label:'进入后续解绑流程',detail:'解绑尚未完成，仍为处理中，不计入已结束或已退出'});
    }else{
      r.exitAt=hasMcn?Math.min(completed,AS_OF):r.exitAt;
      current.exited=r.exitAt;current.result=transfer?'转绑退出':hasMcn?'解绑完成':'结束';
      if(hasMcn)r.events.push({at:r.exitAt,label:'解除我方MCN绑定完成',detail:transfer?'退出我方机构；切片业务是否继续单独核实':'原因：'+r.reason});
    }
  }
  r.events.sort((a,b)=>a.at-b.at);
  return r;
}
const analyticsData=Array.from({length:228},(_,i)=>makeApplication(i));
// 同一账号结束后再次申请，用于验证账号去重与原申请历史保留。
for(const [j,old] of analyticsData.filter(x=>['ended','exited'].includes(x.outcome)&&x.exitAt<Date.parse('2026-10-22T00:00:00+08:00')).slice(0,5).entries()){
  const newer=makeApplication(300+j,old.exitAt+DAY,old.chain);
  Object.assign(newer,{accountId:old.accountId,name:old.name,douyin:old.douyin,chain:old.chain,source:old.source,channel:old.channel});
  newer.events[0].detail='原申请结束后重新发起；保留原申请记录';analyticsData.push(newer);
}
