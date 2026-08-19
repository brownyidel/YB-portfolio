const STORAGE_KEY = 'flowpilot-workspace-v3';
const defaults = {
  runs: 18,
  flows: [
    {id:'lead-follow-up',name:'Lead follow-up',trigger:'When a form is submitted',action:'Send an email summary',schedule:'Instant · Website leads',active:true},
    {id:'invoice-sync',name:'Invoice organiser',trigger:'When a file is uploaded',action:'Add a spreadsheet row',schedule:'Instant · Finance folder',active:true},
    {id:'weekly-report',name:'Weekly performance report',trigger:'Every weekday at 9:00',action:'Transform and export data',schedule:'Monday · 09:00',active:false}
  ],
  activity: [
    {name:'Lead follow-up',action:'Welcome email sent',time:new Date(Date.now()-18*60000).toISOString()},
    {name:'Invoice organiser',action:'Spreadsheet row added',time:new Date(Date.now()-74*60000).toISOString()}
  ]
};
const templates = [
  {icon:'✉',name:'Lead welcome sequence',description:'Respond to new enquiries and create a follow-up task automatically.',trigger:'When a form is submitted',action:'Create a follow-up task',schedule:'Instant · New enquiries'},
  {icon:'▦',name:'Low-stock alert',description:'Watch inventory levels and notify the team before products run out.',trigger:'When stock runs low',action:'Notify the team',schedule:'Continuous monitoring'},
  {icon:'↗',name:'Monday KPI digest',description:'Prepare a concise weekly performance file for the whole team.',trigger:'Every weekday at 9:00',action:'Transform and export data',schedule:'Monday · 09:00'}
];

let state = loadState();
const list = document.getElementById('workflow-list');
const activityList = document.getElementById('activity-list');
const dialog = document.getElementById('flow-dialog');

function cloneDefaults(){return JSON.parse(JSON.stringify(defaults));}
function loadState(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)) || cloneDefaults();}catch{return cloneDefaults();}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function safe(value){const node=document.createElement('span');node.textContent=String(value??'');return node.innerHTML;}
function uid(){return `flow-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;}
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2200);}
function timeAgo(iso){const minutes=Math.max(0,Math.round((Date.now()-new Date(iso).getTime())/60000));if(minutes<1)return 'Just now';if(minutes<60)return `${minutes} min ago`;if(minutes<1440)return `${Math.round(minutes/60)} hr ago`;return new Date(iso).toLocaleDateString();}

function filteredFlows(){const query=document.getElementById('flow-search').value.trim().toLowerCase();const filter=document.getElementById('flow-filter').value;return state.flows.filter(flow=>(!query||`${flow.name} ${flow.trigger} ${flow.action}`.toLowerCase().includes(query))&&(filter==='all'||(filter==='active')===flow.active));}
function render(){
  const visible=filteredFlows();
  list.innerHTML=visible.length?visible.map(flow=>`<article class="workflow">
    <div class="workflow-icon">${safe(flow.name[0].toUpperCase())}</div>
    <div><h3>${safe(flow.name)}</h3><p>${safe(flow.trigger)} → ${safe(flow.action)}</p><div class="workflow-meta"><span>${safe(flow.schedule||'On demand')}</span><span>${flow.active?'Active':'Paused'}</span></div></div>
    <div class="workflow-actions"><button class="run" data-run="${flow.id}">Run now</button><button data-duplicate="${flow.id}" aria-label="Duplicate ${safe(flow.name)}">⧉</button><button data-edit="${flow.id}" aria-label="Edit ${safe(flow.name)}">✎</button><button data-delete="${flow.id}" aria-label="Delete ${safe(flow.name)}">×</button></div>
    <button class="toggle ${flow.active?'on':''}" data-toggle="${flow.id}" aria-label="${flow.active?'Pause':'Activate'} ${safe(flow.name)}"></button>
  </article>`).join(''):'<div class="empty">No workflows match this view. Try another search or create a new workflow.</div>';
  activityList.innerHTML=state.activity.length?state.activity.slice(0,10).map(item=>`<div class="activity"><i></i><div><b>${safe(item.name)} completed</b><p>${safe(item.action)}</p><time>${safe(timeAgo(item.time))}</time></div></div>`).join(''):'<div class="empty">Run a workflow to create an activity record.</div>';
  const active=state.flows.filter(flow=>flow.active).length;
  document.getElementById('active-count').textContent=active;
  document.getElementById('run-count').textContent=state.runs;
  document.getElementById('hours-saved').textContent=(state.runs*0.32).toFixed(1);
  document.getElementById('success-rate').textContent=state.runs?'98%':'100%';
}

function recordRun(flow){state.runs+=1;state.activity.unshift({name:flow.name,action:flow.action,time:new Date().toISOString()});state.activity=state.activity.slice(0,30);save();render();toast(`${flow.name} completed successfully`);}
function openEditor(flow){document.getElementById('dialog-title').textContent=flow?'Edit workflow':'Create a workflow';document.getElementById('flow-id').value=flow?.id||'';document.getElementById('flow-name').value=flow?.name||'';document.getElementById('flow-trigger').value=flow?.trigger||'Every weekday at 9:00';document.getElementById('flow-action').value=flow?.action||'Send an email summary';document.getElementById('flow-schedule').value=flow?.schedule||'';dialog.showModal();}

document.getElementById('template-list').innerHTML=templates.map((template,index)=>`<article class="template-card"><div class="template-top"><div class="template-icon">${template.icon}</div><span class="eyebrow">0${index+1}</span></div><h3>${template.name}</h3><p>${template.description}</p><footer><small>${template.trigger}</small><button data-template="${index}">Use template</button></footer></article>`).join('');
document.getElementById('template-list').onclick=event=>{const index=event.target.dataset.template;if(index===undefined)return;const template=templates[Number(index)];state.flows.unshift({id:uid(),name:template.name,trigger:template.trigger,action:template.action,schedule:template.schedule,active:true});save();render();toast(`${template.name} added to your library`);document.getElementById('workflows').scrollIntoView({behavior:'smooth'});};

list.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  const find=id=>state.flows.find(flow=>flow.id===id);
  if(button.dataset.run)recordRun(find(button.dataset.run));
  if(button.dataset.toggle){const flow=find(button.dataset.toggle);flow.active=!flow.active;save();render();toast(`${flow.name} ${flow.active?'activated':'paused'}`);}
  if(button.dataset.edit)openEditor(find(button.dataset.edit));
  if(button.dataset.duplicate){const original=find(button.dataset.duplicate);state.flows.unshift({...original,id:uid(),name:`${original.name} copy`,active:false});save();render();toast('Workflow duplicated');}
  if(button.dataset.delete){const flow=find(button.dataset.delete);if(confirm(`Delete “${flow.name}”?`)){state.flows=state.flows.filter(item=>item.id!==flow.id);save();render();toast('Workflow deleted');}}
});

document.getElementById('new-flow').onclick=()=>openEditor();
document.querySelectorAll('.close-dialog').forEach(button=>button.onclick=()=>dialog.close());
document.getElementById('flow-form').onsubmit=event=>{event.preventDefault();const id=document.getElementById('flow-id').value;const values={name:document.getElementById('flow-name').value.trim(),trigger:document.getElementById('flow-trigger').value,action:document.getElementById('flow-action').value,schedule:document.getElementById('flow-schedule').value.trim()||'On demand'};if(!values.name)return;const existing=state.flows.find(flow=>flow.id===id);if(existing)Object.assign(existing,values);else state.flows.unshift({id:uid(),...values,active:true});save();render();dialog.close();toast(existing?'Workflow updated':'Workflow created');};
document.getElementById('run-all').onclick=()=>{const active=state.flows.filter(flow=>flow.active);if(!active.length)return toast('Activate a workflow first');active.forEach(flow=>{state.runs+=1;state.activity.unshift({name:flow.name,action:flow.action,time:new Date().toISOString()});});save();render();toast(`${active.length} active workflows completed`);};
document.getElementById('test-flow').onclick=async event=>{const button=event.currentTarget;const nodes=[...document.querySelectorAll('.node')];button.disabled=true;button.textContent='Running…';nodes.forEach(node=>{node.classList.remove('done');node.querySelector('em').textContent='Waiting';});for(const node of nodes){node.classList.add('running');node.querySelector('em').textContent='Running';await new Promise(resolve=>setTimeout(resolve,430));node.classList.remove('running');node.classList.add('done');node.querySelector('em').textContent='✓ Done';}recordRun({name:'New customer welcome flow',action:'Welcome email sent'});button.disabled=false;button.textContent='▶ Run test';};
document.getElementById('clear-log').onclick=()=>{state.activity=[];save();render();toast('Activity cleared');};
document.getElementById('export-log').onclick=()=>{if(!state.activity.length)return toast('There is no activity to export');const rows=['Workflow,Action,Time',...state.activity.map(item=>[item.name,item.action,new Date(item.time).toLocaleString()].map(value=>`"${String(value).replaceAll('"','""')}"`).join(','))];download(rows.join('\n'),'flowpilot-activity.csv','text/csv');toast('Activity log exported');};
document.getElementById('reset-demo').onclick=()=>{if(confirm('Reset this local FlowPilot workspace to the sample data?')){state=cloneDefaults();save();render();toast('Demo workspace reset');}};
document.getElementById('flow-search').oninput=render;document.getElementById('flow-filter').onchange=render;
function download(content,name,type){const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([content],{type}));link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),0);}
function showView(view,updateUrl=true){const valid=['overview','workflows','templates','activity'];const selected=valid.includes(view)?view:'overview';document.querySelectorAll('.app-view').forEach(section=>section.hidden=section.id!==`${selected}-view`);document.querySelectorAll('.sidebar nav button').forEach(button=>button.classList.toggle('active',button.dataset.view===selected));if(updateUrl)history.replaceState(null,'',`#${selected}`);window.scrollTo({top:0,behavior:'smooth'});}
document.querySelectorAll('.sidebar nav button').forEach(button=>button.onclick=()=>showView(button.dataset.view));
showView(location.hash.slice(1),false);
render();
