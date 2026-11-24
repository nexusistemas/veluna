import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import {
  buildAdminOrderEmailHtml,
  buildCustomerOrderEmailHtml,
  buildTestEmailHtml,
  type EmailOrderItemRow,
  type EmailOrderRow,
  type EmailStoreSettingsRow,
  type OrderEmailEvent,
} from './emailTemplates.ts';

const DEFAULT_ORIGIN = 'https://veluna.nexusistemas.app.br';
const DEFAULT_FROM = 'Veluna Cosméticos <pedidos@veluna.nexusistemas.app.br>';

interface PrivateEmailSecrets {
  email_admin_enabled?: boolean | null;
  email_customer_enabled?: boolean | null;
  admin_notification_email?: string | null;
  resend_from_email?: string | null;
  resend_api_key?: string | null;
}

export interface DispatchOrderEmailsParams {
  orderId: string;
  event: OrderEmailEvent;
  siteOrigin?: string;
}

export interface DispatchOrderEmailsResult {
  ok: boolean;
  skipped?: boolean;
  sentAdmin?: boolean;
  sentCustomer?: boolean;
  message: string;
}

function isRealEmail(email: string | null | undefined): boolean {
  const clean = (email ?? '').trim().toLowerCase();
  return clean.includes('@') && !clean.endsWith('@clientes.veluna.internal');
}

async function sendResendEmail(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; detail: string }> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let parsedMsg = errText.slice(0, 220);
    try {
      const json = JSON.parse(errText) as { message?: string; error?: string };
      parsedMsg = json.message || json.error || parsedMsg;
    } catch {
      // Mantém texto bruto
    }
    return { ok: false, detail: `Resend HTTP ${res.status}: ${parsedMsg}` };
  }
  return { ok: true, detail: 'Enviado com sucesso.' };
}

async function loadConfig(supabaseAdmin: SupabaseClient): Promise<{
  settings: EmailStoreSettingsRow;
  secrets: PrivateEmailSecrets | null;
}> {
  const [settingsRes, secretsRes] = await Promise.all([
    supabaseAdmin
      .from('store_settings')
      .select('store_name, pickup_address, pickup_instructions')
      .eq('id', 1)
      .maybeSingle(),
    supabaseAdmin
      .from('private_secrets')
      .select(
        'email_admin_enabled, email_customer_enabled, admin_notification_email, resend_from_email, resend_api_key',
      )
      .eq('id', 1)
      .maybeSingle(),
  ]);

  return {
    settings: (settingsRes.data as EmailStoreSettingsRow | null) ?? {},
    secrets: (secretsRes.data as PrivateEmailSecrets | null) ?? null,
  };
}

export async function sendTestResendEmail(
  supabaseAdmin: SupabaseClient,
  targetEmail: string,
  siteOrigin?: string,
): Promise<{ ok: boolean; message: string }> {
  const cleanTarget = targetEmail.trim();
  if (!isRealEmail(cleanTarget)) {
    return { ok: false, message: 'Informe um endereço de e-mail válido para teste.' };
  }

  const { settings, secrets } = await loadConfig(supabaseAdmin);
  const apiKey = secrets?.resend_api_key?.trim() ?? '';
  if (!apiKey) {
    return { ok: false, message: 'Salve a Resend API Key antes de enviar o teste.' };
  }

  const from = secrets?.resend_from_email?.trim() || DEFAULT_FROM;
  const origin = siteOrigin?.trim() || DEFAULT_ORIGIN;
  const storeName = settings.store_name || 'Veluna Cosméticos';
  const { subject, html } = buildTestEmailHtml(storeName, origin);

  const sent = await sendResendEmail({ apiKey, from, to: cleanTarget, subject, html });
  return {
    ok: sent.ok,
    message: sent.ok ? `E-mail de teste enviado para ${cleanTarget}!` : sent.detail,
  };
}

export async function dispatchOrderEmails(
  supabaseAdmin: SupabaseClient,
  params: DispatchOrderEmailsParams,
): Promise<DispatchOrderEmailsResult> {
  const { settings, secrets } = await loadConfig(supabaseAdmin);
  const apiKey = secrets?.resend_api_key?.trim() ?? '';
  if (!apiKey) {
    return { ok: true, skipped: true, message: 'Resend API Key não configurada.' };
  }

  const [orderRes, itemsRes] = await Promise.all([
    supabaseAdmin.from('orders').select('*').eq('id', params.orderId).maybeSingle(),
    supabaseAdmin.from('order_items').select('*').eq('order_id', params.orderId),
  ]);

  const order = orderRes.data as EmailOrderRow | null;
  if (!order) {
    return { ok: false, message: 'Pedido não encontrado para envio de e-mail.' };
  }

  const items = (itemsRes.data ?? []) as EmailOrderItemRow[];
  const from = secrets?.resend_from_email?.trim() || DEFAULT_FROM;
  const origin = params.siteOrigin?.trim() || DEFAULT_ORIGIN;
  const storeName = settings.store_name || 'Veluna Cosméticos';

  let customerEmail = (order.customer_email ?? '').trim();
  if (!isRealEmail(customerEmail) && order.customer_user_id) {
    try {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(order.customer_user_id);
      if (isRealEmail(userData?.user?.email)) {
        customerEmail = String(userData.user.email).trim();
      }
    } catch {
      // Ignora erro ao consultar usuário
    }
  }

  let sentAdmin = false;
  let sentCustomer = false;
  const errors: string[] = [];

  const adminEmail = (secrets?.admin_notification_email ?? '').trim();
  const shouldNotifyAdmin =
    secrets?.email_admin_enabled === true &&
    isRealEmail(adminEmail) &&
    order.channel === 'online' &&
    (params.event === 'order_created' || params.event === 'payment_approved');

  if (shouldNotifyAdmin) {
    const adminMail = buildAdminOrderEmailHtml(order, items, storeName, params.event, origin);
    const res = await sendResendEmail({
      apiKey,
      from,
      to: adminEmail,
      subject: adminMail.subject,
      html: adminMail.html,
    });
    if (res.ok) sentAdmin = true;
    else errors.push(`Admin: ${res.detail}`);
  }

  const shouldNotifyCustomer =
    secrets?.email_customer_enabled === true && isRealEmail(customerEmail);

  if (shouldNotifyCustomer) {
    const custMail = buildCustomerOrderEmailHtml(order, items, settings, params.event, origin);
    const res = await sendResendEmail({
      apiKey,
      from,
      to: customerEmail,
      subject: custMail.subject,
      html: custMail.html,
    });
    if (res.ok) sentCustomer = true;
    else errors.push(`Cliente: ${res.detail}`);
  }

  if (!shouldNotifyAdmin && !shouldNotifyCustomer) {
    return { ok: true, skipped: true, message: 'Nenhum destinatário habilitado para este evento.' };
  }

  return {
    ok: errors.length === 0 || sentAdmin || sentCustomer,
    sentAdmin,
    sentCustomer,
    message: errors.length > 0 ? errors.join(' | ') : 'E-mails processados com sucesso.',
  };
}
