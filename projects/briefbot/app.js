const AI_ENDPOINT = 'https://yb-briefbot-ai.brownyidel.workers.dev/chat';
const messages = document.getElementById('messages');
const replies = document.getElementById('quick-replies');
const form = document.getElementById('chat-form');
const input = document.getElementById('chat-input');
const sendButton = form.querySelector('button');
const planButton = document.getElementById('generate-plan');

const emptyState = () => ({ idea:'', type:'', industry:'', goal:'', audience:'', features:[], timeline:'', budget:'', style:'', integrations:[] });
let state = emptyState();
let conversation = [];
let sessionId = crypto.randomUUID();
let busy = false;
let refining = false;
let generated = false;

const fieldMeta = {
  type:['▣','Project'], industry:['⌂','Industry'], goal:['↗','Goal'], audience:['◎','Audience'],
  features:['✦','Features'], timeline:['◷','Timeline'], budget:['£','Budget'], style:['◐','Style'], integrations:['⌘','Integrations']
};

const featureDictionary = {
  booking:['booking','book','reservation','appointment','calendar'], payments:['payment','stripe','checkout','pay'],
  shop:['shop','store','cart','ecommerce','e-commerce','products'], accounts:['login','account','member','membership','sign in'],
  dashboard:['dashboard','admin','portal','reporting'], forms:['form','lead form','contact form','enquiry'],
  chat:['chat','chatbot','assistant','bot'], automation:['automation','automate','workflow'], email:['email','newsletter','mailing'],
  database:['database','records','data'], analytics:['analytics','tracking','metrics'], search:['search','filter'],
  inventory:['inventory','stock'], content:['blog','cms','content'], seo:['seo','google'], mobile:['mobile','responsive','phone'],
  api:['api','integration','integrate'], menu:['menu','food list'], directions:['direction','find us','location','map']
};

const typeFeatures = {
  'Restaurant website':['Online table booking','Seasonal menu management','Opening hours & directions','Allergy information','Email confirmations','Local SEO'],
  'E-commerce website':['Product catalogue','Secure checkout','Stock management','Customer accounts','Order emails','Sales analytics'],
  'Business website':['Conversion-focused pages','Enquiry forms','CMS content editing','Testimonials','Analytics','Technical SEO'],
  'Web application':['Secure accounts','Role-based dashboard','Search & filters','Data export','Notifications','Admin tools'],
  'Automation':['Trigger and action builder','Integration monitoring','Error handling','Activity log','Scheduled runs','Email alerts'],
  'Landing page':['Clear value proposition','Lead capture form','Social proof','Analytics','Fast mobile layout','SEO metadata']
};

function safe(value) {
  const node = document.createElement('span');
  node.textContent = String(value ?? '');
  return node.innerHTML;
}

function toast(message) {
  const element = document.getElementById('toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), 2200);
}

function addMessage(text, role = 'bot') {
  const element = document.createElement('div');
  element.className = `message ${role}`;
  element.textContent = text;
  messages.append(element);
  messages.scrollTop = messages.scrollHeight;
}

function showTyping() {
  const element = document.createElement('div');
  element.className = 'message bot typing';
  element.innerHTML = '<i></i><i></i><i></i>';
  messages.append(element);
  messages.scrollTop = messages.scrollHeight;
  return element;
}

function setReplies(options = []) {
  replies.innerHTML = options.map(option => `<button type="button">${safe(option)}</button>`).join('');
  replies.querySelectorAll('button').forEach(button => button.onclick = () => processMessage(button.textContent));
}

function uniquePush(list, value) {
  if (value && !list.some(item => item.toLowerCase() === value.toLowerCase())) list.push(value);
}

function detect(text) {
  const lower = text.toLowerCase();
  const found = { features:[], integrations:[] };
  if (/restaurant|cafe|café|diner|food business/.test(lower)) { found.industry='Restaurant & hospitality'; found.type='Restaurant website'; }
  else if (/shop|store|e-?commerce|sell online|checkout|products online/.test(lower)) { found.type='E-commerce website'; found.industry='Retail & e-commerce'; }
  else if (/automat|workflow|repetitive|script|connect .* (to|with)/.test(lower)) found.type='Automation';
  else if (/landing page|one page/.test(lower)) found.type='Landing page';
  else if (/web app|application|portal|platform|dashboard|saas|software/.test(lower)) found.type='Web application';
  else if (/website|web site|site/.test(lower)) found.type='Business website';

  const industries = [
    ['Healthcare & wellness',/clinic|doctor|health|wellness|therapy|dentist/], ['Property & real estate',/property|estate agent|real estate|letting/],
    ['Professional services',/agency|consult|account|legal|law firm/], ['Education',/school|course|student|education|tutor/],
    ['Fitness',/gym|fitness|trainer|workout/], ['Non-profit',/charity|nonprofit|non-profit/]
  ];
  industries.forEach(([industry, pattern]) => { if (pattern.test(lower)) found.industry = industry; });

  if (/lead|enquir|more clients|new customers|conversion/.test(lower)) found.goal='Generate qualified leads';
  else if (/save time|manual|repetitive|efficien|faster/.test(lower)) found.goal='Save time and reduce manual work';
  else if (/sell|revenue|orders|online sales/.test(lower)) found.goal='Increase online sales';
  else if (/book|reservation|appointment/.test(lower)) found.goal='Increase online bookings';
  else if (/present|showcase|portfolio|credib|professional online/.test(lower)) found.goal='Present the business professionally';
  else if (/customer experience|easier for customers|self.service/.test(lower)) found.goal='Improve the customer experience';

  const hasTeam = /team|staff|employee|internal/.test(lower);
  const hasCustomers = /customer|client|guest|patient|student|visitor|public/.test(lower);
  if (hasTeam && hasCustomers) found.audience='Customers and internal team';
  else if (hasTeam) found.audience='Internal team';
  else if (hasCustomers) found.audience='Customers / public users';

  const timeline = text.match(/(?:within|in|about|around|by)\s+(\d+\s*(?:day|week|month)s?)/i);
  if (timeline) found.timeline = timeline[1];
  else if (/asap|urgent|as soon as possible/.test(lower)) found.timeline='As soon as possible';
  else if (/flexible|no rush|not sure when/.test(lower)) found.timeline='Flexible';

  const budget = text.match(/(?:£|\$|€)\s?\d[\d,]*(?:\s*(?:-|to|–)\s*(?:£|\$|€)?\s?\d[\d,]*)?|\d[\d,]*\s*(?:pounds|dollars|euros)/i);
  if (budget) found.budget = budget[0].replace(/\s+/g,' ').trim();
  else if (/budget.*flexible|not sure.*budget|budget.*not sure/.test(lower)) found.budget='Not decided yet';

  const styles = ['modern','minimal','luxury','premium','playful','professional','bold','friendly','clean','dark','colourful','colorful'];
  const styleHits = styles.filter(word => lower.includes(word));
  if (styleHits.length) found.style = styleHits.map(word => word[0].toUpperCase() + word.slice(1)).join(' + ');

  Object.entries(featureDictionary).forEach(([label, words]) => {
    if (words.some(word => lower.includes(word))) uniquePush(found.features, label[0].toUpperCase() + label.slice(1));
  });
  found.integrations = ['Google Sheets','Excel','Stripe','Shopify','WordPress','Slack','Gmail','Outlook','HubSpot','Airtable','Zapier']
    .filter(name => lower.includes(name.toLowerCase()));
  return found;
}

function applyDetected(found, text) {
  if (!state.idea) state.idea = text.trim();
  ['type','industry','goal','audience','timeline','budget','style'].forEach(key => { if (found[key]) state[key] = found[key]; });
  found.features.forEach(feature => uniquePush(state.features, feature));
  found.integrations.forEach(integration => uniquePush(state.integrations, integration));
}

function recommendedForType() {
  return typeFeatures[state.type] || typeFeatures['Business website'];
}

function completion() {
  const fields = [state.type, state.goal, state.audience, state.features.length, state.timeline, state.budget];
  return Math.round(fields.filter(Boolean).length / fields.length * 100);
}

function missingDetails() {
  const missing = [];
  if (!state.type) missing.push('project type');
  if (!state.goal) missing.push('main goal');
  if (!state.audience) missing.push('primary users');
  if (!state.features.length) missing.push('must-have features');
  if (!state.timeline) missing.push('timeline');
  if (!state.budget) missing.push('budget');
  return missing;
}

function contextForAI() {
  const lines = [];
  Object.keys(fieldMeta).forEach(key => {
    const value = Array.isArray(state[key]) ? state[key].join(', ') : state[key];
    if (value) lines.push(`${fieldMeta[key][1]}: ${value}`);
  });
  if (state.idea) lines.unshift(`Original idea: ${state.idea}`);
  lines.push(`Still missing: ${missingDetails().join(', ') || 'nothing essential'}`);
  return lines.join('\n');
}

function updateContext() {
  const entries = [];
  Object.entries(fieldMeta).forEach(([key, [icon, label]]) => {
    const value = Array.isArray(state[key]) ? state[key].join(', ') : state[key];
    if (value) entries.push({ icon, label, value });
  });
  document.getElementById('context-list').innerHTML = entries.length
    ? entries.map(item => `<div class="context-item"><i>${item.icon}</i><div><span>${item.label}</span><b title="${safe(item.value)}">${safe(item.value)}</b></div></div>`).join('')
    : '<div class="context-empty">Tell BriefBot about your idea. Useful details will appear here as it listens.</div>';
  document.getElementById('memory-count').textContent = `${entries.length} detail${entries.length === 1 ? '' : 's'}`;
  const percent = completion();
  document.getElementById('progress-percent').textContent = `${percent}%`;
  document.getElementById('progress-bar').style.width = `${percent}%`;
  document.getElementById('confidence-bar').style.width = `${Math.min(96, entries.length * 13)}%`;
  document.getElementById('confidence-copy').textContent = entries.length < 2 ? 'Listening…' : entries.length < 5 ? 'Building context' : entries.length < 7 ? 'Strong context' : 'Ready to plan';
  planButton.disabled = !state.idea;
}

async function requestAI() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(AI_ENDPOINT, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'X-BriefBot-Session':sessionId },
      body:JSON.stringify({ messages:conversation.slice(-12), context:contextForAI() }),
      signal:controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'The AI service is unavailable.');
    return data.reply;
  } finally {
    clearTimeout(timeout);
  }
}

function setBusy(value) {
  busy = value;
  input.disabled = value;
  sendButton.disabled = value;
  document.querySelector('.chat-head .status-copy').textContent = value ? 'Thinking with live AI…' : 'Live generative AI';
}

async function processMessage(value) {
  value = value.trim();
  if (!value || busy) return;
  addMessage(value, 'user');
  input.value = '';
  setReplies();
  conversation.push({ role:'user', content:value });
  applyDetected(detect(value), value);
  updateContext();
  setBusy(true);
  const typing = showTyping();
  try {
    const reply = await requestAI();
    typing.remove();
    addMessage(reply);
    conversation.push({ role:'assistant', content:reply });
    if (refining) {
      refining = false;
      generateBrief(true);
    } else if (completion() === 100 && !generated) {
      generateBrief();
    }
  } catch (error) {
    typing.remove();
    const message = error.name === 'AbortError'
      ? 'I’m taking longer than expected. Please try that message once more.'
      : `${error.message} Your project details are still safe in this browser.`;
    addMessage(message, 'error');
  } finally {
    setBusy(false);
    input.focus({ preventScroll:true });
  }
}

function buildRecommendations() {
  const recommendations = [...state.features];
  recommendedForType().forEach(feature => uniquePush(recommendations, feature));
  return recommendations.slice(0, 6);
}

function scopeLevel() {
  const count = state.features.length + state.integrations.length + (state.type === 'Web application' ? 3 : 0) + (state.type === 'E-commerce website' ? 2 : 0);
  return count >= 7 ? 'Advanced build' : count >= 4 ? 'Standard build' : 'Focused first release';
}

function planValues() {
  return {
    type:state.type || 'Digital project', industry:state.industry || 'To confirm',
    goal:state.goal || 'Create a useful, easy-to-use experience', audience:state.audience || 'Primary users to confirm',
    timeline:state.timeline || 'Flexible', budget:state.budget || 'Not decided yet',
    style:state.style || 'Modern + professional'
  };
}

function briefText() {
  const value = planValues();
  return `${value.type.toUpperCase()} — PROJECT BRIEF\n\nProject idea: ${state.idea || value.type}\nIndustry: ${value.industry}\nPrimary goal: ${value.goal}\nTarget audience: ${value.audience}\nVisual direction: ${value.style}\nTimeline: ${value.timeline}\nBudget: ${value.budget}\nIntegrations: ${state.integrations.join(', ') || 'To confirm'}\n\nMUST-HAVE FEATURES\n${buildRecommendations().map(feature => `- ${feature}`).join('\n')}\n\nDELIVERY APPROACH\n1. Discovery and content\n2. UX and visual design\n3. Build and integration\n4. Testing and launch\n\nScope level: ${scopeLevel()}\n\nGenerated from a live BriefBot AI conversation.`;
}

function generateBrief(refined = false) {
  if (!state.idea) return toast('Tell BriefBot about the project first');
  generated = true;
  const value = planValues();
  const recommendations = buildRecommendations();
  const industryName = value.industry.split(' & ')[0];
  const prefix = value.industry !== 'To confirm' && !value.type.toLowerCase().includes(industryName.toLowerCase()) ? `${industryName} ` : '';
  document.getElementById('brief-title').textContent = `${prefix}${value.type} plan`;
  document.getElementById('brief-summary').textContent = `A ${scopeLevel().toLowerCase()} focused on ${value.goal.toLowerCase()} for ${value.audience.toLowerCase()}, with a target of ${value.timeline.toLowerCase()}.`;
  document.getElementById('brief-overview').innerHTML = [['Project',value.type],['Industry',value.industry],['Goal',value.goal],['Timeline',value.timeline],['Budget',value.budget]]
    .map(([label, item]) => `<article><span>${label}</span><b>${safe(item)}</b></article>`).join('');
  document.getElementById('recommended-features').innerHTML = recommendations.map((feature, index) => `<div class="feature"><i>✓</i><div><b>${safe(feature)}</b><p>${index < state.features.length ? 'Requested in the conversation' : 'Recommended for this project type'}</p></div></div>`).join('');
  const roadmap = [['Discover','Confirm content, users, success measures, and technical constraints.'],['Design',`Create a ${value.style} responsive experience and approve key screens.`],['Build','Develop the features, integrations, validation, and management tools.'],['Launch','Test browsers and devices, prepare content, deploy, and monitor the release.']];
  document.getElementById('roadmap').innerHTML = roadmap.map((step, index) => `<div class="roadmap-step"><i>${index + 1}</i><div><b>${step[0]}</b><p>${safe(step[1])}</p></div></div>`).join('');
  document.getElementById('scope-guidance').innerHTML = `<p><span>Suggested scope</span><b>${scopeLevel()}</b></p><p><span>Primary users</span><b>${safe(value.audience)}</b></p><p><span>Integrations</span><b>${safe(state.integrations.join(', ') || 'Confirm in discovery')}</b></p><p><span>Visual direction</span><b>${safe(value.style)}</b></p><p class="scope-note">Keep the first release centred on the main goal. Extra automation, complex accounts, or advanced reporting can be planned as a second phase.</p>`;
  const brief = document.getElementById('brief');
  brief.hidden = false;
  toast(refined ? 'Project plan updated' : 'Project plan generated');
  setTimeout(() => brief.scrollIntoView({ behavior:'smooth', block:'start' }), 150);
}

function start() {
  const welcome = 'Hi, I’m BriefBot. I’m powered by a live generative AI, so you can speak naturally instead of following a fixed questionnaire. Tell me what you want to build—or just ask me a question.';
  addMessage(welcome);
  conversation.push({ role:'assistant', content:welcome });
  setReplies([
    'I need a website that brings my business more enquiries.',
    'Help me plan an automation for repetitive office work.',
    'What information do you need from me?'
  ]);
  input.placeholder = 'Talk to BriefBot naturally…';
  input.focus({ preventScroll:true });
}

function restart() {
  state = emptyState();
  conversation = [];
  sessionId = crypto.randomUUID();
  refining = false;
  generated = false;
  messages.innerHTML = '';
  replies.innerHTML = '';
  document.getElementById('brief').hidden = true;
  updateContext();
  start();
}

form.onsubmit = event => { event.preventDefault(); processMessage(input.value); };
document.getElementById('restart').onclick = restart;
planButton.onclick = () => generateBrief(generated);
document.getElementById('refine').onclick = () => {
  refining = true;
  document.querySelector('.chat-card').scrollIntoView({ behavior:'smooth', block:'center' });
  const prompt = 'Tell me what you want to change. I’ll discuss it with you and update the plan using your latest instruction.';
  addMessage(prompt);
  conversation.push({ role:'assistant', content:prompt });
  input.placeholder = 'Describe the change naturally…';
  input.focus({ preventScroll:true });
};
document.getElementById('copy').onclick = async () => { await navigator.clipboard.writeText(briefText()); toast('Project brief copied'); };
document.getElementById('download').onclick = () => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([briefText()], { type:'text/plain' }));
  link.download = 'briefbot-project-brief.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
  toast('Brief downloaded');
};
document.getElementById('print').onclick = () => window.print();
updateContext();
start();
