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
  // Trata variações de OCR: "R$ 45,00", "RS 45,00", "Rs 45,00", "R$45,00",
  // "Transferência de R$ 45,00", "Valor: 45,00", quebras de linha entre moeda e valor, etc.
  let amountInCents = 0;

  // Regex prioritário para valor monetário com contexto explícito
  const explicitAmountPattern =
    /(?:(?:valor(?:\s+(?:enviado|pago|transferido|da\s+transfer[eê]ncia|do\s+pix))?|total|pago|transfer[eê]ncia(?:\s+de)?)\s*:?\s*)?(?:R\$|RS|Rs|rs|\$)\s*([\d\.]+(?:,\d{2})?)/i;

  const directMatch = normalized.match(explicitAmountPattern);
  if (directMatch && directMatch[1]) {
    amountInCents = parseAmountStringToCents(directMatch[1]);
  }

  // Se não achou na busca direta, procura labels ou símbolos em linhas consecutivas (ex: "Transferência de \n R$ 45,00" ou "R$ \n 45,00")
  if (!amountInCents) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Caso A: Linha com apenas o símbolo de moeda ou label de valor
      if (
        /^(?:R\$|RS|Rs|rs|\$|valor|valor\s+enviado|valor\s+pago|total)$/i.test(line) &&
        i + 1 < lines.length
      ) {
        const nextLine = lines[i + 1];
        const match = nextLine.match(/^(?:R\$|RS|Rs|rs|\$)?\s*([\d\.]+(?:,\d{2})?)$/i);
        if (match && match[1]) {
          amountInCents = parseAmountStringToCents(match[1]);
          if (amountInCents > 0) break;
        }
      }

      // Caso B: Linha "Transferência de" ou "Transferência" e na linha seguinte o valor
      if (/^transfer[eê]ncia(?:\s+de)?$/i.test(line) && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const match = nextLine.match(/(?:R\$|RS|Rs|rs|\$)?\s*([\d\.]+(?:,\d{2})?)/i);
        if (match && match[1]) {
          amountInCents = parseAmountStringToCents(match[1]);
          if (amountInCents > 0) break;
        }
      }
    }
  }

  // Fallback: qualquer número no formato brasileiro acompanhado de R$ ou RS
  if (!amountInCents) {
    const fallbackMatch = normalized.match(/(?:R\$|RS|Rs|rs|\$)\s*([\d\.,]+)/i);
    if (fallbackMatch && fallbackMatch[1]) {
      amountInCents = parseAmountStringToCents(fallbackMatch[1]);
    }
  }

  // Se ainda assim não encontrou valor válido maior que 0, não é um comprovante reconhecível
  if (!amountInCents || amountInCents <= 0) {
    return null;
  }

  // ==========================================
  // 2. EXTRAÇÃO DO DESTINATÁRIO / BENEFICIÁRIO
  // ==========================================
  // No comprovante Pix do Nubank e outros bancos, o layout possui seções de "Origem" (quem enviou)
  // e "Destino" (quem recebeu). É fundamental priorizar a seção de DESTINO para não capturar o próprio usuário pagador.
  let recipient = 'Destinatário Desconhecido';

  // Passo 2.1: Identificar seções demarcadas de Destino vs Origem
  let destinationLines: string[] = [];
  let inDestinationSection = false;
  let inOriginSection = false;

  const destSectionKeywords =
    /^(?:destino|dados\s+do\s+recebedor|dados\s+de\s+quem\s+recebeu|quem\s+recebeu|para|destinat[aá]rio|favorecido|recebedor|benefici[aá]rio)$/i;
  const originSectionKeywords =
    /^(?:origem|dados\s+do\s+pagador|dados\s+de\s+quem\s+pagou|quem\s+pagou|de|pagador|debitar\s+de)$/i;

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

      // Ignora se estiver na seção de origem (ex: logo após "Origem" ou "De")
      if (/^(?:origem|quem\s+pagou|dados\s+do\s+pagador)$/i.test(line)) {
        continue;
      }

      // Caso inline: "Para: João Silva" ou "Destinatário: Maria Santos"
      const inlineMatch = line.match(
        /^(?:para|destinat[aá]rio|favorecido|benefici[aá]rio|quem\s+recebeu|pago\s+a|enviado\s+para)\s*:?\s+(.+)$/i
      );
      if (inlineMatch && inlineMatch[1]) {
        const candidate = cleanCandidateName(inlineMatch[1]);
        if (isValidRecipientName(candidate)) {
          recipient = candidate;
          break;
        }
      }

      // Caso com label em linha separada: "Para\nJoão Silva" ou "Destino\nNome\nJoão Silva"
      if (
        /^(?:para|destinat[aá]rio|favorecido|benefici[aá]rio|quem\s+recebeu|destino)$/i.test(
          line
        )
      ) {
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const next = lines[j];
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

  // Passo 2.3: Fallback regex caso ainda não tenha sido identificado
  if (recipient === 'Destinatário Desconhecido') {
    const rxMatch = normalized.match(
      /(?:para|destinat[aá]rio|benefici[aá]rio|pago a)\s*:?\s*([^\n\r]+)/i
    );
    if (rxMatch && rxMatch[1]) {
      const candidate = cleanCandidateName(rxMatch[1]);
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
      /(\d{2}\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\s+\d{4}(?:\s*[-–—às\s]+\s*\d{2}:\d{2}(?::\d{2})?)?)/i
    ) ||
    normalized.match(
      /(\d{2}\/(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\/\d{4}(?:\s*[-–—às\s]+\s*\d{2}:\d{2}(?::\d{2})?)?)/i
    );

  if (dateMatch) {
    dateStr = dateMatch[1].trim();
  }

  return {
    amount: amountInCents,
    recipient,
    bankName,
    dateStr,
    type: 'PIX_OUT',
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

    // Se a linha tem "Nome: Fulano"
    const nameMatch = l.match(
      /^(?:nome|nome\s+do\s+recebedor|raz[aã]o\s+social)\s*:?\s+(.+)$/i
    );
    if (nameMatch && nameMatch[1]) {
      const cand = cleanCandidateName(nameMatch[1]);
      if (isValidRecipientName(cand)) return cand;
    }

    // Se a linha é apenas "Nome" e o valor está na linha seguinte (típico do Nubank)
    if (
      /^(?:nome|nome\s+do\s+recebedor|raz[aã]o\s+social)$/i.test(l) &&
      i + 1 < destLines.length
    ) {
      const cand = cleanCandidateName(destLines[i + 1]);
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
    /^(?:nome|para|destinat[aá]rio|favorecido)\s*:?\s*/i,
    ''
  );
  // Remove CPF/CNPJ após o nome ou sufixos de banco/chave
  cleaned = cleaned
    .split(
      /(?:\s+CPF|\s+CNPJ|\s+Institui[cç]|\s+Chave|\s+Banco|\s*•|\s*\-|\s*\/)/i
    )[0]
    .trim();
  return cleaned;
}

/**
 * Valida se a string capturada é realmente um nome de pessoa ou empresa
 */
function isValidRecipientName(name: string): boolean {
  if (!name || name.length < 2) return false;
  // Não pode ser apenas números ou CPF/CNPJ
  if (/^[\d\.\-\/\s]+$/.test(name)) return false;
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
    /^(?:cpf|cnpj|institui[cç][aã]o|banco|chave|chave\s+pix|tipo\s+de\s+chave|ag[eê]ncia|conta|valor|tipo\s+de\s+transa[cç][aã]o|pix|c[oó]digo|autentica[cç][aã]o|data|hora|descri[cç][aã]o|nu\s*pagamentos.*|bradesco.*|ita[uú].*|inter.*)/i.test(
      lower
    )
  ) {
    return true;
  }
  if (/^[\d\.\-\/\*]+$/.test(lower)) return true; // CPF ou CNPJ mascarado
  if (/^\*{3}\.\d{3}\.\d{3}\-\*{2}$/.test(lower)) return true;
  return false;
}
