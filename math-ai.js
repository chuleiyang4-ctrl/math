(() => {
  "use strict";

  const ENDPOINT = "/api/math-ai";
  const MAX_MESSAGE_LENGTH = 2000;
  const MAX_HISTORY_MESSAGES = 10;

  const createElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const collectPageContext = () => {
    const title = document.querySelector("h1")?.textContent.trim() || document.title;
    const summary = document.querySelector(".lesson-summary")?.textContent.trim() || "";
    const lessonId = document.body.dataset.lessonId || "";
    const lessonSections = Array.from(document.querySelectorAll(".lesson-section"))
      .map((section) => section.textContent.trim().replace(/\s+/g, " "))
      .join("\n")
      .slice(0, 12000);

    return { title, summary, lessonId, lessonContent: lessonSections };
  };

  const mount = (panel) => {
    if (!panel || panel.dataset.mathAiReady === "true") return;
    panel.dataset.mathAiReady = "true";
    panel.innerHTML = `
      <div class="math-ai-head">
        <div><small>GEMINI TUTOR</small><strong>Math AI</strong></div>
        <button type="button" class="math-ai-close" aria-label="Close Math AI">×</button>
      </div>
      <div class="math-ai-conversation" aria-live="polite">
        <div class="math-ai-message assistant">Ask me about this lesson, request a simpler explanation, or work through a problem step by step.</div>
      </div>
      <form class="math-ai-form">
        <label class="sr-only" for="math-ai-input">Ask Math AI</label>
        <textarea id="math-ai-input" maxlength="${MAX_MESSAGE_LENGTH}" rows="3" placeholder="Ask a mathematics question…" required></textarea>
        <div class="math-ai-form-row">
          <span class="math-ai-status" role="status"></span>
          <button type="submit" class="math-ai-send">Send</button>
        </div>
      </form>`;

    const conversation = panel.querySelector(".math-ai-conversation");
    const form = panel.querySelector(".math-ai-form");
    const input = panel.querySelector("textarea");
    const status = panel.querySelector(".math-ai-status");
    const sendButton = panel.querySelector(".math-ai-send");
    const closeButton = panel.querySelector(".math-ai-close");
    const history = [];

    closeButton.addEventListener("click", () => {
      panel.classList.remove("open", "is-open");
      panel.setAttribute("aria-hidden", "true");
      document
        .querySelectorAll('[aria-controls="' + panel.id + '"]')
        .forEach((button) => button.setAttribute("aria-expanded", "false"));
    });

    const appendMessage = (role, text) => {
      const message = createElement(
        "div",
        `math-ai-message ${role === "user" ? "user" : "assistant"}`,
        text
      );
      conversation.append(message);
      conversation.scrollTop = conversation.scrollHeight;
    };

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = input.value.trim();
      if (!message || sendButton.disabled) return;

      appendMessage("user", message);
      input.value = "";
      input.disabled = true;
      sendButton.disabled = true;
      status.textContent = "Thinking…";

      try {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            history: history.slice(-MAX_HISTORY_MESSAGES),
            context: collectPageContext()
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Math AI is temporarily unavailable.");
        }

        appendMessage("assistant", data.answer);
        history.push(
          { role: "user", text: message },
          { role: "model", text: data.answer }
        );
        if (history.length > MAX_HISTORY_MESSAGES) {
          history.splice(0, history.length - MAX_HISTORY_MESSAGES);
        }
        status.textContent = "";
      } catch (error) {
        appendMessage("assistant", error.message);
        status.textContent = "Could not send";
      } finally {
        input.disabled = false;
        sendButton.disabled = false;
        input.focus();
      }
    });
  };

  const initialize = () => {
    document.querySelectorAll(".math-ai-panel, .ai-panel").forEach(mount);
  };

  window.MathAI = { initialize, mount };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
