(() => {
  "use strict";

  const STORAGE_THEME = "math-theme";
  const STORAGE_FONT = "math-font";
  const DATA_URL = "course-data.json";
  const REPOSITORY_CONTENTS_URL =
    "https://api.github.com/repos/chuleiyang4-ctrl/math/contents?ref=main";

  const fileForLesson = (id) =>
    `module-${String(id).trim().toLowerCase().replaceAll(".", "-")}.html`;

  const setPreference = (type, value) => {
    document.body.dataset[type] = value;
    localStorage.setItem(type === "theme" ? STORAGE_THEME : STORAGE_FONT, value);
    document.querySelectorAll(`[data-set-${type}]`).forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset[`set${type[0].toUpperCase()}${type.slice(1)}`] === value)
      );
    });
  };

  const applySavedPreferences = () => {
    setPreference("theme", localStorage.getItem(STORAGE_THEME) || "dark");
    setPreference("font", localStorage.getItem(STORAGE_FONT) || "sans");
  };

  const flattenLessons = (data) =>
    (data.modules || []).flatMap((module) =>
      (module.lessons || []).map((lesson) => ({
        ...lesson,
        moduleTitle: module.title || module.name || `Module ${module.id || ""}`,
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

  const navLink = (label, href, className = "") => {
    const link = document.createElement("a");
    link.textContent = label;
    link.href = href;
    link.className = className;
    return link;
  };

  const buildNavigation = (previous, next) => {
    if (document.querySelector(".course-page-nav")) return;

    const nav = document.createElement("nav");
    nav.className = "course-page-nav";
    nav.setAttribute("aria-label", "Course navigation");

    nav.append(navLink("Home", "index.html", "nav-primary"));
    nav.append(
      previous
        ? navLink(`← ${previous.id}`, previous.file)
        : navLink("← Previous", "#", "nav-disabled")
    );
    nav.append(
      next
        ? navLink(`${next.id} →`, next.file)
        : navLink("Curriculum →", "index.html#courses")
    );

    const spacer = document.createElement("span");
    spacer.className = "course-nav-spacer";
    nav.append(spacer);

    [
      ["Dark", "theme", "dark"],
      ["Eye", "theme", "eye"],
      ["Aa", "font", "sans"],
      ["Serif", "font", "reader"]
    ].forEach(([label, type, value]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.dataset[`set${type[0].toUpperCase()}${type.slice(1)}`] = value;
      button.addEventListener("click", () => setPreference(type, value));
      nav.append(button);
    });

    document.body.prepend(nav);
    applySavedPreferences();
  };

  const initialize = async () => {
    applySavedPreferences();

    const lessonId = document.body.dataset.lessonId;
    if (!lessonId) {
      buildNavigation(null, null);
      return;
    }

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
      const remoteFiles = filesResponse.ok ? await filesResponse.json() : [];
      const files = new Set(
        Array.isArray(remoteFiles) ? remoteFiles.map((item) => item.name) : []
      );

      if (currentIndex < 0) {
        buildNavigation(null, null);
        return;
      }

      buildNavigation(
        findPublishedNeighbor(lessons, files, currentIndex, -1),
        findPublishedNeighbor(lessons, files, currentIndex, 1)
      );
    } catch (error) {
      console.warn(error);
      buildNavigation(null, null);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
