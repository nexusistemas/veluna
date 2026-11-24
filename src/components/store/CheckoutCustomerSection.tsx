import { formatPhoneBR } from '../../lib/formatters';

export interface CheckoutCustomerFields {
  name: string;
  phone: string;
  email: string;
  cpf: string;
  notes: string;
}

interface CheckoutCustomerSectionProps {
  customer: CheckoutCustomerFields;
  onChange: (patch: Partial<CheckoutCustomerFields>) => void;
}

const INPUT_CLS =
  'mt-1 h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm focus:border-brand focus:bg-white focus:outline-none';

export default function CheckoutCustomerSection({
  customer,
  onChange,
}: CheckoutCustomerSectionProps) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm space-y-3">
      <h2 className="text-base font-bold text-stone-900">Seus Dados</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-stone-700">Nome Completo *</label>
          <input
            type="text"
            required
            value={customer.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Como podemos te chamar?"
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-700">WhatsApp *</label>
          <input
            type="tel"
            required
            inputMode="tel"
            value={customer.phone}
            onChange={(e) => onChange({ phone: formatPhoneBR(e.target.value) })}
            placeholder="(00) 00000-0000"
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-700">E-mail (opcional)</label>
          <input
            type="email"
            value={customer.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="voce@email.com"
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-700">CPF (opcional)</label>
          <input
            type="text"
            inputMode="numeric"
            value={customer.cpf}
            onChange={(e) => onChange({ cpf: e.target.value })}
            placeholder="000.000.000-00"
            className={INPUT_CLS}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-stone-700">Observações (opcional)</label>
        <input
          type="text"
          value={customer.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Ex: Embalar para presente, deixar na portaria..."
          className={INPUT_CLS}
        />
      </div>
    </section>
  );
}
