import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  KeyRound,
  Loader2,
  MessageCircle,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import CustomerEditModal from '../../components/admin/customers/CustomerEditModal';
import CustomerResetPasswordModal from '../../components/admin/customers/CustomerResetPasswordModal';
import { formatBRL, formatPhoneBR, onlyDigits } from '../../lib/formatters';
import { formatCpfBR } from '../../services/customerAuthService';
import {
  deleteCustomerAdmin,
  listCustomersAdmin,
  type AdminCustomerRecord,
} from '../../services/customersAdminService';
import { buildStoreToCustomerWaUrl } from '../../services/whatsappService';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AdminCustomerRecord | null>(null);
  const [resetting, setResetting] = useState<AdminCustomerRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await listCustomersAdmin();
      setCustomers(list);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = onlyDigits(search);
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (digits && (onlyDigits(c.cpf).includes(digits) || onlyDigits(c.whatsapp).includes(digits))),
    );
  }, [customers, search]);

  const handleDelete = async (customer: AdminCustomerRecord) => {
    const ok = window.confirm(
      `Excluir a conta de "${customer.full_name || 'esta cliente'}"? O histórico financeiro de pedidos já realizados será preservado.`,
    );
    if (!ok) return;
    setDeletingId(customer.user_id);
    setErrorMsg(null);
    try {
      await deleteCustomerAdmin(customer.user_id);
      await loadCustomers();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Não foi possível excluir a cliente.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-sm">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900">Clientes Cadastrados</h1>
            <p className="text-xs text-stone-500">
              Gerencie contas (Google e CPF/Senha), edite dados, redefina senhas ou exclua cadastros
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadCustomers()}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-4 text-xs font-semibold text-stone-700 hover:border-brand hover:text-brand"
        >
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, CPF, WhatsApp ou e-mail..."
          className="h-12 w-full rounded-2xl border border-stone-200 bg-white pl-10 pr-4 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      {errorMsg && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-brand">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">
          Nenhum cliente encontrado.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((customer) => {
            const waLink = customer.whatsapp
              ? buildStoreToCustomerWaUrl(customer.whatsapp, `Olá ${customer.full_name || ''}! `)
              : '';
            return (
              <article key={customer.user_id} className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-extrabold text-stone-900">
                        {customer.full_name || 'Sem nome'}
                      </h2>
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-brand">
                        {customer.auth_provider === 'google' ? 'Google' : 'CPF e Senha'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-stone-500">
                      {customer.cpf && <span>CPF: {formatCpfBR(customer.cpf)}</span>}
                      {customer.whatsapp && <span>WhatsApp: {formatPhoneBR(customer.whatsapp)}</span>}
                      {customer.email && <span>{customer.email}</span>}
                    </div>
                    {(customer.street || customer.city) && (
                      <p className="mt-1 text-xs text-stone-500">
                        {[customer.street, customer.number, customer.neighborhood, customer.city, customer.state]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-stone-900">
                      {customer.orders_count} {customer.orders_count === 1 ? 'pedido' : 'pedidos'}
                    </p>
                    <p className="text-xs font-semibold text-brand">{formatBRL(customer.total_spent)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditing(customer)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 text-xs font-semibold text-stone-700 hover:border-brand hover:text-brand"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetting(customer)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 text-xs font-bold text-brand hover:bg-brand-100"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Nova Senha
                  </button>
                  {waLink && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={deletingId === customer.user_id}
                    onClick={() => void handleDelete(customer)}
                    className="ml-auto inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    {deletingId === customer.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Excluir
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <CustomerEditModal customer={editing} onClose={() => setEditing(null)} onSaved={loadCustomers} />
      )}
      {resetting && (
        <CustomerResetPasswordModal customer={resetting} onClose={() => setResetting(null)} />
      )}
    </div>
  );
}
