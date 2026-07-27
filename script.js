const STORAGE_KEY = "eisenhower-matrix-tasks";
const PREFS_KEY = "eisenhower-matrix-prefs";

const QUADRANT_IDS = [
    "importantUrgent",
    "importantNotUrgent",
    "notImportantUrgent",
    "notImportantNotUrgent",
];

const LABELS = ["none", "red", "orange", "green", "blue", "purple"];

const QUADRANT_LABELS = {
    importantUrgent: "Важно • Срочно",
    importantNotUrgent: "Важно • Не срочно",
    notImportantUrgent: "Не важно • Срочно",
    notImportantNotUrgent: "Не важно • Не срочно",
};

let tasks = [];
let prefs = {
    search: "",
    filterQuadrant: "all",
    filterLabel: "all",
    sortByDate: false,
};

let draggedTaskId = null;
let dragMoved = false;
let saveIndicatorTimer = null;
let suppressCardClickUntil = 0;

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                tasks = parsed.map(normalizeTask);
            }
        }
    } catch {
        tasks = [];
    }

    try {
        const rawPrefs = localStorage.getItem(PREFS_KEY);
        if (rawPrefs) {
            const parsed = JSON.parse(rawPrefs);
            prefs = { ...prefs, ...parsed };
        }
    } catch {
        /* keep defaults */
    }
}

function normalizeTask(task) {
    return {
        id: task.id || createId(),
        title: String(task.title || ""),
        description: String(task.description || ""),
        date: task.date || "",
        quadrant: QUADRANT_IDS.includes(task.quadrant) ? task.quadrant : "importantNotUrgent",
        label: LABELS.includes(task.label) ? task.label : "none",
        createdAt: task.createdAt || new Date().toISOString(),
    };
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    showSaveIndicator();
}

function savePrefs() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function showSaveIndicator() {
    const el = document.getElementById("saveIndicator");
    el.textContent = "Автосохранено в браузере";
    clearTimeout(saveIndicatorTimer);
    saveIndicatorTimer = setTimeout(() => {
        el.textContent = "";
    }, 2200);
}

function createId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDate(isoDate) {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    return `${d}.${m}.${y}`;
}

function isOverdue(isoDate) {
    if (!isoDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(isoDate + "T00:00:00");
    return due < today;
}

function getSelectedColor(radioName) {
    const checked = document.querySelector(`input[name="${radioName}"]:checked`);
    return checked ? checked.value : "none";
}

function setSelectedColor(radioName, value) {
    const safe = LABELS.includes(value) ? value : "none";
    const input = document.querySelector(`input[name="${radioName}"][value="${safe}"]`);
    if (input) input.checked = true;
}

function taskMatchesFilters(task) {
    const q = prefs.search.trim().toLowerCase();
    if (q) {
        const hay = `${task.title} ${task.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
    }
    if (prefs.filterQuadrant !== "all" && task.quadrant !== prefs.filterQuadrant) {
        return false;
    }
    if (prefs.filterLabel !== "all" && (task.label || "none") !== prefs.filterLabel) {
        return false;
    }
    return true;
}

function compareByDate(a, b) {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
}

function syncPrefsToUI() {
    document.getElementById("searchInput").value = prefs.search;
    document.getElementById("filterQuadrant").value = prefs.filterQuadrant;
    document.getElementById("filterLabel").value = prefs.filterLabel;
    document.getElementById("sortByDate").checked = prefs.sortByDate;
}

function updateStats(visibleCount, totalCount) {
    const el = document.getElementById("toolbarStats");
    if (prefs.search || prefs.filterQuadrant !== "all" || prefs.filterLabel !== "all") {
        el.textContent = `Показано задач: ${visibleCount} из ${totalCount}`;
    } else {
        el.textContent = `Всего задач: ${totalCount}`;
    }
}

function renderTasks() {
    QUADRANT_IDS.forEach((id) => {
        document.getElementById(id).innerHTML = "";
    });

    const byQuadrant = Object.fromEntries(QUADRANT_IDS.map((id) => [id, []]));
    tasks.forEach((task) => {
        if (byQuadrant[task.quadrant]) {
            byQuadrant[task.quadrant].push(task);
        }
    });

    let visibleTotal = 0;

    QUADRANT_IDS.forEach((quadrantId) => {
        const list = document.getElementById(quadrantId);
        const quadrantEl = list.closest(".quadrant");
        let items = [...byQuadrant[quadrantId]];

        if (prefs.sortByDate) {
            items.sort(compareByDate);
        }

        const visibleInQuadrant = items.filter(taskMatchesFilters);
        visibleTotal += visibleInQuadrant.length;

        const quadrantFiltered =
            prefs.filterQuadrant !== "all" && prefs.filterQuadrant !== quadrantId;
        quadrantEl.classList.toggle("is-filtered-out", quadrantFiltered);

        if (items.length === 0) {
            list.appendChild(createEmptyMessage("Нет задач"));
            return;
        }

        if (visibleInQuadrant.length === 0) {
            list.appendChild(createEmptyMessage("Нет совпадений с фильтром"));
        }

        items.forEach((task) => {
            const visible = taskMatchesFilters(task);
            list.appendChild(createTaskCard(task, visible));
        });
    });

    updateStats(visibleTotal, tasks.length);
}

function createEmptyMessage(text) {
    const empty = document.createElement("p");
    empty.className = "task-list-empty";
    empty.textContent = text;
    return empty;
}

function createTaskCard(task, visible) {
    const card = document.createElement("article");
    card.className = "task-card";
    card.dataset.id = task.id;
    card.dataset.label = task.label || "none";
    card.draggable = true;
    card.classList.toggle("is-hidden", !visible);

    const header = document.createElement("div");
    header.className = "task-card-header";

    if (task.label && task.label !== "none") {
        const dot = document.createElement("span");
        dot.className = "task-label-dot";
        dot.dataset.label = task.label;
        dot.setAttribute("aria-hidden", "true");
        header.appendChild(dot);
    }

    const title = document.createElement("h3");
    title.textContent = task.title;
    header.appendChild(title);
    card.appendChild(header);

    if (task.description) {
        const desc = document.createElement("p");
        desc.className = "task-desc";
        desc.textContent = task.description;
        card.appendChild(desc);
    }

    const meta = document.createElement("div");
    meta.className = "task-meta";

    if (task.date) {
        const dateEl = document.createElement("span");
        dateEl.className = "task-date" + (isOverdue(task.date) ? " overdue" : "");
        dateEl.textContent = "Срок: " + formatDate(task.date);
        meta.appendChild(dateEl);
    }

    card.appendChild(meta);

    const hint = document.createElement("p");
    hint.className = "task-card-hint";
    hint.textContent = "Клик — изменить";
    card.appendChild(hint);

    card.addEventListener("dragstart", onDragStart);
    card.addEventListener("dragend", onDragEnd);
    card.addEventListener("click", onCardClick);

    return card;
}

function onDragStart(e) {
    draggedTaskId = e.currentTarget.dataset.id;
    dragMoved = false;
    e.currentTarget.classList.add("is-dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", draggedTaskId);
}

function onDragEnd(e) {
    e.currentTarget.classList.remove("is-dragging");
    draggedTaskId = null;
    document.querySelectorAll(".quadrant.is-drop-target").forEach((el) => {
        el.classList.remove("is-drop-target");
    });
    setTimeout(() => {
        dragMoved = false;
    }, 0);
}

function onCardClick(e) {
    if (dragMoved || Date.now() < suppressCardClickUntil) return;
    const id = e.currentTarget.dataset.id;
    openEditModal(id);
}

function setupDropZones() {
    QUADRANT_IDS.forEach((quadrantId) => {
        const zone = document.getElementById(quadrantId);

        zone.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            zone.closest(".quadrant").classList.add("is-drop-target");
        });

        zone.addEventListener("dragleave", (e) => {
            if (!zone.contains(e.relatedTarget)) {
                zone.closest(".quadrant").classList.remove("is-drop-target");
            }
        });

        zone.addEventListener("drop", (e) => {
            e.preventDefault();
            zone.closest(".quadrant").classList.remove("is-drop-target");
            dragMoved = true;
            const id = e.dataTransfer.getData("text/plain") || draggedTaskId;
            if (id) {
                moveTask(id, quadrantId);
            }
        });
    });
}

function addTask() {
    const titleInput = document.getElementById("taskTitle");
    const title = titleInput.value.trim();
    if (!title) {
        titleInput.focus();
        return;
    }

    tasks.push(
        normalizeTask({
            id: createId(),
            title,
            description: document.getElementById("taskDescription").value.trim(),
            date: document.getElementById("taskDate").value || "",
            quadrant: document.getElementById("taskType").value,
            label: getSelectedColor("taskColor"),
            createdAt: new Date().toISOString(),
        })
    );

    titleInput.value = "";
    document.getElementById("taskDescription").value = "";
    document.getElementById("taskDate").value = "";
    setSelectedColor("taskColor", "none");

    saveToStorage();
    renderTasks();
    titleInput.focus();
}

function deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    saveToStorage();
    renderTasks();
}

function moveTask(id, newQuadrant) {
    const task = tasks.find((t) => t.id === id);
    if (task && QUADRANT_IDS.includes(newQuadrant) && task.quadrant !== newQuadrant) {
        task.quadrant = newQuadrant;
        saveToStorage();
        renderTasks();
    }
}

function openEditModal(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    document.getElementById("editTaskId").value = task.id;
    document.getElementById("editTitle").value = task.title;
    document.getElementById("editDescription").value = task.description;
    document.getElementById("editDate").value = task.date;
    document.getElementById("editQuadrant").value = task.quadrant;
    setSelectedColor("editColor", task.label || "none");

    document.getElementById("editModal").classList.remove("hidden");
    document.getElementById("editTitle").focus();
}

function closeEditModal() {
    document.getElementById("editModal").classList.add("hidden");
}

function saveEditFromModal(e) {
    e.preventDefault();
    const id = document.getElementById("editTaskId").value;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const title = document.getElementById("editTitle").value.trim();
    if (!title) {
        document.getElementById("editTitle").focus();
        return;
    }

    task.title = title;
    task.description = document.getElementById("editDescription").value.trim();
    task.date = document.getElementById("editDate").value || "";
    task.quadrant = document.getElementById("editQuadrant").value;
    task.label = getSelectedColor("editColor");

    saveToStorage();
    renderTasks();
    closeEditModal();
}

function exportJson() {
    const payload = {
        exportedAt: new Date().toISOString(),
        tasks,
    };
    downloadBlob(
        JSON.stringify(payload, null, 2),
        `матрица-эйзенхауэра-${dateStamp()}.json`,
        "application/json;charset=utf-8"
    );
}

function exportPdf() {
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) {
        alert("Разрешите всплывающие окна для экспорта PDF.");
        return;
    }

    const sections = QUADRANT_IDS.map((qid) => {
        const quadrantTasks = tasks
            .filter((t) => t.quadrant === qid)
            .sort(prefs.sortByDate ? compareByDate : () => 0);

        const rows =
            quadrantTasks.length === 0
                ? "<li><em>Нет задач</em></li>"
                : quadrantTasks
                      .map((t) => {
                          const datePart = t.date
                              ? `<span class="date${isOverdue(t.date) ? " overdue" : ""}">Срок: ${escapeHtml(formatDate(t.date))}</span>`
                              : "";
                          const desc = t.description
                              ? `<p class="desc">${escapeHtml(t.description)}</p>`
                              : "";
                          const label =
                              t.label && t.label !== "none"
                                  ? `<span class="tag tag-${t.label}">${labelName(t.label)}</span>`
                                  : "";
                          return `<li><strong>${escapeHtml(t.title)}</strong> ${label}${datePart}${desc}</li>`;
                      })
                      .join("");

        return `
            <section class="block">
                <h2>${escapeHtml(QUADRANT_LABELS[qid])}</h2>
                <ul>${rows}</ul>
            </section>`;
    }).join("");

    win.document.write(`<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Матрица Эйзенхауэра — ${dateStamp()}</title>
<style>
body { font-family: "Segoe UI", Arial, sans-serif; margin: 24px; color: #111; }
h1 { text-align: center; font-size: 20px; margin-bottom: 4px; }
.sub { text-align: center; color: #555; font-size: 12px; margin-bottom: 20px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.block { border: 1px solid #ccc; border-radius: 8px; padding: 10px; page-break-inside: avoid; }
.block h2 { margin: 0 0 8px; font-size: 13px; }
ul { margin: 0; padding-left: 18px; }
li { margin-bottom: 8px; font-size: 11px; }
.desc { margin: 4px 0 0; color: #444; white-space: pre-wrap; }
.date { display: inline-block; margin-left: 6px; font-size: 10px; color: #666; }
.date.overdue { color: #b91c1c; font-weight: bold; }
.tag { display: inline-block; margin-left: 6px; font-size: 9px; padding: 1px 6px; border-radius: 10px; color: #fff; }
.tag-red { background: #ef4444; }
.tag-orange { background: #f97316; }
.tag-green { background: #22c55e; }
.tag-blue { background: #3b82f6; }
.tag-purple { background: #a855f7; }
@media print {
  body { margin: 12mm; }
  .grid { gap: 8px; }
}
</style>
</head>
<body>
<h1>Матрица Эйзенхауэра</h1>
<p class="sub">Экспорт от ${escapeHtml(new Date().toLocaleString("ru-RU"))} · задач: ${tasks.length}</p>
<div class="grid">${sections}</div>
<script>
window.onload = function() {
  window.print();
  window.onafterprint = function() { window.close(); };
};
<\/script>
</body>
</html>`);
    win.document.close();
}

function labelName(id) {
    const names = {
        red: "Красный",
        orange: "Оранжевый",
        green: "Зелёный",
        blue: "Синий",
        purple: "Фиолетовый",
    };
    return names[id] || id;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function dateStamp() {
    return new Date().toISOString().slice(0, 10);
}

function downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function clearAll() {
    if (!tasks.length) return;
    if (!confirm("Удалить все задачи? Это действие нельзя отменить.")) return;
    tasks = [];
    saveToStorage();
    renderTasks();
}

function onPrefsChange() {
    prefs.search = document.getElementById("searchInput").value;
    prefs.filterQuadrant = document.getElementById("filterQuadrant").value;
    prefs.filterLabel = document.getElementById("filterLabel").value;
    prefs.sortByDate = document.getElementById("sortByDate").checked;
    savePrefs();
    renderTasks();
}

function initTouchDrag() {
    let touchId = null;
    let ghost = null;
    let startX = 0;
    let startY = 0;
    let activeCard = null;

    document.addEventListener(
        "touchstart",
        (e) => {
            const card = e.target.closest(".task-card");
            if (!card || e.touches.length !== 1) return;

            activeCard = card;
            touchId = e.touches[0].identifier;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            draggedTaskId = card.dataset.id;
        },
        { passive: true }
    );

    document.addEventListener(
        "touchmove",
        (e) => {
            if (!activeCard) return;
            const touch = [...e.touches].find((t) => t.identifier === touchId);
            if (!touch) return;

            const dx = Math.abs(touch.clientX - startX);
            const dy = Math.abs(touch.clientY - startY);
            if (dx < 8 && dy < 8) return;

            dragMoved = true;
            if (!ghost) {
                ghost = activeCard.cloneNode(true);
                ghost.style.position = "fixed";
                ghost.style.pointerEvents = "none";
                ghost.style.opacity = "0.85";
                ghost.style.width = activeCard.offsetWidth + "px";
                ghost.style.zIndex = "9999";
                document.body.appendChild(ghost);
                activeCard.classList.add("is-dragging");
            }

            ghost.style.left = touch.clientX - ghost.offsetWidth / 2 + "px";
            ghost.style.top = touch.clientY - 20 + "px";

            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            const zone = el && el.closest("[data-drop-zone]");
            document.querySelectorAll(".quadrant.is-drop-target").forEach((q) => q.classList.remove("is-drop-target"));
            if (zone) {
                zone.closest(".quadrant").classList.add("is-drop-target");
            }

            e.preventDefault();
        },
        { passive: false }
    );

    document.addEventListener(
        "touchend",
        (e) => {
            if (!activeCard) return;
            const touch = [...e.changedTouches].find((t) => t.identifier === touchId);
            if (!touch) return;

            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            const zone = el && el.closest("[data-drop-zone]");
            if (zone && draggedTaskId) {
                moveTask(draggedTaskId, zone.dataset.dropZone);
            }

            if (ghost) {
                ghost.remove();
                ghost = null;
            }
            activeCard.classList.remove("is-dragging");
            document.querySelectorAll(".quadrant.is-drop-target").forEach((q) => q.classList.remove("is-drop-target"));

            if (!dragMoved) {
                suppressCardClickUntil = Date.now() + 400;
                openEditModal(activeCard.dataset.id);
            }

            activeCard = null;
            draggedTaskId = null;
            touchId = null;
            setTimeout(() => {
                dragMoved = false;
            }, 50);
        },
        { passive: true }
    );
}

document.getElementById("addTask").addEventListener("click", addTask);

document.getElementById("taskTitle").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        addTask();
    }
});

document.getElementById("searchInput").addEventListener("input", onPrefsChange);
document.getElementById("filterQuadrant").addEventListener("change", onPrefsChange);
document.getElementById("filterLabel").addEventListener("change", onPrefsChange);
document.getElementById("sortByDate").addEventListener("change", onPrefsChange);

document.getElementById("exportJson").addEventListener("click", exportJson);
document.getElementById("exportPdf").addEventListener("click", exportPdf);
document.getElementById("clear").addEventListener("click", clearAll);

document.getElementById("editForm").addEventListener("submit", saveEditFromModal);
document.getElementById("editCancel").addEventListener("click", closeEditModal);
document.getElementById("editModalClose").addEventListener("click", closeEditModal);
document.getElementById("editDelete").addEventListener("click", () => {
    const id = document.getElementById("editTaskId").value;
    if (confirm("Удалить эту задачу?")) {
        deleteTask(id);
        closeEditModal();
    }
});

document.getElementById("editModal").addEventListener("click", (e) => {
    if (e.target.id === "editModal") closeEditModal();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !document.getElementById("editModal").classList.contains("hidden")) {
        closeEditModal();
    }
});

loadFromStorage();
syncPrefsToUI();
setupDropZones();
initTouchDrag();
renderTasks();
