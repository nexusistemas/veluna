import { RefreshCw, ScanBarcode, ShoppingBag } from 'lucide-react';
import BarcodeScannerModal from '../../components/admin/pos/BarcodeScannerModal';
import PosCheckoutDrawer from '../../components/admin/pos/PosCheckoutDrawer';
import PosProductPicker from '../../components/admin/pos/PosProductPicker';
import PosSaleSuccessModal from '../../components/admin/pos/PosSaleSuccessModal';
import { usePosController } from '../../components/admin/pos/usePosController';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { formatBRL } from '../../lib/formatters';

export default function PosPage() {
  const { settings } = useStoreSettings();
  const pos = usePosController();

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">Balcão Mobile</p>
          <h1 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
            <ScanBarcode className="h-5 w-5 text-brand" />
            PDV — Venda Presencial
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void pos.loadCatalog()}
          aria-label="Atualizar estoque do PDV"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:border-brand-200 hover:text-brand"
        >
          <RefreshCw className={`h-4 w-4 ${pos.loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      <PosProductPicker
        items={pos.catalog}
        loading={pos.loading}
        search={pos.search}
        onSearchChange={pos.setSearch}
        onExactBarcodeSubmit={pos.handleBarcodeLookup}
        cartQuantities={pos.cartQuantities}
        onAddItem={pos.handleAddItem}
        onOpenScanner={() => pos.setScannerOpen(true)}
        scanFeedback={pos.scanFeedback}
      />

      {pos.totalItemsCount > 0 && (
        <div className="fixed bottom-[68px] inset-x-3 z-30 md:bottom-5 md:left-auto md:right-6 md:w-96">
          <button
            type="button"
            onClick={() => pos.setDrawerOpen(true)}
            className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-2xl bg-brand px-5 text-sm font-extrabold text-white shadow-xl shadow-brand/30 transition hover:bg-brand-700 active:scale-[0.99]"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Fechar Venda • {pos.totalItemsCount} {pos.totalItemsCount === 1 ? 'item' : 'itens'}
            </span>
            <span>{formatBRL(pos.grandTotal)}</span>
          </button>
        </div>
      )}

      <BarcodeScannerModal
        open={pos.scannerOpen}
        onClose={() => pos.setScannerOpen(false)}
        onDetected={pos.handleBarcodeLookup}
      />

      <PosCheckoutDrawer
        open={pos.drawerOpen}
        onClose={() => pos.setDrawerOpen(false)}
        cartItems={pos.cart}
        onUpdateQty={pos.handleUpdateQty}
        onClearCart={pos.resetSaleForm}
        manualDiscountInput={pos.manualDiscountInput}
        onManualDiscountChange={pos.setManualDiscountInput}
        couponInput={pos.couponInput}
        onCouponInputChange={pos.setCouponInput}
        appliedCoupon={pos.appliedCoupon}
        couponMsg={pos.couponMsg}
        onApplyCoupon={() => void pos.handleApplyCoupon()}
        onRemoveCoupon={() => {
          pos.setAppliedCoupon(null);
          pos.setCouponMsg(null);
        }}
        customerName={pos.customerName}
        onCustomerNameChange={pos.setCustomerName}
        customerPhone={pos.customerPhone}
        onCustomerPhoneChange={pos.setCustomerPhone}
        notes={pos.notes}
        onNotesChange={pos.setNotes}
        paymentMethod={pos.paymentMethod}
        onPaymentMethodChange={pos.setPaymentMethod}
        subtotal={pos.subtotal}
        effectiveDiscount={pos.effectiveDiscount}
        total={pos.grandTotal}
        submitting={pos.submitting}
        errorMsg={pos.submitError}
        onSubmit={() => void pos.handleFinalizeSale()}
      />

      <PosSaleSuccessModal
        sale={pos.completedSale}
        storeName={settings.store_name}
        pickupAddress={settings.pickup_address}
        onNewSale={pos.handleNewSale}
      />
    </div>
  );
}
