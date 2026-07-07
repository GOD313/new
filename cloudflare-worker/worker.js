export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return json({ ok: true, service: "KaratShod Worker", routes: ["/set-webhook", "/master-bot", "/store-bot", "/customer-bot"] });
    }

    if (url.pathname === "/set-webhook") {
      const site = url.origin;
      const out = {
        master: await telegram(env.MASTER_BOT_TOKEN, "setWebhook", { url: `${site}/master-bot` }),
        store: await telegram(env.STORE_BOT_TOKEN, "setWebhook", { url: `${site}/store-bot` }),
        customer: await telegram(env.CUSTOMER_BOT_TOKEN, "setWebhook", { url: `${site}/customer-bot` }),
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
  if (text === "/start" || text === "/panel") {
    await send(env.MASTER_BOT_TOKEN, chat, "👑 پنل مادر KaratShod\n\nسیستم Worker فعال است.");
  }
  return json({ ok: true });
}

async function handleStore(request, env) {
  const update = await request.json().catch(() => ({}));
  const chat = chatId(update);
  const text = textOf(update);
  if (text === "/start" || text === "/panel") {
    await telegram(env.STORE_BOT_TOKEN, "sendMessage", {
      chat_id: chat,
      text: "🛒 ربات فروشگاه KaratShod\n\nخرید پورت، وضعیت پورت و قیمت‌ها از اینجا مدیریت می‌شود.",
      reply_markup: { keyboard: [["🛒 خرید پورت", "📜 پورت‌های من"], ["💰 قیمت‌ها"]], resize_keyboard: true }
    });
  }
  return json({ ok: true });
}

async function handleCustomer(request, env) {
  const update = await request.json().catch(() => ({}));
  const chat = chatId(update);
  const text = textOf(update);
  if (text === "/start" || text === "/panel") {
    await telegram(env.CUSTOMER_BOT_TOKEN, "sendMessage", {
      chat_id: chat,
      text: "🎛 ربات خدمات مشتری KaratShod\n\nتنظیم قالب، فرم، لوگو، رنگ، اپلیکیشن، درگاه و لینک کوتاه.",
      reply_markup: { keyboard: [["🎨 قالب و فرم", "🖼 رنگ و لوگو"], ["📱 اپلیکیشن من", "💳 درگاه اعتبارسنجی"], ["🔗 لینک کوتاه", "🧠 متن تبلیغاتی"]], resize_keyboard: true }
    });
  }
  return json({ ok: true });
}

async function telegram(token, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({ ok: false }));
}

async function send(token, chat_id, text) {
  return telegram(token, "sendMessage", { chat_id, text });
}

function textOf(update) {
  return update?.message?.text || update?.callback_query?.data || "";
}

function chatId(update) {
  return update?.message?.chat?.id || update?.callback_query?.message?.chat?.id;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
