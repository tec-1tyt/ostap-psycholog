module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  var body = req.body || {};
  var name = (body.name || '').trim();
  var contact = (body.contact || '').trim();
  var message = (body.message || '').trim();

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
