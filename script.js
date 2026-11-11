const STORAGE_KEY = "mi-progreso-subjects";
const subjects = loadSubjects();

const subjectsList = document.querySelector("#subjects-list");
const emptyState = document.querySelector("#empty-state");
const subjectDialog = document.querySelector("#subject-dialog");
const subjectForm = document.querySelector("#subject-form");
const themeToggle = document.querySelector("#theme-toggle");

document.querySelector("#add-subject-button").addEventListener("click", openSubjectDialog);
document.querySelector("#empty-add-button").addEventListener("click", openSubjectDialog);
subjectForm.addEventListener("submit", createSubject);
themeToggle.addEventListener("click", toggleTheme);
applySavedTheme();

function applySavedTheme() {
  const isDark = localStorage.getItem("medtrack-theme") === "dark";
  document.body.classList.toggle("dark-mode", isDark);
  updateThemeToggle(isDark);
}

function toggleTheme() {
  const isDark = !document.body.classList.contains("dark-mode");
  document.body.classList.toggle("dark-mode", isDark);
  localStorage.setItem("medtrack-theme", isDark ? "dark" : "light");
  updateThemeToggle(isDark);
}

function updateThemeToggle(isDark) {
  themeToggle.setAttribute("aria-label", isDark ? "Activar modo claro" : "Activar modo oscuro");
  themeToggle.querySelector(".theme-icon").textContent = isDark ? "☀" : "☾";
  themeToggle.querySelector(".theme-label").textContent = isDark ? "Modo claro" : "Modo oscuro";
}

function loadSubjects() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.map(normalizeSubject) : [];
  } catch {
    return [];
  }
}

function normalizeSubject(subject) {
  const savedPassingGrade = Number(subject.passingGrade);
  const legacyHundredScale = !subject.scaleVersion && savedPassingGrade > 20;
  const legacyTenScale = !subject.scaleVersion && savedPassingGrade <= 10;
  const convertGrade = (grade) => {
    if (grade === "") return grade;
    const numericGrade = Number(grade);
    if (legacyHundredScale) return numericGrade / 5;
    if (legacyTenScale) return numericGrade * 2;
    return numericGrade;
  };
  return {
    ...subject,
    scaleVersion: 20,
    year: Number(subject.year) || 1,
    passingGrade: legacyHundredScale ? savedPassingGrade / 5 : legacyTenScale ? savedPassingGrade * 2 : savedPassingGrade || 10,
    honorGrade: subject.honorGrade === "" || subject.honorGrade == null
      ? null
      : legacyHundredScale
        ? Number(subject.honorGrade) / 5
        : legacyTenScale
          ? Number(subject.honorGrade) * 2
          : Number(subject.honorGrade),
    activities: Array.isArray(subject.activities)
      ? subject.activities.map((activity) => ({
        ...activity,
        editing: false,
        grade: convertGrade(activity.grade),
      }))
      : [],
  };
}

function saveSubjects() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
}

function openSubjectDialog() {
  subjectForm.reset();
  document.querySelector("#study-year").value = 1;
  document.querySelector("#passing-grade").value = 10;
  document.querySelector("#honor-grade").value = "";
  subjectDialog.showModal();
  document.querySelector("#subject-name").focus();
}

function createSubject(event) {
  event.preventDefault();
  const formData = new FormData(subjectForm);
  subjects.push({
    id: crypto.randomUUID(),
    name: formData.get("name").trim(),
    passingGrade: Number(formData.get("passingGrade")),
    honorGrade: formData.get("honorGrade") === "" ? null : Number(formData.get("honorGrade")),
    year: Number(formData.get("year")),
    scaleVersion: 20,
    activities: [],
  });
  saveSubjects();
  subjectDialog.close();
  render();
}

function addActivity(subject) {
  subject.activities.push({ id: crypto.randomUUID(), name: "", grade: "", weight: "", editing: true });
  saveSubjects();
  render();
  const card = document.querySelector(`[data-subject-id="${subject.id}"]`);
  card?.querySelector(".activity-name:last-of-type")?.focus();
}

function removeSubject(id) {
  const index = subjects.findIndex((subject) => subject.id === id);
  if (index < 0 || !window.confirm("¿Quieres eliminar esta materia y sus actividades?")) return;
  subjects.splice(index, 1);
  saveSubjects();
  render();
}

function removeActivity(subject, activityId) {
  subject.activities = subject.activities.filter((activity) => activity.id !== activityId);
  saveSubjects();
  render();
}

function updateActivity(subject, activity, field, value) {
  activity[field] = field === "name" ? value : value === "" ? "" : Number(value);
  saveSubjects();
  updateSubjectSummary(subject);
}

function setActivityEditing(subject, activity, editing) {
  if (!editing) {
    const row = document.querySelector(`[data-activity-id="${activity.id}"]`);
    if (row) {
      activity.name = row.querySelector(".activity-name").value.trim();
      activity.grade = row.querySelector(".activity-grade").value === ""
        ? ""
        : Number(row.querySelector(".activity-grade").value);
      activity.weight = row.querySelector(".activity-weight").value === ""
        ? ""
        : Number(row.querySelector(".activity-weight").value);
    }
  }
  activity.editing = editing;
  saveSubjects();
  render();
  if (editing) {
    const row = document.querySelector(`[data-activity-id="${activity.id}"]`);
    row?.querySelector(".activity-name")?.focus();
  }
}

function getCalculation(subject) {
  const completed = subject.activities.filter((activity) => {
    const grade = Number(activity.grade);
    const weight = Number(activity.weight);
    return activity.grade !== "" && activity.weight !== ""
      && Number.isFinite(grade) && Number.isFinite(weight) && weight > 0;
  });
  const completedWeight = completed.reduce((sum, activity) => sum + Number(activity.weight), 0);
  const currentPoints = completed.reduce((sum, activity) => {
    return sum + Number(activity.grade) * Number(activity.weight) / 100;
  }, 0);
  const remainingWeight = Math.max(0, 100 - completedWeight);
  const needed = remainingWeight === 0 ? null : (subject.passingGrade - currentPoints) * 100 / remainingWeight;
  return { completedWeight, currentPoints, remainingWeight, needed };
}

function updateSubjectSummary(subject) {
  const card = document.querySelector(`[data-subject-id="${subject.id}"]`);
  if (!card) return;
  const calculation = getCalculation(subject);
  const currentGrade = card.querySelector(".current-grade");
  currentGrade.textContent = calculation.currentPoints.toFixed(1);
  card.querySelector(".remaining-grade").textContent = calculation.needed === null
    ? calculation.currentPoints >= subject.passingGrade ? "Aprobada" : "No alcanzada"
    : calculation.needed <= 0 ? "0.0 / 20" : calculation.needed > 20 ? "Más de 20" : `${calculation.needed.toFixed(1)} / 20`;
  card.querySelector(".completion-label").textContent = `${calculation.completedWeight}% evaluado`;
  card.querySelector(".passing-label").textContent = `Apruebas con ${subject.passingGrade}/20`;
  card.querySelector(".honor-grade-input").value = subject.honorGrade ?? "";
  const honorLabel = card.querySelector(".honor-setting span");
  honorLabel.textContent = subject.honorGrade !== null && calculation.currentPoints >= subject.honorGrade
    ? "★ Cuadro de honor desde"
    : "Cuadro de honor desde";
  card.querySelector(".progress-bar").style.width = `${Math.min(100, calculation.completedWeight)}%`;
}

function render() {
  subjectsList.replaceChildren();
  emptyState.hidden = subjects.length > 0;
  const years = [...new Set(subjects.map((subject) => subject.year || 1))].sort((a, b) => a - b);
  years.forEach((year) => {
    const yearSection = document.createElement("section");
    yearSection.className = "year-section";
    yearSection.innerHTML = `<div class="year-heading"><span class="year-number">${year}</span><h2>${yearLabel(year)}</h2></div><div class="year-subjects"></div>`;
    const yearSubjects = yearSection.querySelector(".year-subjects");
    subjects.filter((subject) => (subject.year || 1) === year).forEach((subject) => {
    const card = document.querySelector("#subject-template").content.cloneNode(true);
    const cardElement = card.querySelector(".subject-card");
    cardElement.dataset.subjectId = subject.id;
    card.querySelector(".subject-year").textContent = yearLabel(subject.year || 1);
    card.querySelector(".subject-name").textContent = subject.name;
    card.querySelector(".delete-subject").addEventListener("click", () => removeSubject(subject.id));
    card.querySelector(".add-activity").addEventListener("click", () => addActivity(subject));
    card.querySelector(".honor-grade-input").addEventListener("input", (event) => {
      subject.honorGrade = event.target.value === ""
        ? null
        : Math.max(0, Math.min(20, Number(event.target.value)));
      saveSubjects();
      updateSubjectSummary(subject);
    });

    const activityList = card.querySelector(".activities-list");
    const emptyActivities = card.querySelector(".activities-empty");
    subject.activities.forEach((activity) => {
      const row = document.querySelector("#activity-template").content.cloneNode(true);
      const rowElement = row.querySelector(".activity-row");
      rowElement.dataset.activityId = activity.id;
      row.querySelector(".activity-name").value = activity.name;
      row.querySelector(".activity-grade").value = activity.grade;
      row.querySelector(".activity-weight").value = activity.weight;
      rowElement.classList.toggle("is-locked", !activity.editing);
      row.querySelectorAll("input").forEach((input) => {
        input.disabled = !activity.editing;
      });
      row.querySelector(".activity-done").textContent = activity.editing ? "Listo" : "Editar";
      row.querySelector(".activity-done").addEventListener("click", () => {
        setActivityEditing(subject, activity, !activity.editing);
      });
      row.querySelector(".activity-name").addEventListener("input", (event) => updateActivity(subject, activity, "name", event.target.value));
      row.querySelector(".activity-grade").addEventListener("input", (event) => updateActivity(subject, activity, "grade", event.target.value));
      row.querySelector(".activity-weight").addEventListener("input", (event) => updateActivity(subject, activity, "weight", event.target.value));
      row.querySelector(".delete-activity").addEventListener("click", () => removeActivity(subject, activity.id));
      activityList.append(row);
    });
    emptyActivities.hidden = subject.activities.length > 0;
    yearSubjects.append(card);
    updateSubjectSummary(subject);
    });
    subjectsList.append(yearSection);
  });
  updateGlobalSummary();
}

function yearLabel(year) {
  const labels = ["", "1.er año", "2.º año", "3.er año", "4.º año", "5.º año", "6.º año"];
  return labels[year] || `${year}.º año`;
}

function updateGlobalSummary() {
  document.querySelector("#subject-count").textContent = subjects.length;
  document.querySelector("#activity-count").textContent = subjects.reduce((total, subject) => total + subject.activities.length, 0);
  if (!subjects.length) {
    document.querySelector("#general-average").textContent = "—";
    return;
  }
  const average = subjects.reduce((total, subject) => total + getCalculation(subject).currentPoints, 0) / subjects.length;
  document.querySelector("#general-average").textContent = average.toFixed(1);
}

render();
