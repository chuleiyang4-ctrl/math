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

  const addHomeLink = () => {
    if (document.querySelector(".course-home-link")) return;
    const link = document.createElement("a");
    link.className = "course-home-link";
    link.href = "index.html";
    link.setAttribute("aria-label", "Return to course home");
    link.title = "Course home";
    link.textContent = "∑";
    document.body.prepend(link);
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
    addHomeLink();
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
