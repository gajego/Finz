export interface ParsedReceipt {
  amount: number; // Em centavos
  recipient: string;
  bankName: string;
  dateStr?: string;
  type: 'PIX_OUT' | 'EXPENSE';
  rawText: string;
}

export function parsePixReceipt(text: string): ParsedReceipt | null {
  if (!text || text.trim().length === 0) return null;

  const normalized = text.replace(/\r\n/g, '\n');

  // 1. Extração de Valor Monetário (ex: "R$ 45,90" ou "Valor: 45,90")
  const amountMatch =
    normalized.match(/(?:valor|total|pago|transfer[eê]ncia)?:?\s*R\$\s*([\d\.,]+)/i) ||
    normalized.match(/R\$\s*([\d\.,]+)/i);

  if (!amountMatch) return null;

  // Converte "1.450,90" ou "45,90" para centavos inteiros
  const cleanAmountStr = amountMatch[1].replace(/\./g, '').replace(',', '.');
  const amountNumber = parseFloat(cleanAmountStr);
  if (isNaN(amountNumber) || amountNumber <= 0) return null;
  const amountInCents = Math.round(amountNumber * 100);

  // 2. Extração do Destinatário / Beneficiário / Nome da Empresa
  let recipient = 'Destinatário Desconhecido';
  const recipientMatch =
    normalized.match(/(?:para|destinat[aá]rio|benefici[aá]rio|nome|empresa|pago a):?\s*([^\n\r]+)/i) ||
    normalized.match(/(?:enviado para):?\s*([^\n\r]+)/i);

  if (recipientMatch) {
    recipient = recipientMatch[1].trim();
    // Limpeza de sufixos como CPF ou dados bancários na mesma linha
    recipient = recipient.split(/[•\-\/]/)[0].trim();
  }

  // 3. Extração da Instituição de Origem ou Destino
  let bankName = 'Banco';
  if (/nubank|nu pagamentos/i.test(normalized)) {
    bankName = 'Nubank';
  } else if (/ita[uú]/i.test(normalized)) {
    bankName = 'Itaú';
  } else if (/inter|intermedium/i.test(normalized)) {
    bankName = 'Banco Inter';
  } else if (/bradesco/i.test(normalized)) {
    bankName = 'Bradesco';
  } else if (/c6\s*bank/i.test(normalized)) {
    bankName = 'C6 Bank';
  } else if (/mercado\s*pago/i.test(normalized)) {
    bankName = 'Mercado Pago';
  }

  return {
    amount: amountInCents,
    recipient,
    bankName,
    type: 'PIX_OUT',
    rawText: text,
  };
}
