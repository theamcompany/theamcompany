(function () {
  const saved = localStorage.getItem('am-theme');
  const theme = saved || 'light';
  document.documentElement.dataset.theme = theme;

  function updateButton(button) {
    if (!button) return;
    const dark = document.documentElement.dataset.theme === 'dark';
    button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    button.setAttribute('title', dark ? 'Light mode' : 'Dark mode');
    button.innerHTML = dark
      ? '<span aria-hidden="true">☼</span><span class="theme-label">Light</span>'
      : '<span aria-hidden="true">◐</span><span class="theme-label">Dark</span>';
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('am-theme', theme);
    updateButton(document.querySelector('.theme-toggle'));
  }

  document.addEventListener('DOMContentLoaded', function () {
    const button = document.querySelector('.theme-toggle');
    updateButton(button);
    button?.addEventListener('click', function () {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  });
})();
