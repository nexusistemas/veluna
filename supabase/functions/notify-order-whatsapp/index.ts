import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient, isRequestAdmin } from '../_shared/mpHelpers.ts';
import { notifyOrderWhatsapp } from '../_shared/whatsappNotifier.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as {
      event?: 'order_created' | 'payment_approved' | 'test';
      order_id?: string;
      public_access_token?: string;
      test_phone?: string;
    };

    const event = body.event ?? 'order_created';
    const serviceClient = createServiceClient();

    if (event === 'test') {
      const adminOk = await isRequestAdmin(req, serviceClient);
      if (!adminOk) {
        return jsonResponse({ ok: false, error: 'Acesso restrito a administradores.' }, 401);
      }
      const res = await notifyOrderWhatsapp({
        serviceClient,
        event: 'test',
        forceTest: true,
        testPhone: body.test_phone,
      });
      return jsonResponse(res, res.ok ? 200 : 400);
    }

    if (!body.order_id) {
      return jsonResponse({ ok: false, error: 'order_id obrigatório.' }, 400);
    }

    const { data: order } = await serviceClient
      .from('orders')
      .select('id, public_access_token')
      .eq('id', body.order_id)
      .maybeSingle();

    if (!order) {
      return jsonResponse({ ok: false, error: 'Pedido não encontrado.' }, 404);
    }

    const tokenOk = Boolean(
      body.public_access_token && order.public_access_token === body.public_access_token,
    );
    const authorized = tokenOk || (await isRequestAdmin(req, serviceClient));
    if (!authorized) {
      return jsonResponse({ ok: false, error: 'Não autorizado.' }, 401);
    }

    const res = await notifyOrderWhatsapp({
      serviceClient,
      orderId: order.id,
      event,
    });
    return jsonResponse(res, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno ao notificar WhatsApp.';
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
