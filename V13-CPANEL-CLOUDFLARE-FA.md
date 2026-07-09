# KaratShod V13 — cPanel + Cloudflare

Netlify حذف شد.

## معماری نهایی

```txt
cPanel = پنل مادر + API + سایت پورت‌ها
Cloudflare Worker = ربات‌ها و Webhook تلگرام
GitHub = بکاپ و کد
```

## تست cPanel

اول این لینک باید JSON بدهد:

```txt
https://my.karatshod.click/api/health.php
```

## ساخت Cloudflare Worker

1. Cloudflare Dashboard
2. Workers and Pages
3. Create Worker
4. اسم: `karatshod-worker`
5. Deploy
6. Edit code
7. کد `cloudflare-worker/worker.js` را جایگزین کن
8. Save and deploy

## Secrets موردنیاز

داخل Worker:

Settings → Variables → Secrets

این‌ها را اضافه کن:

```txt
MASTER_BOT_TOKEN
STORE_BOT_TOKEN
CUSTOMER_BOT_TOKEN
MASTER_CHAT_ID
API_BASE
MASTER_SECRET
```

مقدار API_BASE:

```txt
https://my.karatshod.click
```

## تست Worker

```txt
https://YOUR-WORKER.workers.dev/health
```

## فعال‌سازی Webhook

```txt
https://YOUR-WORKER.workers.dev/set-webhook
```

بعد داخل هر سه ربات `/start` بزن.
