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

/**
 * Formata data de agrupamento visual para extrato editorial Neo-Fintech.
 * Ex: "Hoje • 21 de out", "Ontem • 20 de out", "18 de out"
 */
export function formatSectionDate(timestamp: number): string {
  const validTimestamp = Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
  const date = new Date(validTimestamp);
  const now = new Date();

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTHS_PT[date.getMonth()] || 'jan';
  const isCurrentYear = date.getFullYear() === now.getFullYear();
  const dateStr = isCurrentYear ? `${day} de ${month}` : `${day} de ${month} de ${date.getFullYear()}`;

  if (isSameDay(date, now)) {
    return `Hoje • ${dateStr}`;
  }
  if (isSameDay(date, yesterday)) {
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
 * Formata horário de 24h
 */
export function formatTime(timestamp: number): string {
  const validTimestamp = Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
  try {
    return new Date(validTimestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '--:--';
  }
}
