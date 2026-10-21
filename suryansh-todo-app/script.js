const STORAGE_KEY = "taskflow-tasks-v1";
const THEME_KEY = "taskflow-theme-v1";
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const emptyTitle = document.getElementById("empty-title");
const emptyCopy = document.getElementById("empty-copy");
const formError = document.getElementById("form-error");
const liveRegion = document.getElementById("live-region");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const clearCompletedButton = document.getElementById("clear-completed");
const themeToggle = document.getElementById("theme-toggle");
const themeSymbol = document.getElementById("theme-symbol");
const editDialog = document.getElementById("edit-dialog");
const editForm = document.getElementById("edit-form");
const editInput = document.getElementById("edit-input");
const closeDialogButton = document.getElementById("close-dialog");
const cancelEditButton = document.getElementById("cancel-edit");
const celebrationLayer = document.getElementById("celebration-layer");
let tasks = loadTasks();
let currentFilter = "all";
let editingTaskId = null;
let celebrationTimer = null;

document.getElementById("year").textContent = new Date().getFullYear();
document.getElementById("today-label").textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date());

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter(task => task && typeof task.id === "string" && typeof task.text === "string" && typeof task.completed === "boolean") : [];
  } catch (error) {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    announce("Could not save missions in this browser. Check your storage settings.");
    return false;
  }
}

function announce(message) {
  liveRegion.textContent = "";
  window.setTimeout(() => { liveRegion.textContent = message; }, 20);
}

function visibleTasks() {
  if (currentFilter === "active") return tasks.filter(task => !task.completed);
  if (currentFilter === "completed") return tasks.filter(task => task.completed);
  return tasks;
}

function renderTasks(celebratingId = null) {
  const visible = visibleTasks();
  const completed = tasks.filter(task => task.completed).length;
  const active = tasks.length - completed;

  taskList.replaceChildren();
  visible.forEach(task => taskList.appendChild(createTaskElement(task, task.id === celebratingId)));
  document.getElementById("task-count").textContent = tasks.length;
  document.getElementById("all-count").textContent = tasks.length;
  document.getElementById("active-count").textContent = active;
  document.getElementById("completed-count").textContent = completed;
  document.getElementById("remaining-text").textContent = `${active} ${active === 1 ? "mission" : "missions"} left to smash`;
  clearCompletedButton.disabled = completed === 0;

  filterButtons.forEach(button => {
    const selected = button.dataset.filter === currentFilter;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  emptyState.hidden = visible.length > 0;
  if (!visible.length) {
    if (!tasks.length) {
      emptyTitle.textContent = "The deck is clear!";
      emptyCopy.textContent = "Add a mission above. The cola is cold and the to-dos are nervous.";
    } else if (currentFilter === "active") {
      emptyTitle.textContent = "All missions smashed!";
      emptyCopy.textContent = "The deck is clear. Time for a cola break and a victory pose.";
    } else if (currentFilter === "completed") {
      emptyTitle.textContent = "No wins on the board yet.";
      emptyCopy.textContent = "Complete a mission and the confetti cannons will do their thing.";
    } else {
      emptyTitle.textContent = "No missions here.";
      emptyCopy.textContent = "Add a task above and give that checklist a reason to fear you.";
    }
  }
}

function createTaskElement(task, justCompleted = false) {
  const item = document.createElement("li");
  item.className = `task-item${task.completed ? " is-completed" : ""}${justCompleted ? " just-completed" : ""}`;
  item.dataset.taskId = task.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-check";
  checkbox.checked = task.completed;
  checkbox.dataset.taskId = task.id;
  checkbox.setAttribute("aria-label", `Mark "${task.text}" as ${task.completed ? "active" : "completed"}`);
  checkbox.addEventListener("change", () => toggleTask(task.id, checkbox));

  const label = document.createElement("span");
  label.className = "task-label";
  label.textContent = task.text;

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "task-action";
  edit.textContent = "✎";
  edit.title = "Edit task";
  edit.setAttribute("aria-label", `Edit task: ${task.text}`);
  edit.addEventListener("click", () => openEdit(task.id));

  const del = document.createElement("button");
  del.type = "button";
  del.className = "task-action delete";
  del.textContent = "×";
  del.title = "Delete task";
  del.setAttribute("aria-label", `Delete task: ${task.text}`);
  del.addEventListener("click", () => deleteTask(task.id));

  actions.append(edit, del);
  item.append(checkbox, label, actions);
  return item;
}

taskForm.addEventListener("submit", event => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) {
    formError.textContent = "Type a mission first. The robot arms are ready.";
    taskInput.focus();
    return;
  }

  tasks.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    text,
    completed: false,
    createdAt: new Date().toISOString()
  });
  saveTasks();
  currentFilter = "all";
  formError.textContent = "";
  taskInput.value = "";
  renderTasks();
  taskInput.focus();
  announce(`Mission added: ${text}`);
});

taskInput.addEventListener("input", () => {
  if (taskInput.value.trim()) formError.textContent = "";
});

function toggleTask(id, checkbox) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;
  const burstOrigin = checkbox.getBoundingClientRect();
  task.completed = !task.completed;
  saveTasks();
  renderTasks(task.completed ? id : null);
  announce(task.completed ? `Mission smashed: ${task.text}. SUPER!` : `Mission reopened: ${task.text}`);

  const nextCheckbox = [...taskList.querySelectorAll(".task-check")].find(input => input.dataset.taskId === id);
  if (nextCheckbox) {
    nextCheckbox.focus();
  } else {
    const fallbackFilter = filterButtons.find(button => button.dataset.filter === currentFilter);
    fallbackFilter?.focus();
  }

  if (task.completed) celebrate(burstOrigin);
}

function celebrate(origin) {
  window.clearTimeout(celebrationTimer);
  celebrationLayer.replaceChildren();

  const originX = `${origin.left + origin.width / 2}px`;
  const originY = `${origin.top + origin.height / 2}px`;
  const colors = ["#49c9ff", "#ff5361", "#ffd348", "#70efb2", "#b68cff", "#fff9ed"];

  for (let index = 0; index < 34; index += 1) {
    const piece = document.createElement("span");
    const angle = Math.PI + Math.random() * Math.PI;
    const distance = 75 + Math.random() * 145;
    piece.className = "confetti-piece";
    piece.style.setProperty("--origin-x", originX);
    piece.style.setProperty("--origin-y", originY);
    piece.style.setProperty("--burst-x", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--burst-y", `${Math.sin(angle) * distance}px`);
    piece.style.setProperty("--burst-spin", `${Math.round(Math.random() * 760 - 380)}deg`);
    piece.style.setProperty("--piece-size", `${4 + Math.random() * 6}px`);
    piece.style.setProperty("--piece-color", colors[index % colors.length]);
    piece.style.setProperty("--piece-delay", `${Math.random() * 130}ms`);
    celebrationLayer.appendChild(piece);
  }

  const popper = document.createElement("span");
  popper.className = "celebration-popper";
  popper.textContent = "🎉";
  popper.style.setProperty("--origin-x", originX);
  popper.style.setProperty("--origin-y", originY);
  celebrationLayer.appendChild(popper);

  const shout = document.createElement("div");
  shout.className = "celebration-shout";
  shout.append("SUPER! TASK SMASHED! ");
  const cola = document.createElement("span");
  cola.textContent = "🥤";
  shout.appendChild(cola);
  celebrationLayer.appendChild(shout);
  celebrationTimer = window.setTimeout(() => celebrationLayer.replaceChildren(), 1800);
}

function deleteTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;
  tasks = tasks.filter(item => item.id !== id);
  saveTasks();
  renderTasks();
  announce(`Deleted mission: ${task.text}`);
}

function openEdit(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;
  editingTaskId = id;
  editInput.value = task.text;
  if (typeof editDialog.showModal === "function") {
    editDialog.showModal();
  } else {
    const value = prompt("Edit mission", task.text);
    if (value !== null) updateTask(value);
  }
  editInput.focus();
  editInput.select();
}

function updateTask(value) {
  const text = value.trim();
  if (!text || !editingTaskId) return false;
  const task = tasks.find(item => item.id === editingTaskId);
  if (!task) return false;
  task.text = text;
  saveTasks();
  renderTasks();
  announce(`Mission updated: ${text}`);
  editingTaskId = null;
  return true;
}

editForm.addEventListener("submit", event => {
  event.preventDefault();
  if (updateTask(editInput.value) && typeof editDialog.close === "function") editDialog.close();
});

function closeEdit() {
  editingTaskId = null;
  if (typeof editDialog.close === "function" && editDialog.open) editDialog.close();
}

closeDialogButton.addEventListener("click", closeEdit);
cancelEditButton.addEventListener("click", closeEdit);
editDialog.addEventListener("click", event => {
  if (event.target === editDialog) closeEdit();
});
editDialog.addEventListener("close", () => { editingTaskId = null; });

filterButtons.forEach(button => button.addEventListener("click", () => {
  currentFilter = button.dataset.filter;
  renderTasks();
}));

clearCompletedButton.addEventListener("click", () => {
  const count = tasks.filter(task => task.completed).length;
  if (!count) return;
  tasks = tasks.filter(task => !task.completed);
  saveTasks();
  renderTasks();
  announce(`Cleared ${count} smashed ${count === 1 ? "mission" : "missions"}`);
});

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const dark = theme === "dark";
  themeSymbol.textContent = dark ? "☼" : "☾";
  themeToggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  themeToggle.title = dark ? "Switch to light theme" : "Switch to dark theme";
  document.querySelector('meta[name="theme-color"]').content = dark ? "#10101b" : "#f2f4fb";
}

let savedTheme = null;
try { savedTheme = localStorage.getItem(THEME_KEY); } catch (error) { /* Storage can be disabled. */ }
setTheme(savedTheme === "light" ? "light" : "dark");

themeToggle.addEventListener("click", () => {
  const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch (error) { /* The theme still works until this page closes. */ }
});

renderTasks();
