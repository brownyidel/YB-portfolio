const AI_ENDPOINT = 'https://yb-briefbot-ai.brownyidel.workers.dev/chat';
const messages = document.getElementById('messages');
const replies = document.getElementById('quick-replies');
const form = document.getElementById('chat-form');
const input = document.getElementById('chat-input');
const sendButton = form.querySelector('button');
const researchToggle = document.getElementById('research-toggle');
const statusCopy = document.querySelector('.status-copy');

let conversation = [];
let sessionId = crypto.randomUUID();
let busy = false;
let researchNext = false;

function updateMessageCount() {
  document.getElementById('message-count').textContent = conversation.length;
}

function sourceHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Source';
  }
}

function addMessage(text, role = 'bot', sources = []) {
  const element = document.createElement('div');
  element.className = `message ${role}${sources.length ? ' has-sources' : ''}`;

  const copy = document.createElement('div');
  copy.className = 'message-copy';
  copy.textContent = text;
  element.append(copy);

  if (sources.length) {
    const sourceList = document.createElement('div');
    sourceList.className = 'message-sources';

    const heading = document.createElement('span');
    heading.className = 'sources-heading';
    heading.textContent = `Sources · ${sources.length}`;
    sourceList.append(heading);

    sources.forEach((source, index) => {
      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.title = source.snippet || source.title;

      const number = document.createElement('i');
      number.textContent = String(index + 1);
      const label = document.createElement('span');
      const title = document.createElement('b');
      title.textContent = source.title;
      const host = document.createElement('small');
      host.textContent = `${sourceHost(source.url)} ↗`;
      label.append(title, host);
      link.append(number, label);
      sourceList.append(link);
    });

    element.append(sourceList);
  }

  messages.append(element);
  messages.scrollTop = messages.scrollHeight;
}

function showTyping(isResearching) {
  const wrapper = document.createElement('div');
  wrapper.className = 'typing-wrap';

  const element = document.createElement('div');
  element.className = 'message bot typing';
  element.setAttribute('aria-label', isResearching ? 'BriefBot is searching and thinking' : 'BriefBot is thinking');
  element.append(document.createElement('i'), document.createElement('i'), document.createElement('i'));
  wrapper.append(element);

  if (isResearching) {
    const label = document.createElement('small');
    label.textContent = 'Searching the live web…';
    wrapper.append(label);
  }

  messages.append(wrapper);
  messages.scrollTop = messages.scrollHeight;
  return wrapper;
}

function setReplies(options = []) {
  replies.replaceChildren();
  options.forEach(option => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = option;
    button.addEventListener('click', () => processMessage(option));
    replies.append(button);
  });
}

function setResearchNext(value) {
  researchNext = value;
  researchToggle.setAttribute('aria-pressed', String(value));
  researchToggle.classList.toggle('active', value);
  researchToggle.innerHTML = value ? '<span>✓</span> Search is on' : '<span>◎</span> Web search';
}

function setBusy(value, isResearching = false) {
  busy = value;
  input.readOnly = value;
  input.setAttribute('aria-busy', String(value));
  sendButton.disabled = value;
  researchToggle.disabled = value;
  statusCopy.textContent = value ? (isResearching ? 'Searching and thinking…' : 'Thinking…') : 'Online and ready';
}

function showToast(text) {
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2500);
}

async function requestAI(researchMode) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BriefBot-Session': sessionId,
      },
      body: JSON.stringify({ messages: conversation.slice(-16), researchMode }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'The AI service is unavailable.');
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function processMessage(rawValue) {
  const value = rawValue.trim();
  if (!value || busy) return;

  const forcedResearch = researchNext;
  addMessage(value, 'user');
  conversation.push({ role: 'user', content: value });
  updateMessageCount();
  input.value = '';
  setReplies();
  setBusy(true, forcedResearch);
  const typing = showTyping(forcedResearch);

  try {
    const data = await requestAI(forcedResearch ? 'on' : 'auto');
    typing.remove();
    addMessage(data.reply, 'bot', Array.isArray(data.sources) ? data.sources : []);
    conversation.push({ role: 'assistant', content: data.reply });
    updateMessageCount();
    if (data.researched) showToast(`Answer checked against ${data.sources.length} web sources`);
  } catch (error) {
    typing.remove();
    const message = error.name === 'AbortError'
      ? 'I’m taking longer than expected. Please try that message once more.'
      : `${error.message} Please try again in a moment.`;
    addMessage(message, 'error');
  } finally {
    setResearchNext(false);
    setBusy(false);
    if (window.matchMedia('(min-width: 701px)').matches) input.focus({ preventScroll: true });
  }
}

function start() {
  const welcome = 'Hi! I’m BriefBot. We can schmooze, brainstorm, write, explain things, talk technology, or research something happening now. Say whatever is on your mind—I’ll follow your lead.';
  addMessage(welcome);
  conversation.push({ role: 'assistant', content: welcome });
  updateMessageCount();
  setReplies([
    'Let’s just schmooze for a bit.',
    'Search the web for something interesting today.',
    'Help me improve some writing.',
    'Explain a difficult idea simply.',
  ]);
  if (window.matchMedia('(min-width: 701px)').matches) input.focus({ preventScroll: true });
}

function restart() {
  conversation = [];
  sessionId = crypto.randomUUID();
  messages.replaceChildren();
  replies.replaceChildren();
  setResearchNext(false);
  setBusy(false);
  start();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  processMessage(input.value);
});

researchToggle.addEventListener('click', () => {
  setResearchNext(!researchNext);
  if (researchNext) {
    showToast('Web search will be used for your next message');
    input.focus({ preventScroll: true });
  }
});

document.getElementById('restart').addEventListener('click', restart);
start();
