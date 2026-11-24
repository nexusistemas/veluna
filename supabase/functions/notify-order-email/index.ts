import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { dispatchOrderEmails, sendTestResendEmail } from '../_shared/emailNotifier.ts';
import type { OrderEmailEvent } from '../_shared/emailTemplates.ts';
import { createServiceClient, isRequestAdmin } from '../_shared/mpHelpers.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as {
      event?: OrderEmailEvent | 'test';
      order_id?: string;
      public_access_token?: string;
      test_email?: string;
      site_origin?: string;
    };

    const event = body.event ?? 'order_created';
    const serviceClient = createServiceClient();
    const reqOrigin = req.headers.get('origin') ?? '';
    const siteOrigin =
      body.site_origin?.trim() ||
      (reqOrigin.startsWith('http') ? reqOrigin : 'https://veluna.nexusistemas.app.br');

    if (event === 'test') {
      const adminOk = await isRequestAdmin(req, serviceClient);
      if (!adminOk) {
        return jsonResponse({ ok: false, error: 'Acesso restrito a administradoras.' }, 401);
      }
      const res = await sendTestResendEmail(serviceClient, body.test_email ?? '', siteOrigin);
      return jsonResponse(res, res.ok ? 200 : 400);
    }

    if (!body.order_id) {
      return jsonResponse({ ok: false, error: 'order_id obrigatório.' }, 400);
    }

    if (event === 'payment_approved' || event === 'status_updated') {
      const adminOk = await isRequestAdmin(req, serviceClient);
      if (!adminOk) {
        return jsonResponse({ ok: false, error: 'Apenas administradoras podem disparar este evento.' }, 401);
      }
    } else if (event === 'order_created') {
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
    } else {
      return jsonResponse({ ok: false, error: 'Evento de e-mail inválido.' }, 400);
    }

    const result = await dispatchOrderEmails(serviceClient, {
      orderId: body.order_id,
      event,
      siteOrigin,
    });
    return jsonResponse(result, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno ao enviar e-mail.';
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
