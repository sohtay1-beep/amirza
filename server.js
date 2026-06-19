const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { normalize, isValidWord, randomWordOfLength } = require("./words");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));

// تنظیمات پیش‌فرض دور بازی: تعداد و طول کلمه‌های لازم
const DEFAULT_SLOT_LENGTHS = [3, 3, 3, 3, 4, 4, 5];

// امتیاز بر اساس طول کلمه
function pointsForLength(len) {
  return len - 2; // 3حرفی=1، 4حرفی=2، 5حرفی=3
}

/** @type {Map<string, Room>} */
const rooms = new Map();

function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function buildPool(slotLengths) {
  const pool = {};
  const slots = slotLengths.map((length) => {
    const word = normalize(randomWordOfLength(length));
    for (const ch of word) pool[ch] = (pool[ch] || 0) + 1;
    return { length, word: null, foundBy: null };
  });
  return { pool, slots };
}

function canFormFromPool(word, pool) {
  const counts = {};
  for (const ch of word) counts[ch] = (counts[ch] || 0) + 1;
  for (const ch of Object.keys(counts)) {
    if (!pool[ch] || pool[ch] < counts[ch]) return false;
  }
  return true;
}

function publicState(room) {
  return {
    code: room.code,
    letters: room.letters,
    slots: room.slots,
    players: Object.values(room.players).map((p) => ({ name: p.name, score: p.score })),
    finished: room.finished,
  };
}

function createRoom(slotLengths = DEFAULT_SLOT_LENGTHS) {
  const code = makeRoomCode();
  const { pool, slots } = buildPool(slotLengths);
  const letters = shuffle(Object.entries(pool).flatMap(([ch, count]) => Array(count).fill(ch)));
  const room = { code, pool, slots, letters, players: {}, foundWords: new Set(), finished: false };
  rooms.set(code, room);
  return room;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

io.on("connection", (socket) => {
  socket.on("create_room", ({ name }) => {
    const room = createRoom();
    room.players[socket.id] = { name: (name || "بازیکن").slice(0, 20), score: 0 };
    socket.join(room.code);
    socket.data.roomCode = room.code;
    io.to(room.code).emit("room_state", publicState(room));
  });

  socket.on("join_room", ({ name, code }) => {
    const room = rooms.get((code || "").toUpperCase());
    if (!room) {
      socket.emit("error_msg", "اتاقی با این کد پیدا نشد.");
      return;
    }
    room.players[socket.id] = { name: (name || "بازیکن").slice(0, 20), score: 0 };
    socket.join(room.code);
    socket.data.roomCode = room.code;
    io.to(room.code).emit("room_state", publicState(room));
  });

  socket.on("submit_word", ({ word }) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || room.finished) return;
    const player = room.players[socket.id];
    if (!player) return;

    const norm = normalize(word);
    if (!norm) return;

    if (room.foundWords.has(norm)) {
      socket.emit("word_rejected", { word, reason: "این کلمه قبلاً پیدا شده." });
      return;
    }
    const length = norm.length;
    const openSlotIndex = room.slots.findIndex((s) => s.length === length && !s.word);
    if (openSlotIndex === -1) {
      socket.emit("word_rejected", { word, reason: `جای خالی ${length} حرفی نداریم.` });
      return;
    }
    if (!canFormFromPool(norm, room.pool)) {
      socket.emit("word_rejected", { word, reason: "این کلمه با حروف داده‌شده ساخته نمی‌شه." });
      return;
    }
    if (!isValidWord(norm, length)) {
      socket.emit("word_rejected", { word, reason: "این کلمه تو فرهنگ‌لغت بازی نیست." });
      return;
    }

    // قبول شد
    room.slots[openSlotIndex] = { length, word: norm, foundBy: player.name };
    room.foundWords.add(norm);
    player.score += pointsForLength(length);

    const allFilled = room.slots.every((s) => s.word);
    if (allFilled) room.finished = true;

    io.to(room.code).emit("word_found", {
      slotIndex: openSlotIndex,
      word: norm,
      by: player.name,
      points: pointsForLength(length),
    });
    io.to(room.code).emit("room_state", publicState(room));

    if (allFilled) {
      io.to(room.code).emit("game_over", publicState(room));
    }
  });

  socket.on("new_round", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    const { pool, slots } = buildPool(DEFAULT_SLOT_LENGTHS);
    room.pool = pool;
    room.slots = slots;
    room.letters = shuffle(Object.entries(pool).flatMap(([ch, count]) => Array(count).fill(ch)));
    room.foundWords.clear();
    room.finished = false;
    io.to(room.code).emit("room_state", publicState(room));
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    delete room.players[socket.id];
    if (Object.keys(room.players).length === 0) {
      rooms.delete(code);
    } else {
      io.to(room.code).emit("room_state", publicState(room));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`آمیرزای آنلاین روی پورت ${PORT} اجراست`));
