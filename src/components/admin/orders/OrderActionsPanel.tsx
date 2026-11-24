import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, MessageCircle, Trash2 } from 'lucide-react';
import { onlyDigits } from '../../../lib/formatters';
import {
  approveOrderPaymentManuallyAdmin,
  deleteOrderPermanentlyAdmin,
  updateOrderStatusAdmin,
  type AdminOrderWithItems,
} from '../../../services/ordersAdminService';
import {
  buildOrderReceiptText,
  buildOrderStatusUpdateText,
  buildStoreToCustomerWaUrl,
} from '../../../services/whatsappService';
import type { OrderStatus } from '../../../types/database';

interface OrderActionsPanelProps {
  order: AdminOrderWithItems;
  storeName: string;
  pickupAddress: string | null;
  onOrderUpdated: () => void;
  onOrderDeleted: () => void;
  onError: (message: string | null) => void;
}

const STATUS_ACTIONS: Array<{ value: OrderStatus; label: string }> = [
  { value: 'pending_payment', label: 'Aguardando Pagamento' },
  { value: 'paid', label: 'Pago' },
  { value: 'preparing', label: 'Separando' },
  { value: 'ready_for_pickup', label: 'Pronto p/ Retirada' },
  { value: 'out_for_delivery', label: 'Saiu p/ Entrega' },
  { value: 'completed', label: 'Concluído' },
];

export default function OrderActionsPanel({
  order,
  storeName,
  pickupAddress,
  onOrderUpdated,
  onOrderDeleted,
  onError,
}: OrderActionsPanelProps) {
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hasPhone = onlyDigits(order.customer_phone ?? '').length >= 10;

  const receiptWaUrl = hasPhone
    ? buildStoreToCustomerWaUrl(
        order.customer_phone ?? '',
        buildOrderReceiptText({
          storeName, orderNumber: order.order_number, customerName: order.customer_name,
          items: order.order_items, subtotal: order.subtotal, discountAmount: order.discount_amount,
          shippingFee: order.shipping_fee, total: order.total, fulfillmentType: order.fulfillment_type,
          shippingAddress: order.shipping_address, pickupAddress,
          paymentMethod: order.payment_method, paymentStatus: order.payment_status, notes: order.notes,
        }),
      )
    : '';

  const statusWaUrl = hasPhone
    ? buildStoreToCustomerWaUrl(
        order.customer_phone ?? '',
        buildOrderStatusUpdateText({
          storeName, orderNumber: order.order_number, customerName: order.customer_name,
          status: order.status, fulfillmentType: order.fulfillment_type, pickupAddress,
        }),
      )
    : '';

  const handleApproveManual = async () => {
    setBusy(true);
    onError(null);
    try {
      await approveOrderPaymentManuallyAdmin(order.id);
      onOrderUpdated();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao confirmar recebimento.');
    } finally {
      setBusy(false);
    }
  };

  const handleChangeStatus = async (nextStatus: OrderStatus) => {
    setBusy(true);
    onError(null);
    try {
      await updateOrderStatusAdmin(order.id, nextStatus);
      setConfirmCancel(false);
      onOrderUpdated();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao atualizar status do pedido.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePermanent = async () => {
    setBusy(true);
    onError(null);
    try {
      await deleteOrderPermanentlyAdmin(order.id);
      onOrderDeleted();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao excluir pedido definitivamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5">
      {order.payment_status === 'pending' && order.status !== 'cancelled' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleApproveManual()}
          className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Confirmar Recebimento Manual
        </button>
      )}

      {order.status !== 'cancelled' && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-stone-800">Atualizar Status do Pedido</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STATUS_ACTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={busy || order.status === opt.value}
                onClick={() => void handleChangeStatus(opt.value)}
                className={`min-h-[44px] rounded-xl border px-2.5 text-xs font-bold transition ${
                  order.status === opt.value
                    ? 'border-brand bg-brand text-white'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-brand-200 hover:text-brand'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1">
        {hasPhone ? (
          <>
            <a
              href={receiptWaUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              Enviar Comprovante Completo
            </a>
            <a
              href={statusWaUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              Avisar Status Atual
            </a>
          </>
        ) : (
          <p className="col-span-full text-center text-xs text-stone-500">
            Pedido sem WhatsApp cadastrado para envio direto.
          </p>
        )}
      </div>

      {order.status !== 'cancelled' && (
        <div className="border-t border-stone-100 pt-3">
          {!confirmCancel ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmCancel(true)}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              <AlertTriangle className="h-4 w-4" />
              Cancelar Pedido (Devolver Estoque)
            </button>
          ) : (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3 space-y-2 text-center">
              <p className="text-xs font-bold text-rose-900">
                Confirmar cancelamento? O banco devolverá o estoque automaticamente.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  className="min-h-[44px] flex-1 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleChangeStatus('cancelled')}
                  className="min-h-[44px] flex-1 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700"
                >
                  Sim, Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="border-t border-stone-100 pt-3">
        {!confirmDelete ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-rose-300 bg-white px-4 text-xs font-bold text-rose-700 hover:bg-rose-50"
          >
            <Trash2 className="h-4 w-4" /> Excluir Pedido Definitivamente
          </button>
        ) : (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3 space-y-2 text-center">
            <p className="text-xs font-bold text-rose-900">
              Excluir o Pedido #{order.order_number} para sempre? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="min-h-[44px] flex-1 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700">
                Voltar
              </button>
              <button type="button" disabled={busy} onClick={() => void handleDeletePermanent()} className="min-h-[44px] flex-1 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700">
                Sim, Excluir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
