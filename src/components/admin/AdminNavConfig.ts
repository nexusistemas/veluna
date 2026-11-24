import {
  FolderTree,
  Image,
  LayoutDashboard,
  Package,
  ScanBarcode,
  Settings,
  ShoppingBag,
  TicketPercent,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type AdminModuleKey =
  | 'pdv'
  | 'produtos'
  | 'clientes'
  | 'categorias'
  | 'banners'
  | 'cupons'
  | 'entrega'
  | 'pedidos'
  | 'configuracoes';

export interface AdminNavItem {
  id: 'inicio' | AdminModuleKey;
  label: string;
  to: string;
  icon: LucideIcon;
  primaryMobile: boolean;
  end?: boolean;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: 'inicio', label: 'Início', to: '/painel', icon: LayoutDashboard, primaryMobile: true, end: true },
  { id: 'pdv', label: 'PDV', to: '/painel/pdv', icon: ScanBarcode, primaryMobile: true },
  { id: 'produtos', label: 'Produtos', to: '/painel/produtos', icon: Package, primaryMobile: true },
  { id: 'pedidos', label: 'Pedidos', to: '/painel/pedidos', icon: ShoppingBag, primaryMobile: true },
  { id: 'clientes', label: 'Clientes', to: '/painel/clientes', icon: Users, primaryMobile: false },
  { id: 'categorias', label: 'Categorias', to: '/painel/categorias', icon: FolderTree, primaryMobile: false },
  { id: 'banners', label: 'Banners', to: '/painel/banners', icon: Image, primaryMobile: false },
  { id: 'cupons', label: 'Cupons', to: '/painel/cupons', icon: TicketPercent, primaryMobile: false },
  { id: 'entrega', label: 'Entrega', to: '/painel/entrega', icon: Truck, primaryMobile: false },
  { id: 'configuracoes', label: 'Configurações', to: '/painel/configuracoes', icon: Settings, primaryMobile: false },
];

export const MOBILE_PRIMARY_NAV = ADMIN_NAV_ITEMS.filter((item) => item.primaryMobile);
export const MOBILE_MORE_NAV = ADMIN_NAV_ITEMS.filter((item) => !item.primaryMobile);

export interface AdminModuleMeta {
  title: string;
  stageLabel: string;
  description: string;
  icon: LucideIcon;
}

export const ADMIN_MODULE_META: Record<AdminModuleKey, AdminModuleMeta> = {
  pdv: {
    title: 'PDV — Venda Presencial',
    stageLabel: 'Etapa 7',
    description: 'Leitura de código de barras, baixa imediata de estoque e recibo rápido no celular.',
    icon: ScanBarcode,
  },
  produtos: {
    title: 'Produtos, Variantes e Kits',
    stageLabel: 'Etapa 4',
    description: 'Cadastro completo de cosméticos, tons, lotes, validade, fotos WebP e estoque.',
    icon: Package,
  },
  clientes: {
    title: 'Clientes Cadastrados',
    stageLabel: 'Etapa 8',
    description: 'Gerenciamento de contas de clientes, edição de dados, redefinição de senhas e exclusão.',
    icon: Users,
  },
  categorias: {
    title: 'Categorias do Catálogo',
    stageLabel: 'Etapa 3',
    description: 'Organização visual das linhas de skincare, maquiagem, perfumaria e presentes.',
    icon: FolderTree,
  },
  banners: {
    title: 'Banners Promocionais',
    stageLabel: 'Etapa 3',
    description: 'Destaques sazonais e campanhas da capa da loja com upload otimizado em WebP.',
    icon: Image,
  },
  cupons: {
    title: 'Cupons de Desconto',
    stageLabel: 'Etapa 6',
    description: 'Cupons percentuais ou fixos validados de forma atômica no checkout.',
    icon: TicketPercent,
  },
  entrega: {
    title: 'Taxas e Zonas de Entrega',
    stageLabel: 'Etapa 3',
    description: 'Configuração de bairros atendidos, frete fixo, frete grátis e retirada na loja.',
    icon: Truck,
  },
  pedidos: {
    title: 'Gestão de Pedidos',
    stageLabel: 'Etapa 7',
    description: 'Acompanhamento de pedidos online e PDV, pagamentos Pix/Mercado Pago e status.',
    icon: ShoppingBag,
  },
  configuracoes: {
    title: 'Configurações da Loja',
    stageLabel: 'Etapa 3',
    description: 'Identidade da marca, WhatsApp, horários, chave Pix e integrações seguras.',
    icon: Settings,
  },
};
