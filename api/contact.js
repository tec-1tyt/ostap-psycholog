var WINDOW_MS = 10 * 60 * 1000;
var MAX_PER_IP = 3;
var hits = new Map();

function tooMany(ip) {
  var now = Date.now();
  hits.forEach(function (list, key) {
    var fresh = list.filter(function (t) { return now - t < WINDOW_MS; });
    if (fresh.length) hits.set(key, fresh); else hits.delete(key);
  });
  var list = hits.get(ip) || [];
  if (list.length >= MAX_PER_IP) return true;
  list.push(now);
  hits.set(ip, list);
  return false;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  var ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  var body = req.body || {};
  var name = String(body.name || '').trim().slice(0, 100);
  var contact = String(body.contact || '').trim().slice(0, 100);
  var message = String(body.message || '').trim().slice(0, 2000);

  if (!name || !contact || !message) {
    res.status(400).json({ error: 'Missing fields' });
    return;
  }

  var token = process.env.TELEGRAM_BOT_TOKEN;
  var chatId = process.env.TELEGRAM_CHAT_ID;
  var chatId2 = process.env.TELEGRAM_CHAT_ID_2;
  if (!token || !chatId) {
    res.status(500).json({ error: 'Not configured' });
    return;
  }

  var text = 'Нова заявка з сайту\n\n' +
    'Ім\'я: ' + name + '\n' +
    'Контакт: ' + contact + '\n\n' +
    'Запит:\n' + message;

  var chatIds = chatId2 ? [chatId, chatId2] : [chatId];

  try {
    var results = await Promise.all(chatIds.map(function (id) {
      return fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: id, text: text })
      });
    }));

    if (!results[0].ok) {
      res.status(502).json({ error: 'Telegram send failed' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: 'Telegram send failed' });
  }
};
