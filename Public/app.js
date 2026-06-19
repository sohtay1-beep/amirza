const socket = io();

const screenHome = document.getElementById("screen-home");
const screenGame = document.getElementById("screen-game");
const nameInput = document.getElementById("nameInput");
const codeInput = document.getElementById("codeInput");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const errorMsg = document.getElementById("errorMsg");

const roomCodeLabel = document.getElementById("roomCodeLabel");
const lettersBoard = document.getElementById("lettersBoard");
const slotsList = document.getElementById("slotsList");
const wordForm = document.getElementById("wordForm");
const wordInput = document.getElementById("wordInput");
const feedback = document.getElementById("feedback");
const scoreboard = document.getElementById("scoreboard");
const logFeed = document.getElementById("logFeed");
const shareBtn = document.getElementById("shareBtn");
const newRoundBtn = document.getElementById("newRoundBtn");

// اگر داخل تلگرام باز شده، از WebApp API استفاده کن
const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
if (tg) {
  tg.ready();
  tg.expand();
}

function savedName() {
  return localStorageSafe("amirza_name") || (tg && tg.initDataUnsafe?.user?.first_name) || "";
}
function localStorageSafe(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function saveName(name) {
  try { localStorage.setItem("amirza_name", name); } catch {}
}

nameInput.value = savedName();

// اگر لینک با ?room=CODE باز شده، خودکار پر کن
const urlParams = new URLSearchParams(window.location.search);
const prefillRoom = urlParams.get("room");
if (prefillRoom) codeInput.value = prefillRoom.toUpperCase();

createBtn.addEventListener("click", () => {
  const name = nameInput.value.trim() || "بازیکن";
  saveName(name);
  socket.emit("create_room", { name });
});

joinBtn.addEventListener("click", () => {
  const name = nameInput.value.trim() || "بازیکن";
  const code = codeInput.value.trim().toUpperCase();
  if (!code) { errorMsg.textContent = "کد اتاق رو وارد کن."; return; }
  saveName(name);
  socket.emit("join_room", { name, code });
});

socket.on("error_msg", (msg) => { errorMsg.textContent = msg; });

let currentState = null;

socket.on("room_state", (state) => {
  currentState = state;
  errorMsg.textContent = "";
  screenHome.classList.add("hidden");
  screenGame.classList.remove("hidden");
  renderState(state);
});

socket.on("word_found", ({ word, by, points }) => {
  addLog(`${by} کلمه‌ی «${word}» رو پیدا کرد (+${points} امتیاز)`);
});

socket.on("word_rejected", ({ word, reason }) => {
  feedback.textContent = `«${word}» قبول نشد: ${reason}`;
  feedback.className = "feedback bad";
});

socket.on("game_over", () => {
  addLog("🎉 همه‌ی جاهای خالی پر شد! دور تموم شد.");
  newRoundBtn.classList.remove("hidden");
});

function renderState(state) {
  roomCodeLabel.textContent = state.code;

  lettersBoard.innerHTML = "";
  state.letters.forEach((ch) => {
    const tile = document.createElement("div");
    tile.className = "letter-tile";
    tile.textContent = ch;
    tile.style.setProperty("--r", `${(Math.random() * 8 - 4).toFixed(1)}deg`);
    lettersBoard.appendChild(tile);
  });

  slotsList.innerHTML = "";
  state.slots.forEach((slot) => {
    const row = document.createElement("div");
    row.className = "slot-row" + (slot.word ? " filled" : "");
    if (slot.word) {
      row.innerHTML = `<span class="word">${slot.word}</span><span class="by">${slot.foundBy}</span>`;
    } else {
      row.innerHTML = `<span class="blanks">${"ـ ".repeat(slot.length)}</span><span class="by">${slot.length} حرفی</span>`;
    }
    slotsList.appendChild(row);
  });

  scoreboard.innerHTML = "";
  [...state.players].sort((a, b) => b.score - a.score).forEach((p) => {
    const chip = document.createElement("div");
    chip.className = "score-chip";
    chip.innerHTML = `${p.name}: <strong>${p.score}</strong>`;
    scoreboard.appendChild(chip);
  });

  if (state.finished) {
    newRoundBtn.classList.remove("hidden");
  } else {
    newRoundBtn.classList.add("hidden");
  }
}

wordForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const word = wordInput.value.trim();
  if (!word) return;
  socket.emit("submit_word", { word });
  wordInput.value = "";
  feedback.textContent = "";
});

function addLog(text) {
  const line = document.createElement("div");
  line.textContent = text;
  logFeed.prepend(line);
}

shareBtn.addEventListener("click", () => {
  if (!currentState) return;
  const url = `${window.location.origin}${window.location.pathname}?room=${currentState.code}`;
  if (tg) {
    tg.switchInlineQuery ? tg.switchInlineQuery(currentState.code) : navigator.clipboard?.writeText(url);
  }
  if (navigator.share) {
    navigator.share({ title: "آمیرزای آنلاین", text: `بیا با هم آمیرزا بازی کنیم! کد اتاق: ${currentState.code}`, url });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
    feedback.textContent = "لینک کپی شد!";
    feedback.className = "feedback ok";
  }
});

newRoundBtn.addEventListener("click", () => {
  socket.emit("new_round");
  newRoundBtn.classList.add("hidden");
});
