import { MapPin } from 'lucide-react';
import { formatBRL } from '../../lib/formatters';
import type { PublicOrderStatusResult } from '../../types/database';
import PickupLocationCard from './PickupLocationCard';

interface OrderReceiptDetailsCardProps {
  receipt: PublicOrderStatusResult;
  pickupAddress: string | null;
  pickupInstructions?: string | null;
  storeLat?: number | null;
  storeLng?: number | null;
}

export default function OrderReceiptDetailsCard({
  receipt,
  pickupAddress,
  pickupInstructions,
  storeLat,
  storeLng,
}: OrderReceiptDetailsCardProps) {
  return (
    <>
      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-stone-900">Itens do Pedido</h2>
        <div className="space-y-2 text-xs text-stone-700">
          {receipt.items.map((item, idx) => (
            <div
              key={`${item.product_name}-${idx}`}
              className="flex justify-between gap-2 border-b border-stone-100 pb-2"
            >
              <span>
                <strong>{item.quantity}x</strong> {item.product_name}
                {item.variant_name ? ` (${item.variant_name})` : ''}
              </span>
              <span className="shrink-0 font-semibold">{formatBRL(item.line_total)}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1 text-xs text-stone-600 pt-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatBRL(receipt.subtotal)}</span>
          </div>
          {receipt.discount_amount > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Desconto</span>
              <span>-{formatBRL(receipt.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Frete</span>
            <span>{receipt.shipping_fee === 0 ? 'Grátis' : formatBRL(receipt.shipping_fee)}</span>
          </div>
          <div className="flex justify-between pt-2 text-base font-extrabold text-stone-900">
            <span>Total</span>
            <span className="text-brand">{formatBRL(receipt.total)}</span>
          </div>
        </div>
      </section>

      {receipt.fulfillment_type === 'pickup' ? (
        <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
          <PickupLocationCard
            title="Retirada na Loja"
            pickupAddress={pickupAddress}
            pickupInstructions={pickupInstructions}
            storeLat={storeLat}
            storeLng={storeLng}
          />
        </section>
      ) : (
        <section className="rounded-3xl border border-stone-200 bg-white p-4 text-xs text-stone-600 shadow-sm space-y-1">
          <p className="flex items-center gap-1.5 font-bold text-stone-900">
            <MapPin className="h-4 w-4 text-brand" />
            Endereço de Entrega
          </p>
          <p>{receipt.shipping_address || 'Endereço registrado no pedido.'}</p>
        </section>
      )}
    </>
  );
}
