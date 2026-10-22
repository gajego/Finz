import {
  Utensils,
  Coffee,
  Wine,
  Pizza,
  Car,
  Fuel,
  Bus,
  Plane,
  Gamepad2,
  Tv,
  Music,
  Film,
  ShoppingBag,
  Shirt,
  Smartphone,
  Laptop,
  TrendingUp,
  PiggyBank,
  Landmark,
  Wallet,
  Home,
  Zap,
  Droplet,
  Wifi,
  HeartPulse,
  Pill,
  Dumbbell,
  GraduationCap,
  BookOpen,
  PawPrint,
  Scissors,
  Baby,
  Gift,
  Wrench,
  Shield,
  HelpCircle,
  Briefcase,
  Sparkles,
  Tag,
  CreditCard,
  LucideIcon,
} from 'lucide-react-native';

export interface CategoryIconOption {
  id: string;
  name: string;
  Icon: LucideIcon;
  categoryHint: string;
}

export const CATEGORY_ICON_LIST: CategoryIconOption[] = [
  // Alimentação & Bebidas
  { id: 'utensils', name: 'Restaurante', Icon: Utensils, categoryHint: 'Alimentação' },
  { id: 'coffee', name: 'Café', Icon: Coffee, categoryHint: 'Alimentação' },
  { id: 'pizza', name: 'Lanches', Icon: Pizza, categoryHint: 'Alimentação' },
  { id: 'wine', name: 'Bares', Icon: Wine, categoryHint: 'Alimentação' },

  // Transporte & Mobilidade
  { id: 'car', name: 'Carro / App', Icon: Car, categoryHint: 'Transporte' },
  { id: 'fuel', name: 'Combustível', Icon: Fuel, categoryHint: 'Transporte' },
  { id: 'bus', name: 'Ônibus / Trem', Icon: Bus, categoryHint: 'Transporte' },
  { id: 'plane', name: 'Viagens', Icon: Plane, categoryHint: 'Transporte' },

  // Lazer & Entretenimento
  { id: 'gamepad-2', name: 'Jogos / Setup', Icon: Gamepad2, categoryHint: 'Lazer' },
  { id: 'tv', name: 'Streaming', Icon: Tv, categoryHint: 'Lazer' },
  { id: 'film', name: 'Cinema', Icon: Film, categoryHint: 'Lazer' },
  { id: 'music', name: 'Música / Shows', Icon: Music, categoryHint: 'Lazer' },

  // Compras & Varejo
  { id: 'shopping-bag', name: 'Compras', Icon: ShoppingBag, categoryHint: 'Compras' },
  { id: 'shirt', name: 'Roupas', Icon: Shirt, categoryHint: 'Compras' },
  { id: 'smartphone', name: 'Celular', Icon: Smartphone, categoryHint: 'Compras' },
  { id: 'laptop', name: 'Tecnologia', Icon: Laptop, categoryHint: 'Compras' },
  { id: 'gift', name: 'Presentes', Icon: Gift, categoryHint: 'Compras' },

  // Finanças & Investimentos
  { id: 'trending-up', name: 'Investimentos', Icon: TrendingUp, categoryHint: 'Investimentos' },
  { id: 'piggy-bank', name: 'Poupança', Icon: PiggyBank, categoryHint: 'Investimentos' },
  { id: 'landmark', name: 'Banco', Icon: Landmark, categoryHint: 'Investimentos' },
  { id: 'wallet', name: 'Carteira', Icon: Wallet, categoryHint: 'Investimentos' },
  { id: 'credit-card', name: 'Cartão', Icon: CreditCard, categoryHint: 'Investimentos' },

  // Moradia & Contas
  { id: 'home', name: 'Moradia', Icon: Home, categoryHint: 'Moradia' },
  { id: 'zap', name: 'Energia / Luz', Icon: Zap, categoryHint: 'Contas' },
  { id: 'droplet', name: 'Água', Icon: Droplet, categoryHint: 'Contas' },
  { id: 'wifi', name: 'Internet', Icon: Wifi, categoryHint: 'Contas' },
  { id: 'wrench', name: 'Manutenção', Icon: Wrench, categoryHint: 'Moradia' },

  // Saúde & Bem-estar
  { id: 'heart-pulse', name: 'Saúde / Farmácia', Icon: HeartPulse, categoryHint: 'Saúde' },
  { id: 'pill', name: 'Remédios', Icon: Pill, categoryHint: 'Saúde' },
  { id: 'dumbbell', name: 'Academia', Icon: Dumbbell, categoryHint: 'Saúde' },
  { id: 'scissors', name: 'Beleza / Cuidado', Icon: Scissors, categoryHint: 'Saúde' },

  // Educação & Trabalho
  { id: 'graduation-cap', name: 'Educação', Icon: GraduationCap, categoryHint: 'Educação' },
  { id: 'book-open', name: 'Livros / Cursos', Icon: BookOpen, categoryHint: 'Educação' },
  { id: 'briefcase', name: 'Trabalho', Icon: Briefcase, categoryHint: 'Trabalho' },

  // Família, Pets & Proteção
  { id: 'paw-print', name: 'Pets', Icon: PawPrint, categoryHint: 'Pets' },
  { id: 'baby', name: 'Crianças / Filhos', Icon: Baby, categoryHint: 'Família' },
  { id: 'shield', name: 'Seguros', Icon: Shield, categoryHint: 'Serviços' },
  { id: 'sparkles', name: 'Desejos', Icon: Sparkles, categoryHint: 'Outros' },

  // Genérico / Padrão
  { id: 'help-circle', name: 'Outros', Icon: HelpCircle, categoryHint: 'Outros' },
  { id: 'tag', name: 'Geral', Icon: Tag, categoryHint: 'Outros' },
];

export const CATEGORY_PALETTE: string[] = [
  '#F59E0B', // Âmbar
  '#EF4444', // Coral / Vermelho
  '#EC4899', // Rosa
  '#8B5CF6', // Roxo
  '#3B82F6', // Azul
  '#00F0FF', // Ciano
  '#10B981', // Verde Esmeralda
  '#84CC16', // Verde Lima
  '#D9F920', // Finz Neon
  '#6366F1', // Índigo
  '#14B8A6', // Turquesa
  '#F97316', // Laranja
  '#A855F7', // Púrpura
  '#06B6D4', // Azul Celeste
  '#64748B', // Cinza Ardósia
];

/**
 * Retorna o componente Lucide correspondente ao identificador de ícone
 */
export function getCategoryIconComponent(iconId?: string): LucideIcon {
  if (!iconId) return HelpCircle;
  const found = CATEGORY_ICON_LIST.find(
    (item) => item.id.toLowerCase() === iconId.toLowerCase()
  );
  if (found) return found.Icon;

  // Fallbacks comuns
  switch (iconId.toLowerCase()) {
    case 'food':
    case 'alimentação':
      return Utensils;
    case 'transport':
    case 'transporte':
      return Car;
    case 'leisure':
    case 'lazer':
    case 'gamepad':
      return Gamepad2;
    case 'shopping':
    case 'compras':
      return ShoppingBag;
    case 'investments':
    case 'investimentos':
      return TrendingUp;
    case 'não categorizado':
    case 'others':
    case 'outros':
      return HelpCircle;
    default:
      return HelpCircle;
  }
}
