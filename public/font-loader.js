document.querySelectorAll('link[rel="preload"][as="style"]').forEach((link) => {
  const activate = () => {
    link.rel = "stylesheet";
  };

  if (link.sheet) {
    activate();
    return;
  }

  link.addEventListener("load", activate, { once: true });
});
