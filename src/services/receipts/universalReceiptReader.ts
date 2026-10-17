import * as FileSystem from 'expo-file-system';
import { parsePixReceipt, ParsedReceipt } from './receiptParser';

// Carregamento dinâmico seguro do ML Kit (para não quebrar em ambientes sem o módulo nativo compilado)
let TextRecognition: any = null;
try {
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
} catch {
  TextRecognition = null;
}

/**
 * Leitor Universal de Comprovantes:
 * Aceita texto puro, imagens (JPG/PNG) via OCR on-device ou arquivos PDF bancários.
 */
export async function readReceiptFromFileOrUri(
  uri: string,
  mimeType?: string
): Promise<ParsedReceipt | null> {
  if (!uri) return null;

  const lowerUri = uri.toLowerCase();
  const isPdf = lowerUri.endsWith('.pdf') || mimeType === 'application/pdf';
  const isImage =
    lowerUri.endsWith('.jpg') ||
    lowerUri.endsWith('.jpeg') ||
    lowerUri.endsWith('.png') ||
    lowerUri.endsWith('.webp') ||
    mimeType?.startsWith('image/');

  let extractedText = '';

  if (isImage) {
    extractedText = await extractTextFromImageOcr(uri);
  } else if (isPdf) {
    extractedText = await extractTextFromPdf(uri);
  } else {
    // Tenta ler como texto direto se for arquivo de texto
    try {
      extractedText = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch {
      extractedText = '';
    }
  }

  if (!extractedText || extractedText.trim().length === 0) {
    return null;
  }

  return parsePixReceipt(extractedText);
}

/**
 * Extrai texto de imagem via OCR on-device do Google ML Kit
 */
async function extractTextFromImageOcr(imageUri: string): Promise<string> {
  if (!TextRecognition) {
    console.warn('ML Kit TextRecognition não disponível neste ambiente.');
    return '';
  }

  try {
    const result = await TextRecognition.recognize(imageUri);
    return result?.text || '';
  } catch (error) {
    console.error('Falha no OCR da imagem:', error);
    return '';
  }
}

/**
 * Extrai texto de arquivos PDF bancários decodificando streams e strings de texto
 */
async function extractTextFromPdf(pdfUri: string): Promise<string> {
  try {
    // Lê o conteúdo bruto do PDF em Base64 ou UTF-8
    const rawContent = await FileSystem.readAsStringAsync(pdfUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // 1. Procura por blocos de texto PDF clássicos (operadores Tj, TJ e strings entre parênteses)
    const textMatches: string[] = [];
    const literalStringsRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
    let match;

    while ((match = literalStringsRegex.exec(rawContent)) !== null) {
      if (match[1] && match[1].trim().length > 0) {
        textMatches.push(match[1]);
      }
    }

    // 2. Procura por valores monetários e palavras-chave de comprovante em texto não compactado
    const keywordMatches = rawContent.match(
      /(?:R\$\s*[\d\.,]+|Comprovante|Pix|Transfer[eê]ncia|Destinat[aá]rio|Pagador|Banco|Autentica[cç][aã]o)[^\n\r]+/gi
    );

    if (keywordMatches) {
      textMatches.push(...keywordMatches);
    }

    return textMatches.join('\n');
  } catch (error) {
    console.error('Falha ao processar arquivo PDF:', error);
    return '';
  }
}
