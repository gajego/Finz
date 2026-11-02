/**
 * FINZ WEBRTC HOST (Mobile P2P Engine)
 * Sincroniza em tempo real o estado local das stores do SQLite/Zustand
 * para a interface Finz Web via RTCDataChannel ou Relay WebSocket.
 */

import { useWalletStore } from '../../store/useWalletStore';
import { SyncFullStatePayload, SyncMessage } from '../../types';

export type HostConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

class WebSyncHost {
  private ws: WebSocket | null = null;
  private peer: any = null;
  private dataChannel: any = null;
  private unsubscribeStore: (() => void) | null = null;
  private currentRoomId = '';
  private currentServerUrl = '';
  private stateListeners: Set<(state: HostConnectionState, error?: string | null) => void> = new Set();
  private connectionState: HostConnectionState = 'idle';
  private connectTimeout: any = null;

  public addListener(cb: (state: HostConnectionState, error?: string | null) => void) {
    this.stateListeners.add(cb);
    cb(this.connectionState);
    return () => this.stateListeners.delete(cb);
  }

  private notifyState(state: HostConnectionState, error: string | null = null) {
    this.connectionState = state;
    for (const listener of this.stateListeners) {
      listener(state, error);
    }
  }

  public connect(serverUrl: string, roomId: string) {
    this.disconnect();
    this.currentRoomId = roomId.trim().toUpperCase();
    this.currentServerUrl = serverUrl.trim();
    this.notifyState('connecting');

    // Timeout de segurança para evitar loading infinito caso a porta/IP não responda
    this.connectTimeout = setTimeout(() => {
      if (this.connectionState === 'connecting') {
        console.warn('[WebSyncHost] Timeout ao tentar conectar em:', this.currentServerUrl);
        this.disconnect();
        this.notifyState(
          'error',
          'Tempo limite esgotado. Verifique se o Finz Web está aberto no PC e se ambos estão na mesma rede Wi-Fi.'
        );
      }
    }, 6000);

    try {
      this.ws = new WebSocket(this.currentServerUrl);

      this.ws.onopen = () => {
        if (this.connectTimeout) {
          clearTimeout(this.connectTimeout);
          this.connectTimeout = null;
        }
        console.log('[WebSyncHost] Conectado ao Signaling Server. Ingressando na sala:', this.currentRoomId);
        this.ws?.send(
          JSON.stringify({
            type: 'join',
            roomId: this.currentRoomId,
            role: 'mobile',
          })
        );
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'joined') {
            console.log('[WebSyncHost] Ingressou na sala. Enviando snapshot inicial...');
            this.sendFullState();
            this.setupStoreSubscription();
            this.notifyState('connected');
            return;
          }

          if (msg.type === 'signal') {
            await this.handleSignaling(msg.signalData);
            return;
          }

          if (msg.type === 'REQUEST_FULL_STATE') {
            this.sendFullState();
            return;
          }
        } catch (err) {
          console.error('[WebSyncHost] Erro ao processar mensagem do servidor:', err);
        }
      };

      this.ws.onerror = (e) => {
        if (this.connectTimeout) {
          clearTimeout(this.connectTimeout);
          this.connectTimeout = null;
        }
        console.error('[WebSyncHost] Erro no WebSocket de Sinalização:', e);
        this.notifyState('error', 'Não foi possível conectar ao IP especificado. Verifique a porta e o Wi-Fi.');
      };

      this.ws.onclose = () => {
        if (this.connectTimeout) {
          clearTimeout(this.connectTimeout);
          this.connectTimeout = null;
        }
        console.log('[WebSyncHost] WebSocket de Sinalização encerrado.');
        if (this.connectionState !== 'error') {
          this.notifyState('disconnected');
        }
        this.cleanupSubscription();
      };
    } catch (err: any) {
      if (this.connectTimeout) {
        clearTimeout(this.connectTimeout);
        this.connectTimeout = null;
      }
      this.notifyState('error', err?.message || 'Erro ao inicializar conexão.');
    }
  }

  private async handleSignaling(signal: any) {
    // Caso suporte RTCPeerConnection no ambiente
    try {
      const g = globalThis as any;
      const globalRTC = g.RTCPeerConnection;
      if (globalRTC && !this.peer) {
        this.peer = new globalRTC({
          // 100% Offline / Rede Local (LAN) sem requisições para servidores STUN externos
          iceServers: [],
        });

        this.peer.onicecandidate = (event: any) => {
          if (event.candidate && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(
              JSON.stringify({
                type: 'signal',
                roomId: this.currentRoomId,
                signalData: { type: 'candidate', candidate: event.candidate },
              })
            );
          }
        };

        this.peer.ondatachannel = (event: any) => {
          this.dataChannel = event.channel;
          this.dataChannel.onopen = () => {
            console.log('[WebSyncHost] RTCDataChannel conectado diretamente!');
            this.sendFullState();
          };
          this.dataChannel.onmessage = (e: any) => {
            try {
              const data = JSON.parse(e.data);
              if (data.type === 'REQUEST_FULL_STATE') this.sendFullState();
            } catch {}
          };
        };
      }

      if (this.peer && signal.type === 'offer') {
        const SessionDesc = g.RTCSessionDescription;
        await this.peer.setRemoteDescription(new SessionDesc(signal.sdp));
        const answer = await this.peer.createAnswer();
        await this.peer.setLocalDescription(answer);

        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              type: 'signal',
              roomId: this.currentRoomId,
              signalData: { type: 'answer', sdp: answer },
            })
          );
        }
      } else if (this.peer && signal.type === 'candidate') {
        const Candidate = g.RTCIceCandidate;
        await this.peer.addIceCandidate(new Candidate(signal.candidate));
      }
    } catch (e) {
      console.warn('[WebSyncHost] WebRTC nativo não inicializado, operando via canal seguro de relay WebSocket:', e);
    }
  }

  public sendFullState() {
    const state = useWalletStore.getState();
    const payload: SyncFullStatePayload = {
      profile: state.profile,
      cards: state.cards,
      transactions: state.transactions,
      categories: state.categories,
      investments: state.investments,
      notificationPreference: state.notificationPreference,
      activeCardIndex: state.activeCardIndex,
      privacyMode: state.privacyMode,
      presentationMode: state.presentationMode,
      smartAlerts: state.activeAlert ? [state.activeAlert] : [],
      syncedAt: Date.now(),
    };

    const msg: SyncMessage = {
      type: 'SYNC_FULL_STATE',
      payload,
    };

    this.sendMessage(msg);
  }

  public sendDelta(deltaType: any, data: any) {
    const msg: SyncMessage = {
      type: 'SYNC_DELTA',
      payload: {
        deltaType,
        data,
        timestamp: Date.now(),
      },
    };
    this.sendMessage(msg);
  }

  private sendMessage(msg: SyncMessage) {
    const serialized = JSON.stringify(msg);

    // Prioriza envio via RTCDataChannel direto se aberto
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(serialized);
        return;
      } catch (e) {
        console.warn('[WebSyncHost] Falha ao enviar via DataChannel, usando relay:', e);
      }
    }

    // Fallback instantâneo e seguro via WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'sync-relay',
          roomId: this.currentRoomId,
          payload: msg,
        })
      );
    }
  }

  private setupStoreSubscription() {
    this.cleanupSubscription();

    let lastTxCount = useWalletStore.getState().transactions.length;
    let lastCards = useWalletStore.getState().cards;
    let lastCategories = useWalletStore.getState().categories;
    let lastProfile = useWalletStore.getState().profile;

    this.unsubscribeStore = useWalletStore.subscribe((state) => {
      // Checa transações novas
      if (state.transactions.length !== lastTxCount) {
        lastTxCount = state.transactions.length;
        if (state.transactions[0]) {
          this.sendDelta('TRANSACTION_ADD', state.transactions[0]);
        }
      }

      // Checa mudanças de perfil
      if (state.profile !== lastProfile) {
        lastProfile = state.profile;
        this.sendDelta('PROFILE_UPDATE', state.profile);
      }

      // Checa cartões
      if (state.cards !== lastCards) {
        lastCards = state.cards;
        this.sendFullState(); // Mantém lista de cartões perfeitamente sincronizada
      }

      // Checa categorias
      if (state.categories !== lastCategories) {
        lastCategories = state.categories;
        this.sendFullState();
      }
    });
  }

  private cleanupSubscription() {
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }
  }

  public disconnect() {
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    this.cleanupSubscription();
    if (this.dataChannel) {
      try { this.dataChannel.close(); } catch {}
      this.dataChannel = null;
    }
    if (this.peer) {
      try { this.peer.close(); } catch {}
      this.peer = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    this.notifyState('idle');
  }

  public getState(): HostConnectionState {
    return this.connectionState;
  }
}

export const webSyncHost = new WebSyncHost();
