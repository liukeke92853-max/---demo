/* 内部关联键仅用于维持演示数据关系，不作为业务字段展示。 */
const companies={'1747373':'Kva','100001':'AB 机构','123456':'青禾机构','234567':'星河机构','345678':'远山机构','456789':'拾光机构'};
const names={working:'合作中',pending:'待接受',closed:'已关闭',declined:'已拒绝'};
let slots,relations,logs,filter='all',scope=null,sequence=10,selectedRecipient='123456',phoneView='official',activeInviteId=null;
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=()=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date()).replaceAll('/','-');
const slotBy=id=>slots.find(s=>s.id===id);
function event(s,action,detail,actor='AB 机构'){logs.unshift({time:time(),company:s.company,action,detail,actor});}
function toast(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('toast').style.display='none',3000);}
function reset(){
 slots=[{id:'s1',company:'1747373',type:1,parent:'',rate:20,status:'working',createdAt:'2026-10-27 16:14:57'},{id:'s2',company:'234567',type:2,parent:'s1',rate:10,parentRate:20,status:'working',createdAt:'2026-10-28 10:25:32'},{id:'s3',company:'345678',type:1,parent:'',rate:15,status:'working',createdAt:'2026-10-29 14:08:11'}];
 relations=[{name:'林间工作室',source:'s1',owner:'s1'},{name:'晨曦工作室',source:'s2',owner:'s2'},{name:'流光工作室',source:'s2',owner:'s2'},{name:'新叶工作室',source:'s3',owner:'s3'}];
 logs=[];sequence=10;scope=null;selectedRecipient='123456';phoneView='official';activeInviteId=null;clearFilters();render();
}
function inviter(s){return s.type===1?'AB 机构':companies[slotBy(s.parent)?.company]||'—';}
function render(){
 const query=$('search').value.trim().toLowerCase(),level=$('level').value,start=$('startDate').value,end=$('endDate').value,invalid=start&&end&&start>end;
 $('filterError').textContent=invalid?'开始日期不能晚于结束日期':'';
 const visible=invalid?[]:slots.filter(s=>(filter==='all'||s.status===filter)&&(!query||(companies[s.company]+' '+s.company).toLowerCase().includes(query))&&(!level||String(s.type)===level)&&(!start||s.createdAt.slice(0,10)>=start)&&(!end||s.createdAt.slice(0,10)<=end));
 $('rows').innerHTML=visible.map(s=>`<tr><td><div class="identity"><span class="avatar">${esc(companies[s.company].slice(0,1))}</span><div><b>${esc(companies[s.company])}</b><small>ID：${s.company}</small></div></div></td><td>${s.type===1?'一级':'二级'}</td><td>${s.rate}%</td><td>${s.type===1?'--':`<div class="identity parent-identity"><span class="avatar">${esc(inviter(s).slice(0,1))}</span><div>${esc(inviter(s))}<small>ID：${slotBy(s.parent)?.company||'--'}</small></div></div>`}</td><td>${s.type===1?'--':(s.status==='pending'?s.parentRate:slotBy(s.parent)?.rate??s.parentRate)+'%'}</td><td>${esc(s.createdAt)}</td><td><span class="badge ${s.status}">${names[s.status]}</span></td><td>${s.status==='working'?`<button class="link" data-edit="${s.id}" data-review-change="edit-slot">编辑</button><button class="link danger-link" data-close="${s.id}" data-review-change="close-slot">关闭</button>`:''}<button class="link" data-log="${s.id}" data-review-change="logs">日志</button>${['closed','declined'].includes(s.status)?`<button class="link" data-reinvite="${s.id}" data-review-change="reinvite">重新邀请</button>`:''}</td></tr>`).join('')||'<tr><td colspan="8" class="empty">暂无符合条件的推广位</td></tr>';
 $('resultCount').textContent='共 '+visible.length+' 条';$('status').value=filter;
 $('recipient').innerHTML=Object.entries(companies).filter(([id])=>id!=='100001').map(([id,name])=>`<option value="${id}" ${id===selectedRecipient?'selected':''}>${name} · ${id}</option>`).join('');
 renderPhone();
 const items=logs.filter(l=>!scope||scope===l.company);
 $('logs').innerHTML=items.map(l=>`<tr><td>${l.time}</td><td>${esc(l.actor)}</td><td>${esc(l.action)}</td><td>${esc(l.detail)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">暂无操作日志</td></tr>';
 $('logTitle').textContent=scope?`${companies[scope]}的操作日志`:'操作日志';applyChangeMarks();
}
function openModal(html){$('modalContent').innerHTML=html;applyChangeMarks($('modalContent'));$('modal').showModal();$('modal').querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>$('modal').close());}
function create(old,editing=false){
 openModal(`<h2 data-review-change="${editing?'edit-slot':old?'reinvite':'create-slot'}">${editing?'编辑推广位':old?'重新邀请':'新增推广位'}</h2><form id="inviteForm"><label for="company">推广位机构 ID *</label><input id="company" inputmode="numeric" ${editing?'disabled':''} required pattern="[0-9]+" value="${old?.company||''}"><label for="type">推广位类型 *</label><select id="type"><option value="1">一级推广位</option><option value="2">二级推广位</option></select><label for="rate">分成比例（%）*</label><input id="rate" type="number" min="0" max="100" step="1" required value="${old?.rate??''}"><section id="parentFields" class="parent-section"><h3 data-review-change="parent-config">上级信息</h3><div class="parent-config"><div><label for="parent">关联上级 *</label><select id="parent"><option value="">请选择</option>${slots.filter(s=>s.status==='working'&&s.type===1&&(!editing||s.id!==old.id)).map(s=>`<option value="${s.id}">${companies[s.company]} · ${s.company}</option>`).join('')}</select></div><div><label for="parentRate">上级分成比例（%）*</label><input id="parentRate" type="number" min="0" max="100" step="1"></div></div><p class="parent-impact">${editing?'保存':'合作生效'}后同步更新该上级的分成比例。</p></section><p id="shareRule" class="share-rule" data-review-change="share-rule"></p><div class="error" id="formError"></div><div class="actions"><button type="button" data-cancel>取消</button><button class="primary" type="submit" ${editing?'':'data-review-change="send-invite"'}>${editing?'保存':'发出邀请'}</button></div></form>`);
 $('type').value=String(old?.type||1);if(old?.parent&&slotBy(old.parent)?.status==='working')$('parent').value=old.parent;
 function update(){const second=$('type').value==='2';$('parentFields').hidden=!second;$('parent').required=second;$('parentRate').required=second;if(!second){$('parent').value='';$('parentRate').value='';$('parentRate').disabled=true;}else{const selected=slotBy($('parent').value);$('parentRate').value=selected?selected.rate:'';$('parentRate').disabled=!selected;}$('shareRule').textContent=second?'例如推广位分60%、上级分20%：每100元渠道提成，推广位拿60元，上级拿20元，渠道留20元。两个比例相加不能超过100%。':'例如推广位分60%：每100元渠道提成，推广位拿60元，渠道留40元。';applyChangeMarks($('modalContent'));}
 $('type').onchange=update;$('parent').onchange=update;update();
 $('inviteForm').onsubmit=e=>{e.preventDefault();const company=$('company').value.trim(),type=Number($('type').value),parent=$('parent').value,rate=Number($('rate').value),parentRate=type===2?Number($('parentRate').value):0,p=slotBy(parent);let error='';
 if(!companies[company]||company==='100001')error='请输入有效的被邀机构 ID，不能邀请渠道自身。';else if(slots.some(s=>(!editing||s.id!==old.id)&&s.company===company&&['working','pending'].includes(s.status)))error='该机构已有合作或待接受邀请，不可重复发起。';else if(type===2&&(!p||p.status!=='working'||p.type!==1||p.company===company))error='请选择本渠道合作中的一级上级，且不能是自身。';else if(type===2&&parentRate+rate>100)error='二级与上级分成比例之和不得超过100%。';if(editing&&type===2&&slots.some(x=>x.parent===old.id&&['working','pending'].includes(x.status)))error='该推广位仍有下属，不能改为二级。';
 if(error){$('formError').textContent=error;return;}
 if(editing){const before=old.rate;Object.assign(old,{type,parent,rate,parentRate});if(type===2&&p.rate!==parentRate){event(p,'调整分成比例',`${p.rate}% → ${parentRate}%`);p.rate=parentRate;}event(old,'编辑推广位',`${companies[company]}：分成比例${before}% → ${rate}%`);$('modal').close();render();toast('保存成功。');return;}
 const s={createdAt:time(),id:`s${++sequence}`,company,type,parent,rate,parentRate,parentBase:type===2?p.rate:0,status:'pending',invitation:true};s.inviterName=inviter(s);slots.push(s);event(s,'发出邀请',`邀请${companies[company]}成为${type===1?'一级':'二级'}推广位；邀请方：${s.inviterName}`);selectedRecipient=company;scope=null;clearFilters();$('modal').close();render();showPhone();toast('邀请已发出。');
 };
}
function accept(id){
 const s=slotBy(id);if(!s||s.status!=='pending'||s.company!==selectedRecipient)return toast('邀请已处理或当前机构无权操作。');const p=slotBy(s.parent);
 if(s.type===2&&(!p||p.status!=='working'||p.type!==1))return toast('上级推广位已失效，无法接受邀请。');
 if(s.type===2&&p.rate!==s.parentBase)return toast('合作配置已变更，请联系邀请方重新确认。');
 if(slots.some(x=>x.id!==id&&x.company===s.company&&x.status==='working'))return toast('该机构已存在有效合作，不能重复接受。');
 if(s.type===2&&p.rate!==s.parentRate){event(p,'调整分成比例',`${p.rate}% → ${s.parentRate}%`);p.rate=s.parentRate;}
 s.status='working';activeInviteId=null;event(s,'接受邀请',`${companies[s.company]}接受${s.inviterName}的邀请，合作生效`,companies[s.company]);render();toast('已接受邀请。');
}
function closeSlot(id){
 const s=slotBy(id);if(!s||s.status!=='working')return;const children=slots.filter(x=>x.parent===id&&x.status==='working'),targets=[s,...children],ids=targets.map(x=>x.id),affected=relations.filter(r=>ids.includes(r.owner));
 openModal(`<h2 data-review-change="close-slot">确认关闭${esc(companies[s.company])}？</h2><div class="readonly">机构 ID：${s.company} · ${s.type===1?'一级':'二级'}推广位${children.length?`<br>同时关闭下属二级：${children.map(c=>`${esc(companies[c.company])}（ID：${c.company}）`).join('、')}`:''}</div><p>关闭后，${affected.length}条邀约由顶层渠道 <b>AB 机构</b>继承。</p>${affected.length?`<p class="muted">受影响邀约：${affected.map(r=>esc(r.name)).join('、')}</p>`:''}<div class="pending-note">关闭后不可再次启用，重新合作须重新邀请。历史订单及待结算收益保留原归属，关闭后新订单归AB机构。</div><div class="error" id="closeError"></div><div class="actions"><button data-cancel>取消</button><button id="confirmClose" class="danger" data-review-change="close-slot">确认关闭</button></div>`);
 $('confirmClose').onclick=()=>{
 const freshIds=[s,...slots.filter(x=>x.parent===id&&x.status==='working')].map(x=>x.id);if(s.status!=='working'||JSON.stringify(ids)!==JSON.stringify(freshIds)){$('closeError').textContent='合作状态已变化，请重新操作。';return;}
 for(const target of targets){const own=relations.filter(r=>r.owner===target.id);for(const r of own){r.owner='channel';event(target,'邀约继承',`${r.name}：${companies[target.company]} → AB 机构`);}target.status='closed';event(target,target.id===id?'关闭推广位':'随上级一起关闭',`${companies[target.company]}已关闭；${own.length}条邀约归AB机构`);}
 $('modal').close();render();toast('关闭成功。');};
}
function clearFilters(){filter='all';$('status').value='all';for(const id of ['search','level','startDate','endDate'])$(id).value='';}
function renderPhone(){
 $('phoneHead').textContent=phoneView==='official'?'公众号':'切片业务';if(phoneView==='business')$('phoneHead').dataset.reviewChange='business-entry';else delete $('phoneHead').dataset.reviewChange;$('officialScene').classList.toggle('active',phoneView==='official');$('businessScene').classList.toggle('active',phoneView==='business');
 if(phoneView==='official'){const notices=slots.filter(s=>s.company===selectedRecipient&&s.invitation).slice().reverse();$('phoneContent').innerHTML=notices.map(s=>`<article class="official-message" role="link" tabindex="0" data-open-invite="${s.id}"><h3 data-review-change="official-notice">合作邀请通知</h3><p>${esc(s.inviterName)}邀请您成为他的合作伙伴</p><div class="official-link">查看详情 <span>›</span></div></article>`).join('')||'<div class="empty">暂无邀请通知</div>';applyChangeMarks($('phoneDrawer'));return;}
 const current=slotBy(activeInviteId);$('phoneContent').innerHTML=current&&current.status==='pending'&&current.company===selectedRecipient?`<div class="invitation-mask"><section class="invitation-popup" role="dialog" aria-modal="true" aria-labelledby="invitePopupTitle"><h3 id="invitePopupTitle" data-review-change="invite-popup">合作邀请</h3><p>${esc(current.inviterName)}邀请您作为其推广合作伙伴</p><div class="invitation-actions"><button data-decline="${current.id}" data-review-change="decline-invite">拒绝</button><button class="primary" data-accept="${current.id}" data-review-change="accept-invite">接受</button></div></section></div>`:'';applyChangeMarks($('phoneDrawer'));
}
function enterBusiness(id){phoneView='business';activeInviteId=null;const target=id?slotBy(id):slots.find(s=>s.company===selectedRecipient&&s.invitation&&s.status==='pending');if(target&&target.company!==selectedRecipient){renderPhone();toast('当前机构无法处理该邀请。');return;}if(target&&target.status==='pending')activeInviteId=target.id;else if(id)toast('该邀请已处理。');renderPhone();}
function decline(id){const s=slotBy(id);if(!s||s.status!=='pending'||s.company!==selectedRecipient)return toast('邀请已处理或当前机构无权操作。');s.status='declined';activeInviteId=null;event(s,'拒绝邀请',`${companies[s.company]}拒绝${s.inviterName}的邀请，未建立合作`,companies[s.company]);render();toast('已拒绝邀请。');}
function showPhone(){phoneView='official';activeInviteId=null;renderPhone();$('phoneDrawer').showModal();}
function view(prd){$('demo').hidden=prd;$('fullPrd').hidden=!prd;$('demoView').classList.toggle('active',!prd);$('prdView').classList.toggle('active',prd);}
function closeDialogs(){for(const id of ['modal','phoneDrawer','logDialog'])if($(id).open)$(id).close();}
 document.addEventListener('click',e=>{const notice=e.target.closest('[data-open-invite]');if(notice){enterBusiness(notice.dataset.openInvite);return;}const b=e.target.closest('button');if(!b)return;if(b.dataset.edit)create(slotBy(b.dataset.edit),true);if(b.dataset.log){scope=slotBy(b.dataset.log).company;render();$('logDialog').showModal();}if(b.dataset.close)closeSlot(b.dataset.close);if(b.dataset.reinvite)create(slotBy(b.dataset.reinvite));if(b.dataset.accept)accept(b.dataset.accept);if(b.dataset.decline)decline(b.dataset.decline);});
$('showPhone').onclick=showPhone;$('closePhone').onclick=()=>$('phoneDrawer').close();$('closeLogs').onclick=()=>$('logDialog').close();
$('phoneDrawer').onclick=e=>{if(e.target===$('phoneDrawer')&&e.clientX<$('phoneDrawer').getBoundingClientRect().left)$('phoneDrawer').close();};
$('status').addEventListener('change',()=>{filter=$('status').value;render();});for(const id of ['search','level','startDate','endDate'])$(id).addEventListener(id==='search'?'input':'change',render);
$('resetFilters').onclick=()=>{clearFilters();render();};$('recipient').onchange=()=>{selectedRecipient=$('recipient').value;activeInviteId=null;render();if(phoneView==='business')enterBusiness();};$('create').onclick=()=>create();$('reset').onclick=()=>{closeDialogs();reset();};$('demoView').onclick=()=>view(false);$('prdView').onclick=()=>view(true);reset();

$('officialScene').onclick=()=>{phoneView='official';activeInviteId=null;renderPhone();};$('businessScene').onclick=()=>enterBusiness();

document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-open-invite]')){e.preventDefault();enterBusiness(e.target.dataset.openInvite);}});
