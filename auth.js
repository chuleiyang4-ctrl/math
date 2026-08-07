(() => {
  "use strict";

  const config = window.LEARNING_AUTH_CONFIG || window.MATH_AUTH_CONFIG || {};
  let client = null;
  let modal = null;

  const setOpen = (open) => {
    if (!modal) return;
    modal.hidden = !open;
    modal.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("auth-dialog-open", open);
    if (open) modal.querySelector("#auth-email")?.focus();
  };

  const setStatus = (text) => {
    const target = modal?.querySelector(".auth-status");
    if (target) target.textContent = text;
  };

  const ensureClient = async () => {
    if (client) return client;
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error("Account sign-in is being configured. You can continue as a guest.");
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return client;
  };

  const returnUrl = () => `${location.origin}${location.pathname}${location.search}`;

  const signInEmail = async (event) => {
    event.preventDefault();
    try {
      const supabase = await ensureClient();
      const email = modal.querySelector("#auth-email").value.trim();
      setStatus("Sending your secure sign-in link...");
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: returnUrl(), shouldCreateUser: true }
      });
      if (error) throw error;
      setStatus("Check your email for the sign-in link. You may close this window and keep browsing.");
    } catch (error) {
      setStatus(error.message);
    }
  };

  const createModal = () => {
    modal = document.createElement("div");
    modal.className = "auth-modal";
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <section class="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button class="auth-close" type="button" aria-label="Close sign in">×</button>
        <small>OPTIONAL ACCOUNT</small>
        <h2 id="auth-title">Sign in with Email</h2>
        <p>Courses and Math Lab are open to everyone. Sign in only to sync notes, progress, and AI history across devices.</p>
        <form class="auth-email-form">
          <label for="auth-email">Email</label>
          <input id="auth-email" type="email" autocomplete="email" required placeholder="you@example.com">
          <button type="submit">Email me a sign-in link</button>
        </form>
        <button class="auth-guest" type="button">Continue as guest</button>
        <p class="auth-status" role="status"></p>
      </section>`;
    document.body.append(modal);
    modal.querySelector(".auth-close").addEventListener("click", () => setOpen(false));
    modal.querySelector(".auth-guest").addEventListener("click", () => setOpen(false));
    modal.addEventListener("click", (event) => { if (event.target === modal) setOpen(false); });
    modal.querySelector(".auth-email-form").addEventListener("submit", signInEmail);
  };

  const initialize = () => {
    createModal();
    document.querySelectorAll(".course-profile-button, .profile-tool").forEach((button) => {
      button.addEventListener("click", () => setOpen(true));
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) setOpen(false);
    });
  };

  window.LearningAuth = { open: () => setOpen(true), close: () => setOpen(false), getClient: ensureClient };
  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", initialize)
    : initialize();
})();
