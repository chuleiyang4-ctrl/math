(() => {
  "use strict";

  const DATA_URL = "course-data.json";
  const REPOSITORY_CONTENTS_URL =
    "https://api.github.com/repos/chuleiyang4-ctrl/math/contents?ref=main";
  const SITE_ORIGIN = "https://math.luminaatlas.com";

  const fileForLesson = (id) =>
    `module-${String(id).trim().toLowerCase().replaceAll(".", "-")}.html`;

  const flattenLessons = (data) =>
    (data.modules || []).flatMap((module) =>
      (module.lessons || []).map((lesson) => ({
        ...lesson,
        moduleTitle: module.moduleName || module.moduleId || "",
        file: fileForLesson(lesson.id)
      }))
    );

  const findPublishedNeighbor = (lessons, files, currentIndex, direction) => {
    for (
      let index = currentIndex + direction;
      index >= 0 && index < lessons.length;
      index += direction
    ) {
      if (files.has(lessons[index].file.toLowerCase())) return lessons[index];
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

  const loadMathAIAssets = () => {
    if (!document.querySelector('link[href="atlas-shell.css"]')) {
      const shellStyle = document.createElement("link");
      shellStyle.rel = "stylesheet";
      shellStyle.href = "atlas-shell.css";
      document.head.append(shellStyle);
    }
    if (!document.querySelector('link[href="math-ai.css"]')) {
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = "math-ai.css";
      document.head.append(style);
    }

    if (!document.querySelector('link[href="notebook.css"]')) {
      const notebookStyle = document.createElement("link");
      notebookStyle.rel = "stylesheet";
      notebookStyle.href = "notebook.css";
      document.head.append(notebookStyle);
    }
    if (!document.querySelector('link[href="auth.css"]')) {
      const authStyle = document.createElement("link");
      authStyle.rel = "stylesheet";
      authStyle.href = "auth.css";
      document.head.append(authStyle);
    }

    if (window.MathAI) {
      window.MathAI.initialize();
      return;
    }
    if (!document.querySelector('script[src^="math-ai.js"]')) {
      const script = document.createElement("script");
      script.src = "math-ai.js?v=20260812-panel-header";
      script.defer = true;
      document.head.append(script);
    }
    if (!window.MathNotebook && !document.querySelector('script[src="notebook.js"]')) {
      const notebookScript = document.createElement("script");
      notebookScript.src = "notebook.js";
      notebookScript.defer = true;
      document.head.append(notebookScript);
    }
    if (!document.querySelector('script[src="auth-config.js"]')) {
      const authConfig = document.createElement("script");
      authConfig.src = "auth-config.js";
      document.head.append(authConfig);
      authConfig.addEventListener("load", () => {
    if (!document.querySelector('script[src^="account.js"]')) {
          const authScript = document.createElement("script");
          authScript.src = "account.js?v=20260812-password-auth";
          document.head.append(authScript);
        }
      });
    }
  };

  const addCourseTopbar = () => {
    if (document.querySelector(".atlas-topbar")) return;

    document.querySelectorAll(".topbar, .course-page-nav").forEach((element) => element.remove());
    document.querySelectorAll(".course-home-link").forEach((element) => element.remove());
    document.body.classList.add("has-course-topbar");

    const header = document.createElement("header");
    header.className = "atlas-topbar";
    header.innerHTML = `
      <div class="course-topbar-inner">
        <a class="course-brand" href="index.html" aria-label="Mathematics home">
          <span class="course-brand-mark">∑</span>
          <span class="course-brand-name">Mathematics</span>
        </a>
        <a class="course-tool-button" href="labs/index.html"><span aria-hidden="true">⚗</span> Lab</a>
        <form class="course-search" role="search">
          <label class="sr-only" for="course-search-input">Search courses</label>
          <input id="course-search-input" type="search" placeholder="Search courses" autocomplete="off">
        </form>
        <button class="course-tool-button course-notebook-button" type="button" data-notebook-open><span aria-hidden="true">▤</span> Notebook</button>
        <button class="course-tool-button course-ai-button" type="button" aria-expanded="false" aria-controls="math-ai-panel"><span aria-hidden="true">?</span> Math AI</button>
        <button class="course-profile-button" type="button" aria-label="Sign in or open profile">Profile</button>
      </div>`;
    header.innerHTML = `
      <div class="atlas-topbar-inner">
        <a class="atlas-brand" href="https://luminaatlas.com/" aria-label="Lumina Atlas home"><span class="atlas-brand-mark">Σ</span><span class="atlas-brand-name">Lumina Atlas</span></a>
        <form class="atlas-search course-search" role="search"><label class="sr-only" for="course-search-input">Search courses</label><input id="course-search-input" type="search" placeholder="Search courses" autocomplete="off"></form>
        <button class="atlas-tool course-notebook-button" type="button" data-notebook-open><span class="atlas-tool-icon">▤</span><span class="atlas-tool-label">Notebook</span></button>
        <button class="atlas-tool atlas-ai course-ai-button" type="button" aria-expanded="false" aria-controls="math-ai-panel"><span class="atlas-tool-icon">✦</span><span class="atlas-tool-label">AI</span></button>
        <button class="atlas-tool atlas-profile course-profile-button" type="button" data-auth-open aria-label="Sign in or open profile"><span class="atlas-tool-icon">●</span><span class="atlas-tool-label">Profile</span></button>
      </div>`;

    const panel = document.createElement("aside");
    panel.id = "math-ai-panel";
    panel.className = "math-ai-panel";
    panel.dataset.aiName = "Math AI";
    panel.dataset.aiEndpoint = "/api/math-ai";
    panel.dataset.aiIntro = "Ask about this lesson, request another explanation, or work through a problem step by step.";
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
    loadMathAIAssets();

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
      link.setAttribute("aria-disabled", "true");
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
    document.querySelectorAll(".course-page-nav").forEach((element) => element.remove());
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

  const upsertMeta = (selector, attributes) => {
    let element = document.head.querySelector(selector);
    if (!element) {
      element = document.createElement(attributes.tag || "meta");
      document.head.append(element);
    }
    Object.entries(attributes).forEach(([name, value]) => {
      if (name !== "tag") element.setAttribute(name, value);
    });
    return element;
  };

  const improveSeo = (lessonId) => {
    const summary = document.querySelector(".lesson-summary");
    const description =
      summary?.textContent.trim().replace(/\s+/g, " ") ||
      document.querySelector('meta[name="description"]')?.content ||
      "Interactive mathematics lesson for AI, science, and engineering.";
    const canonicalUrl = `${SITE_ORIGIN}/${window.location.pathname.split("/").pop()}`;

    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertMeta('link[rel="canonical"]', { tag: "link", rel: "canonical", href: canonicalUrl });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "article" });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: document.title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary" });

    if (!document.head.querySelector('script[data-course-schema="true"]')) {
      const schema = document.createElement("script");
      schema.type = "application/ld+json";
      schema.dataset.courseSchema = "true";
      schema.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LearningResource",
        name: document.querySelector("h1")?.textContent.trim() || document.title,
        description,
        url: canonicalUrl,
        inLanguage: "en",
        learningResourceType: "lesson",
        isPartOf: {
          "@type": "Course",
          name: "Mathematics",
          url: `${SITE_ORIGIN}/`
        },
        position: lessonId || undefined
      });
      document.head.append(schema);
    }
  };

  const initialize = async () => {
    addCourseTopbar();
    renderMath();

    const lessonId = document.body.dataset.lessonId;
    improveSeo(lessonId);

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
        return;
      }

      const remoteFiles = filesResponse.ok ? await filesResponse.json() : [];
      const files = new Set(
        Array.isArray(remoteFiles)
          ? remoteFiles
              .filter((item) => item.type === "file")
              .map((item) => item.name.toLowerCase())
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
