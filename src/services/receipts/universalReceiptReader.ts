import { NativeModules } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
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
 * Verifica se o módulo nativo de OCR do Google ML Kit está devidamente vinculado no runtime atual.
 * No Expo Go (host.exp.exponent), módulos nativos customizados de terceiros não estão presentes.
 */
export function isImageOcrAvailable(): boolean {
  try {
    return !!(NativeModules && NativeModules.TextRecognition && typeof NativeModules.TextRecognition.recognize === 'function');
  } catch {
    return false;
  }
}

/**
 * Leitor Universal de Comprovantes:
 * Aceita texto puro, imagens (JPG/PNG/HEIC) via OCR on-device ou arquivos PDF bancários.
 */
export async function readReceiptFromFileOrUri(
  uri: string,
  mimeType?: string
): Promise<ParsedReceipt | null> {
  if (!uri) return null;

  const lowerUri = uri.toLowerCase();
  const isPdf = lowerUri.includes('.pdf') || mimeType === 'application/pdf';
  const isImage =
    mimeType?.startsWith('image/') ||
    lowerUri.includes('.jpg') ||
    lowerUri.includes('.jpeg') ||
    lowerUri.includes('.png') ||
    lowerUri.includes('.webp') ||
    lowerUri.includes('.heic') ||
    lowerUri.includes('.heif');

  let extractedText = '';

  if (isImage) {
    extractedText = await extractTextFromImageOcr(uri);
  } else if (isPdf) {
    extractedText = await extractTextFromPdf(uri);
  } else {
    // Se for URI de arquivo, lê o arquivo; caso contrário, é o próprio texto compartilhado
    if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/') || uri.startsWith('http')) {
      try {
        extractedText = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      } catch {
        try {
          extractedText = await FileSystem.readAsStringAsync(decodeURI(uri), {
            encoding: FileSystem.EncodingType.UTF8,
          });
        } catch {
          extractedText = uri;
        }
      }
    } else {
      extractedText = uri;
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
  if (!isImageOcrAvailable() || !TextRecognition) {
    console.warn(
      '[Finz OCR] Google ML Kit não disponível no ambiente atual (ex: Expo Go). Utilize comprovantes em PDF ou gere a build nativa.'
    );
    return '';
  }

  try {
    const result = await TextRecognition.recognize(imageUri);
    return result?.text || '';
  } catch (error) {
    console.warn('[Finz OCR] Falha no OCR da imagem:', error);
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
    let base64Data: string | null = null;
    try {
      base64Data = await FileSystem.readAsStringAsync(pdfUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {
      try {
        const decoded = decodeURI(pdfUri);
        base64Data = await FileSystem.readAsStringAsync(decoded, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch (err) {
        console.warn('[Finz PDF] Falha ao ler arquivo PDF com FileSystem legacy:', err);
        return '';
      }
    }

    if (!base64Data || base64Data.length === 0) {
      return '';
    }

    const bytes = base64ToUint8Array(base64Data);
    return extractPdfTextFromBytes(bytes);
  } catch (error) {
    console.warn('[Finz PDF] Falha ao processar arquivo PDF:', error);
    return '';
  }
}

/**
 * Motor seguro de extração de texto PDF:
 * - Varredura linear com limites de complexidade O(N)
 * - Descompactação controlada de streams FlateDecode via fflate
 * - Parsing de fontes embutidas (ToUnicode CMap) com intervalos estritamente limitados
 * - Extração de blocos de renderização de texto (BT ... ET)
 * - Suporte a arrays TJ contendo strings hexadecimais (<004e0075>) e literais ((Texto))
 */
export function extractPdfTextFromBytes(bytes: Uint8Array): string {
  try {
    // Proteção contra arquivos gigantescos (comprovantes bancários costumam ter < 2MB)
    const MAX_PROCESS_BYTES = 5 * 1024 * 1024; // 5 MB
    const targetBytes =
      bytes.length > MAX_PROCESS_BYTES
        ? bytes.subarray(0, MAX_PROCESS_BYTES)
        : bytes;

    const binaryStr = uint8ArrayToLatin1(targetBytes);
    const extractedLines: string[] = [];

    // Passo A: Extração segura de mapas de caracteres Unicode (CMap) para fontes subsetted
    const cmapMap = extractCMaps(binaryStr, targetBytes);

    // Passo B: Percorre streams de dados do PDF
    const streamMarker = 'stream';
    const endStreamMarker = 'endstream';
    let pos = 0;
    let streamCount = 0;
    const MAX_STREAMS = 100;
    const decompressedChunks: string[] = [];

    while (
      (pos = binaryStr.indexOf(streamMarker, pos)) !== -1 &&
      streamCount < MAX_STREAMS
    ) {
      streamCount++;

      // Identifica o dicionário delimitado imediatamente anterior ao stream (máx 1KB para evitar alocações de megabytes)
      const dictStart = Math.max(0, pos - 1024);
      const precedingDict = binaryStr.slice(dictStart, pos);

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

      const streamLen = endPos - dataStart;
      if (streamLen <= 0 || streamLen > 2 * 1024 * 1024) {
        continue;
      }

      const rawStreamBytes = targetBytes.subarray(dataStart, endPos);
      let contentStr = '';

      if (isFlate) {
        try {
          const decompressed = unzlibSync(rawStreamBytes);
          contentStr = uint8ArrayToLatin1(decompressed.subarray(0, 500 * 1024));
        } catch {
          try {
            const decompressed = inflateSync(rawStreamBytes);
            contentStr = uint8ArrayToLatin1(decompressed.subarray(0, 500 * 1024));
          } catch {
            contentStr = '';
          }
        }
      } else {
        contentStr = uint8ArrayToLatin1(rawStreamBytes.subarray(0, 200 * 1024));
      }

      if (!contentStr) continue;
      decompressedChunks.push(contentStr);

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

    // Se nenhum operador BT..ET foi encontrado ou pouco texto foi extraído, varre texto decodificado
    if (extractedLines.length === 0) {
      for (const chunk of decompressedChunks) {
        extractPrintableChunks(chunk, extractedLines);
        if (extractedLines.length >= 20) break;
      }
    }

    return extractedLines.join('\n');
  } catch (error) {
    console.warn('[Finz PDF] Erro na extração de texto do PDF:', error);
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

    // Arrays de texto com ajustes de kerning: [ (Str1) -120 (Str2) ] TJ ou [ <004e0075> -120 <00620061> ] TJ
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
          } else if (tjContent[j] === '<' && tjContent[j + 1] !== '<') {
            const endHex = tjContent.indexOf('>', j + 1);
            if (endHex !== -1 && endHex - j < 2000) {
              const hex = tjContent.slice(j + 1, endHex);
              strAccum += decodeHexString(hex, cmapMap);
              j = endHex + 1;
            } else {
              j++;
            }
          } else if (
            tjContent[j] === '-' &&
            /[0-9]/.test(tjContent[j + 1] || '')
          ) {
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
        const hex = block.slice(i + 1, endHex);
        const decoded = decodeHexString(hex, cmapMap);
        if (decoded.trim().length > 0) {
          output.push(decoded.trim());
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
 * Decodifica strings em notação hexadecimal de PDF com suporte a CMap, UTF-16BE e ASCII
 */
function decodeHexString(hex: string, cmapMap: Map<number, string>): string {
  if (!hex) return '';
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  if (cleanHex.length === 0) return '';

  let decoded = '';

  // 1. Caso com BOM UTF-16BE: FEFF ou feff
  if (cleanHex.length >= 4 && (cleanHex.startsWith('FEFF') || cleanHex.startsWith('feff'))) {
    for (let h = 4; h < cleanHex.length; h += 4) {
      if (h + 4 <= cleanHex.length) {
        const code = parseInt(cleanHex.slice(h, h + 4), 16);
        if (!isNaN(code)) decoded += String.fromCharCode(code);
      }
    }
    return decoded;
  }

  // 2. Se houver CMap definido para o PDF
  if (cmapMap.size > 0) {
    // Tenta 2-byte CMap (4 hex digits)
    if (cleanHex.length >= 4 && cleanHex.length % 4 === 0) {
      let matched = false;
      let temp = '';
      for (let h = 0; h < cleanHex.length; h += 4) {
        const code = parseInt(cleanHex.slice(h, h + 4), 16);
        if (cmapMap.has(code)) {
          temp += cmapMap.get(code);
          matched = true;
        } else if (code >= 32 && code <= 126) {
          temp += String.fromCharCode(code);
        } else {
          temp += ' ';
        }
      }
      if (matched) return temp;
    }

    // Tenta 1-byte CMap (2 hex digits)
    if (cleanHex.length % 2 === 0) {
      let matched = false;
      let temp = '';
      for (let h = 0; h < cleanHex.length; h += 2) {
        const code = parseInt(cleanHex.slice(h, h + 2), 16);
        if (cmapMap.has(code)) {
          temp += cmapMap.get(code);
          matched = true;
        } else if (code >= 32 && code <= 126) {
          temp += String.fromCharCode(code);
        }
      }
      if (matched) return temp;
    }
  }

  // 3. Sem CMap: se for sequência de 2-byte com byte alto nulo (ex: 004E 0075 0062 = "Nub")
  if (cleanHex.length >= 4 && cleanHex.length % 4 === 0) {
    let allHighZero = true;
    for (let h = 0; h < cleanHex.length; h += 4) {
      if (cleanHex.slice(h, h + 2) !== '00') {
        allHighZero = false;
        break;
      }
    }
    if (allHighZero) {
      for (let h = 0; h < cleanHex.length; h += 4) {
        const code = parseInt(cleanHex.slice(h + 2, h + 4), 16);
        if (!isNaN(code)) decoded += String.fromCharCode(code);
      }
      return decoded;
    }
  }

  // 4. Fallback padrão: 1 byte por cada 2 caracteres hex
  for (let h = 0; h < cleanHex.length; h += 2) {
    if (h + 2 <= cleanHex.length) {
      const code = parseInt(cleanHex.slice(h, h + 2), 16);
      if (!isNaN(code)) {
        decoded += String.fromCharCode(code);
      }
    }
  }

  return decoded;
}

/**
 * Decodifica ToUnicode CMaps presentes no PDF com limites estritos
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
  const MAX_CMAP_STREAMS = 20;

  while ((pos = binaryStr.indexOf(streamMarker, pos)) !== -1 && count < MAX_CMAP_STREAMS) {
    count++;
    const dictStart = Math.max(0, pos - 1024);
    const precedingDict = binaryStr.slice(dictStart, pos);

    const isFlate = /\/FlateDecode/i.test(precedingDict);
    const isToUnicode = /\/ToUnicode|\/CMap/i.test(precedingDict);

    let dataStart = pos + streamMarker.length;
    if (binaryStr[dataStart] === '\r') dataStart++;
    if (binaryStr[dataStart] === '\n') dataStart++;

    const endPos = binaryStr.indexOf(endStreamMarker, dataStart);
    if (endPos === -1) break;
    pos = endPos + endStreamMarker.length;

    // Se o stream for maior que 50KB e não mencionar ToUnicode, pula para poupar CPU
    if (!isToUnicode && endPos - dataStart > 50000) {
      continue;
    }

    const rawStreamBytes = targetBytes.subarray(dataStart, endPos);
    let decStr = '';

    if (isFlate) {
      try {
        const dec = unzlibSync(rawStreamBytes);
        decStr = uint8ArrayToLatin1(dec.subarray(0, 100 * 1024));
      } catch {
        continue;
      }
    } else {
      decStr = uint8ArrayToLatin1(rawStreamBytes.subarray(0, 50 * 1024));
    }

    if (!decStr.includes('begincmap')) continue;

    // Delimita estritamente ao bloco begincmap ... endcmap
    const cmapStart = decStr.indexOf('begincmap');
    const cmapEnd = decStr.indexOf('endcmap', cmapStart);
    const cmapBody = cmapEnd !== -1 ? decStr.slice(cmapStart, cmapEnd) : decStr.slice(cmapStart);

    // 1. Processa beginbfrange ... endbfrange
    let bfrangeIdx = 0;
    while ((bfrangeIdx = cmapBody.indexOf('beginbfrange', bfrangeIdx)) !== -1) {
      const bfrangeEnd = cmapBody.indexOf('endbfrange', bfrangeIdx);
      if (bfrangeEnd === -1) break;
      const bfrangeChunk = cmapBody.slice(bfrangeIdx, bfrangeEnd);
      bfrangeIdx = bfrangeEnd + 10;

      const rangeRegex = /<([0-9a-fA-F]{1,8})>\s*<([0-9a-fA-F]{1,8})>\s*<([0-9a-fA-F]{1,8})>/g;
      let m: RegExpExecArray | null;
      while ((m = rangeRegex.exec(bfrangeChunk)) !== null) {
        const start = parseInt(m[1], 16);
        const end = parseInt(m[2], 16);
        const target = parseInt(m[3], 16);
        if (!isNaN(start) && !isNaN(end) && !isNaN(target) && end >= start && end - start < 1000) {
          for (let code = start; code <= end; code++) {
            cmapMap.set(code, String.fromCharCode(target + (code - start)));
            if (cmapMap.size >= 5000) break;
          }
        }
        if (cmapMap.size >= 5000) break;
      }
    }

    // 2. Processa beginbfchar ... endbfchar
    let bfcharIdx = 0;
    while ((bfcharIdx = cmapBody.indexOf('beginbfchar', bfcharIdx)) !== -1) {
      const bfcharEnd = cmapBody.indexOf('endbfchar', bfcharIdx);
      if (bfcharEnd === -1) break;
      const bfcharChunk = cmapBody.slice(bfcharIdx, bfcharEnd);
      bfcharIdx = bfcharEnd + 10;

      const charRegex = /<([0-9a-fA-F]{1,8})>\s*<([0-9a-fA-F]{1,8})>/g;
      let m: RegExpExecArray | null;
      while ((m = charRegex.exec(bfcharChunk)) !== null) {
        const code = parseInt(m[1], 16);
        const target = parseInt(m[2], 16);
        if (!isNaN(code) && !isNaN(target)) {
          cmapMap.set(code, String.fromCharCode(target));
          if (cmapMap.size >= 5000) break;
        }
      }
    }
  }

  return cmapMap;
}

/**
 * Traduz texto codificado em CID glyphs para caracteres Unicode caso haja mapa CMap
 */
function decodeCmapText(raw: string, cmapMap: Map<number, string>): string {
  if (cmapMap.size === 0 || raw.length === 0) return raw;

  // Se tiver tamanho par e mais de 2 caracteres, tenta decodificar como 2-byte CID
  let decoded2Byte = '';
  let matched2Byte = 0;

  for (let i = 0; i < raw.length; i += 2) {
    if (i + 1 < raw.length) {
      const code = (raw.charCodeAt(i) << 8) | raw.charCodeAt(i + 1);
      if (cmapMap.has(code)) {
        decoded2Byte += cmapMap.get(code);
        matched2Byte++;
      } else {
        decoded2Byte += raw[i] + raw[i + 1];
      }
    } else {
      decoded2Byte += raw[i];
    }
  }

  if (matched2Byte > 0 && matched2Byte >= raw.length / 4) {
    return decoded2Byte;
  }

  // Tenta 1-byte CID
  let decoded1Byte = '';
  let matched1Byte = 0;
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (cmapMap.has(code)) {
      decoded1Byte += cmapMap.get(code);
      matched1Byte++;
    } else {
      decoded1Byte += raw[i];
    }
  }

  if (matched1Byte > 0) {
    return decoded1Byte;
  }

  return raw;
}

/**
 * Extrai sequências de caracteres imprimíveis em texto decodificado (não-binário)
 */
function extractPrintableChunks(str: string, output: string[]): void {
  let current = '';
  const MAX_LINES = 100;
  const maxScan = Math.min(str.length, 200000);

  for (let i = 0; i < maxScan && output.length < MAX_LINES; i++) {
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
