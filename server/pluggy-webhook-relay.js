/**
 * Finz Pluggy Webhook Relay Server
 * 
 * Este servidor recebe notificações de eventos em tempo real da API da Pluggy
 * (como "transactions/created") e envia Push Notifications remotas (APNs)
 * diretamente para o iPhone do usuário via Expo Push Service.
 * 
 * Isso garante que o usuário receba alertas bancários mesmo com o aplicativo
 * 100% FECHADO ou com o celular bloqueado.
 * 
 * Uso:
 *   node server/pluggy-webhook-relay.js
 */

const http = require('http');

const PORT = process.env.PORT || 3001;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Armazena em memória (ou envie via variável de ambiente PUSH_TOKEN)
let storedPushToken = process.env.EXPO_PUSH_TOKEN || null;

async function sendExpoPush({ title, body, data }) {
  if (!storedPushToken) {
    console.warn('[Relay] ⚠️ Nenhum Push Token registrado ainda. Registre via POST /api/register-token');
    return false;
  }

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: storedPushToken,
        title: title || 'Finz • Nova Transação',
        body: body || 'Nova movimentação bancária detectada.',
        data: data || {},
        sound: 'default',
        priority: 'high',
        channelId: 'finz_transactions',
        badge: 1,
        _displayInForeground: true,
      }),
    });
    const result = await res.json();
    console.log('[Relay] ✅ Push remoto despachado com sucesso para o APNs/Expo:', result);
    return true;
  } catch (error) {
    console.error('[Relay] ❌ Falha ao despachar push remoto:', error);
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Registro de Token do dispositivo
  if (req.method === 'POST' && req.url === '/api/register-token') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (payload.token) {
          storedPushToken = payload.token;
          console.log(`[Relay] 📲 Push Token atualizado com sucesso: ${storedPushToken}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, token: storedPushToken }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Token ausente no payload.' }));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'JSON inválido' }));
      }
    });
    return;
  }

  // 2. Webhook oficial da Pluggy
  if (req.method === 'POST' && (req.url === '/api/webhook' || req.url === '/webhook')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const webhookData = JSON.parse(body);
        console.log('[Relay] 🔔 Webhook recebido da Pluggy:', JSON.stringify(webhookData, null, 2));

        const event = webhookData.event || webhookData.type || 'transactions/created';
        
        let title = 'Finz • Nova Movimentação';
        let message = 'Uma nova transação foi confirmada na sua conta.';

        if (webhookData.data && webhookData.data.description) {
          const rawAmount = webhookData.data.amount || 0;
          const formatted = (Math.abs(rawAmount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          title = 'Finz • Compra Aprovada';
          message = `${webhookData.data.description} no valor de ${formatted}.`;
        }

        await sendExpoPush({
          title,
          body: message,
          data: { webhookEvent: event, rawData: webhookData.data },
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error('[Relay] Erro ao processar payload do webhook:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro no processamento do webhook' }));
      }
    });
    return;
  }

  // 3. Status
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'Finz Pluggy Push Relay',
      status: 'online',
      hasPushToken: Boolean(storedPushToken),
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint não encontrado.' }));
});

server.listen(PORT, () => {
  console.log(`[Finz Relay] Servidor de Push e Webhooks rodando na porta ${PORT}`);
});
