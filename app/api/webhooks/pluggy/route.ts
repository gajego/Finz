// app/api/webhooks/pluggy/route.ts (Next.js / Node.js Serverless)
// Documentation: https://docs.pluggy.ai/docs/webhooks

export interface PluggyWebhookPayload {
  event: 'item/created' | 'item/updated' | 'item/error' | 'item/deleted' | 'transactions/created';
  itemId: string;
  eventId?: string;
  error?: {
    code: string;
    message: string;
  };
  data?: Record<string, unknown>;
}

async function handleItemCreated(itemId: string) {
  console.log(`[Pluggy Webhook] Novo item bancário conectado: ${itemId}`);
}

async function handleItemUpdated(itemId: string) {
  console.log(`[Pluggy Webhook] Item bancário sincronizado/atualizado: ${itemId}`);
}

async function handleItemError(itemId: string, error?: { code: string; message: string }) {
  console.error(`[Pluggy Webhook] Erro reportado no item ${itemId}:`, error);
}

export async function POST(req: Request) {
  try {
    const event = (await req.json()) as PluggyWebhookPayload;

    console.log('[Pluggy Webhook] Evento recebido:', event.event);
    if (event.eventId) {
      console.log('[Pluggy Webhook] Event ID:', event.eventId);
    }

    // Processamento assíncrono para garantir resposta HTTP 2xx em menos de 5 segundos
    (async () => {
      try {
        switch (event.event) {
          case 'item/created':
            await handleItemCreated(event.itemId);
            break;
          case 'item/updated':
            await handleItemUpdated(event.itemId);
            break;
          case 'item/error':
            await handleItemError(event.itemId, event.error);
            break;
          default:
            console.log(`[Pluggy Webhook] Evento não tratado: ${event.event}`);
            break;
        }
      } catch (err) {
        console.error('[Pluggy Webhook] Falha ao processar evento em background:', err);
      }
    })();

    // Resposta imediata 200 OK exigida pela Pluggy (<= 5 segundos)
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Invalid webhook payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
