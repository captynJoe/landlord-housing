export function initPasswordVisibilityToggles(root = document) {
  const passwordInputs = root.querySelectorAll('input[type="password"]');

  passwordInputs.forEach((node) => {
    if (!(node instanceof HTMLInputElement)) {
      return;
    }

    if (node.dataset.passwordToggleReady === "true") {
      return;
    }
    node.dataset.passwordToggleReady = "true";

    let wrapper = node.parentElement;
    if (!wrapper || !wrapper.classList.contains("password-toggle-wrap")) {
      wrapper = document.createElement("div");
      wrapper.className = "password-toggle-wrap";
      node.parentNode?.insertBefore(wrapper, node);
      wrapper.append(node);
    }

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "password-toggle-btn";
    toggleButton.setAttribute("aria-label", "Show password");
    toggleButton.setAttribute("title", "Show password");
    toggleButton.setAttribute("aria-pressed", "false");
    toggleButton.innerHTML =
      '<span class="password-eye-icon" aria-hidden="true">👁</span>';

    toggleButton.addEventListener("click", () => {
      const reveal = node.type === "password";
      node.type = reveal ? "text" : "password";
      toggleButton.classList.toggle("is-visible", reveal);
      toggleButton.setAttribute(
        "aria-label",
        reveal ? "Hide password" : "Show password"
      );
      toggleButton.setAttribute(
        "title",
        reveal ? "Hide password" : "Show password"
      );
      toggleButton.setAttribute("aria-pressed", reveal ? "true" : "false");
    });

    wrapper.append(toggleButton);
  });
}
