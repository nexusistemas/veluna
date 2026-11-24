import { onlyDigits } from '../lib/formatters';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { buildCustomerToStoreWaUrl } from './whatsappService';

export function formatCpfBR(raw: string): string {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function isInternalCpfEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase().endsWith('@clientes.veluna.internal'));
}

export function formatAccountIdentifier(email?: string | null, cpf?: string | null): string {
  const cleanCpf = onlyDigits(cpf ?? '');
  if (email && !isInternalCpfEmail(email)) return email;
  if (cleanCpf.length === 11) return `CPF ${formatCpfBR(cleanCpf)}`;
  if (email && isInternalCpfEmail(email)) {
    const match = /^cpf\.(\d{11})@/.exec(email.toLowerCase());
    if (match) return `CPF ${formatCpfBR(match[1])}`;
  }
  return 'Sua conta Veluna';
}

async function extractFnError(error: unknown, fallback: string): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = (await ctx.json()) as { error?: string; message?: string } | null;
        if (body?.error) return body.error;
        if (body?.message) return body.message;
      } catch {
        // Ignora parse
      }
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function registerCustomerWithCpf(params: {
  fullName: string;
  cpf: string;
  whatsapp: string;
  password: string;
}): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: 'Supabase não configurado.' };

  const cpfDigits = onlyDigits(params.cpf);
  if (params.fullName.trim().length < 2) return { error: 'Informe seu nome completo.' };
  if (cpfDigits.length !== 11) return { error: 'Informe um CPF válido com 11 números.' };
  if (params.password.length < 6) return { error: 'A senha deve ter pelo menos 6 caracteres.' };

  const { data, error } = await supabase.functions.invoke('customer-auth', {
    body: {
      action: 'register_cpf',
      full_name: params.fullName.trim(),
      cpf: cpfDigits,
      whatsapp: onlyDigits(params.whatsapp),
      password: params.password,
    },
  });

  if (error) {
    return { error: await extractFnError(error, 'Não foi possível criar sua conta agora.') };
  }
  const parsed = data as { ok?: boolean; login_email?: string; error?: string } | null;
  if (!parsed?.ok || !parsed.login_email) {
    return { error: parsed?.error || 'Não foi possível criar sua conta.' };
  }

  const signInRes = await supabase.auth.signInWithPassword({
    email: parsed.login_email,
    password: params.password,
  });
  if (signInRes.error) {
    return { error: 'Conta criada! Agora entre usando seu CPF e senha.' };
  }
  return { error: null };
}

export async function loginCustomerWithCpf(
  cpf: string,
  password: string,
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) return { error: 'Supabase não configurado.' };
  const cpfDigits = onlyDigits(cpf);
  if (cpfDigits.length !== 11) return { error: 'Informe um CPF válido com 11 números.' };
  if (!password) return { error: 'Informe sua senha.' };

  let loginEmail = `cpf.${cpfDigits}@clientes.veluna.internal`;
  try {
    const { data } = await supabase.functions.invoke('customer-auth', {
      body: { action: 'resolve_cpf_login', cpf: cpfDigits },
    });
    const parsed = data as { ok?: boolean; login_email?: string } | null;
    if (parsed?.ok && parsed.login_email) loginEmail = parsed.login_email;
  } catch {
    // Usa fallback determinístico
  }

  const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
  if (error) {
    return {
      error:
        'CPF ou senha incorretos. Se entrou antes pelo Google, use o botão Google — ou peça uma nova senha no WhatsApp abaixo.',
    };
  }
  return { error: null };
}

export function buildForgotPasswordWhatsappUrl(params: {
  storeWhatsapp: string | null;
  storeName: string;
  cpf?: string;
  fullName?: string;
}): string {
  const digits = onlyDigits(params.storeWhatsapp ?? '');
  if (!digits) return '';
  const cpfFormatted = onlyDigits(params.cpf ?? '').length === 11 ? formatCpfBR(params.cpf ?? '') : '(meu CPF)';
  const namePart = params.fullName?.trim() ? `Meu nome é ${params.fullName.trim()} e ` : '';
  const msg = `Olá! Esqueci a senha da minha conta na *${params.storeName}*. ${namePart}meu CPF é *${cpfFormatted}*. Pode redefinir minha senha, por favor?`;
  return buildCustomerToStoreWaUrl(digits, msg);
}
