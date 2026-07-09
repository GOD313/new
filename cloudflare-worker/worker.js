// KaratShod V13 — Cloudflare Worker Telegram Relay
// Netlify حذف شده؛ این Worker جایگزین Netlify Functions است.
// Secrets را داخل Cloudflare Worker تنظیم کن، نه داخل GitHub.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return json({
        ok: true,
        service: "KaratShod Cloudflare Worker",
        version: "V13_CLOUDFLARE_ONLY",
        routes: ["/health", "/set-webhook", "/master-bot", "/store-bot", "/customer-bot"]
      });
    }

    if (url.pathname === "/health") {
      return json({
        ok: true,
        worker: "V13_CLOUDFLARE_ONLY",
        api_base: env.API_BASE || null,
        has_master_token: Boolean(env.MASTER_BOT_TOKEN),
        has_store_token: Boolean(env.STORE_BOT_TOKEN),
        has_customer_token: Boolean(env.CUSTOMER_BOT_TOKEN),
        has_secret: Boolean(env.MASTER_SECRET)
      });
    }

    if (url.pathname === "/set-webhook") {
      const site = url.origin;
      const out = {
        master: await telegram(env.MASTER_BOT_TOKEN, "setWebhook", { url: `${site}/master-bot` }),
        store: await telegram(env.STORE_BOT_TOKEN, "setWebhook", { url: `${site}/store-bot` }),
        customer: await telegram(env.CUSTOMER_BOT_TOKEN, "setWebhook", { url: `${site}/customer-bot` })
      };
      return json({ ok: true, mode: "cloudflare-worker", site, out });
    }

    if (url.pathname === "/master-bot") return handleMaster(request, env);
    if (url.pathname === "/store-bot") return handleStore(request, env);
    if (url.pathname === "/customer-bot") return handleCustomer(request, env);

    return json({ ok: false, error: "not_found" }, 404);
  }
};

async function handleMaster(request, env) {
  const update = await request.json().catch(() => ({}));
  const chat = chatId(update);
  const text = textOf(update);

  if (text === "/start" || text === "/panel" || text === "⬅️ بازگشت") {
    await telegram(env.MASTER_BOT_TOKEN, "sendMessage", {
      chat_id: chat,
      text: "👑 پنل مادر KaratShod\n\nCloudflare Worker فعال است.\nپنل اصلی و API روی cPanel اجرا می‌شود.",
      reply_markup: { keyboard: [["📊 وضعیت کل", "📦 پورت‌ها"], ["💎 ولت", "⬅️ بازگشت"]], resize_keyboard: true }
    });
    return json({ ok: true });
  }

  if (text === "📊 وضعیت کل" || text === "/status") {
    const health = await api(env, "/api/health.php").catch(e => ({ ok: false, error: String(e.message || e) }));
    await telegram(env.MASTER_BOT_TOKEN, "sendMessage", {
      chat_id: chat,
      text: `📊 وضعیت سیستم\n\nAPI: ${env.API_BASE}\nResult: ${health.ok ? "✅ سالم" : "❌ خطا"}\n${health.version ? "Version: " + health.version : ""}`
    });
    return json({ ok: true });
  }

  return json({ ok: true });
}

async function handleStore(request, env) {
  const update = await request.json().catch(() => ({}));
  const chat = chatId(update);
  const text = textOf(update);

  if (text === "/start" || text === "/panel" || text === "⬅️ بازگشت") {
    await telegram(env.STORE_BOT_TOKEN, "sendMessage", {
      chat_id: chat,
      text: "🛒 ربات فروشگاه KaratShod\n\nخرید پورت، وضعیت پورت و قیمت‌ها از اینجا مدیریت می‌شود.",
      reply_markup: { keyboard: [["🛒 خرید پورت", "📜 پورت‌های من"], ["🔎 وضعیت پورت"], ["💼 حساب کاربری", "☎️ پشتیبانی"], ["💰 قیمت‌ها"]], resize_keyboard: true }
    });
    return json({ ok: true });
  }

  if (text === "💰 قیمت‌ها") {
    await telegram(env.STORE_BOT_TOKEN, "sendMessage", { chat_id: chat, text: "💰 قیمت‌ها:\n\n۲ روزه: 12 TRX\n۷ روزه: 30 TRX\n۱۵ روزه: 55 TRX\n۳۰ روزه: 84 TRX" });
    return json({ ok: true });
  }

  if (text === "🛒 خرید پورت") {
    await telegram(env.STORE_BOT_TOKEN, "sendMessage", {
      chat_id: chat,
      text: "🛒 نوع قالب را انتخاب کنید:",
      reply_markup: { inline_keyboard: [[{ text: "👥 استخدام", callback_data: "template:hire" }, { text: "🛍 فروشگاهی", callback_data: "template:shop" }], [{ text: "💳 درگاه/لندینگ", callback_data: "template:gateway" }, { text: "☎️ پشتیبانی", callback_data: "template:support" }], [{ text: "📱 صفحه داخل اپ", callback_data: "template:app" }]] }
    });
    return json({ ok: true });
  }

  if (text.startsWith("template:")) {
    const template = text.split(":")[1] || "hire";
    await answerCallback(env.STORE_BOT_TOKEN, update);
    await telegram(env.STORE_BOT_TOKEN, "sendMessage", {
      chat_id: chat,
      text: `قالب انتخاب شد: ${template}\nمدت اشتراک را انتخاب کنید:`,
      reply_markup: { inline_keyboard: [[{ text: "۲ روزه - 12 TRX", callback_data: `buy:${template}:2` }, { text: "۷ روزه - 30 TRX", callback_data: `buy:${template}:7` }], [{ text: "۱۵ روزه - 55 TRX", callback_data: `buy:${template}:15` }, { text: "۳۰ روزه - 84 TRX", callback_data: `buy:${template}:30` }]] }
    });
    return json({ ok: true });
  }

  if (text.startsWith("buy:")) {
    const [, template, daysRaw] = text.split(":");
    const days = Number(daysRaw || 7);
    await answerCallback(env.STORE_BOT_TOKEN, update);

    const order = await api(env, "/api/create-order.php", {
      days,
      template,
      telegram_user_id: userId(update),
      customer_chat_id: chat,
      customer_name: firstName(update),
      project_title: `پورت ${template} ${days} روزه`
    }).catch(e => ({ ok: false, error: String(e.message || e) }));

    await telegram(env.STORE_BOT_TOKEN, "sendMessage", {
      chat_id: chat,
      text: order.ok ? `✅ سفارش ساخته شد\n\nشناسه: ${order.order.id}\nمدت: ${days} روز\nمبلغ: ${order.order.price_trx} TRX\n\nبعد از پرداخت TXID را ارسال کنید.` : `❌ خطا در ساخت سفارش:\n${order.error || "API error"}`
    });
    return json({ ok: true });
  }

  return json({ ok: true });
}

async function handleCustomer(request, env) {
  const update = await request.json().catch(() => ({}));
  const chat = chatId(update);
  const text = textOf(update);

  if (text === "/start" || text === "/panel" || text === "⬅️ بازگشت") {
    await telegram(env.CUSTOMER_BOT_TOKEN, "sendMessage", {
      chat_id: chat,
      text: "🎛 ربات خدمات مشتری KaratShod\n\nتنظیم قالب، فرم، لوگو، رنگ، اپلیکیشن، درگاه و لینک کوتاه.",
      reply_markup: { keyboard: [["🎨 قالب و فرم", "🖼 رنگ و لوگو"], ["📱 اپلیکیشن من", "💳 درگاه اعتبارسنجی"], ["🔗 لینک کوتاه", "🧠 متن تبلیغاتی"], ["🌐 باز کردن پروژه"]], resize_keyboard: true }
    });
    return json({ ok: true });
  }

  if (["🎨 قالب و فرم", "🖼 رنگ و لوگو", "📱 اپلیکیشن من", "💳 درگاه اعتبارسنجی", "🔗 لینک کوتاه", "🧠 متن تبلیغاتی", "🌐 باز کردن پروژه"].includes(text)) {
    await telegram(env.CUSTOMER_BOT_TOKEN, "sendMessage", { chat_id: chat, text: "📦 کد پورت را بفرستید.\nمثال: DG" });
    return json({ ok: true });
  }

  return json({ ok: true });
}

async function api(env, path, data = null) {
  const res = await fetch(`${env.API_BASE}${path}`, {
    method: data ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-Karat-Secret": env.MASTER_SECRET },
    body: data ? JSON.stringify(data) : undefined
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error("bad_json_from_cpanel: " + text.slice(0, 120)); }
}

async function telegram(token, method, body) {
  if (!token) return { ok: false, error: "missing_token" };
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json().catch(() => ({ ok: false }));
}

async function answerCallback(token, update) {
  if (update.callback_query) await telegram(token, "answerCallbackQuery", { callback_query_id: update.callback_query.id }).catch(() => {});
}

function textOf(update) { return update?.message?.text || update?.message?.caption || update?.callback_query?.data || ""; }
function chatId(update) { return update?.message?.chat?.id || update?.callback_query?.message?.chat?.id; }
function userId(update) { return update?.message?.from?.id || update?.callback_query?.from?.id || ""; }
function firstName(update) { return update?.message?.from?.first_name || update?.callback_query?.from?.first_name || ""; }
function json(data, status = 200) { return new Response(JSON.stringify(data, null, 2), { status, headers: { "Content-Type": "application/json; charset=utf-8" } }); }
