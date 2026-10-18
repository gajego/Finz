import { useEffect } from 'react';
import { NativeModules, NativeEventEmitter, Platform, Alert } from 'react-native';
import { readReceiptFromFileOrUri } from './universalReceiptReader';
import { ParsedReceipt } from './receiptParser';

const { ShareReceiver } = NativeModules;
const shareEmitter = ShareReceiver ? new NativeEventEmitter(ShareReceiver) : null;

export interface SharedData {
  type: 'image' | 'pdf' | 'text';
  uri?: string;
  mimeType?: string;
  text?: string;
}

export function useShareReceiver(onReceiptReceived: (receipt: ParsedReceipt) => void) {
  useEffect(() => {
    if (Platform.OS !== 'android' || !ShareReceiver) return;

    let isMounted = true;

    const processSharedContent = async (data: SharedData | null) => {
      if (!data || !isMounted) return;

      try {
        let receipt: ParsedReceipt | null = null;
        if (data.uri) {
          receipt = await readReceiptFromFileOrUri(data.uri, data.mimeType);
        } else if (data.text) {
          receipt = await readReceiptFromFileOrUri(data.text);
        }

        if (!isMounted) return;

        if (receipt) {
          onReceiptReceived(receipt);
        } else {
          Alert.alert(
            'Comprovante Não Reconhecido',
            'O Finz recebeu o arquivo compartilhado, mas não foi possível identificar dados de pagamento válidos (Pix ou compra).'
          );
        }
      } catch (err) {
        console.warn('[useShareReceiver] Falha ao processar compartilhamento:', err);
      }
    };

    // 1. Cold start: aplicativo aberto pelo menu de compartilhamento
    ShareReceiver.getInitialShare().then((initialData: SharedData | null) => {
      if (initialData) {
        processSharedContent(initialData);
      }
    });

    // 2. Warm start: aplicativo já aberto recebendo novo compartilhamento
    const sub = shareEmitter?.addListener('onShareReceived', (data: any) => {
      processSharedContent(data as SharedData);
    });

    return () => {
      isMounted = false;
      sub?.remove();
    };
  }, [onReceiptReceived]);
}
