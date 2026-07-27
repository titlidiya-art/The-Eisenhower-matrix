(function () {
    const STORAGE_KEY = "eisenhower-matrix-tasks";
    const el = document.getElementById("heroStats");
    if (!el) return;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const tasks = JSON.parse(raw);
        if (!Array.isArray(tasks) || tasks.length === 0) return;
        const n = tasks.length;
        const word =
            n % 10 === 1 && n % 100 !== 11
                ? "задача"
                : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)
                  ? "задачи"
                  : "задач";
        el.textContent = `У вас уже сохранено ${n} ${word} — продолжите в планировщике.`;
        el.classList.add("has-tasks");
    } catch {
        /* ignore */
    }
})();
