import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  createServiceClient,
  mapMpStatusToPaymentStatus,
  updateOrderPaymentSafe,
} from '../_shared/mpHelpers.ts';
import { notifyOrderWhatsapp } from '../_shared/whatsappNotifier.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let body: Record<string, unknown> = {};
    if (req.method === 'POST') {
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        body = {};
      }
    }

    const dataObj = (body.data as Record<string, unknown> | undefined) ?? {};
    const paymentId = String(
      dataObj.id ??
        url.searchParams.get('data.id') ??
        url.searchParams.get('id') ??
        '',
    ).trim();

    if (!paymentId) {
      return jsonResponse({ received: true, ignored: true }, 200);
    }

    const serviceClient = createServiceClient();
    const { data: secrets } = await serviceClient
      .from('private_secrets')
      .select('mp_access_token')
      .eq('id', 1)
      .maybeSingle();

    const mpAccessToken = (secrets as { mp_access_token?: string | null } | null)?.mp_access_token?.trim();
    if (!mpAccessToken) {
      return jsonResponse({ received: true, skipped: 'mp_access_token_missing' }, 200);
    }

    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: `Bearer ${mpAccessToken}` } },
    );

    if (!mpRes.ok) {
      return jsonResponse({ received: true, mp_lookup_status: mpRes.status }, 200);
    }

    const mpData = (await mpRes.json()) as Record<string, unknown>;
    const externalRef = String(mpData.external_reference ?? '').trim();

    let order: { id: string; status: string; payment_status: string } | null = null;
    if (externalRef) {
      const { data } = await serviceClient
        .from('orders')
        .select('id, status, payment_status')
        .eq('id', externalRef)
        .maybeSingle();
      order = data as { id: string; status: string; payment_status: string } | null;
    }

    if (!order) {
      const { data } = await serviceClient
        .from('orders')
        .select('id, status, payment_status')
        .eq('mp_payment_id', paymentId)
        .maybeSingle();
      order = data as { id: string; status: string; payment_status: string } | null;
    }

    if (!order) {
      return jsonResponse({ received: true, order_found: false }, 200);
    }

    const nextPaymentStatus = mapMpStatusToPaymentStatus(String(mpData.status ?? 'pending'));
    const wasApproved = order.payment_status === 'approved';

    await updateOrderPaymentSafe(serviceClient, order, nextPaymentStatus, {
      mp_payment_id: paymentId,
    });

    if (nextPaymentStatus === 'approved' && !wasApproved) {
      await notifyOrderWhatsapp({
        serviceClient,
        orderId: order.id,
        event: 'payment_approved',
      }).catch(() => {});
    }

    return jsonResponse({ received: true, updated: true, payment_status: nextPaymentStatus }, 200);
  } catch (err) {
    console.error('mp-webhook error:', err);
    return jsonResponse({ received: true, error: 'handled' }, 200);
  }
});
