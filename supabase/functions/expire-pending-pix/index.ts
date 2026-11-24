import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { dispatchOrderEmails } from '../_shared/emailNotifier.ts';
import {
  createServiceClient,
  mapMpStatusToPaymentStatus,
  updateOrderPaymentSafe,
} from '../_shared/mpHelpers.ts';
import { notifyOrderWhatsapp } from '../_shared/whatsappNotifier.ts';

const PIX_TTL_MS = 30 * 60 * 1000;

interface PendingPixOrder {
  id: string;
  order_number: number;
  status: string;
  payment_status: string;
  mp_payment_id: string | null;
  pix_expires_at: string | null;
  created_at: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceClient = createServiceClient();
    const nowMs = Date.now();

    const [{ data: pendingOrders, error }, { data: secrets }] = await Promise.all([
      serviceClient
        .from('orders')
        .select('id, order_number, status, payment_status, mp_payment_id, pix_expires_at, created_at')
        .in('status', ['pending', 'pending_payment'])
        .eq('payment_status', 'pending')
        .in('payment_method', ['pix_mp', 'pos_pix_mp'])
        .order('created_at', { ascending: true })
        .limit(25),
      serviceClient.from('private_secrets').select('mp_access_token').eq('id', 1).maybeSingle(),
    ]);

    if (error) {
      return jsonResponse({ ok: false, error: error.message }, 500);
    }

    const mpAccessToken = (secrets as { mp_access_token?: string | null } | null)?.mp_access_token?.trim() ?? '';
    const candidates = ((pendingOrders ?? []) as PendingPixOrder[]).filter((ord) => {
      const expMs = ord.pix_expires_at
        ? new Date(ord.pix_expires_at).getTime()
        : new Date(ord.created_at).getTime() + PIX_TTL_MS;
      return Number.isFinite(expMs) && expMs <= nowMs;
    });

    let cancelledCount = 0;
    let approvedCount = 0;

    for (const order of candidates) {
      let mpStatus: string | null = null;
      if (order.mp_payment_id && mpAccessToken) {
        try {
          const mpRes = await fetch(
            `https://api.mercadopago.com/v1/payments/${encodeURIComponent(order.mp_payment_id)}`,
            { headers: { Authorization: `Bearer ${mpAccessToken}` } },
          );
          if (mpRes.ok) {
            const mpData = (await mpRes.json()) as { status?: string };
            mpStatus = mpData.status ?? null;
          }
        } catch {
          // Segue com expiração local se consulta ao MP oscilar
        }
      }

      const mapped = mapMpStatusToPaymentStatus(mpStatus);
      if (mapped === 'approved') {
        await updateOrderPaymentSafe(serviceClient, order, 'approved');
        await Promise.all([
          notifyOrderWhatsapp({ serviceClient, orderId: order.id, event: 'payment_approved' }).catch(() => {}),
          dispatchOrderEmails(serviceClient, { orderId: order.id, event: 'payment_approved' }).catch(() => {}),
        ]);
        approvedCount += 1;
        continue;
      }

      if (order.mp_payment_id && mpAccessToken && mapped === 'pending') {
        await fetch(
          `https://api.mercadopago.com/v1/payments/${encodeURIComponent(order.mp_payment_id)}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${mpAccessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'cancelled' }),
          },
        ).catch(() => {});
      }

      const { data: updatedRows } = await serviceClient
        .from('orders')
        .update({
          status: 'cancelled',
          payment_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .in('status', ['pending', 'pending_payment'])
        .select('id');

      if (updatedRows && updatedRows.length > 0) {
        cancelledCount += 1;
        await dispatchOrderEmails(serviceClient, { orderId: order.id, event: 'pix_expired' }).catch(() => {});
      }
    }

    return jsonResponse(
      { ok: true, checked: candidates.length, cancelled: cancelledCount, approved: approvedCount },
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao verificar Pix expirados.';
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
