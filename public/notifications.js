const QUIET_STATUS_PATTERNS = [
  /checking/i,
  /loading/i,
  /refreshing/i,
  /signing in/i,
  /signed in/i,
  /redirecting/i,
  /uploading/i,
  /data refreshed/i,
  /load failed/i,
  /failed$/i,
  /unavailable/i
];

const TOAST_LIFETIME_MS = 5200;

let layerReady = false;
let toastRegion = null;
let modalBackdrop = null;
let modalTitleEl = null;
let modalMessageEl = null;
let modalCloseBtn = null;
let lastToastKey = "";
let lastToastAt = 0;
let lastModalKey = "";
let lastModalAt = 0;

function normalizeMessage(message) {
  return String(message ?? "").replace(/\s+/g, " ").trim();
}

function ensureLayer() {
  if (layerReady) {
    return;
  }

  const style = document.createElement("style");
  style.dataset.captynNotifications = "true";
  style.textContent = `
    .app-notification-region {
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 60000;
      display: grid;
      gap: 10px;
      width: min(380px, calc(100vw - 24px));
      pointer-events: none;
    }

    .app-toast {
      pointer-events: auto;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px 12px;
      align-items: start;
      border: 1px solid rgba(16, 35, 49, 0.14);
      border-left: 5px solid #16847f;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.98);
      color: #102331;
      box-shadow: 0 18px 38px rgba(16, 35, 49, 0.22);
      padding: 13px 14px;
      animation: app-toast-in 160ms ease-out;
    }

    .app-toast.is-error,
    .app-notification-dialog.is-error {
      border-left-color: #ae2f2f;
    }

    .app-toast.is-warning,
    .app-notification-dialog.is-warning {
      border-left-color: #a86813;
    }

    .app-toast h2,
    .app-notification-dialog h2 {
      margin: 0;
      font-size: 0.92rem;
      line-height: 1.25;
      color: #102331;
    }

    .app-toast p,
    .app-notification-dialog p {
      grid-column: 1 / -1;
      margin: 0;
      color: rgba(16, 35, 49, 0.76);
      font-size: 0.88rem;
      line-height: 1.45;
    }

    .app-toast button,
    .app-notification-dialog button {
      border: 0;
      border-radius: 8px;
      background: rgba(16, 35, 49, 0.08);
      color: #102331;
      cursor: pointer;
      font-weight: 800;
    }

    .app-toast button {
      width: 30px;
      height: 30px;
    }

    .app-notification-backdrop {
      position: fixed;
      inset: 0;
      z-index: 60010;
      display: grid;
      place-items: center;
      padding: 18px;
      background: rgba(16, 35, 49, 0.44);
    }

    .app-notification-backdrop.hidden {
      display: none;
    }

    .app-notification-dialog {
      width: min(460px, 100%);
      border: 1px solid rgba(16, 35, 49, 0.16);
      border-left: 5px solid #16847f;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 24px 70px rgba(16, 35, 49, 0.32);
      padding: 18px;
    }

    .app-notification-dialog-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }

    .app-notification-dialog-actions button {
      min-height: 38px;
      padding: 0 16px;
      background: #16847f;
      color: #fff;
    }

    @keyframes app-toast-in {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 640px) {
      .app-notification-region {
        top: auto;
        right: 12px;
        bottom: 12px;
        left: 12px;
        width: auto;
      }

      .app-notification-backdrop {
        align-items: end;
      }
    }
  `;
  document.head.append(style);

  toastRegion = document.createElement("section");
  toastRegion.className = "app-notification-region";
  toastRegion.setAttribute("aria-live", "polite");
  toastRegion.setAttribute("aria-label", "Notifications");
  document.body.append(toastRegion);

  modalBackdrop = document.createElement("div");
  modalBackdrop.className = "app-notification-backdrop hidden";
  modalBackdrop.setAttribute("role", "presentation");
  modalBackdrop.innerHTML = `
    <section class="app-notification-dialog" role="alertdialog" aria-modal="true" aria-labelledby="app-notification-title" aria-describedby="app-notification-message">
      <h2 id="app-notification-title"></h2>
      <p id="app-notification-message"></p>
      <div class="app-notification-dialog-actions">
        <button type="button">Dismiss</button>
      </div>
    </section>
  `;
  document.body.append(modalBackdrop);

  modalTitleEl = modalBackdrop.querySelector("#app-notification-title");
  modalMessageEl = modalBackdrop.querySelector("#app-notification-message");
  modalCloseBtn = modalBackdrop.querySelector("button");
  modalCloseBtn?.addEventListener("click", closeNotificationModal);
  modalBackdrop.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) {
      closeNotificationModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNotificationModal();
    }
  });

  layerReady = true;
}

function inferStatusTone(message) {
  if (/deleted|removed|revoked|no new|no .*changes/i.test(message)) {
    return "warning";
  }
  return "success";
}

function shouldNotifyStatus(message, force) {
  if (force) {
    return true;
  }
  return !QUIET_STATUS_PATTERNS.some((pattern) => pattern.test(message));
}

function titleForTone(tone) {
  if (tone === "error") return "Action needs attention";
  if (tone === "warning") return "Review complete";
  return "Done";
}

export function notifyStatus(message, options = {}) {
  const text = normalizeMessage(message);
  if (!text || !shouldNotifyStatus(text, Boolean(options.force))) {
    return;
  }

  showToast({
    message: text,
    tone: options.tone ?? inferStatusTone(text),
    title: options.title
  });
}

export function notifyError(message, options = {}) {
  const text = normalizeMessage(message);
  if (!text) {
    return;
  }

  showNotificationModal({
    message: text,
    tone: "error",
    title: options.title ?? "Action needs attention"
  });
}

export function showToast({ message, tone = "success", title } = {}) {
  const text = normalizeMessage(message);
  if (!text) {
    return;
  }

  ensureLayer();
  const key = `${tone}:${text}`;
  const now = Date.now();
  if (key === lastToastKey && now - lastToastAt < 1500) {
    return;
  }
  lastToastKey = key;
  lastToastAt = now;

  const toast = document.createElement("article");
  toast.className = `app-toast is-${tone}`;
  toast.setAttribute("role", tone === "error" ? "alert" : "status");

  const heading = document.createElement("h2");
  heading.textContent = title ?? titleForTone(tone);
  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "Dismiss notification");
  close.textContent = "X";
  const copy = document.createElement("p");
  copy.textContent = text;

  toast.append(heading, close, copy);
  toastRegion?.prepend(toast);

  const removeToast = () => {
    toast.remove();
  };
  close.addEventListener("click", removeToast);
  window.setTimeout(removeToast, TOAST_LIFETIME_MS);
}

export function showNotificationModal({ message, tone = "error", title } = {}) {
  const text = normalizeMessage(message);
  if (!text) {
    return;
  }

  ensureLayer();
  const key = `${tone}:${text}`;
  const now = Date.now();
  if (key === lastModalKey && now - lastModalAt < 1000) {
    return;
  }
  lastModalKey = key;
  lastModalAt = now;

  const dialog = modalBackdrop?.querySelector(".app-notification-dialog");
  dialog?.classList.remove("is-error", "is-warning", "is-success");
  dialog?.classList.add(`is-${tone}`);

  if (modalTitleEl instanceof HTMLElement) {
    modalTitleEl.textContent = title ?? titleForTone(tone);
  }
  if (modalMessageEl instanceof HTMLElement) {
    modalMessageEl.textContent = text;
  }
  modalBackdrop?.classList.remove("hidden");
  modalCloseBtn?.focus();
}

export function closeNotificationModal() {
  modalBackdrop?.classList.add("hidden");
}
