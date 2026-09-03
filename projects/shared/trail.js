(() => {
  const projectName = (document.title || 'Project').split('—')[0].trim();
  const trail = document.createElement('div');
  trail.className = 'portfolio-trail';
  trail.innerHTML = `
    <div class="portfolio-trail__crumbs">
      <a href="https://yidel.dev/">Yidel.dev</a>
      <i>/</i>
      <a href="https://portfolio.yidel.dev/">Portfolio</a>
      <i>/</i>
      <strong>${projectName}</strong>
    </div>
    <div class="portfolio-trail__meta">Live project showcase</div>
  `;
  document.body.prepend(trail);

  const canonical = document.querySelector('link[rel="canonical"]') || document.createElement('link');
  canonical.rel = 'canonical';
  const slug = location.pathname.split('/').filter(Boolean).pop() || projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  canonical.href = `https://portfolio.yidel.dev/projects/${slug}/`;
  if (!canonical.parentNode) document.head.appendChild(canonical);
})();
