import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { dispatchOrderEmails } from '../_shared/emailNotifier.ts';
import {
  createServiceClient, getEnv, isRequestAdmin, mapMpStatusToPaymentStatus, updateOrderPaymentSafe,
} from '../_shared/mpHelpers.ts';
import { notifyOrderWhatsapp } from '../_shared/whatsappNotifier.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as {
      action?: 'pix' | 'card' | 'preference' | 'sync_status';
      order_id?: string;
      public_access_token?: string;
      card_form_data?: Record<string, unknown>;
    };

    const { action, order_id: orderId, public_access_token: publicToken, card_form_data: cardData } = body;
    if (!action || !orderId) {
      return jsonResponse({ error: 'Parâmetros action e order_id são obrigatórios.' }, 400);
    }

    const serviceClient = createServiceClient();
    const { data: order, error: orderErr } = await serviceClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return jsonResponse({ error: 'Pedido não encontrado.' }, 404);
    }

    const tokenMatches = Boolean(publicToken && order.public_access_token === publicToken);
    const authorized = tokenMatches || (await isRequestAdmin(req, serviceClient));
    if (!authorized) {
      return jsonResponse({ error: 'Não autorizado para acessar este pedido.' }, 401);
    }

    const [secretsRes, settingsRes] = await Promise.all([
      serviceClient.from('private_secrets').select('mp_access_token').eq('id', 1).maybeSingle(),
      serviceClient.from('store_settings').select('store_name').eq('id', 1).maybeSingle(),
    ]);

    const mpAccessToken = (secretsRes.data as { mp_access_token?: string | null } | null)?.mp_access_token?.trim();
    if (!mpAccessToken) {
      return jsonResponse({ error: 'Token do Mercado Pago ainda não configurado no painel.' }, 400);
    }

    const storeName = (settingsRes.data as { store_name?: string } | null)?.store_name || 'Veluna Cosméticos';
    const supabaseUrl = getEnv('SUPABASE_URL').replace(/\/+$/, '');
    const notificationUrl = `${supabaseUrl}/functions/v1/mp-webhook`;
    const orderTotal = Number(Number(order.total).toFixed(2));

    if (action === 'pix') {
      if (order.mp_pix_qr_code && order.payment_status === 'pending') {
        return jsonResponse({
          ok: true,
          mp_payment_id: order.mp_payment_id,
          qr_code: order.mp_pix_qr_code,
          qr_code_base64: order.mp_pix_qr_base64,
          status: 'pending',
          payment_status: order.payment_status,
        });
      }

      const payerEmail =
        (order.customer_email as string | null)?.trim() ||
        `pedido.${String(order.order_number).replace(/\W/g, '')}@veluna.nexusistemas.app.br`;

      const expiresAtIso = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `pix-${order.id}-${Date.now()}`,
        },
        body: JSON.stringify({
          transaction_amount: orderTotal,
          description: `Pedido #${order.order_number} - ${storeName}`,
          payment_method_id: 'pix',
          date_of_expiration: expiresAtIso,
          external_reference: order.id,
          notification_url: notificationUrl,
          payer: {
            email: payerEmail,
            first_name: String(order.customer_name || 'Cliente').slice(0, 60),
          },
        }),
      });

      const mpData = (await mpRes.json()) as Record<string, unknown>;
      if (!mpRes.ok) {
        return jsonResponse({ error: String(mpData.message || 'Erro ao gerar Pix no Mercado Pago.') }, 400);
      }

      const txData = (mpData.point_of_interaction as { transaction_data?: Record<string, string> } | undefined)?.transaction_data;
      const qrCode = txData?.qr_code ?? null;
      const qrBase64 = txData?.qr_code_base64 ?? null;
      const mpPaymentId = mpData.id ? String(mpData.id) : null;

      await serviceClient
        .from('orders')
        .update({
          mp_payment_id: mpPaymentId,
          mp_pix_qr_code: qrCode,
          mp_pix_qr_base64: qrBase64,
          pix_expires_at: (mpData.date_of_expiration as string | undefined) || expiresAtIso,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      return jsonResponse({
        ok: true, mp_payment_id: mpPaymentId, qr_code: qrCode, qr_code_base64: qrBase64,
        status: String(mpData.status || 'pending'),
        payment_status: mapMpStatusToPaymentStatus(String(mpData.status || 'pending')),
      });
    }

    if (action === 'card') {
      if (!cardData || typeof cardData !== 'object') {
        return jsonResponse({ error: 'Dados do cartão não enviados.' }, 400);
      }

      const rawPayer = (cardData.payer as Record<string, unknown> | undefined) ?? {};
      const payload = {
        transaction_amount: orderTotal,
        description: `Pedido #${order.order_number} - ${storeName}`,
        token: cardData.token, issuer_id: cardData.issuer_id,
        payment_method_id: cardData.payment_method_id, installments: Number(cardData.installments) || 1,
        external_reference: order.id, notification_url: notificationUrl,
        payer: {
          ...rawPayer,
          email: (rawPayer.email as string | undefined) || (order.customer_email as string | null) || `pedido.${String(order.order_number).replace(/\W/g, '')}@veluna.nexusistemas.app.br`,
        },
      };

      const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `card-${order.id}-${Date.now()}`,
        },
        body: JSON.stringify(payload),
      });

      const mpData = (await mpRes.json()) as Record<string, unknown>;
      if (!mpRes.ok) {
        return jsonResponse({ error: String(mpData.message || 'Erro ao processar cartão no Mercado Pago.') }, 400);
      }

      const mpPaymentId = mpData.id ? String(mpData.id) : null;
      const paymentStatus = mapMpStatusToPaymentStatus(String(mpData.status || 'pending'));
      await updateOrderPaymentSafe(serviceClient, order, paymentStatus, { mp_payment_id: mpPaymentId });

      if (paymentStatus === 'approved' && order.payment_status !== 'approved') {
        await Promise.all([
          notifyOrderWhatsapp({ serviceClient, orderId: order.id, event: 'payment_approved' }).catch(() => {}),
          dispatchOrderEmails(serviceClient, { orderId: order.id, event: 'payment_approved' }).catch(() => {}),
        ]);
      }

      return jsonResponse({
        ok: true,
        mp_payment_id: mpPaymentId,
        status: String(mpData.status || 'pending'),
        status_detail: (mpData.status_detail as string | null) ?? null,
        payment_status: paymentStatus,
      });
    }

    if (action === 'preference') {
      const returnUrl = `https://veluna.nexusistemas.app.br/#/pedido/${order.id}?token=${encodeURIComponent(order.public_access_token)}`;
      const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              title: `Pedido #${order.order_number} - ${storeName}`,
              quantity: 1,
              currency_id: 'BRL',
              unit_price: orderTotal,
            },
          ],
          external_reference: order.id,
          notification_url: notificationUrl,
          back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
          auto_return: 'approved',
        }),
      });

      const prefData = (await prefRes.json()) as Record<string, unknown>;
      if (!prefRes.ok || !prefData.init_point) {
        return jsonResponse({ error: String(prefData.message || 'Erro ao criar link de pagamento.') }, 400);
      }
      return jsonResponse({ ok: true, init_point: String(prefData.init_point), preference_id: String(prefData.id ?? '') });
    }

    if (action === 'sync_status') {
      if (order.payment_status === 'approved' || !order.mp_payment_id) {
        return jsonResponse({ ok: true, payment_status: order.payment_status, order_status: order.status });
      }

      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(order.mp_payment_id)}`, {
        headers: { Authorization: `Bearer ${mpAccessToken}` },
      });
      if (!mpRes.ok) {
        return jsonResponse({ ok: true, payment_status: order.payment_status, order_status: order.status });
      }

      const mpData = (await mpRes.json()) as Record<string, unknown>;
      const paymentStatus = mapMpStatusToPaymentStatus(String(mpData.status || 'pending'));
      let orderStatus = String(order.status);

      if (paymentStatus !== order.payment_status) {
        orderStatus = await updateOrderPaymentSafe(serviceClient, order, paymentStatus);
        if (paymentStatus === 'approved') {
          await Promise.all([
            notifyOrderWhatsapp({ serviceClient, orderId: order.id, event: 'payment_approved' }).catch(() => {}),
            dispatchOrderEmails(serviceClient, { orderId: order.id, event: 'payment_approved' }).catch(() => {}),
          ]);
        } else if (paymentStatus === 'cancelled' && orderStatus === 'cancelled') {
          await dispatchOrderEmails(serviceClient, { orderId: order.id, event: 'pix_expired' }).catch(() => {});
        }
      }

      return jsonResponse({ ok: true, payment_status: paymentStatus, order_status: orderStatus, mp_status: String(mpData.status ?? '') });
    }

    return jsonResponse({ error: 'Ação inválida.' }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno ao processar pagamento.';
    return jsonResponse({ error: message }, 500);
  }
});
