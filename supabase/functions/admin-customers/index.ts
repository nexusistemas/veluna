import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient, isRequestAdmin } from '../_shared/mpHelpers.ts';

function onlyDigits(raw: string | undefined | null): string {
  return (raw ?? '').replace(/\D/g, '');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceClient = createServiceClient();
    const adminOk = await isRequestAdmin(req, serviceClient);
    if (!adminOk) {
      return jsonResponse({ ok: false, error: 'Acesso restrito a administradoras.' }, 401);
    }

    const body = (await req.json()) as {
      action?: 'list' | 'update' | 'reset_password' | 'delete';
      user_id?: string;
      new_password?: string;
      profile?: Record<string, string | undefined>;
    };

    const action = body.action;

    if (action === 'list') {
      const [profilesRes, ordersRes, adminUsersRes, authListRes] = await Promise.all([
        serviceClient.from('customer_profiles').select('*').order('created_at', { ascending: false }),
        serviceClient.from('orders').select('customer_user_id, total, status, created_at').not('customer_user_id', 'is', null),
        serviceClient.from('admin_users').select('user_id'),
        serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ]);

      if (profilesRes.error) {
        return jsonResponse({ ok: false, error: profilesRes.error.message }, 500);
      }

      const adminIds = new Set((adminUsersRes.data ?? []).map((a) => String(a.user_id)));
      const authMap = new Map<string, { email: string; provider: string; last_sign_in_at: string | null }>();
      for (const u of authListRes.data?.users ?? []) {
        const provider =
          String(u.app_metadata?.provider ?? '') ||
          (u.email?.endsWith('@clientes.veluna.internal') ? 'cpf' : 'email');
        authMap.set(u.id, {
          email: u.email ?? '',
          provider: u.email?.endsWith('@clientes.veluna.internal') ? 'cpf' : provider,
          last_sign_in_at: u.last_sign_in_at ?? null,
        });
      }

      const statsMap = new Map<string, { orders_count: number; total_spent: number; last_order_at: string | null }>();
      for (const ord of ordersRes.data ?? []) {
        const uid = String(ord.customer_user_id ?? '');
        if (!uid) continue;
        const cur = statsMap.get(uid) ?? { orders_count: 0, total_spent: 0, last_order_at: null };
        cur.orders_count += 1;
        if (ord.status !== 'cancelled') {
          cur.total_spent += Number(ord.total) || 0;
        }
        if (!cur.last_order_at || String(ord.created_at) > cur.last_order_at) {
          cur.last_order_at = String(ord.created_at);
        }
        statsMap.set(uid, cur);
      }

      const customers = (profilesRes.data ?? [])
        .filter((p) => !adminIds.has(String(p.user_id)))
        .map((p) => {
          const uid = String(p.user_id);
          const authInfo = authMap.get(uid);
          const stats = statsMap.get(uid) ?? { orders_count: 0, total_spent: 0, last_order_at: null };
          const visibleEmail =
            p.email && !String(p.email).endsWith('@clientes.veluna.internal')
              ? String(p.email)
              : authInfo?.email && !authInfo.email.endsWith('@clientes.veluna.internal')
                ? authInfo.email
                : '';

          return {
            ...p,
            email: visibleEmail,
            auth_provider: authInfo?.provider ?? 'cpf',
            last_sign_in_at: authInfo?.last_sign_in_at ?? null,
            orders_count: stats.orders_count,
            total_spent: Math.round(stats.total_spent * 100) / 100,
            last_order_at: stats.last_order_at,
          };
        });

      return jsonResponse({ ok: true, customers }, 200);
    }

    const userId = String(body.user_id ?? '').trim();
    if (!userId) {
      return jsonResponse({ ok: false, error: 'user_id é obrigatório.' }, 400);
    }

    const { data: targetAdmin } = await serviceClient
      .from('admin_users')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (targetAdmin?.id) {
      return jsonResponse({ ok: false, error: 'Não é permitido alterar ou excluir uma conta administradora por aqui.' }, 403);
    }

    if (action === 'update') {
      const p = body.profile ?? {};
      const cpfDigits = onlyDigits(p.cpf);
      const whatsappDigits = onlyDigits(p.whatsapp);
      const fullName = (p.full_name ?? '').trim();
      if (fullName.length < 2) {
        return jsonResponse({ ok: false, error: 'Informe um nome válido para o cliente.' }, 400);
      }

      const { error: updErr } = await serviceClient
        .from('customer_profiles')
        .update({
          full_name: fullName,
          email: (p.email ?? '').trim(),
          whatsapp: whatsappDigits,
          cpf: cpfDigits,
          cep: onlyDigits(p.cep).slice(0, 8),
          street: (p.street ?? '').trim(),
          number: (p.number ?? '').trim(),
          complement: (p.complement ?? '').trim(),
          neighborhood: (p.neighborhood ?? '').trim(),
          city: (p.city ?? '').trim(),
          state: (p.state ?? '').trim().toUpperCase().slice(0, 2),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updErr) return jsonResponse({ ok: false, error: updErr.message }, 400);

      await serviceClient.auth.admin
        .updateUserById(userId, { user_metadata: { full_name: fullName, cpf: cpfDigits } })
        .catch(() => {});

      return jsonResponse({ ok: true }, 200);
    }

    if (action === 'reset_password') {
      const newPassword = body.new_password ?? '';
      if (newPassword.length < 6) {
        return jsonResponse({ ok: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' }, 400);
      }

      const { error: passErr } = await serviceClient.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
      if (passErr) {
        return jsonResponse({ ok: false, error: passErr.message }, 400);
      }
      return jsonResponse({ ok: true }, 200);
    }

    if (action === 'delete') {
      const { error: delErr } = await serviceClient.auth.admin.deleteUser(userId);
      if (delErr) {
        return jsonResponse({ ok: false, error: delErr.message }, 400);
      }
      return jsonResponse({ ok: true }, 200);
    }

    return jsonResponse({ ok: false, error: 'Ação inválida.' }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno ao gerenciar clientes.';
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
