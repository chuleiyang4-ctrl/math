(() => {
  "use strict";
  const STORAGE_KEY = "math-notebook-v1";
  const read = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
  const write = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  let panel;
  const render = () => {
    if (!panel) return;
    const list = panel.querySelector(".notebook-list");
    const items = read();
    list.innerHTML = items.length ? "" : '<p class="notebook-empty">No notes yet. Save an AI answer or select lesson text.</p>';
    items.slice().reverse().forEach((item) => {
      const card = document.createElement("article"); card.className = "notebook-card";
      const source = document.createElement("a"); source.href = item.sourceUrl || "#"; source.textContent = item.sourceTitle || "Mathematics";
      const text = document.createElement("p"); text.textContent = item.text;
      const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "Delete";
      remove.addEventListener("click", () => { write(read().filter((note) => note.id !== item.id)); render(); });
      card.append(source, text, remove); list.append(card);
    });
  };
  const add = (note) => { const items = read(); items.push({ ...note, id: crypto.randomUUID(), createdAt: new Date().toISOString() }); write(items); render(); };
  const toggle = (force) => { if (!panel) mount(); const open = force ?? !panel.classList.contains("is-open"); panel.classList.toggle("is-open", open); panel.setAttribute("aria-hidden", String(!open)); };
  const mount = () => {
    if (document.querySelector(".notebook-panel")) return;
    panel = document.createElement("aside"); panel.className = "notebook-panel"; panel.setAttribute("aria-hidden", "true");
    panel.innerHTML = '<div class="notebook-head"><div><small>YOUR SOURCES</small><strong>Notebook</strong></div><button type="button" aria-label="Close Notebook">×</button></div><div class="notebook-list"></div>';
    document.body.append(panel);
    panel.querySelector(".notebook-head button").addEventListener("click", () => toggle(false));
    document.querySelectorAll(".course-notebook-button").forEach((button) => button.addEventListener("click", () => toggle()));
    render();
    const selectionButton = document.createElement("button"); selectionButton.type = "button"; selectionButton.className = "selection-to-notebook"; selectionButton.textContent = "＋ Notebook"; selectionButton.hidden = true; document.body.append(selectionButton);
    document.addEventListener("selectionchange", () => { const selection = window.getSelection(); const text = selection?.toString().trim() || ""; const inLesson = selection?.anchorNode?.parentElement?.closest("main"); selectionButton.hidden = !(text.length >= 3 && inLesson); });
    selectionButton.addEventListener("click", () => { const text = window.getSelection()?.toString().trim(); if (!text) return; add({ text, sourceTitle: document.querySelector("h1")?.textContent.trim() || document.title, sourceUrl: location.href, lessonId: document.body.dataset.lessonId || "", type: "selection" }); window.getSelection()?.removeAllRanges(); selectionButton.hidden = true; toggle(true); });
  };
  window.MathNotebook = { add, read, toggle, mount };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", mount) : mount();
})();
