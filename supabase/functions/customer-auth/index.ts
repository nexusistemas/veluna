import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/mpHelpers.ts';

function onlyDigits(raw: string | undefined | null): string {
  return (raw ?? '').replace(/\D/g, '');
}

function buildInternalCpfEmail(cpfDigits: string): string {
  return `cpf.${cpfDigits}@clientes.veluna.internal`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as {
      action?: 'register_cpf' | 'resolve_cpf_login';
      full_name?: string;
      cpf?: string;
      whatsapp?: string;
      password?: string;
    };

    const action = body.action;
    const cpfDigits = onlyDigits(body.cpf);
    if (cpfDigits.length !== 11) {
      return jsonResponse({ ok: false, error: 'Informe um CPF válido com 11 números.' }, 400);
    }

    const serviceClient = createServiceClient();

    if (action === 'resolve_cpf_login') {
      const { data: profile } = await serviceClient
        .from('customer_profiles')
        .select('user_id')
        .eq('cpf', cpfDigits)
        .maybeSingle();

      if (profile?.user_id) {
        const { data: userRes } = await serviceClient.auth.admin.getUserById(String(profile.user_id));
        if (userRes?.user?.email) {
          return jsonResponse({ ok: true, login_email: userRes.user.email }, 200);
        }
      }
      return jsonResponse({ ok: true, login_email: buildInternalCpfEmail(cpfDigits) }, 200);
    }

    if (action === 'register_cpf') {
      const fullName = (body.full_name ?? '').trim();
      const password = body.password ?? '';
      const whatsappDigits = onlyDigits(body.whatsapp);

      if (fullName.length < 2) {
        return jsonResponse({ ok: false, error: 'Informe seu nome completo.' }, 400);
      }
      if (password.length < 6) {
        return jsonResponse({ ok: false, error: 'Crie uma senha com pelo menos 6 caracteres.' }, 400);
      }

      const { data: existingProfile } = await serviceClient
        .from('customer_profiles')
        .select('user_id')
        .eq('cpf', cpfDigits)
        .maybeSingle();

      if (existingProfile?.user_id) {
        return jsonResponse(
          {
            ok: false,
            error:
              'Já existe uma conta cadastrada com este CPF. Use a aba "Entrar com CPF" ou peça uma nova senha pelo WhatsApp.',
          },
          409,
        );
      }

      const internalEmail = buildInternalCpfEmail(cpfDigits);
      const { data: created, error: createErr } = await serviceClient.auth.admin.createUser({
        email: internalEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          cpf: cpfDigits,
          auth_type: 'cpf',
        },
      });

      if (createErr || !created?.user?.id) {
        const msg = createErr?.message?.toLowerCase() ?? '';
        if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
          return jsonResponse(
            {
              ok: false,
              error: 'Este CPF já possui cadastro. Faça login na aba "Entrar com CPF".',
            },
            409,
          );
        }
        return jsonResponse(
          { ok: false, error: createErr?.message || 'Não foi possível criar sua conta agora.' },
          400,
        );
      }

      const userId = created.user.id;
      await serviceClient.from('customer_profiles').upsert(
        {
          user_id: userId,
          full_name: fullName,
          email: '',
          whatsapp: whatsappDigits,
          cpf: cpfDigits,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

      return jsonResponse({ ok: true, login_email: internalEmail, user_id: userId }, 200);
    }

    return jsonResponse({ ok: false, error: 'Ação inválida.' }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno no serviço de conta.';
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
