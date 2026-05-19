import { initPasswordVisibilityToggles } from "./password-visibility.js";
import { notifyError, notifyStatus } from "./notifications.js";

const loginFormEl = document.getElementById("admin-login-form");
const accessTokenEl = document.getElementById("admin-access-token");
const usernameEl = document.getElementById("admin-username");
const passwordEl = document.getElementById("admin-password");
const loginBtnEl = document.getElementById("admin-login-btn");
const loginStatusEl = document.getElementById("login-status");
const loginErrorEl = document.getElementById("login-error");

function setStatus(message) {
  loginStatusEl.textContent = message;
  notifyStatus(message);
}

function showError(message) {
  loginErrorEl.textContent = message;
  loginErrorEl.classList.remove("hidden");
  notifyError(message);
}

function clearError() {
  loginErrorEl.textContent = "";
  loginErrorEl.classList.add("hidden");
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin"
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const issueMessage = payload.issues?.[0]?.message;
    const err = new Error(
      issueMessage ?? payload.error ?? `Request failed (${response.status})`
    );
    err.status = response.status;
    throw err;
  }

  return payload;
}

async function checkSession() {
  try {
    const payload = await requestJson("/api/auth/admin/session");
    if (payload.data?.role) {
      window.location.href = "/landlord";
      return true;
    }
  } catch (_error) {
    return false;
  }

  return false;
}

async function signIn(event) {
  event.preventDefault();
  clearError();

  const accessToken = accessTokenEl.value.trim();
  const username = usernameEl.value.trim();
  const password = passwordEl.value.trim();

  if (!accessToken && !(username && password)) {
    showError("Provide token, or username and password.");
    return;
  }

  loginBtnEl.disabled = true;
  setStatus("Signing in...");

  try {
    const payload = await requestJson("/api/auth/admin/login", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        accessToken: accessToken || undefined,
        username: username || undefined,
        password: password || undefined
      })
    });

    setStatus(`Signed in as ${payload.data?.role ?? "admin"}. Redirecting...`);
    window.location.href = "/landlord";
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sign in.";
    showError(message);
    setStatus("Sign-in failed.");
  } finally {
    loginBtnEl.disabled = false;
  }
}

loginFormEl.addEventListener("submit", (event) => {
  void signIn(event);
});

initPasswordVisibilityToggles();
void checkSession();
