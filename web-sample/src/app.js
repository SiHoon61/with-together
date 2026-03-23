const tabs = Array.from(document.querySelectorAll(".flow-tab"));
const panels = Array.from(document.querySelectorAll(".flow-panel"));
const questButtons = Array.from(document.querySelectorAll("[data-quest-toggle]"));
const progressValue = document.querySelector(".progress-pill strong");
const progressPill = document.querySelector(".progress-pill");

function setActivePanel(panelName) {
  tabs.forEach((tab) => {
    const isActive = tab.dataset.panel === panelName;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === panelName);
  });
}

function updateQuestProgress() {
  if (!progressValue || !progressPill) {
    return;
  }

  const completedCount = questButtons.filter((button) => button.classList.contains("is-complete")).length;
  progressValue.textContent = String(completedCount);
  progressPill.lastChild.textContent = ` / ${questButtons.length} 완료`;
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActivePanel(tab.dataset.panel);
  });
});

questButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const isComplete = button.classList.toggle("is-complete");
    const state = button.querySelector(".quest-state");
    const helper = button.querySelector("small");

    if (!button.dataset.pendingHelper && helper) {
      button.dataset.pendingHelper = helper.textContent ?? "";
    }

    state.textContent = isComplete ? "완료" : "대기";
    helper.textContent = isComplete
      ? "2026-03-20 완료 처리됨"
      : button.dataset.pendingHelper || "클릭해서 오늘 완료 처리";

    updateQuestProgress();
  });
});

updateQuestProgress();
