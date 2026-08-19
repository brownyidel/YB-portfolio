const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-header nav');
const progressBar = document.getElementById('scroll-progress-bar');
const backToTop = document.querySelector('.back-to-top');

toggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});

nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  toggle?.setAttribute('aria-expanded', 'false');
  toggle?.setAttribute('aria-label', 'Open navigation');
}));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && nav?.classList.contains('open')) {
    nav.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Open navigation');
    toggle?.focus();
  }
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

const updateScrollUi = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
  if (progressBar) progressBar.style.width = `${progress * 100}%`;
  backToTop?.classList.toggle('visible', window.scrollY > 700);
};

window.addEventListener('scroll', updateScrollUi, { passive: true });
window.addEventListener('resize', updateScrollUi);
updateScrollUi();

backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

const navLinks = [...(nav?.querySelectorAll('a[href^="#"]') || [])];
const navSections = navLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

const sectionObserver = new IntersectionObserver((entries) => {
  const visible = entries
    .filter((entry) => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

  if (!visible) return;
  navLinks.forEach((link) => {
    const active = link.getAttribute('href') === `#${visible.target.id}`;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}, { rootMargin: '-20% 0px -65%', threshold: [0, 0.2, 0.5] });

navSections.forEach((section) => sectionObserver.observe(section));

const filterButtons = [...document.querySelectorAll('[data-filter]')];
const projects = [...document.querySelectorAll('.project[data-category]')];
const projectCount = document.getElementById('project-count');

filterButtons.forEach((button) => button.addEventListener('click', () => {
  const filter = button.dataset.filter;
  let visibleCount = 0;

  filterButtons.forEach((item) => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });

  projects.forEach((project) => {
    const matches = filter === 'all' || project.dataset.category.split(' ').includes(filter);
    project.hidden = !matches;
    if (matches) visibleCount += 1;
  });

  if (projectCount) {
    const label = button.textContent.trim().toLowerCase();
    projectCount.textContent = filter === 'all'
      ? `Showing all ${visibleCount} live projects`
      : `Showing ${visibleCount} ${label} project${visibleCount === 1 ? '' : 's'}`;
  }
}));

filterButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === 0)));

const faqItems = [...document.querySelectorAll('.faq-list article')];
faqItems.forEach((item) => {
  const button = item.querySelector('button');
  const answer = item.querySelector('.faq-answer');
  const icon = button?.querySelector('i');

  button?.addEventListener('click', () => {
    const opening = button.getAttribute('aria-expanded') !== 'true';

    faqItems.forEach((otherItem) => {
      const otherButton = otherItem.querySelector('button');
      const otherAnswer = otherItem.querySelector('.faq-answer');
      const otherIcon = otherButton?.querySelector('i');
      otherButton?.setAttribute('aria-expanded', 'false');
      if (otherAnswer) otherAnswer.hidden = true;
      if (otherIcon) otherIcon.textContent = '+';
    });

    if (opening) {
      button.setAttribute('aria-expanded', 'true');
      answer.hidden = false;
      if (icon) icon.textContent = '−';
    }
  });
});

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
