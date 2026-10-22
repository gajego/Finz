/**
 * Utilitários de alto desempenho para formatação, parsing de parcelas e agrupamento de transações.
 */

export interface ParsedMerchant {
  cleanName: string;
  installment?: {
    current: number;
    total: number;
    text: string;
  };
}

/**
 * Extrai parcelas (ex: 01/06, 2 de 10) e limpa o nome do estabelecimento
 * removendo prefixos de adquirentes e caracteres técnicos de maquininhas.
 */
export function parseMerchantAndInstallments(
  rawMerchant?: string,
  rawText?: string
): ParsedMerchant {
  const merchantStr = (rawMerchant || '').trim();
  const textStr = (rawText || '').trim();
  const combined = `${merchantStr} ${textStr}`.trim();

  let installment: { current: number; total: number; text: string } | undefined;

  // Reconhece "01/06", "1/10", "PARC 02/12", "PARCELA 2 DE 5", "PARC 03-10"
  const installmentMatch = combined.match(
    /(?:(?:parc(?:ela)?\.?\s*)|(?:\b))(\d{1,2})\s*(?:\/|de|-)\s*(\d{1,2})\b/i
  );

  if (installmentMatch) {
    const current = parseInt(installmentMatch[1], 10);
    const total = parseInt(installmentMatch[2], 10);
    if (total > 1 && total <= 72 && current <= total && current >= 1) {
      installment = {
        current,
        total,
        text: `${current}/${total}`,
      };
    }
  }

  // Limpeza do nome do estabelecimento
  let clean = merchantStr;

  // Remove adquirentes e gateways comuns
  clean = clean.replace(
    /^(?:pag\*|mp\*|pagarme\*|cielo\*|stone\*|getnet\*|sumup\*|rede\*|safra\*)\s*/i,
    ''
  );

  // Remove prefixos do pluggy/open finance
  clean = clean.replace(/^pluggy:\s*/i, '');

  // Remove termos técnicos de transação
  clean = clean.replace(
    /^(?:compra\s+(?:parc(?:elada)?|aprovada|cartao|nacional|internacional|debito|credito)?\s*)/i,
    ''
  );

  // Remove tokens de parcela do nome
  clean = clean.replace(
    /(?:parc(?:ela)?\.?\s*)?\b\d{1,2}\s*(?:\/|de|-)\s*\d{1,2}\b/gi,
    ''
  );

  // Remove códigos residuais e caracteres soltos
  clean = clean
    .replace(/\b(?:compra|parc|parcelada)\b/gi, '')
    .replace(/[*_#]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!clean) {
    clean = merchantStr || 'Transação';
  }

  return { cleanName: clean, installment };
}

const MONTHS_PT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/** Fuso horário oficial bancário brasileiro (Horário de Brasília: UTC-3 permanente) */
export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';
export const BRAZIL_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Retorna as partes da data (dia, mês 0-11, ano) rigorosamente no Horário de Brasília (UTC-3).
 * Utiliza cálculo aritmético determinístico UTC-3 imune a variações de fuso local do dispositivo.
 */
export function getBrazilDateParts(timestamp: number): { day: number; month: number; year: number } {
  const validTimestamp = Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
  const brt = new Date(validTimestamp - BRAZIL_UTC_OFFSET_MS);
  return {
    day: brt.getUTCDate(),
    month: brt.getUTCMonth(),
    year: brt.getUTCFullYear(),
  };
}

/**
 * Formata data de agrupamento visual para extrato editorial Neo-Fintech no Horário de Brasília.
 * Ex: "Hoje • 21 de out", "Ontem • 20 de out", "18 de out"
 */
export function formatSectionDate(timestamp: number): string {
  const validTimestamp = Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
  const dateParts = getBrazilDateParts(validTimestamp);
  const nowParts = getBrazilDateParts(Date.now());

  const dayStr = String(dateParts.day).padStart(2, '0');
  const monthStr = MONTHS_PT[dateParts.month] || 'jan';
  const isCurrentYear = dateParts.year === nowParts.year;
  const dateStr = isCurrentYear
    ? `${dayStr} de ${monthStr}`
    : `${dayStr} de ${monthStr} de ${dateParts.year}`;

  const isToday =
    dateParts.year === nowParts.year &&
    dateParts.month === nowParts.month &&
    dateParts.day === nowParts.day;

  // Calcula se é ontem no Horário de Brasília (24h atrás)
  const yesterdayParts = getBrazilDateParts(Date.now() - 24 * 60 * 60 * 1000);
  const isYesterday =
    dateParts.year === yesterdayParts.year &&
    dateParts.month === yesterdayParts.month &&
    dateParts.day === yesterdayParts.day;

  if (isToday) {
    return `Hoje • ${dateStr}`;
  }
  if (isYesterday) {
    return `Ontem • ${dateStr}`;
  }

  return dateStr;
}

/**
 * Formatação de moeda no padrão BRL com respeito ao modo privacidade
 */
export function formatBRL(cents: number, privacyMode = false): string {
  if (privacyMode) return '••••••';
  const validCents = Number.isFinite(cents) ? cents : 0;
  try {
    return (validCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  } catch {
    const val = (validCents / 100).toFixed(2).replace('.', ',');
    return `R$ ${val}`;
  }
}

/**
 * Formata horário de 24h rigorosamente no Horário de Brasília (America/Sao_Paulo / UTC-3)
 */
export function formatTime(timestamp: number): string {
  const validTimestamp = Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
  const brt = new Date(validTimestamp - BRAZIL_UTC_OFFSET_MS);
  const hours = String(brt.getUTCHours()).padStart(2, '0');
  const minutes = String(brt.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export type PaymentModality = 'PIX_IN' | 'PIX_OUT' | 'REFUND' | 'DEBIT' | 'CREDIT';

/**
 * Detecta com precisão a modalidade real de pagamento da transação
 */
export function getPaymentModality(
  type: string,
  rawText?: string,
  merchant?: string,
  hasInstallments = false
): {
  modality: PaymentModality;
  label: string;
  shortLabel: string;
} {
  const combined = `${rawText || ''} ${merchant || ''}`.toLowerCase();

  if (type === 'PIX_IN') {
    return {
      modality: 'PIX_IN',
      label: 'Pix Recebido (Conta Corrente)',
      shortLabel: 'Pix Recebido',
    };
  }
  if (type === 'PIX_OUT') {
    return {
      modality: 'PIX_OUT',
      label: 'Pix Enviado (Conta Corrente)',
      shortLabel: 'Pix Enviado',
    };
  }
  if (type === 'REFUND') {
    return {
      modality: 'REFUND',
      label: 'Estorno (Crédito / Débito)',
      shortLabel: 'Estorno',
    };
  }

  // Se o texto original bancário identificar débito
  if (combined.includes('débito') || combined.includes('debito')) {
    return {
      modality: 'DEBIT',
      label: 'Cartão de Débito',
      shortLabel: 'Débito',
    };
  }

  // Se o texto identificar crédito ou tiver parcelas
  if (combined.includes('crédito') || combined.includes('credito') || hasInstallments) {
    return {
      modality: 'CREDIT',
      label: 'Cartão de Crédito',
      shortLabel: 'Crédito',
    };
  }

  // Fallback padrão para compras sem indicação de parcelamento
  return {
    modality: 'DEBIT',
    label: 'Cartão de Débito',
    shortLabel: 'Débito',
  };
}
