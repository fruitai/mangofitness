const supabaseConfig = window.MANGO_FITNESS_SUPABASE;
const supabaseClient = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
window.mangoSupabaseClient = supabaseClient;

function setMessage(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("hidden", !text);
}

function resetRedirectUrl() {
  return new URL("reset-password.html", window.location.href).href.replace(/[#?].*$/, "");
}

function configureEmailInput(input, autocomplete = "username") {
  if (!input) return;
  input.setAttribute("autocomplete", autocomplete);
  input.setAttribute("inputmode", "email");
  input.setAttribute("autocapitalize", "none");
  input.setAttribute("spellcheck", "false");
}

function addPasswordVisibilityToggle(input, autocomplete = "current-password") {
  if (!input || input.dataset.visibilityToggleReady === "true") return;
  input.dataset.visibilityToggleReady = "true";
  input.setAttribute("autocomplete", autocomplete);

  const wrapper = document.createElement("div");
  wrapper.className = "password-input-wrap";
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "password-visibility-toggle";
  toggle.textContent = "Show";
  toggle.setAttribute("aria-controls", input.id);
  toggle.setAttribute("aria-label", "Show password");
  toggle.setAttribute("aria-pressed", "false");
  toggle.addEventListener("click", () => {
    const shouldShow = input.type === "password";
    input.type = shouldShow ? "text" : "password";
    toggle.textContent = shouldShow ? "Hide" : "Show";
    toggle.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
    toggle.setAttribute("aria-pressed", String(shouldShow));
    input.focus();
  });
  wrapper.appendChild(toggle);
}

function initConnectionStatusBanner() {
  let banner = document.getElementById("connectionStatusBanner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "connectionStatusBanner";
    banner.className = "connection-status-banner hidden";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    document.body.prepend(banner);
  }

  function updateConnectionStatus() {
    const offline = !navigator.onLine;
    banner.textContent = offline ? "You’re offline. Sign-in and sync need internet." : "";
    banner.classList.toggle("hidden", !offline);
  }

  if (banner.dataset.connectionListenersReady !== "true") {
    banner.dataset.connectionListenersReady = "true";
    window.addEventListener("online", updateConnectionStatus);
    window.addEventListener("offline", updateConnectionStatus);
  }
  updateConnectionStatus();
}

async function userHasCoachAccess(user) {
  if (!user?.id) return false;
  const { data, error } = await supabaseClient
    .from("coach_profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.id);
}

async function initLoginPage(options) {
  const email = document.getElementById(options.emailId);
  const password = document.getElementById(options.passwordId);
  const signIn = document.getElementById(options.signInBtnId);
  const forgot = document.getElementById(options.forgotBtnId);
  const signOut = document.getElementById(options.signOutBtnId);
  const signOutSeparator = signOut ? document.getElementById(`${options.signOutBtnId.replace("Btn", "Separator")}`) : null;
  const dashboardMessage = document.getElementById(options.dashboardMessageId);
  const headerAuth = dashboardMessage?.closest(".header-auth") || signOut?.closest(".header-auth");
  const authCard = document.getElementById(options.authCardId);
  const dashboard = document.getElementById(options.dashboardId);
  const forgotCard = authCard ? document.createElement("section") : null;
  const resetEmailId = `${options.forgotBtnId || options.emailId}ResetEmail`;
  const sendResetBtnId = `${options.forgotBtnId || options.emailId}SendReset`;
  const cancelResetBtnId = `${options.forgotBtnId || options.emailId}CancelReset`;
  const forgotMessageId = `${options.forgotBtnId || options.emailId}ResetMessage`;
  configureEmailInput(email);
  addPasswordVisibilityToggle(password);
  initConnectionStatusBanner();
  if (forgotCard && forgot) {
    forgotCard.id = `${options.forgotBtnId}Card`;
    forgotCard.className = "card auth-card hidden";
    forgotCard.innerHTML = `
      <h2>Forgot Password</h2>
      <p class="muted">Enter your email address and we'll send a password reset link.</p>
      <div class="field"><label for="${resetEmailId}">Email</label><input id="${resetEmailId}" type="email" placeholder="Email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" /></div>
      <div class="actions" style="margin-top:14px;">
        <button type="button" id="${sendResetBtnId}" class="primary">Send Reset Link</button>
        <button type="button" id="${cancelResetBtnId}">Back to Sign In</button>
      </div>
      <p id="${forgotMessageId}" class="muted hidden" style="margin:12px 0 0;"></p>
    `;
    authCard.insertAdjacentElement("afterend", forgotCard);
  }

  function setForgotMessage(text) {
    setMessage(forgotMessageId, text);
  }

  function showForgotCard() {
    const resetEmail = document.getElementById(resetEmailId);
    if (!forgotCard || !resetEmail) return;
    resetEmail.value = email?.value.trim() || "";
    authCard?.classList.add("hidden");
    dashboard?.classList.add("hidden");
    forgotCard.classList.remove("hidden");
    setMessage(options.messageId, "");
    setForgotMessage("");
    resetEmail.focus();
  }

  function hideForgotCard() {
    forgotCard?.classList.add("hidden");
    authCard?.classList.remove("hidden");
    setForgotMessage("");
  }

  async function sendResetEmail() {
    const resetEmail = document.getElementById(resetEmailId);
    const sendResetBtn = document.getElementById(sendResetBtnId);
    const userEmail = resetEmail?.value.trim().toLowerCase() || "";
    setForgotMessage("");
    if (!userEmail) return setForgotMessage("Enter your email address.");
    const redirectTo = resetRedirectUrl();
    if (redirectTo.startsWith("file:")) {
      return setForgotMessage("Password reset emails cannot be sent while this page is opened as a file on your computer. Open the live portal and try again.");
    }
    if (sendResetBtn) sendResetBtn.disabled = true;
    setForgotMessage("Sending reset link...");
    const { error } = await supabaseClient.auth.resetPasswordForEmail(userEmail, { redirectTo });
    if (sendResetBtn) sendResetBtn.disabled = false;
    if (error) {
      const msg = (error.message || "").toLowerCase();
      const hint = (msg.includes("redirect") || msg.includes("url"))
        ? ` In Supabase Dashboard → Authentication → URL Configuration, add this exact address under Redirect URLs: ${redirectTo}`
        : "";
      return setForgotMessage((error.message || "Could not send reset email.") + hint);
    }
    setForgotMessage("If that email is registered, a reset link was sent. Check inbox, spam, or promotions.");
  }

  function showSignedIn(userEmail) {
    if (forgotCard) forgotCard.classList.add("hidden");
    if (authCard) authCard.classList.add("hidden");
    if (dashboard) dashboard.classList.remove("hidden");
    if (headerAuth) headerAuth.classList.remove("hidden");
    if (signOut) signOut.classList.remove("hidden");
    if (signOutSeparator) signOutSeparator.classList.remove("hidden");
    setMessage(options.dashboardMessageId, `Signed in as ${userEmail || "your account"}.`);
  }

  function showAccessDenied() {
    if (forgotCard) forgotCard.classList.add("hidden");
    if (authCard) authCard.classList.remove("hidden");
    if (dashboard) dashboard.classList.add("hidden");
    if (headerAuth) headerAuth.classList.add("hidden");
    if (signOut) signOut.classList.add("hidden");
    if (signOutSeparator) signOutSeparator.classList.add("hidden");
    setMessage(options.messageId, "Coach access required. Sign in with a coach account.");
  }

  async function showSignedInIfAllowed(user) {
    if (options.requiredRole === "coach" && !(await userHasCoachAccess(user))) {
      showAccessDenied();
      return false;
    }
    showSignedIn(user?.email);
    return true;
  }

  function showSignedOut() {
    if (forgotCard) forgotCard.classList.add("hidden");
    if (authCard) authCard.classList.remove("hidden");
    if (dashboard) dashboard.classList.add("hidden");
    if (headerAuth) headerAuth.classList.add("hidden");
    if (signOut) signOut.classList.add("hidden");
    if (signOutSeparator) signOutSeparator.classList.add("hidden");
  }

  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (sessionData.session?.user) await showSignedInIfAllowed(sessionData.session.user);
  else showSignedOut();

  let signInPending = false;

  async function submitSignIn() {
    if (!signIn || signInPending) return;
    setMessage(options.messageId, "");
    const userEmail = email.value.trim();
    const userPassword = password.value;
    if (!userEmail || !userPassword) return setMessage(options.messageId, "Enter your email and password.");

    signInPending = true;
    signIn.disabled = true;
    signIn.textContent = "Signing in...";
    let data;
    let error;
    try {
      ({ data, error } = await supabaseClient.auth.signInWithPassword({ email: userEmail, password: userPassword }));
    } finally {
      signInPending = false;
      signIn.disabled = false;
      signIn.textContent = "Sign In";
    }

    if (error) return setMessage(options.messageId, error.message || "Could not sign in.");
    const allowed = await showSignedInIfAllowed(data.user);
    if (!allowed) await supabaseClient.auth.signOut();
  }

  signIn?.addEventListener("click", submitSignIn);
  [email, password].forEach((input) => input?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.isComposing) return;
    event.preventDefault();
    submitSignIn();
  }));

  forgot?.addEventListener("click", showForgotCard);
  document.getElementById(sendResetBtnId)?.addEventListener("click", sendResetEmail);
  document.getElementById(cancelResetBtnId)?.addEventListener("click", hideForgotCard);

  signOut?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    showSignedOut();
  });
}

async function initResetPasswordPage() {
  const save = document.getElementById("savePasswordBtn");
  const newPassword = document.getElementById("newPassword");
  const confirmPassword = document.getElementById("confirmPassword");
  addPasswordVisibilityToggle(newPassword, "new-password");
  addPasswordVisibilityToggle(confirmPassword, "new-password");
  initConnectionStatusBanner();

  save?.addEventListener("click", async () => {
    setMessage("resetMessage", "");
    const pass = newPassword.value;
    const confirm = confirmPassword.value;
    if (!pass || pass.length < 8) return setMessage("resetMessage", "Password must be at least 8 characters.");
    if (pass !== confirm) return setMessage("resetMessage", "Passwords do not match.");

    save.disabled = true;
    save.textContent = "Saving...";
    const { error } = await supabaseClient.auth.updateUser({ password: pass });
    save.disabled = false;
    save.textContent = "Save Password";

    if (error) return setMessage("resetMessage", error.message || "Could not save password.");
    setMessage("resetMessage", "Password saved. You can sign in now.");
  });
}
