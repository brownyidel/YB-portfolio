const seed = [
  { id: crypto.randomUUID(), name: 'Lead follow-up', trigger: 'When a form is submitted', action: 'Send an email summary', active: true },
  { id: crypto.randomUUID(), name: 'Invoice sync', trigger: 'When a file is uploaded', action: 'Add a spreadsheet row', active: true },
  { id: crypto.randomUUID(), name: 'Weekly performance report', trigger: 'Every weekday at 9:00', action: 'Transform and export data', active: false }
];
let flows = JSON.parse(localStorage.getItem('flowpilot-flows') || 'null') || seed;
let runs = Number(localStorage.getItem('flowpilot-runs') || 0);
let activity = JSON.parse(localStorage.getItem('flowpilot-activity') || '[]');
const list = document.getElementById('workflow-list');
const log = document.getElementById('activity-list');
const dialog = document.getElementById('flow-dialog');

function persist(){localStorage.setItem('flowpilot-flows',JSON.stringify(flows));localStorage.setItem('flowpilot-runs',runs);localStorage.setItem('flowpilot-activity',JSON.stringify(activity));}
function escapeHTML(value){const node=document.createElement('span');node.textContent=value;return node.innerHTML;}
function render(){
  list.innerHTML=flows.length?flows.map(flow=>`<article class="workflow"><div class="workflow-icon">${escapeHTML(flow.name[0].toUpperCase())}</div><div><h3>${escapeHTML(flow.name)}</h3><p>${escapeHTML(flow.trigger)} → ${escapeHTML(flow.action)}</p></div><button class="run" data-run="${flow.id}">Run now</button><button class="toggle ${flow.active?'on':''}" data-toggle="${flow.id}" aria-label="Toggle ${escapeHTML(flow.name)}"></button></article>`).join(''):'<div class="empty">Create your first workflow to get started.</div>';
  log.innerHTML=activity.length?activity.slice(0,8).map(item=>`<div class="activity"><i></i><div><b>${escapeHTML(item.name)} completed</b><p>${escapeHTML(item.time)} · ${escapeHTML(item.action)}</p></div></div>`).join(''):'<div class="empty">Run a workflow to see activity here.</div>';
  document.getElementById('active-count').textContent=flows.filter(f=>f.active).length;
  document.getElementById('run-count').textContent=runs;
  document.getElementById('hours-saved').textContent=(runs*.4).toFixed(1);
}
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200)}
function run(flow){runs++;activity.unshift({name:flow.name,action:flow.action,time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})});activity=activity.slice(0,20);persist();render();toast(`${flow.name} completed successfully`)}
list.addEventListener('click',event=>{const runId=event.target.dataset.run;const toggleId=event.target.dataset.toggle;if(runId)run(flows.find(f=>f.id===runId));if(toggleId){const flow=flows.find(f=>f.id===toggleId);flow.active=!flow.active;persist();render();}});
document.getElementById('new-flow').onclick=()=>dialog.showModal();
document.getElementById('save-flow').onclick=event=>{event.preventDefault();const name=document.getElementById('flow-name');if(!name.value.trim()){name.reportValidity();return}flows.unshift({id:crypto.randomUUID(),name:name.value.trim(),trigger:document.getElementById('flow-trigger').value,action:document.getElementById('flow-action').value,active:true});persist();render();dialog.close();document.getElementById('flow-form').reset();toast('Workflow created')};
document.getElementById('run-all').onclick=()=>{const active=flows.filter(f=>f.active);if(!active.length)return toast('No active workflows');active.forEach(flow=>{runs++;activity.unshift({name:flow.name,action:flow.action,time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})})});persist();render();toast(`${active.length} workflows completed`)};
document.getElementById('clear-log').onclick=()=>{activity=[];persist();render()};
document.getElementById('test-flow').onclick=event=>{const button=event.currentTarget;button.disabled=true;button.textContent='Running…';setTimeout(()=>{run({name:'New customer welcome flow',action:'Welcome email sent'});button.disabled=false;button.textContent='▶ Run test'},1200)};
const sideButtons=[...document.querySelectorAll('.sidebar nav button')];sideButtons.forEach(button=>button.onclick=()=>{sideButtons.forEach(item=>item.classList.remove('active'));button.classList.add('active');const label=button.getAttribute('aria-label');if(label==='Dashboard')window.scrollTo({top:0,behavior:'smooth'});if(label==='Workflows')document.querySelector('.workflow-list').scrollIntoView({behavior:'smooth',block:'center'});if(label==='Activity')document.querySelector('.activity-panel').scrollIntoView({behavior:'smooth',block:'center'})});
render();
