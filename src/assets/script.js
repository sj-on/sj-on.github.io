document.addEventListener("DOMContentLoaded", function () {
  // Dynamic copyright year
  const yearSpan = document.getElementById('year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // Simple flip behavior for cards. Clicking the card toggles its flipped state.
  document.querySelectorAll('.flip-card').forEach(card => {
    card.addEventListener('click', function (e) {
      const interactiveTarget = e.target && e.target.closest ? e.target.closest('a, button, .share-btn') : null;
      if (interactiveTarget) return;
      card.classList.toggle('flipped');
    });

    const shareButton = card.querySelector('.share-btn');
    if (!shareButton) return;

    shareButton.addEventListener('click', async function (e) {
      e.preventDefault();
      e.stopPropagation();

      const shareUrl = shareButton.dataset.shareUrl || card.dataset.shareUrl || '';
      const fullUrl = shareUrl ? new URL(shareUrl, window.location.origin).toString() : window.location.href;

      if (navigator.share) {
        try {
          await navigator.share({ title: document.title, url: fullUrl });
          return;
        } catch (error) {
          if (error && error.name === 'AbortError') {
            return;
          }
        }
      }

      try {
        await navigator.clipboard.writeText(fullUrl);
        shareButton.classList.add('copied');
        shareButton.setAttribute('aria-label', 'Link copied');
        window.setTimeout(() => {
          shareButton.classList.remove('copied');
          shareButton.setAttribute('aria-label', 'Share this card');
        }, 1400);
      } catch (error) {
        window.prompt('Copy this link:', fullUrl);
      }
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
