(function () {
    const STORAGE_KEY = "eisenhower-matrix-tasks";
    const el = document.getElementById("heroStats");
    if (!el) return;
    const TASKS_KEY = "eisenhower-matrix-tasks";
    const THEME_KEY = "landing-theme";
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const tasks = JSON.parse(raw);
        if (!Array.isArray(tasks) || tasks.length === 0) return;
    const heroStats = document.getElementById("heroStats");
    if (heroStats) {
        try {
            const raw = localStorage.getItem(TASKS_KEY);
            if (raw) {
                const tasks = JSON.parse(raw);
                if (Array.isArray(tasks) && tasks.length > 0) {
                    const n = tasks.length;
                    const word =
                        n % 10 === 1 && n % 100 !== 11
                            ? "задача"
                            : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)
                              ? "задачи"
                              : "задач";
        const n = tasks.length;
        const word =
            n % 10 === 1 && n % 100 !== 11
                ? "задача"
                : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)
                  ? "задачи"
                  : "задач";
                    heroStats.textContent = `У вас уже сохранено ${n} ${word} — продолжите в планировщике.`;
                    heroStats.classList.add("has-tasks");
                }
            }
        } catch {
            /* ignore */
        }
    }
        el.textContent = `У вас уже сохранено ${n} ${word} — продолжите в планировщике.`;
        el.classList.add("has-tasks");
    } catch {
        /* ignore */
    const themeToggle = document.getElementById("themeToggle");
    if (!themeToggle) return;
    function getTheme() {
        return document.documentElement.getAttribute("data-theme") === "deep-blue"
            ? "deep-blue"
            : "light";
    }
    function applyTheme(theme) {
        if (theme === "deep-blue") {
            document.documentElement.setAttribute("data-theme", "deep-blue");
            themeToggle.setAttribute("aria-label", "Включить светлую тему");
            themeToggle.title = "Светлая тема";
        } else {
            document.documentElement.removeAttribute("data-theme");
            themeToggle.setAttribute("aria-label", "Включить глубокую синюю тему");
            themeToggle.title = "Глубокая синяя тема";
        }
        localStorage.setItem(THEME_KEY, theme);
    }
    themeToggle.addEventListener("click", () => {
        applyTheme(getTheme() === "light" ? "deep-blue" : "light");
    });
    applyTheme(getTheme());
})();
