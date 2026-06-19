// بات تلگرام - فقط یه دکمه می‌سازه که بازی رو به‌عنوان Telegram WebApp باز می‌کنه
// اجرا: TELEGRAM_BOT_TOKEN=xxxx GAME_URL=https://yourdomain.com node bot.js

const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GAME_URL = process.env.GAME_URL; // مثلاً https://amirza.yourdomain.com

if (!TOKEN || !GAME_URL) {
  console.error("لطفاً TELEGRAM_BOT_TOKEN و GAME_URL رو ست کن.");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start(?:\s+(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const roomCode = match && match[1] ? match[1].trim() : null;
  const url = roomCode ? `${GAME_URL}?room=${roomCode}` : GAME_URL;

  bot.sendMessage(chatId, roomCode
    ? `دعوت شدی به اتاق ${roomCode}! دکمه زیر رو بزن:`
    : "بزن بریم آمیرزا بازی کنیم 🎲", {
    reply_markup: {
      inline_keyboard: [[{ text: "🎮 شروع بازی", web_app: { url } }]],
    },
  });
});

bot.onText(/\/newgame/, (msg) => {
  bot.sendMessage(msg.chat.id, "اتاق جدید بساز و کد رو با دوستات شریک کن:", {
    reply_markup: {
      inline_keyboard: [[{ text: "🎮 ساخت اتاق", web_app: { url: GAME_URL } }]],
    },
  });
});

console.log("بات تلگرام آمیرزای آنلاین اجرا شد.");
