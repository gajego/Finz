import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import {
  exportAllDataForBackup,
  restoreAllDataFromBackup,
  FinzBackupPayload,
} from '@/services/database/db';
import { useWalletStore } from '@/store/useWalletStore';

export interface ExportBackupResult {
  success: boolean;
  canceled?: boolean;
  fileName?: string;
  uri?: string;
  summary?: FinzBackupPayload['summary'];
  error?: string;
}

export interface ImportBackupResult {
  success: boolean;
  canceled?: boolean;
  fileName?: string;
  counts?: {
    cards: number;
    transactions: number;
    investments: number;
    categories: number;
  };
  error?: string;
}

/**
 * Salva todos os dados locais em um arquivo JSON.
 * No Android, utiliza o StorageAccessFramework para permitir que o usuário salve
 * em qualquer pasta do dispositivo (como Downloads ou Documentos), sobrevivendo à desinstalação.
 */
export async function exportBackupToFile(): Promise<ExportBackupResult> {
  try {
    const payload = exportAllDataForBackup();
    const jsonString = JSON.stringify(payload, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `finz_backup_${dateStr}.json`;

    // 1. Ambiente Web
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return {
          success: true,
          fileName,
          summary: payload.summary,
        };
      }
      return { success: false, error: 'Download de arquivo não suportado neste navegador.' };
    }

    // 2. Android: Usa StorageAccessFramework para salvar fora da sandbox do app
    if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
      const permissions =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (!permissions.granted) {
        return { success: false, canceled: true };
      }

      // Cria o arquivo na pasta escolhida pelo usuário
      const createdFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        fileName,
        'application/json'
      );

      // Escreve os dados no arquivo
      await FileSystem.StorageAccessFramework.writeAsStringAsync(
        createdFileUri,
        jsonString,
        { encoding: FileSystem.EncodingType.UTF8 }
      );

      return {
        success: true,
        fileName,
        uri: createdFileUri,
        summary: payload.summary,
      };
    }

    // 3. iOS ou fallback para documentDirectory
    const targetUri = `${FileSystem.documentDirectory || ''}${fileName}`;
    await FileSystem.writeAsStringAsync(targetUri, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Tenta compartilhar nativamente se o módulo sharing estiver presente
    try {
      const Sharing = require('expo-sharing');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri, {
          mimeType: 'application/json',
          dialogTitle: 'Salvar backup do Finz',
          UTI: 'public.json',
        });
      }
    } catch {
      // Ignora se não houver expo-sharing
    }

    return {
      success: true,
      fileName,
      uri: targetUri,
      summary: payload.summary,
    };
  } catch (err: any) {
    console.error('[backupService] Falha ao exportar backup:', err);
    return {
      success: false,
      error: err?.message || 'Falha ao salvar o arquivo de backup.',
    };
  }
}

/**
 * Abre o seletor de documentos para carregar um arquivo JSON de backup local,
 * valida a integridade dos dados e restaura todas as tabelas e o estado da aplicação.
 */
export async function importBackupFromFile(): Promise<ImportBackupResult> {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/*', '*/*'],
      copyToCacheDirectory: true,
    });

    if (res.canceled || !res.assets || res.assets.length === 0) {
      return { success: false, canceled: true };
    }

    const selectedAsset = res.assets[0];
    let fileContent = '';

    try {
      fileContent = await FileSystem.readAsStringAsync(selectedAsset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch {
      // Fallback via fetch (para web ou URIs especiais)
      const resp = await fetch(selectedAsset.uri);
      fileContent = await resp.text();
    }

    if (!fileContent || !fileContent.trim()) {
      return { success: false, error: 'O arquivo selecionado está vazio.' };
    }

    let payload: FinzBackupPayload;
    try {
      payload = JSON.parse(fileContent);
    } catch {
      return {
        success: false,
        error: 'O arquivo selecionado não contém um formato JSON legível.',
      };
    }

    if (!payload || payload.format !== 'finz_backup' || !payload.data) {
      return {
        success: false,
        error:
          'O arquivo selecionado não é um backup válido do Finz ou está em formato incompatível.',
      };
    }

    // 1. Restaura no SQLite
    const counts = restoreAllDataFromBackup(payload);

    // 2. Atualiza os estados em memória no Zustand
    useWalletStore.getState().reloadFromSQLite();

    return {
      success: true,
      fileName: selectedAsset.name,
      counts,
    };
  } catch (err: any) {
    console.error('[backupService] Falha ao importar backup:', err);
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao restaurar o backup.',
    };
  }
}
