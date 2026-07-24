try {
  if (localStorage.getItem('starlight-theme') === 'dark') {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.style.colorScheme = 'dark';
  }
} catch (_) {}
