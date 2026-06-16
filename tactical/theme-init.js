(function(){
  try {
    var key = 'tf_site_theme';
    var saved = localStorage.getItem(key);
    var theme = (saved === 'light' || saved === 'dark') ? saved : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
