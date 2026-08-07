(() => {
  "use strict";
  const ENDPOINT = "/api/math-ai";
  const MAX_MESSAGE_LENGTH = 2000;
  const MAX_HISTORY_MESSAGES = 10;

  const pageContext = () => ({
    title: document.querySelector("h1")?.textContent.trim() || document.title,
    summary: document.querySelector(".lesson-summary")?.textContent.trim() || "",
    lessonId: document.body.dataset.lessonId || "",
    url: location.href,
    lessonContent: Array.from(document.querySelectorAll(".lesson-section"))
      .map((section) => section.textContent.trim().replace(/\s+/g, " "))
      .join("\n").slice(0, 12000)
  });

  const mount = (panel) => {
    if (!panel || panel.dataset.mathAiReady === "true") return;
    panel.dataset.mathAiReady = "true";
    const context = pageContext();
    let sharePage = true;
    const history = [];
    const safeTitle = context.title.replace(/[<>&"]/g, "");

    panel.innerHTML = `
      <div class="math-ai-head"><div><small>GEMINI TUTOR</small><strong>Math AI</strong></div><button type="button" class="math-ai-close" aria-label="Close Math AI">×</button></div>
      <div class="math-ai-conversation" aria-live="polite"><div class="math-ai-message assistant">Ask about this lesson, request a simpler explanation, or work through a problem step by step.</div></div>
      <form class="math-ai-form">
        <div class="math-ai-share-chip"><span aria-hidden="true">✦</span><span>Sharing “${safeTitle}”</span><button type="button" class="math-ai-share-close" aria-label="Stop sharing this page">×</button></div>
        <button type="button" class="math-ai-share-restore" hidden>＋ Share current page</button>
        <label class="sr-only" for="math-ai-input">Ask Math AI</label>
        <textarea id="math-ai-input" maxlength="${MAX_MESSAGE_LENGTH}" rows="3" placeholder="Ask a mathematics question…" required></textarea>
        <div class="math-ai-form-row"><span class="math-ai-status" role="status"></span><button type="submit" class="math-ai-send">Send</button></div>
      </form>`;

    const conversation = panel.querySelector(".math-ai-conversation");
    const form = panel.querySelector(".math-ai-form");
    const input = panel.querySelector("textarea");
    const status = panel.querySelector(".math-ai-status");
    const sendButton = panel.querySelector(".math-ai-send");
    const shareChip = panel.querySelector(".math-ai-share-chip");
    const restoreShare = panel.querySelector(".math-ai-share-restore");

    panel.querySelector(".math-ai-close").addEventListener("click", () => {
      panel.classList.remove("open", "is-open");
      panel.setAttribute("aria-hidden", "true");
      document.querySelectorAll(`[aria-controls="${panel.id}"]`).forEach((button) => button.setAttribute("aria-expanded", "false"));
    });
    panel.querySelector(".math-ai-share-close").addEventListener("click", () => {
      sharePage = false; shareChip.hidden = true; restoreShare.hidden = false;
    });
    restoreShare.addEventListener("click", () => {
      sharePage = true; shareChip.hidden = false; restoreShare.hidden = true;
    });

    const appendMessage = (role, text, canSave = false) => {
      const wrapper = document.createElement("div");
      wrapper.className = `math-ai-message ${role}`;
      const content = document.createElement("div");
      content.textContent = text;
      wrapper.append(content);
      if (canSave) {
        const save = document.createElement("button");
        save.type = "button"; save.className = "math-ai-save-note"; save.textContent = "Save to Notebook";
        save.addEventListener("click", () => {
          window.MathNotebook?.add({ text, sourceTitle: context.title, sourceUrl: location.href, lessonId: context.lessonId, type: "ai-response" });
          save.textContent = "Saved"; save.disabled = true;
        });
        wrapper.append(save);
      }
      conversation.append(wrapper);
      conversation.scrollTop = conversation.scrollHeight;
    };

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = input.value.trim();
      if (!message || sendButton.disabled) return;
      appendMessage("user", message);
      input.value = ""; input.disabled = true; sendButton.disabled = true; status.textContent = "Thinking…";
      try {
        const response = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, history: history.slice(-MAX_HISTORY_MESSAGES), context: sharePage ? context : {} }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Math AI is temporarily unavailable.");
        appendMessage("assistant", data.answer, true);
        history.push({ role: "user", text: message }, { role: "model", text: data.answer });
        if (history.length > MAX_HISTORY_MESSAGES) history.splice(0, history.length - MAX_HISTORY_MESSAGES);
        status.textContent = "";
      } catch (error) { appendMessage("assistant", error.message); status.textContent = "Could not send"; }
      finally { input.disabled = false; sendButton.disabled = false; input.focus(); }
    });
  };
  const initialize = () => document.querySelectorAll(".math-ai-panel, .ai-panel").forEach(mount);
  window.MathAI = { initialize, mount };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", initialize) : initialize();
})();
