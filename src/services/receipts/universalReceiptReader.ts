import * as FileSystem from 'expo-file-system';
import { unzlibSync, inflateSync } from 'fflate';
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
 * Extrai texto de arquivos PDF bancários (Nubank, Bradesco, Itaú, PicPay, etc.)
 * Utiliza decodificação direta de streams e operadores de texto PDF (BT...ET)
 * sem regexes vulneráveis a backtracking infinito.
 */
async function extractTextFromPdf(pdfUri: string): Promise<string> {
  try {
    // 1. Lê o arquivo como Base64 para preservar dados binários sem corromper bytes UTF-8
    const base64Data = await FileSystem.readAsStringAsync(pdfUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!base64Data || base64Data.length === 0) {
      return '';
    }

    const bytes = base64ToUint8Array(base64Data);
    return extractPdfTextFromBytes(bytes);
  } catch (error) {
    console.error('Falha ao processar arquivo PDF:', error);
    return '';
  }
}

/**
 * Motor seguro de extração de texto PDF:
 * - Varredura linear com limites de complexidade O(N)
 * - Descompactação controlada de streams FlateDecode via fflate
 * - Parsing de fontes embutidas (ToUnicode CMap)
 * - Extração de blocos de renderização de texto (BT ... ET)
 */
export function extractPdfTextFromBytes(bytes: Uint8Array): string {
  try {
    // Proteção contra arquivos gigantescos (comprovantes bancários costumam ter < 2MB)
    const MAX_PROCESS_BYTES = 10 * 1024 * 1024; // 10 MB
    const targetBytes =
      bytes.length > MAX_PROCESS_BYTES
        ? bytes.subarray(0, MAX_PROCESS_BYTES)
        : bytes;

    const binaryStr = uint8ArrayToLatin1(targetBytes);
    const extractedLines: string[] = [];

    // Passo A: Extração de mapas de caracteres Unicode (CMap) para fontes subsetted
    const cmapMap = extractCMaps(binaryStr, targetBytes);

    // Passo B: Percorre streams de dados do PDF
    const streamMarker = 'stream';
    const endStreamMarker = 'endstream';
    let pos = 0;
    let streamCount = 0;
    const MAX_STREAMS = 150;

    while (
      (pos = binaryStr.indexOf(streamMarker, pos)) !== -1 &&
      streamCount < MAX_STREAMS
    ) {
      streamCount++;

      // Identifica o dicionário correspondente ao stream atual
      const lastBoundary = Math.max(
        0,
        binaryStr.lastIndexOf('endobj', pos),
        binaryStr.lastIndexOf('endstream', pos)
      );
      const precedingDict = binaryStr.slice(lastBoundary, pos);

      // Pula streams de imagens puras (economiza 95% do processamento e evita ruído binário)
      const isImage = /\/Subtype\s*\/Image/i.test(precedingDict);
      const isFlate = /\/FlateDecode/i.test(precedingDict);

      let dataStart = pos + streamMarker.length;
      if (binaryStr[dataStart] === '\r') dataStart++;
      if (binaryStr[dataStart] === '\n') dataStart++;

      const endPos = binaryStr.indexOf(endStreamMarker, dataStart);
      if (endPos === -1) break;
      pos = endPos + endStreamMarker.length;

      if (isImage) {
        continue;
      }

      const rawStreamBytes = targetBytes.subarray(dataStart, endPos);
      let contentStr = '';

      if (isFlate) {
        try {
          const decompressed = unzlibSync(rawStreamBytes);
          contentStr = uint8ArrayToLatin1(decompressed);
        } catch {
          try {
            const decompressed = inflateSync(rawStreamBytes);
            contentStr = uint8ArrayToLatin1(decompressed);
          } catch {
            contentStr = '';
          }
        }
      } else {
        contentStr = uint8ArrayToLatin1(rawStreamBytes);
      }

      if (!contentStr) continue;

      // Passo C: Extrai texto contido exclusivamente entre operadores BT e ET
      let btPos = 0;
      let blockCount = 0;
      const MAX_BLOCKS = 300;

      while (
        (btPos = contentStr.indexOf('BT', btPos)) !== -1 &&
        blockCount < MAX_BLOCKS
      ) {
        blockCount++;
        const etPos = contentStr.indexOf('ET', btPos + 2);
        if (etPos === -1) break;

        const textBlock = contentStr.slice(btPos + 2, etPos);
        btPos = etPos + 2;

        extractStringsFromPdfBlock(textBlock, extractedLines, cmapMap);
      }
    }

    // Se nenhum operador BT..ET foi encontrado, executa varredura de fallback para texto simples
    if (extractedLines.length === 0) {
      extractPrintableChunks(binaryStr, extractedLines);
    }

    return extractedLines.join('\n');
  } catch (error) {
    console.error('Erro na extração de texto do PDF:', error);
    return '';
  }
}

/**
 * Extrai cadeias de caracteres e textos dentro de um bloco BT ... ET
 */
function extractStringsFromPdfBlock(
  block: string,
  output: string[],
  cmapMap: Map<number, string>
): void {
  let i = 0;
  const len = block.length;
  let itemCount = 0;
  const MAX_ITEMS = 500;

  while (i < len && itemCount < MAX_ITEMS) {
    const ch = block[i];

    // Arrays de texto com ajustes de kerning: [ (Str1) -120 (Str2) ] TJ
    if (ch === '[') {
      const endTJ = block.indexOf(']', i + 1);
      if (endTJ !== -1 && endTJ - i < 8000) {
        const tjContent = block.slice(i + 1, endTJ);
        let strAccum = '';
        let j = 0;

        while (j < tjContent.length) {
          if (tjContent[j] === '(') {
            j++;
            let depth = 1;
            let rawLiteral = '';
            while (j < tjContent.length && depth > 0) {
              if (tjContent[j] === '\\' && j + 1 < tjContent.length) {
                const esc = tjContent[j + 1];
                if (esc === 'n') rawLiteral += '\n';
                else if (esc === 'r') rawLiteral += '\r';
                else if (esc === 't') rawLiteral += '\t';
                else rawLiteral += esc;
                j += 2;
              } else if (tjContent[j] === '(') {
                depth++;
                rawLiteral += '(';
                j++;
              } else if (tjContent[j] === ')') {
                depth--;
                if (depth > 0) rawLiteral += ')';
                j++;
              } else {
                rawLiteral += tjContent[j];
                j++;
              }
            }
            strAccum += decodeCmapText(rawLiteral, cmapMap);
          } else if (
            tjContent[j] === '-' &&
            /[0-9]/.test(tjContent[j + 1] || '')
          ) {
            // Se o kerning for significativamente negativo, representa um espaço entre palavras
            let numStr = '';
            let k = j;
            while (k < tjContent.length && /[\d\.\-]/.test(tjContent[k])) {
              numStr += tjContent[k];
              k++;
            }
            const offset = parseFloat(numStr);
            if (
              offset < -120 &&
              strAccum.length > 0 &&
              !strAccum.endsWith(' ')
            ) {
              strAccum += ' ';
            }
            j = k;
          } else {
            j++;
          }
        }

        if (strAccum.trim().length > 0) {
          output.push(strAccum.trim());
          itemCount++;
        }
        i = endTJ + 1;
      } else {
        i++;
      }
    } else if (ch === '(') {
      // String literal única: (Texto) Tj
      i++;
      let depth = 1;
      let rawLiteral = '';
      while (i < len && depth > 0) {
        if (block[i] === '\\' && i + 1 < len) {
          const esc = block[i + 1];
          if (esc === 'n') rawLiteral += '\n';
          else if (esc === 'r') rawLiteral += '\r';
          else if (esc === 't') rawLiteral += '\t';
          else rawLiteral += esc;
          i += 2;
        } else if (block[i] === '(') {
          depth++;
          rawLiteral += '(';
          i++;
        } else if (block[i] === ')') {
          depth--;
          if (depth > 0) rawLiteral += ')';
          i++;
        } else {
          rawLiteral += block[i];
          i++;
        }
      }

      const decoded = decodeCmapText(rawLiteral, cmapMap);
      if (decoded.trim().length > 0) {
        output.push(decoded.trim());
        itemCount++;
      }
    } else if (ch === '<' && block[i + 1] !== '<') {
      // String hexadecimal: <004E0075> Tj
      const endHex = block.indexOf('>', i + 1);
      if (endHex !== -1 && endHex - i < 2000) {
        const hex = block.slice(i + 1, endHex).replace(/\s+/g, '');
        let decoded = '';

        if (hex.length >= 4 && (hex.startsWith('FEFF') || hex.startsWith('feff'))) {
          // UTF-16BE
          for (let h = 4; h < hex.length; h += 4) {
            const code = parseInt(hex.slice(h, h + 4), 16);
            if (!isNaN(code)) decoded += String.fromCharCode(code);
          }
        } else {
          for (let h = 0; h < hex.length; h += 2) {
            const code = parseInt(hex.slice(h, h + 2), 16);
            if (!isNaN(code)) decoded += String.fromCharCode(code);
          }
        }

        const cmapDecoded = decodeCmapText(decoded, cmapMap);
        if (cmapDecoded.trim().length > 0) {
          output.push(cmapDecoded.trim());
          itemCount++;
        }
        i = endHex + 1;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
}

/**
 * Decodifica ToUnicode CMaps presentes no PDF
 */
function extractCMaps(
  binaryStr: string,
  targetBytes: Uint8Array
): Map<number, string> {
  const cmapMap = new Map<number, string>();
  const streamMarker = 'stream';
  const endStreamMarker = 'endstream';
  let pos = 0;
  let count = 0;

  while ((pos = binaryStr.indexOf(streamMarker, pos)) !== -1 && count < 60) {
    count++;
    const lastBoundary = Math.max(
      0,
      binaryStr.lastIndexOf('endobj', pos),
      binaryStr.lastIndexOf('endstream', pos)
    );
    const precedingDict = binaryStr.slice(lastBoundary, pos);
    const isFlate = /\/FlateDecode/i.test(precedingDict);

    let dataStart = pos + streamMarker.length;
    if (binaryStr[dataStart] === '\r') dataStart++;
    if (binaryStr[dataStart] === '\n') dataStart++;

    const endPos = binaryStr.indexOf(endStreamMarker, dataStart);
    if (endPos === -1) break;
    pos = endPos + endStreamMarker.length;

    const rawStreamBytes = targetBytes.subarray(dataStart, endPos);
    let decStr = '';

    if (isFlate) {
      try {
        const dec = unzlibSync(rawStreamBytes);
        decStr = uint8ArrayToLatin1(dec);
      } catch {
        continue;
      }
    } else {
      decStr = uint8ArrayToLatin1(rawStreamBytes);
    }

    if (decStr.includes('begincmap')) {
      // Processa intervalos de mapeamento de caracteres: <0001> <0001> <0020>
      const bfrangeRegex =
        /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
      let bfm;
      while ((bfm = bfrangeRegex.exec(decStr)) !== null) {
        const start = parseInt(bfm[1], 16);
        const end = parseInt(bfm[2], 16);
        const target = parseInt(bfm[3], 16);
        for (let code = start; code <= end; code++) {
          cmapMap.set(code, String.fromCharCode(target + (code - start)));
        }
      }

      // Processa mapeamentos individuais: <0001> <0020>
      const bfcharRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
      let bfc;
      while ((bfc = bfcharRegex.exec(decStr)) !== null) {
        cmapMap.set(
          parseInt(bfc[1], 16),
          String.fromCharCode(parseInt(bfc[2], 16))
        );
      }
    }
  }

  return cmapMap;
}

/**
 * Traduz texto codificado em CID glyphs para caracteres Unicode caso haja mapa CMap
 */
function decodeCmapText(raw: string, cmapMap: Map<number, string>): string {
  if (cmapMap.size === 0 || raw.length < 2) return raw;

  // Se o texto parecer 2-byte encoded (ex: primeiros bytes nulos ou no formato Identity-H)
  let decoded = '';
  let matchedAny = false;

  for (let i = 0; i < raw.length; i += 2) {
    const code = (raw.charCodeAt(i) << 8) | raw.charCodeAt(i + 1);
    if (cmapMap.has(code)) {
      decoded += cmapMap.get(code);
      matchedAny = true;
    } else {
      decoded += raw[i] + (raw[i + 1] || '');
    }
  }

  return matchedAny ? decoded : raw;
}

/**
 * Fallback seguro: extrai sequências de caracteres imprimíveis em varredura linear
 */
function extractPrintableChunks(str: string, output: string[]): void {
  let current = '';
  const MAX_LINES = 200;

  for (let i = 0; i < str.length && output.length < MAX_LINES; i++) {
    const code = str.charCodeAt(i);
    if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) {
      current += str[i];
    } else {
      if (current.trim().length >= 4) {
        output.push(current.trim());
      }
      current = '';
    }
  }

  if (current.trim().length >= 4 && output.length < MAX_LINES) {
    output.push(current.trim());
  }
}

/**
 * Converte Base64 para Uint8Array sem dependência de módulos nativos
 */
function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  const Buf = (globalThis as any).Buffer;
  if (typeof Buf !== 'undefined') {
    return new Uint8Array(Buf.from(base64, 'base64'));
  }

  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  let bufferLength = base64.length * 0.75;
  if (base64.endsWith('==')) bufferLength -= 2;
  else if (base64.endsWith('=')) bufferLength -= 1;
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const encoded1 = lookup[base64.charCodeAt(i)];
    const encoded2 = lookup[base64.charCodeAt(i + 1)];
    const encoded3 = lookup[base64.charCodeAt(i + 2)];
    const encoded4 = lookup[base64.charCodeAt(i + 3)];
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== 64 && p < bufferLength)
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    if (encoded4 !== 64 && p < bufferLength)
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  return bytes;
}

/**
 * Converte Uint8Array para Latin1 string em chunks seguros (evita Maximum call stack size exceeded)
 */
function uint8ArrayToLatin1(bytes: Uint8Array): string {
  const CHUNK_SIZE = 8192;
  let result = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    result += String.fromCharCode.apply(null, slice as unknown as number[]);
  }
  return result;
}
