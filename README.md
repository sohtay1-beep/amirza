# آمیرزای آنلاین 🎲

نسخه‌ی گروهی و آنلاین بازی آمیرزا. حروف رو می‌گیرید، هرکی کلمه‌ای پیدا کرد فوراً برای همه نمایش داده می‌شه و امتیاز می‌گیره.

## ساختار پروژه
- `server.js` — بک‌اند Node.js + Socket.io (منطق بازی و اتاق‌ها)
- `words.js` — واژه‌نامه (فعلاً یه نمونه‌ی کوچیک، حتماً گسترشش بده)
- `public/` — صفحه‌ی وب بازی
- `bot.js` — بات تلگرام برای باز کردن بازی به‌صورت WebApp

## ۱. نصب روی سرور هتزنر (از طریق ترموکس یا هر SSH client)

```bash
ssh root@YOUR_SERVER_IP

# نصب Node.js (نسخه LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git

# آپلود پروژه (از گوشیت با scp، یا git clone اگه تو گیت‌هاب گذاشتیش)
mkdir -p /opt/amirza && cd /opt/amirza
# فایل‌ها رو همینجا کپی کن

npm install
```

## ۲. اجرای دائمی با pm2

```bash
npm install -g pm2
pm2 start server.js --name amirza
pm2 save
pm2 startup   # دستوری که نشون می‌ده رو اجرا کن تا با ریبوت سرور هم بالا بیاد
```

## ۳. دامنه + HTTPS (لازمه چون Telegram WebApp فقط با https کار می‌کنه)

با Caddy ساده‌ترین راهه (SSL خودکار):

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

فایل `/etc/caddy/Caddyfile` رو بساز:
```
amirza.yourdomain.com {
    reverse_proxy localhost:3000
}
```

```bash
systemctl reload caddy
```

(یادت نره دامنه‌ت رو با یه رکورد A به IP سرور هتزنر وصل کنی)

## ۴. ساخت بات تلگرام

1. تو تلگرام برو پیش `@BotFather`، با `/newbot` یه بات بساز، توکن رو بگیر
2. به بات‌فادر بگو `/newapp` یا از تنظیمات بات WebApp رو فعال کن و آدرس `https://amirza.yourdomain.com` رو بهش بده
3. روی سرور:

```bash
TELEGRAM_BOT_TOKEN="توکن_بات" GAME_URL="https://amirza.yourdomain.com" pm2 start bot.js --name amirza-bot
pm2 save
```

حالا تو تلگرام به بات `/start` بزن، دکمه‌ی «شروع بازی» میاد.

## ۵. گسترش واژه‌نامه (مهم!)

لیست فعلی تو `words.js` فقط نمونه‌ست (~۱۰۰ کلمه). برای بازی واقعی باید چند هزار کلمه‌ی ۳ و ۴ و ۵ حرفی فارسی اضافه کنی. هر منبع لیست کلمات فارسی (txt یا json) که پیدا کردی رو می‌تونی با یه اسکریپت ساده بر اساس طول دسته‌بندی کنی و جایگزین آرایه‌های `WORDS_BY_LENGTH` کنی.

## نکات بعدی که می‌شه اضافه کرد
- حالت رقابتی (هرکی برای خودش، اسلات‌های جدا)
- تایمر برای هر دور
- چندین دست پشت‌سرهم با امتیاز تجمعی
- اعتبارسنجی بهتر کلمه (فعل/جمع نباشه و...)
