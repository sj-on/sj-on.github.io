document.addEventListener("DOMContentLoaded", function () {
  // Simple flip behavior for cards. Clicking the card toggles its flipped state.
  document.querySelectorAll('.flip-card').forEach(card => {
    card.addEventListener('click', function (e) {
      // Avoid flipping when clicking links or interactive elements
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'a' || tag === 'button' || e.target.closest && e.target.closest('a')) return;
      card.classList.toggle('flipped');
    });
  });
  
  // Theme toggle: persist in localStorage and apply `.dark` class to <html>
  const themeToggle = document.getElementById('theme-toggle');
  const root = document.documentElement || document.querySelector('html');
  function applyTheme(theme){
    if(theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    try{ localStorage.setItem('site-theme', theme); }catch(e){}
  }

  // Initialize theme from storage or site default
  let stored = null;
  try{ stored = localStorage.getItem('site-theme'); }catch(e){}
  const initial = stored || (window?.__ELEVENTY__?.site?.theme?.default) || 'light';
  applyTheme(initial);

  if(themeToggle){
    themeToggle.addEventListener('click', function(){
      const now = root.classList.contains('dark') ? 'light' : 'dark';
      applyTheme(now);
    });
  }
});
