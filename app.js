const games = [
  {
    storageKey: "selmas-regnemagi-v1",
    starsElement: document.querySelector("#math-stars"),
    levelElement: document.querySelector("#math-level")
  },
  {
    storageKey: "selmas-clock-practice-v1",
    starsElement: document.querySelector("#clock-stars"),
    levelElement: document.querySelector("#clock-level")
  }
];

function loadGameProgress(storageKey) {
  try {
    const progress = JSON.parse(localStorage.getItem(storageKey));
    const stars =
      progress && Number.isInteger(progress.correctProblems) && progress.correctProblems >= 0
        ? progress.correctProblems
        : 0;
    const level =
      progress && Number.isInteger(progress.level) && progress.level >= 1
        ? progress.level
        : 1;
    return { stars, level };
  } catch {
    return { stars: 0, level: 1 };
  }
}

function renderProgress() {
  games.forEach((game) => {
    const progress = loadGameProgress(game.storageKey);
    game.starsElement.textContent = progress.stars;
    game.levelElement.textContent = progress.level;
  });
}

window.addEventListener("pageshow", renderProgress);
renderProgress();
