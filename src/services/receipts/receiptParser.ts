export interface ParsedReceipt {
  amount: number; // Em centavos
  recipient: string;
  bankName: string;
  dateStr?: string;
  type: 'PIX_OUT' | 'EXPENSE';
  rawText: string;
}

/**
 * Analisa e extrai dados de comprovantes Pix (Nubank, Itaú, Bradesco, Inter, PicPay, etc.)
 * Suporta textos extraídos de imagens (OCR ML Kit) ou gerados por decodificação de PDFs bancários.
 */
export function parsePixReceipt(text: string): ParsedReceipt | null {
  if (!text || text.trim().length === 0) return null;

  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // ==========================================
  // 1. EXTRAÇÃO DO VALOR MONETÁRIO
  // ==========================================
  // Trata variações de OCR e layouts do Nubank: "R$ 45,00", "RS 45,00", "Rs 45,00", "R$45,00",
  // "Transferência de R$ 45,00", "Você transferiu\nR$ 45,00", quebras de linha entre moeda e valor, etc.
  let amountInCents = 0;

  // 1.1 Padrões contextuais de valor na mesma linha
  const contextualAmountPatterns = [
    /(?:transfer[eê]ncia(?:\s+(?:pix|enviada|realizada|agendada))?(?:\s+de)?|voc[eê]\s+(?:enviou|transferiu|pagou)|envio(?:\s+de)?|pix\s+enviado)\s*:?\s*(?:R\$|RS|Rs|rs|\$)\s*([\d\.]+(?:,\d{2})?)/i,
    /(?:valor(?:\s+(?:enviado|pago|transferido|da\s+transfer[eê]ncia|do\s+pix|da\s+compra))?|total|pago)\s*:?\s*(?:R\$|RS|Rs|rs|\$)\s*([\d\.]+(?:,\d{2})?)/i,
    /(?:valor(?:\s+(?:enviado|pago|transferido|da\s+transfer[eê]ncia|do\s+pix))?|total|pago)\s*:\s*([\d\.]+(?:,\d{2}))(?!\d)/i,
  ];

  for (const pattern of contextualAmountPatterns) {
    const m = normalized.match(pattern);
    if (m && m[1]) {
      const cents = parseAmountStringToCents(m[1]);
      if (cents > 0) {
        amountInCents = cents;
        break;
      }
    }
  }

  // 1.2 Multi-linha: Rótulo de contexto e valor na linha seguinte (típico do app Nubank)
  if (!amountInCents) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (
        /^(?:transfer[eê]ncia(?:\s+(?:de|pix|enviada|realizada|agendada))?|voc[eê]\s+(?:enviou|transferiu|pagou)|envio(?:\s+de)?|pix\s+enviado|valor(?:\s+(?:enviado|pago|transferido|da\s+transfer[eê]ncia|do\s+pix|da\s+compra))?|total|pago)\s*:?$/i.test(line) &&
        i + 1 < lines.length
      ) {
        const nextLine = lines[i + 1];
        const match = nextLine.match(/^(?:R\$|RS|Rs|rs|\$)?\s*([\d\.]+(?:,\d{2})?)$/i);
        if (match && match[1]) {
          const cents = parseAmountStringToCents(match[1]);
          if (cents > 0) {
            amountInCents = cents;
            break;
          }
        }
      }

      // Linha apenas com o símbolo monetário (R$, RS, etc.) e o valor numérico na próxima
      if (/^(?:R\$|RS|Rs|rs|\$)$/i.test(line) && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const match = nextLine.match(/^([\d\.]+(?:,\d{2})?)$/i);
        if (match && match[1]) {
          const cents = parseAmountStringToCents(match[1]);
          if (cents > 0) {
            amountInCents = cents;
            break;
          }
        }
      }
    }
  }

  // 1.3 Símbolo monetário direto com centavos: "R$ 45,00", "RS 45,00", "R$45,00"
  if (!amountInCents) {
    const directMatches = normalized.matchAll(/(?:R\$|RS|Rs|rs|\$)\s*([\d\.]+(?:,\d{2}))(?!\d)/gi);
    for (const match of directMatches) {
      if (match && match[1]) {
        const cents = parseAmountStringToCents(match[1]);
        // Ignora valores zerados (ex: "Tarifa: R$ 0,00")
        if (cents > 0) {
          amountInCents = cents;
          break;
        }
      }
    }
  }

  // 1.4 Fallback genérico para R$ com número
  if (!amountInCents) {
    const fallbackMatch = normalized.match(/(?:R\$|RS|Rs|rs|\$)\s*([\d\.,]+)/i);
    if (fallbackMatch && fallbackMatch[1]) {
      amountInCents = parseAmountStringToCents(fallbackMatch[1]);
    }
  }

  // Se não encontrou valor válido maior que 0, não é um comprovante reconhecível
  if (!amountInCents || amountInCents <= 0) {
    return null;
  }

  // ==========================================
  // 2. EXTRAÇÃO DO DESTINATÁRIO / BENEFICIÁRIO
  // ==========================================
  // No comprovante Pix do Nubank e outros bancos, o layout possui seções de "Origem" (quem enviou)
  // e "Destino" (quem recebeu). É fundamental priorizar a seção de DESTINO para não capturar o próprio pagador.
  let recipient = 'Destinatário Desconhecido';

  // Passo 2.1: Identificar seções demarcadas de Destino vs Origem
  let destinationLines: string[] = [];
  let inDestinationSection = false;
  let inOriginSection = false;

  const destSectionKeywords =
    /^(?:destino|dados\s+do\s+recebedor|dados\s+de\s+quem\s+recebeu|quem\s+recebeu|para|destinat[aá]rio|favorecido|recebedor|benefici[aá]rio|recebedor\(a\)|estabelecimento|dados\s+da\s+transa[cç][aã]o)\s*:?$/i;
  const originSectionKeywords =
    /^(?:origem|dados\s+do\s+pagador|dados\s+de\s+quem\s+pagou|quem\s+pagou|de|pagador|pagador\(a\)|debitar\s+de|dados\s+do\s+titular.*)\s*:?$/i;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (destSectionKeywords.test(l)) {
      inDestinationSection = true;
      inOriginSection = false;
      continue;
    }
    if (originSectionKeywords.test(l)) {
      inOriginSection = true;
      inDestinationSection = false;
      continue;
    }
    if (inDestinationSection && !inOriginSection) {
      destinationLines.push(l);
    }
  }

  // Se identificamos linhas na seção de destino, extrai o recebedor dali
  if (destinationLines.length > 0) {
    recipient = findRecipientInLines(destinationLines);
  }

  // Passo 2.2: Se não isolou via seções, faz varredura por rótulos no fluxo de linhas
  if (recipient === 'Destinatário Desconhecido') {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Ignora seção de origem (ex: logo após "Origem" ou "De")
      if (/^(?:origem|quem\s+pagou|dados\s+do\s+pagador|dados\s+do\s+titular.*|de)\s*:?$/i.test(line)) {
        continue;
      }

      // Caso inline: "Para: João Silva", "Destinatário: Maria Santos", "Estabelecimento: PADARIA REAL"
      const inlineMatch = line.match(
        /^(?:para|destinat[aá]rio|favorecido|benefici[aá]rio|recebedor|quem\s+recebeu|pago\s+a|enviado\s+para|transfer[eê]ncia\s+para|estabelecimento|local|loja|empresa|com[eé]rcio)\s*:?\s+(.+)$/i
      );
      if (inlineMatch && inlineMatch[1]) {
        const candidate = cleanCandidateName(inlineMatch[1]);
        if (isValidRecipientName(candidate)) {
          recipient = candidate;
          break;
        }
      }

      // Caso com label em linha separada: "Para\nJoão Silva" ou "Destinatário\nJoão Silva"
      if (
        /^(?:para|destinat[aá]rio|favorecido|benefici[aá]rio|recebedor|quem\s+recebeu|destino|estabelecimento|estabeleciment|local|loja)\s*:?$/i.test(
          line
        )
      ) {
        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          let next = lines[j];
          // Trata quebra de OCR comum em telas (ex: "o  DINIZ SUPERMERCADOS")
          next = next.replace(/^[ot]\s+/i, '');
          if (/^(?:nome|nome\s+do\s+recebedor|raz[aã]o\s+social)\s*:?$/i.test(next)) {
            continue;
          }
          if (isMetadataOrLabelLine(next)) {
            continue;
          }
          const candidate = cleanCandidateName(next);
          if (isValidRecipientName(candidate)) {
            recipient = candidate;
            break;
          }
        }
        if (recipient !== 'Destinatário Desconhecido') break;
      }
    }
  }

  // Passo 2.3: Linha de compra no débito / crédito / compras aprovadas
  if (recipient === 'Destinatário Desconhecido') {
    for (let i = 0; i < lines.length; i++) {
      if (/^compra\s+(?:no\s+)?(?:d[eé]bito|cr[eé]dito|aprovada)$/i.test(lines[i])) {
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const cand = cleanCandidateName(lines[j]);
          if (isValidRecipientName(cand) && !/^\d{2}\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|\d{2}\/)/i.test(cand)) {
            recipient = cand;
            break;
          }
        }
        if (recipient !== 'Destinatário Desconhecido') break;
      }
    }
  }

  // Passo 2.4: Fallback regex caso ainda não tenha sido identificado
  if (recipient === 'Destinatário Desconhecido') {
    const rxMatch = normalized.match(
      /(?:para|destinat[aá]rio|benefici[aá]rio|pago a|estabelecimento|estabeleciment[\s\n]*o?)\s*:?\s*([^\n\r]+)/i
    );
    if (rxMatch && rxMatch[1]) {
      const candidate = cleanCandidateName(rxMatch[1].replace(/^[ot]\s+/i, ''));
      if (isValidRecipientName(candidate)) {
        recipient = candidate;
      }
    }
  }

  // ==========================================
  // 3. EXTRAÇÃO DA INSTITUIÇÃO BANCÁRIA
  // ==========================================
  let bankName = 'Banco';
  if (/nubank|nu\s*pagamentos|nu\s*financeira|banco\s*nu\b/i.test(normalized)) {
    bankName = 'Nubank';
  } else if (/ita[uú]|itaucard/i.test(normalized)) {
    bankName = 'Itaú';
  } else if (/bradesco/i.test(normalized)) {
    bankName = 'Bradesco';
  } else if (/inter\b|intermedium|banco\s*inter/i.test(normalized)) {
    bankName = 'Banco Inter';
  } else if (/c6\s*bank|banco\s*c6/i.test(normalized)) {
    bankName = 'C6 Bank';
  } else if (/mercado\s*pago/i.test(normalized)) {
    bankName = 'Mercado Pago';
  } else if (/picpay/i.test(normalized)) {
    bankName = 'PicPay';
  } else if (/caixa\s+econ[oô]mica|cef\b/i.test(normalized)) {
    bankName = 'Caixa Econômica';
  } else if (/banco\s+do\s+brasil|bco\s+do\s+brasil|bb\b/i.test(normalized)) {
    bankName = 'Banco do Brasil';
  } else if (/santander/i.test(normalized)) {
    bankName = 'Santander';
  } else if (/pagbank|pagseguro/i.test(normalized)) {
    bankName = 'PagBank';
  } else if (/stone\b/i.test(normalized)) {
    bankName = 'Stone';
  } else if (/neon\b/i.test(normalized)) {
    bankName = 'Neon';
  } else if (/sicredi/i.test(normalized)) {
    bankName = 'Sicredi';
  } else if (/sicoob/i.test(normalized)) {
    bankName = 'Sicoob';
  }

  // ==========================================
  // 4. EXTRAÇÃO DE DATA (OPCIONAL)
  // ==========================================
  let dateStr: string | undefined;
  const dateMatch =
    normalized.match(
      /(\d{2}\/\d{2}\/\d{4}(?:\s*[-–—às\s]+\s*\d{2}:\d{2}(?::\d{2})?)?)/i
    ) ||
    normalized.match(
      /(\d{2}\s+(?:de\s+)?(?:jan(?:eiro)?|fev(?:ereiro)?|mar(?:[cç]o)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?)\s+(?:de\s+)?\d{4}(?:\s*[-–—às\s]+\s*\d{2}:\d{2}(?::\d{2})?)?)/i
    ) ||
    normalized.match(
      /(\d{2}\/(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\/\d{4}(?:\s*[-–—às\s]+\s*\d{2}:\d{2}(?::\d{2})?)?)/i
    );

  if (dateMatch) {
    dateStr = dateMatch[1].trim();
  }

  let receiptType: 'PIX_OUT' | 'EXPENSE' = 'PIX_OUT';
  if (/compra|d[eé]bito|cr[eé]dito|cart[aã]o|loja|supermercado|estabelecimento/i.test(normalized)) {
    receiptType = 'EXPENSE';
  }

  return {
    amount: amountInCents,
    recipient,
    bankName,
    dateStr,
    type: receiptType,
    rawText: text,
  };
}

/**
 * Converte string monetária brasileira para valor em centavos
 */
function parseAmountStringToCents(str: string): number {
  const clean = str.replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

/**
 * Procura o nome do destinatário em uma lista de linhas pertencentes à seção de destino
 */
function findRecipientInLines(destLines: string[]): string {
  for (let i = 0; i < destLines.length; i++) {
    const l = destLines[i];

    // Se a linha tem "Nome: Fulano" ou "Estabelecimento: Fulano"
    const nameMatch = l.match(
      /^(?:nome|nome\s+do\s+recebedor|raz[aã]o\s+social|estabelecimento|local|loja)\s*:?\s+(.+)$/i
    );
    if (nameMatch && nameMatch[1]) {
      const cand = cleanCandidateName(nameMatch[1]);
      if (isValidRecipientName(cand)) return cand;
    }

    // Se a linha é apenas "Nome" ou "Estabelecimento" e o valor está na linha seguinte
    if (
      /^(?:nome|nome\s+do\s+recebedor|raz[aã]o\s+social|estabelecimento|estabeleciment|local|loja)\s*:?$/i.test(l) &&
      i + 1 < destLines.length
    ) {
      const cand = cleanCandidateName(destLines[i + 1].replace(/^[ot]\s+/i, ''));
      if (isValidRecipientName(cand)) return cand;
    }

    // Linha pura com o nome (primeira linha não-metadado)
    if (!isMetadataOrLabelLine(l)) {
      const cand = cleanCandidateName(l);
      if (isValidRecipientName(cand)) return cand;
    }
  }
  return 'Destinatário Desconhecido';
}

/**
 * Limpa prefixos, CPF/CNPJ na mesma linha e sufixos bancários
 */
function cleanCandidateName(str: string): string {
  let cleaned = str.trim();
  // Remove prefixos como "Nome:", "Para:", etc.
  cleaned = cleaned.replace(
    /^(?:nome|para|destinat[aá]rio|favorecido|recebedor|benefici[aá]rio|estabelecimento|estabeleciment)\s*:?\s*/i,
    ''
  );
  // Remove CPF/CNPJ após o nome ou sufixos de banco/chave
  cleaned = cleaned
    .split(
      /(?:\s+-\s+Nu\s*Pagamentos|\s+-\s+Nu\s*Financeira|\s+CPF|\s+CNPJ|\s+Institui[cç]|\s+Chave|\s+Banco|\s*•|\s+-\s+|\s+\/\s+)/i
    )[0]
    .trim();
  // Remove aspas ou pontuação final
  cleaned = cleaned.replace(/^[",'\s]+|[",'\s]+$/g, '');
  return cleaned;
}

/**
 * Valida se a string capturada é realmente um nome de pessoa ou empresa
 */
function isValidRecipientName(name: string): boolean {
  if (!name || name.length < 2) return false;
  // Não pode ser valor monetário (ex: R$ 45,00, RS 45,00, $ 45,00)
  if (/^(?:R\$|RS|Rs|rs|\$)?\s*[\d\.,]+$/i.test(name)) return false;
  // Não pode ser apenas números ou símbolos de CPF/CNPJ
  if (/^[\d\.\-\/\s\*]+$/.test(name)) return false;
  // Não pode ser rótulo ou metadado
  if (isMetadataOrLabelLine(name)) return false;
  return true;
}

/**
 * Identifica se uma linha é apenas rótulo técnico ou metadado do comprovante
 */
function isMetadataOrLabelLine(line: string): boolean {
  const lower = line.toLowerCase().trim();
  if (
    /^(?:cpf|cnpj|institui[cç][aã]o.*|banco.*|chave.*|chave\s+pix.*|tipo\s+de\s+chave.*|ag[eê]ncia.*|conta.*|tipo\s+de\s+conta.*|valor.*|tarifa.*|tipo\s+de\s+transa[cç][aã]o.*|tipo\s+de\s+transfer[eê]ncia.*|nsu.*|dados\s+da\s+transa[cç][aã]o.*|dados\s+do\s+titular.*|n[uú]mero\s+do\s+cart[aã]o.*|cart[aã]o.*|pix.*|c[oó]digo.*|autentica[cç][aã]o.*|protocolo.*|identificador.*|id\s+da\s+transa[cç][aã]o.*|data.*|hora.*|data\s+e\s+hora.*|descri[cç][aã]o.*|estabelecimento|estabeleciment|dados\s+do\s+estabelecimento|me\s+ajuda.*|ajuda|nu\s*pagamentos.*|nu\s*financeira.*|nubank.*|banco\s*nu.*|bradesco.*|ita[uú].*|inter.*|santander.*|caixa\s*econ.*|mercado\s*pago.*|picpay.*|comprovante.*|transfer[eê]ncia\s+pix.*)/i.test(
      lower
    )
  ) {
    return true;
  }
  if (/^[\d\.\-\/\*]+$/.test(lower)) return true; // CPF ou CNPJ mascarado
  if (/^\*{3}\.\d{3}\.\d{3}\-\*{2}$/.test(lower)) return true;
  if (/^[a-f0-9\-]{20,}$/i.test(lower)) return true; // UUID ou ID de transação hexadecimal
  return false;
}

