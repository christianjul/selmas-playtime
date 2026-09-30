const STORAGE_KEY = "selmas-regnemagi-v1";
const MIN_LEVEL = 1;
const MAX_LEVEL = 8;
const MAX_HISTORY = 8;

const levelSettings = {
  1: { operators: ["+", "+", "+"], addMax: 10, subtractMax: 10, factorMax: 2 },
  2: { operators: ["+", "+", "-"], addMax: 15, subtractMax: 12, factorMax: 2 },
  3: { operators: ["+", "+", "-", "-"], addMax: 25, subtractMax: 20, factorMax: 3 },
  4: { operators: ["+", "+", "-", "-", "×"], addMax: 40, subtractMax: 30, factorMax: 5 },
  5: { operators: ["+", "-", "×", "×", "÷"], addMax: 50, subtractMax: 50, factorMax: 5 },
  6: { operators: ["+", "-", "×", "×", "÷", "÷"], addMax: 75, subtractMax: 75, factorMax: 10 },
  7: { operators: ["+", "-", "×", "÷"], addMax: 100, subtractMax: 100, factorMax: 10 },
  8: { operators: ["+", "-", "×", "÷"], addMax: 150, subtractMax: 150, factorMax: 12 }
};

const defaultOperationStats = () => ({
  "+": { attempts: 0, firstTryCorrect: 0 },
  "-": { attempts: 0, firstTryCorrect: 0 },
  "×": { attempts: 0, firstTryCorrect: 0 },
  "÷": { attempts: 0, firstTryCorrect: 0 }
});

const createDefaultProgress = () => ({
  level: 1,
  totalAttempts: 0,
  totalProblems: 0,
  correctProblems: 0,
  streak: 0,
  bestStreak: 0,
  questionsAtLevel: 0,
  skippedProblems: 0,
  recentResults: [],
  operationStats: defaultOperationStats()
});

const elements = {
  form: document.querySelector("#answer-form"),
  answer: document.querySelector("#answer"),
  equation: document.querySelector("#equation"),
  feedback: document.querySelector("#feedback"),
  checkButton: document.querySelector(".check-button"),
  keypadButtons: document.querySelectorAll(".number-pad button"),
  difficultyButtons: document.querySelectorAll("[data-difficulty]"),
  skipControls: document.querySelector("#skip-controls"),
  skipCount: document.querySelector("#skip-count"),
  nextButton: document.querySelector("#next-button"),
  gameCard: document.querySelector(".game-card"),
  starCount: document.querySelector("#star-count"),
  streakCount: document.querySelector("#streak-count"),
  levelCount: document.querySelector("#level-count"),
  encouragement: document.querySelector("#encouragement-text"),
  resetButton: document.querySelector("#reset-button"),
  resetDialog: document.querySelector("#reset-dialog")
};

let progress = loadProgress();
let currentProblem = null;
let wrongAttempts = 0;
let problemFinished = false;

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateOperationStats(value) {
  const operators = ["+", "-", "×", "÷"];
  if (!value || typeof value !== "object") {
    return false;
  }

  return operators.every((operator) => {
    const stat = value[operator];
    return (
      stat &&
      isNonNegativeInteger(stat.attempts) &&
      isNonNegativeInteger(stat.firstTryCorrect) &&
      stat.firstTryCorrect <= stat.attempts
    );
  });
}

function isValidProgress(value) {
  return (
    value &&
    typeof value === "object" &&
    Number.isInteger(value.level) &&
    value.level >= MIN_LEVEL &&
    value.level <= MAX_LEVEL &&
    isNonNegativeInteger(value.totalAttempts) &&
    isNonNegativeInteger(value.totalProblems) &&
    isNonNegativeInteger(value.correctProblems) &&
    value.correctProblems <= value.totalProblems &&
    isNonNegativeInteger(value.streak) &&
    isNonNegativeInteger(value.bestStreak) &&
    value.streak <= value.bestStreak &&
    isNonNegativeInteger(value.questionsAtLevel) &&
    (value.skippedProblems === undefined || isNonNegativeInteger(value.skippedProblems)) &&
    Array.isArray(value.recentResults) &&
    value.recentResults.length <= MAX_HISTORY &&
    value.recentResults.every((result) => typeof result === "boolean") &&
    validateOperationStats(value.operationStats)
  );
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return isValidProgress(saved)
      ? {
          ...saved,
          skippedProblems: saved.skippedProblems ?? 0
        }
      : createDefaultProgress();
  } catch {
    return createDefaultProgress();
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    elements.encouragement.textContent = "Du kan stadig regne videre her.";
  }
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOperator(settings) {
  const choices = [...settings.operators];
  const availableOperators = [...new Set(choices)];

  availableOperators.forEach((operator) => {
    const stat = progress.operationStats[operator];
    if (stat.attempts >= 2 && stat.firstTryCorrect / stat.attempts < 0.6) {
      choices.push(operator, operator);
    }
  });

  return choices[randomInteger(0, choices.length - 1)];
}

function makeProblem() {
  const settings = levelSettings[progress.level];
  const operator = pickOperator(settings);
  let left;
  let right;
  let answer;

  if (operator === "+") {
    left = randomInteger(0, settings.addMax);
    right = randomInteger(0, settings.addMax - left);
    answer = left + right;
  } else if (operator === "-") {
    left = randomInteger(1, settings.subtractMax);
    right = randomInteger(0, left);
    answer = left - right;
  } else if (operator === "×") {
    left = randomInteger(1, settings.factorMax);
    right = randomInteger(1, settings.factorMax);
    answer = left * right;
  } else {
    right = randomInteger(1, settings.factorMax);
    answer = randomInteger(1, settings.factorMax);
    left = right * answer;
  }

  return { left, right, operator, answer };
}

function getNextProblem() {
  let nextProblem = makeProblem();
  let tries = 0;

  while (
    currentProblem &&
    nextProblem.left === currentProblem.left &&
    nextProblem.right === currentProblem.right &&
    nextProblem.operator === currentProblem.operator &&
    tries < 5
  ) {
    nextProblem = makeProblem();
    tries += 1;
  }

  return nextProblem;
}

function renderStats() {
  elements.starCount.textContent = progress.correctProblems;
  elements.streakCount.textContent = progress.streak;
  elements.levelCount.textContent = progress.level;
  elements.skipCount.textContent = progress.skippedProblems;
}

function showProblem() {
  currentProblem = getNextProblem();
  wrongAttempts = 0;
  problemFinished = false;
  elements.equation.textContent = `${currentProblem.left} ${currentProblem.operator} ${currentProblem.right}`;
  elements.answer.value = "";
  elements.answer.disabled = false;
  elements.keypadButtons.forEach((button) => {
    button.disabled = false;
  });
  elements.feedback.textContent = "";
  elements.feedback.className = "feedback";
  elements.nextButton.hidden = true;
  elements.skipControls.hidden = false;
  elements.gameCard.classList.remove("celebrate");
  elements.answer.focus();
}

function addRecentResult(result) {
  progress.recentResults.push(result);
  if (progress.recentResults.length > MAX_HISTORY) {
    progress.recentResults.shift();
  }
}

function adaptLevel() {
  const recentSix = progress.recentResults.slice(-6);
  const recentFive = progress.recentResults.slice(-5);
  const correctInSix = recentSix.filter(Boolean).length;
  const correctInFive = recentFive.filter(Boolean).length;

  if (
    progress.level < MAX_LEVEL &&
    progress.questionsAtLevel >= 6 &&
    recentSix.length === 6 &&
    correctInSix >= 5
  ) {
    progress.level += 1;
    progress.questionsAtLevel = 0;
    progress.recentResults = [];
    return "up";
  }

  if (
    progress.level > MIN_LEVEL &&
    progress.questionsAtLevel >= 5 &&
    recentFive.length === 5 &&
    correctInFive <= 2
  ) {
    progress.level -= 1;
    progress.questionsAtLevel = 0;
    progress.recentResults = [];
    return "down";
  }

  return "same";
}

function finishProblem(wasCorrect) {
  const firstTry = wasCorrect && wrongAttempts === 0;
  const stat = progress.operationStats[currentProblem.operator];

  progress.totalProblems += 1;
  progress.questionsAtLevel += 1;
  stat.attempts += 1;

  if (wasCorrect) {
    progress.correctProblems += 1;
  }

  if (firstTry) {
    progress.streak += 1;
    progress.bestStreak = Math.max(progress.bestStreak, progress.streak);
    stat.firstTryCorrect += 1;
  } else {
    progress.streak = 0;
  }

  addRecentResult(firstTry);
  const levelChange = adaptLevel();
  saveProgress();
  renderStats();
  return levelChange;
}

function setFinishedState() {
  problemFinished = true;
  elements.answer.disabled = true;
  elements.keypadButtons.forEach((button) => {
    button.disabled = true;
  });
  elements.nextButton.hidden = false;
  elements.skipControls.hidden = true;
  elements.nextButton.focus();
}

function handleCorrectAnswer() {
  const levelChange = finishProblem(true);
  const messages = ["Flot regnet!", "Du har helt ret!", "Juhuu, det er rigtigt!", "Supergodt klaret!"];
  let message = messages[randomInteger(0, messages.length - 1)];

  if (levelChange === "up") {
    message = `Fantastisk! Du er nu på niveau ${progress.level}!`;
  }

  elements.feedback.textContent = `★ ${message}`;
  elements.feedback.className = "feedback correct";
  elements.encouragement.textContent =
    progress.streak >= 3 ? `${progress.streak} rigtige i træk — sikke en serie!` : "Godt gået! Du lærer hele tiden.";
  elements.gameCard.classList.add("celebrate");
  setFinishedState();
}

function handleIncorrectAnswer() {
  wrongAttempts += 1;

  if (wrongAttempts >= 3) {
    const levelChange = finishProblem(false);
    const extraMessage =
      levelChange === "down" ? ` Vi øver lidt på niveau ${progress.level}.` : "";
    elements.feedback.textContent = `Svaret er ${currentProblem.answer}.${extraMessage}`;
    elements.feedback.className = "feedback incorrect";
    elements.encouragement.textContent = "Det er helt okay — næste opgave er en ny chance.";
    setFinishedState();
    return;
  }

  const hint = wrongAttempts === 1 ? "Prøv én gang til." : "Du er tæt på — prøv igen.";
  elements.feedback.textContent = `Ikke helt endnu. ${hint}`;
  elements.feedback.className = "feedback incorrect";
  elements.answer.value = "";
}

function handleSubmit(event) {
  event.preventDefault();

  if (problemFinished) {
    showProblem();
    return;
  }

  const rawAnswer = elements.answer.value.trim();
  if (rawAnswer === "") {
    elements.feedback.textContent = "Skriv et tal først.";
    elements.feedback.className = "feedback incorrect";
    elements.answer.focus();
    return;
  }

  progress.totalAttempts += 1;
  saveProgress();

  if (Number(rawAnswer) === currentProblem.answer) {
    handleCorrectAnswer();
  } else {
    handleIncorrectAnswer();
  }
}

function resetProgress() {
  progress = createDefaultProgress();
  saveProgress();
  renderStats();
  elements.encouragement.textContent = "En frisk start — du kan godt!";
  showProblem();
}

function skipProblem(direction) {
  progress.skippedProblems += 1;
  progress.level = Math.max(
    MIN_LEVEL,
    Math.min(MAX_LEVEL, progress.level + (direction === "up" ? 1 : -1))
  );
  progress.questionsAtLevel = 0;
  progress.recentResults = [];
  saveProgress();
  renderStats();
  showProblem();
  elements.encouragement.textContent =
    direction === "up"
      ? `Så prøver vi niveau ${progress.level}.`
      : `Vi gør det lidt lettere på niveau ${progress.level}.`;
}

function enterDigit(digit) {
  if (problemFinished || elements.answer.value.length >= 3) {
    return;
  }

  elements.answer.value += digit;
  elements.feedback.textContent = "";
  elements.feedback.className = "feedback";
}

function deleteDigit() {
  if (problemFinished) {
    return;
  }

  elements.answer.value = elements.answer.value.slice(0, -1);
}

elements.keypadButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.key;
    if (key === "delete") {
      deleteDigit();
    } else if (key !== undefined) {
      enterDigit(key);
    }
  });
});
elements.difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => skipProblem(button.dataset.difficulty));
});
elements.form.addEventListener("submit", handleSubmit);
elements.nextButton.addEventListener("click", showProblem);
document.addEventListener("keydown", (event) => {
  if (elements.resetDialog.open) {
    return;
  }

  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    enterDigit(event.key);
  } else if (event.key === "Backspace" || event.key === "Delete") {
    event.preventDefault();
    deleteDigit();
  } else if (event.key === "Enter") {
    event.preventDefault();
    if (problemFinished) {
      showProblem();
    } else {
      elements.form.requestSubmit();
    }
  }
});
elements.resetButton.addEventListener("click", () => {
  elements.resetDialog.returnValue = "";
  elements.resetDialog.showModal();
});
elements.resetDialog.addEventListener("close", () => {
  if (elements.resetDialog.returnValue === "confirm") {
    resetProgress();
  }
});

renderStats();
showProblem();
