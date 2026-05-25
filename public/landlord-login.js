import { initPasswordVisibilityToggles } from "./password-visibility.js";

const loginFormEl = document.getElementById("landlord-login-form");
const identifierEl = document.getElementById("landlord-email");
const caretakerModeEl = document.getElementById("landlord-caretaker-mode");
const houseNumberEl = document.getElementById("landlord-house-number");
const passwordEl = document.getElementById("landlord-password");
const caretakerNewPasswordEl = document.getElementById(
  "landlord-caretaker-new-password"
);
const loginBtnEl = document.getElementById("landlord-login-btn");
const loginStatusEl = document.getElementById("login-status");
const loginErrorEl = document.getElementById("login-error");
const landlordSecondaryErrorEl = document.getElementById("landlord-secondary-error");
const landlordPasswordChangeFormEl = document.getElementById(
  "landlord-password-change-form"
);
const landlordNewPasswordEl = document.getElementById("landlord-new-password");
const landlordConfirmPasswordEl = document.getElementById(
  "landlord-confirm-password"
);
const landlordPasswordChangeBtnEl = document.getElementById(
  "landlord-password-change-btn"
);
const landlordPasswordChangeErrorEl = document.getElementById(
  "landlord-password-change-error"
);

const landlordForgotFormEl = document.getElementById("landlord-forgot-form");
const landlordForgotIdentifierEl = document.getElementById(
  "landlord-forgot-identifier"
);
const landlordForgotBtnEl = document.getElementById("landlord-forgot-btn");

function setStatus(message) {
  loginStatusEl.textContent = formatHouseManagerText(message);
}

function focusInlineFeedback(element) {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  element.scrollIntoView({ behavior: "smooth", block: "nearest" });
  element.focus({ preventScroll: true });
}

function showPanelError(element, message, { reveal = false } = {}) {
  element.textContent = formatHouseManagerText(message);
  element.classList.remove("hidden");
  if (reveal) {
    focusInlineFeedback(element);
  }
}

function clearPanelError(element) {
  element.textContent = "";
  element.classList.add("hidden");
}

function clearAllErrors() {
  clearPanelError(loginErrorEl);
  clearPanelError(landlordSecondaryErrorEl);
  clearPanelError(landlordPasswordChangeErrorEl);
}

function normalizeLandlordSignInError(error, { caretakerMode = false } = {}) {
  if (!(error instanceof Error)) {
    return caretakerMode
      ? "House manager sign-in failed. Check your phone number, house number, and password."
      : "Manager sign-in failed. Check your email, phone number, or username and password.";
  }

  const message = error.message || "";

  if (/incorrect password/i.test(message)) {
    return caretakerMode
      ? "Incorrect password for this house manager account. Try again or request help."
      : "Incorrect password for this landlord account. Try again or request reset.";
  }

  if (error.status === 401) {
    return caretakerMode
      ? "House manager sign-in failed. Check your phone number, house number, and password."
      : "Manager sign-in failed. Check your email, phone number, or username and password.";
  }

  return message;
}

function formatHouseManagerText(message) {
  return String(message ?? "")
    .replace(/\bcaretakers\b/gi, (match) =>
      match[0] === "C" ? "House managers" : "house managers"
    )
    .replace(/\bcaretaker\b/gi, (match) =>
      match[0] === "C" ? "House manager" : "house manager"
    );
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function identifierLoginPayload(identifier, password) {
  const normalized = String(identifier ?? "").trim();
  const looksLikePhone = /^(\+254|254|0)\d{9}$/.test(
    normalized.replace(/[\s-]/g, "")
  );

  return looksLikePhone
    ? { phoneNumber: normalized, password }
    : { email: normalized, password };
}

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim());
}

function looksLikeKenyaPhone(value) {
  return /^(\+254|254|0)\d{9}$/.test(String(value ?? "").trim().replace(/[\s-]/g, ""));
}

function normalizeHouseNumber(value) {
  return String(value ?? "").trim().toUpperCase();
}

function setCaretakerMode(enabled) {
  const controls = [houseNumberEl, caretakerNewPasswordEl];

  controls.forEach((control) => {
    if (control instanceof HTMLInputElement) {
      control.disabled = !enabled;
      if (!enabled) {
        control.value = "";
      }
    }
  });
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

async function handleSignedInRole(role, identity = {}) {
  if (
    role === "landlord" ||
    role === "admin" ||
    role === "root_admin" ||
    role === "caretaker"
  ) {
    if (identity?.mustChangePassword) {
      showPermanentPasswordForm(role, identity);
      return true;
    }

    setStatus(`Signed in as ${role}. Redirecting...`);
    window.location.href = "/landlord";
    return true;
  }

  if (role === "tenant") {
    const email = typeof identity.email === "string" ? identity.email : "";
    const phoneMask =
      typeof identity.phoneMask === "string" ? identity.phoneMask : "";
    if (email || phoneMask) {
      setStatus(
        `Signed in as resident (${email || "no email"}${phoneMask ? ` • ${phoneMask}` : ""}). Use the resident portal for this account.`
      );
    } else {
      setStatus("Signed in as resident. Use the resident portal for this account.");
    }
    return true;
  }

  return false;
}

function showPermanentPasswordForm(role, identity = {}) {
  loginFormEl?.classList.add("hidden");
  landlordForgotFormEl?.classList.add("hidden");
  landlordPasswordChangeFormEl?.classList.remove("hidden");

  const label =
    identity.fullName ||
    identity.email ||
    (role === "caretaker" ? "house manager account" : "manager account");
  setStatus(
    `Temporary password accepted for ${label}. Set a permanent password to continue.`
  );

  if (landlordNewPasswordEl instanceof HTMLInputElement) {
    landlordNewPasswordEl.focus();
  }
}

async function checkSession() {
  try {
    const payload = await requestJson("/api/auth/landlord/session", { cache: "no-store" });
    const role = payload.data?.role;
    return handleSignedInRole(role, payload.data ?? {});
  } catch (_landlordSessionError) {
    try {
      const payload = await requestJson("/api/auth/session", { cache: "no-store" });
      const role = payload.data?.role;
      return handleSignedInRole(role, payload.data ?? {});
    } catch (_userSessionError) {
      // no active manager/user session
    }
    return false;
  }
}

async function signIn(event) {
  event.preventDefault();
  clearAllErrors();

  const identifier = identifierEl.value.trim();
  const houseNumber = normalizeHouseNumber(houseNumberEl?.value);
  const password = passwordEl.value.trim();
  const newPassword = String(caretakerNewPasswordEl?.value || "").trim();
  const caretakerPhoneLogin = Boolean(caretakerModeEl?.checked);

  if (!identifier) {
    showPanelError(loginErrorEl, "Provide email, phone number, or username.", {
      reveal: true
    });
    return;
  }

  if (caretakerPhoneLogin && !looksLikeKenyaPhone(identifier)) {
    showPanelError(loginErrorEl, "House manager sign-in requires a phone number.", {
      reveal: true
    });
    return;
  }

  if (caretakerPhoneLogin && !houseNumber) {
    showPanelError(loginErrorEl, "House manager sign-in requires house number.", {
      reveal: true
    });
    return;
  }

  loginBtnEl.disabled = true;
  setStatus("Signing in...");

  try {
    if (caretakerPhoneLogin) {
      if (!password) {
        if (!newPassword) {
          const probe = await requestJson("/api/auth/caretaker/resolve", {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              phoneNumber: identifier,
              houseNumber
            })
          });

          if (probe.data?.requiresPasswordSetup) {
            setStatus(
              `House manager verified for ${probe.data?.buildingName ?? probe.data?.buildingId}. Enter a new password below to finish first-time setup.`
            );
            return;
          }

          showPanelError(
            loginErrorEl,
            "House manager password already set. Enter password to sign in.",
            { reveal: true }
          );
          return;
        }

        if (newPassword.length < 8) {
          showPanelError(loginErrorEl, "New password must be at least 8 characters.", {
            reveal: true
          });
          return;
        }

        const setupPayload = await requestJson("/api/auth/caretaker/setup-password", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            phoneNumber: identifier,
            houseNumber,
            newPassword
          })
        });

        const setupRole = setupPayload.data?.role ?? "caretaker";
        const handledSetup = await handleSignedInRole(
          setupRole,
          setupPayload.data ?? {}
        );
        if (!handledSetup) {
          throw new Error("House manager setup completed, but portal access was denied.");
        }
        return;
      }

      const caretakerPayload = await requestJson("/api/auth/caretaker/login-phone", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          phoneNumber: identifier,
          houseNumber,
          password
        })
      });

      const caretakerRole = caretakerPayload.data?.role ?? "caretaker";
      const handledCaretaker = await handleSignedInRole(
        caretakerRole,
        caretakerPayload.data ?? {}
      );
      if (!handledCaretaker) {
        throw new Error("This house manager account is not eligible for landlord portal.");
      }
      return;
    }

    if (!password) {
      showPanelError(loginErrorEl, "Provide password.", { reveal: true });
      return;
    }

    const managerUsernameLogin = !looksLikeKenyaPhone(identifier) && !looksLikeEmail(identifier);
    const payload = await requestJson(
      managerUsernameLogin ? "/api/auth/landlord/login" : "/api/auth/login",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(
          managerUsernameLogin
            ? { username: identifier, password }
            : identifierLoginPayload(identifier, password)
        )
      }
    );

    const role = payload.data?.role;
    const handled = await handleSignedInRole(role, payload.data ?? {});
    if (!handled) {
      throw new Error("This account is not eligible for landlord portal access.");
    }
  } catch (error) {
    const message = normalizeLandlordSignInError(error, {
      caretakerMode: caretakerPhoneLogin
    });
    showPanelError(loginErrorEl, message, { reveal: true });
    setStatus(caretakerPhoneLogin ? "House manager sign-in failed." : "Manager sign-in failed.");
  } finally {
    loginBtnEl.disabled = false;
  }
}

async function requestPasswordReset(event) {
  event.preventDefault();
  clearAllErrors();

  const identifier = landlordForgotIdentifierEl.value.trim();
  if (!identifier) {
    showPanelError(landlordSecondaryErrorEl, "Provide email or phone number.", {
      reveal: true
    });
    return;
  }

  landlordForgotBtnEl.disabled = true;

  try {
    const payload = await requestJson("/api/auth/password-recovery/request", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        identifier
      })
    });

    landlordForgotFormEl.reset();
    setStatus(
      payload.message ??
        "Recovery request received. Management will verify and contact you."
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to submit recovery request.";
    showPanelError(landlordSecondaryErrorEl, message, { reveal: true });
  } finally {
    landlordForgotBtnEl.disabled = false;
  }
}

async function submitPermanentPasswordChange(event) {
  event.preventDefault();
  clearAllErrors();

  const newPassword = String(landlordNewPasswordEl?.value || "");
  const confirmPassword = String(landlordConfirmPasswordEl?.value || "");

  if (newPassword.length < 8) {
    showPanelError(
      landlordPasswordChangeErrorEl,
      "New password must be at least 8 characters.",
      { reveal: true }
    );
    return;
  }

  if (newPassword !== confirmPassword) {
    showPanelError(
      landlordPasswordChangeErrorEl,
      "Confirmation password must match the new password.",
      { reveal: true }
    );
    return;
  }

  if (landlordPasswordChangeBtnEl instanceof HTMLButtonElement) {
    landlordPasswordChangeBtnEl.disabled = true;
  }
  setStatus("Updating password...");

  try {
    const payload = await requestJson("/api/auth/account/change-password", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        newPassword,
        confirmPassword
      })
    });

    landlordPasswordChangeFormEl?.reset();
    setStatus("Password updated. Redirecting...");
    const handled = await handleSignedInRole(payload.data?.role, payload.data ?? {});
    if (!handled) {
      throw new Error("Password updated, but this account cannot open the manager portal.");
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update password.";
    showPanelError(landlordPasswordChangeErrorEl, message, { reveal: true });
    setStatus("Password update failed.");
  } finally {
    if (landlordPasswordChangeBtnEl instanceof HTMLButtonElement) {
      landlordPasswordChangeBtnEl.disabled = false;
    }
  }
}

loginFormEl.addEventListener("submit", (event) => {
  void signIn(event);
});

caretakerModeEl?.addEventListener("change", () => {
  setCaretakerMode(Boolean(caretakerModeEl.checked));
});

landlordForgotFormEl.addEventListener("submit", (event) => {
  void requestPasswordReset(event);
});

landlordPasswordChangeFormEl?.addEventListener("submit", (event) => {
  void submitPermanentPasswordChange(event);
});

initPasswordVisibilityToggles();
setCaretakerMode(Boolean(caretakerModeEl?.checked));
void checkSession();
