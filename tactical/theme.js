(function () {
  var STORAGE_KEY = 'tf_site_theme';
  var root = document.documentElement;

  function normalizeTheme(value) {
    return value === 'dark' ? 'dark' : 'light';
  }

  function getTheme() {
    return normalizeTheme(root.getAttribute('data-theme') || localStorage.getItem(STORAGE_KEY) || 'light');
  }

  function applyTheme(theme) {
    var normalized = normalizeTheme(theme);
    root.setAttribute('data-theme', normalized);
    try { localStorage.setItem(STORAGE_KEY, normalized); } catch (e) {}
    document.querySelectorAll('[data-theme-option]').forEach(function (button) {
      var active = button.getAttribute('data-theme-option') === normalized;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    window.dispatchEvent(new CustomEvent('tf-theme-change', { detail: normalized }));
  }

  document.querySelectorAll('[data-theme-option]').forEach(function (button) {
    button.addEventListener('click', function () {
      applyTheme(button.getAttribute('data-theme-option'));
    });
  });

  window.tfGetTheme = getTheme;
  window.tfSetTheme = applyTheme;
  window.addEventListener('storage', function (event) {
    if (event.key === STORAGE_KEY) {
      applyTheme(normalizeTheme(event.newValue || 'light'));
    }
  });
  applyTheme(getTheme());
})();
