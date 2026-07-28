(() => {
  "use strict";

  const DATA_URL = "course-data.json";
  const REPOSITORY_CONTENTS_URL =
    "https://api.github.com/repos/chuleiyang4-ctrl/math/contents?ref=main";

  const fileForLesson = (id) =>
    `module-${String(id).trim().toLowerCase().replaceAll(".", "-")}.html`;

  const flattenLessons = (data) =>
    (data.modules || []).flatMap((module) =>
      (module.lessons || []).map((lesson) => ({
        ...lesson,
        moduleTitle: module.moduleName || module.title || module.name || module.moduleId,
        file: fileForLesson(lesson.id)
      }))
    );

  const findPublishedNeighbor = (lessons, files, currentIndex, direction) => {
    for (
      let index = currentIndex + direction;
      index >= 0 && index < lessons.length;
      index += direction
    ) {
      if (files.has(lessons[index].file)) return lessons[index];
    }
    return null;
  };

  const showComingSoon = (label) => {
    let toast = document.querySelector(".course-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "course-toast";
      toast.setAttribute("role", "status");
      document.body.append(toast);
    }
    toast.textContent = `${label} is coming soon.`;
    toast.classList.add("is-visible");
    window.clearTimeout(showComingSoon.timer);
    showComingSoon.timer = window.setTimeout(
      () => toast.classList.remove("is-visible"),
      2200
    );
  };

  const addCourseTopbar = () => {
    if (document.querySelector(".course-topbar")) return;

    document.querySelectorAll(".topbar").forEach((element) => element.remove());
    document.querySelectorAll(".course-home-link").forEach((element) => element.remove());
    document.body.classList.add("has-course-topbar");

    const header = document.createElement("header");
    header.className = "course-topbar";
    header.innerHTML = `
      <div class="course-topbar-inner">
        <a class="course-brand" href="index.html" aria-label="Mathematics home">
          <span class="course-brand-mark">∑</span>
          <span class="course-brand-name">Mathematics</span>
        </a>
        <button class="course-tool-button" type="button" data-coming-soon="Lab">Lab</button>
        <form class="course-search" role="search">
          <label class="sr-only" for="course-search-input">Search courses</label>
          <input id="course-search-input" type="search" placeholder="Search courses" autocomplete="off">
        </form>
        <button class="course-tool-button course-notebook-button" type="button" data-coming-soon="Notebook">Notebook</button>
        <button class="course-tool-button course-ai-button" type="button" aria-expanded="false" aria-controls="math-ai-panel">Math AI</button>
        <button class="course-profile-button" type="button" data-coming-soon="Profile" aria-label="Sign in or open profile">Profile</button>
      </div>`;

    const panel = document.createElement("aside");
    panel.id = "math-ai-panel";
    panel.className = "math-ai-panel";
    panel.setAttribute("aria-hidden", "true");
    panel.innerHTML = `
      <div class="math-ai-head">
        <div><small>ASSISTANT</small><strong>Math AI</strong></div>
        <button type="button" class="math-ai-close" aria-label="Close Math AI">×</button>
      </div>
      <div class="math-ai-body">
        <p>Ask questions about the lesson, request another explanation, or work through a problem.</p>
        <div class="math-ai-placeholder">Math AI will be connected here in a future update.</div>
      </div>`;

    document.body.prepend(header);
    document.body.append(panel);

    header.querySelector(".course-search").addEventListener("submit", (event) => {
      event.preventDefault();
      const query = header.querySelector("#course-search-input").value.trim();
      window.location.href = query
        ? `index.html?q=${encodeURIComponent(query)}#courses`
        : "index.html#courses";
    });

    header.querySelectorAll("[data-coming-soon]").forEach((button) => {
      button.addEventListener("click", () => showComingSoon(button.dataset.comingSoon));
    });

    const aiButton = header.querySelector(".course-ai-button");
    const closeButton = panel.querySelector(".math-ai-close");
    const setPanel = (open) => {
      panel.classList.toggle("is-open", open);
      panel.setAttribute("aria-hidden", String(!open));
      aiButton.setAttribute("aria-expanded", String(open));
    };
    aiButton.addEventListener("click", () => setPanel(!panel.classList.contains("is-open")));
    closeButton.addEventListener("click", () => setPanel(false));
  };

  const navCard = (lesson, direction) => {
    const link = document.createElement("a");
    if (!lesson) {
      link.className = "nav-disabled";
      link.href = "#";
      link.innerHTML = `<small>${direction}</small><strong>No published lesson</strong>`;
      return link;
    }

    link.href = lesson.file;
    link.innerHTML =
      `<small>${direction} · ${lesson.id}</small>` +
      `<strong>${lesson.title || `Lesson ${lesson.id}`}</strong>`;
    return link;
  };

  const addBottomNavigation = (previous, next) => {
    if (document.querySelector(".lesson-course-nav")) return;
    const main = document.querySelector("main") || document.body;
    const footer = main.querySelector(".lesson-footer");
    const nav = document.createElement("nav");
    nav.className = "lesson-course-nav";
    nav.setAttribute("aria-label", "Previous and next lessons");
    nav.append(navCard(previous, "Previous lesson"));
    nav.append(navCard(next, "Next lesson"));
    footer ? main.insertBefore(nav, footer) : main.append(nav);
  };

  const showLessonIdWarning = (lessonId) => {
    if (document.querySelector(".lesson-id-warning")) return;
    const main = document.querySelector("main") || document.body;
    const warning = document.createElement("div");
    warning.className = "lesson-id-warning";
    warning.setAttribute("role", "alert");
    warning.textContent = lessonId
      ? `Lesson ID "${lessonId}" was not found in course-data.json. Check data-lesson-id before publishing.`
      : "This page has no data-lesson-id. Add the exact lesson ID from course-data.json before publishing.";
    main.prepend(warning);
  };

  const renderMath = () => {
    if (typeof window.renderMathInElement === "function") {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ],
        throwOnError: false
      });
    }
  };

  const initialize = async () => {
    addCourseTopbar();
    renderMath();

    const lessonId = document.body.dataset.lessonId;

    try {
      const [dataResponse, filesResponse] = await Promise.all([
        fetch(DATA_URL, { cache: "no-store" }),
        fetch(REPOSITORY_CONTENTS_URL, {
          headers: { Accept: "application/vnd.github+json" },
          cache: "no-store"
        })
      ]);

      if (!dataResponse.ok) throw new Error("Course data could not be loaded.");

      const data = await dataResponse.json();
      const lessons = flattenLessons(data);
      const currentIndex = lessons.findIndex(
        (lesson) => String(lesson.id) === String(lessonId)
      );

      if (!lessonId || currentIndex < 0) {
        showLessonIdWarning(lessonId);
        addBottomNavigation(null, null);
        console.error(
          "Lesson navigation disabled: data-lesson-id must exactly match an id in course-data.json."
        );
        return;
      }

      const remoteFiles = filesResponse.ok ? await filesResponse.json() : [];
      const files = new Set(
        Array.isArray(remoteFiles)
          ? remoteFiles.filter((item) => item.type === "file").map((item) => item.name.toLowerCase())
          : []
      );

      addBottomNavigation(
        findPublishedNeighbor(lessons, files, currentIndex, -1),
        findPublishedNeighbor(lessons, files, currentIndex, 1)
      );
    } catch (error) {
      console.error(error);
      showLessonIdWarning(lessonId);
      addBottomNavigation(null, null);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
