# Especificação Técnica do Sistema: Carteira & Gestão Financeira Local-First

Aplicativo mobile de finanças pessoais de alta fidelidade visual (Android & iOS via React Native), focado em experiência tátil, animações fluidas de 60/120 FPS, componentização modular expansível, rastreamento automático de gastos via notificações nativas do Android e operação 100% local (sem dependência de backend pago).

---

## 1. Princípios Arquiteturais e Stack

- **Filosofia de Dados:** *Local-First*. Os dados pertencem exclusivamente ao dispositivo do usuário.
- **Framework Principal:** React Native 0.74+ (com React Native CLI ou Bare Workflow).
- **Linguagem:** TypeScript em modo estrito (`strict: true`).
- **Animações e Gráficos:**
  - `react-native-reanimated` (v3+): Interações acionadas por gestos e física.
  - `react-native-gesture-handler`: Reconhecimento de gestos complexos (arrasto, pinça, rotação).
  - `@shopify/react-native-skia`: Renderização de shaders, efeito líquido, desfoques e reflexos de luz.
- **Persistência & Banco Local:**
  - `react-native-mmkv`: Armazenamento de alta velocidade para preferências, estado do onboarding e chaves de sessão.
  - `react-native-quick-sqlite` ou `WatermelonDB`: Armazenamento relacional para transações históricas, cartões e categorias.
- **Rastreamento de Hardware:**
  - `react-native-sensors`: Acelerômetro/Giroscópio para efeitos de inclinação 3D dos cartões.
  - Módulo nativo Android (`NotificationListenerService`): Captura de pushes bancários em background.
- **Notificações & Agendamento:**
  - `react-native-notifee` ou `Android WorkManager` nativo para disparar os lembretes de revisão semanal, mensal e anual.

---

## 2. Estrutura de Diretórios Modular (Feature-Driven)

```text
src/
├── app/                      # Inicialização, Provedores globais e Navegação
│   ├── navigation/
│   └── providers/
├── assets/                   # Fontes, sons, texturas e ícones base
│   ├── sounds/
│   └── textures/
├── components/ui/            # Átomos e moléculas reaproveitáveis
│   ├── AnimatedNumber.tsx
│   ├── Badge.tsx
│   ├── BlurModal.tsx
│   ├── Button.tsx
│   ├── GlassView.tsx
│   └── TextInput.tsx
├── features/
│   ├── onboarding/           # Coleta de perfil e permissões iniciais
│   │   ├── components/
│   │   ├── hooks/
│   │   └── screens/
│   ├── cards/                # Gestão de cartões, skins e renderização 3D
│   │   ├── components/       # CardView, SkinPicker, GyroReflection
│   │   ├── hooks/
│   │   └── state/
│   ├── notification-engine/  # Módulo nativo e regras de parsing de bancos
│   │   ├── android/          # Implementação Kotlin do NotificationListener
│   │   ├── parsers/          # Regex de extração por banco
│   │   └── types.ts
│   ├── transactions/         # Extrato, categorização e busca
│   │   ├── components/
│   │   └── hooks/
│   ├── budgets/              # Metas de gastos com shader líquido
│   │   └── components/       # LiquidProgressView
│   ├── wrapped/              # Stories interativos (Semanal, Mensal, Anual)
│   │   ├── components/       # StoryContainer, StatSlide
│   │   └── hooks/
│   └── privacy/              # Modo Stealth e bloqueio biométrico
├── services/
│   ├── database/             # Schemas e queries SQLite
│   ├── notifications/        # Agendamento local (semana, mês, ano)
│   └── storage/              # Instância do MMKV
└── shared/
    ├── theme/                # Cores, espaçamentos, tipografia
    └── utils/                # Formatadores de moeda, cores e datas
```

---

## 3. Modelo de Dados (Schemas)

### 3.1. Perfil do Usuário (`UserProfile`)
```typescript
interface UserProfile {
  id: string;
  nickname: string;
  fullName: string;
  birthDate: string; // ISO 8601
  createdAt: string;
  onboardingCompleted: boolean;
  stealthModeEnabled: boolean;
}
```

### 3.2. Cartão / Banco (`BankCard`)
```typescript
interface BankCard {
  id: string;
  bankName: string;            // Ex: "Nubank", "Itaú", "Inter"
  packageName: string;         // Ex: "com.nu.production", "com.itau"
  wallpaperUri: string;        // Path local da imagem ou gradiente predefinido
  textureType: 'glass' | 'carbon' | 'metal' | 'matte' | 'custom';
  accentColor: string;
  textTheme: 'light' | 'dark' | 'auto';
  balanceOrLimit: number;
  order: number;
}
```

### 3.3. Transação (`Transaction`)
```typescript
interface Transaction {
  id: string;
  bankCardId: string;          // FK para BankCard
  amount: number;              // Em centavos (inteiro para evitar imprecisão de float)
  merchant: string;            // Estabelecimento (ex: "iFood", "Posto Shell")
  categoryId: string;          // FK para Category
  timestamp: number;           // Unix epoch ms
  rawText?: string;            // Log original do push para auditoria
  isManual: boolean;           // true se o usuário digitou, false se veio do listener
}
```

### 3.4. Categoria & Meta (`Category`)
```typescript
interface Category {
  id: string;
  name: string;                // "Alimentação", "Transporte", etc.
  icon: string;                // Nome do ícone
  colorHex: string;
  monthlyLimit: number;        // Limite estipulado em centavos
}
```

---

## 4. Especificação dos Módulos Principais

### Módulo 1: Onboarding e Perfil Inicial
1. **Entrada Animada:** Telas de transição horizontal com desaceleração física (spring physics).
2. **Coleta de Dados:**
   - Apelido (Nickname): Usado para saudações e títulos de relatórios.
   - Nome Completo: Criptografado no dispositivo.
   - Data de Nascimento: Componente de calendário estilo roleta (iOS-like) ou seletor circular com micro-vibrações táteis.
3. **Guia de Permissão de Notificação:**
   - Tela educativa interativa demonstrando que apenas valores e nomes de compras são processados.
   - Botão com redirecionamento direto para a tela de configurações de Acesso a Notificações do Android (`Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS`).

### Módulo 2: Card Studio & Motor Visual 3D
1. **Renderização do Cartão:**
   - Componente `InteractiveCard` montado sobre canvas do `@shopify/react-native-skia`.
   - Utilização do giroscópio do dispositivo para inclinar o cartão em até 15 graus no eixo X e Y conforme o movimento da mão.
   - Shader de luz especular simulando o brilho refletido em cartões metálicos ou holográficos.
2. **Editor de Skins:**
   - Opções de fábrica: Gradientes aurora, fibra de carbono, metal escovado, vidro translúcido.
   - Modo Custom: O usuário carrega qualquer imagem da galeria. O sistema calcula o brilho médio da imagem (YIQ formula) e define o contraste dos textos automaticamente.

### Módulo 3: Motor Nativo de Notificações (`NotificationListenerService`) & Parsers

#### 3.1. Classificação de Tipos de Transação
O sistema categoriza a notificação em 4 tipos operacionais:
- `EXPENSE`: Compra no crédito ou débito (adiciona gasto).
- `REFUND`: Estorno ou compra cancelada (subtrai do gasto ou estorna transação anterior).
- `PIX_OUT`: Transferência Pix enviada (adiciona gasto).
- `PIX_IN`: Pix recebido (opcional para abatimento/crédito).

#### 3.2. Dicionário de Regex e Padrões dos Bancos Brasileiros

```typescript
export interface ParsedBankNotification {
  type: 'EXPENSE' | 'REFUND' | 'PIX_OUT' | 'PIX_IN';
  amountInCents: number;
  merchantOrRecipient: string;
  bankPackage: string;
  rawText: string;
}

export const BANK_PATTERNS = {
  // NUBANK
  'com.nu.production': {
    refund: [
      /compra\s+de\s+R\$\s*([\d\.,]+)\s+no\s+(.+?)\s+foi\s+estornada/i,
      /estorno\s+de\s+R\$\s*([\d\.,]+)\s+(?:no|em)\s+(.+)/i,
      /compra\s+cancelada:\s*R\$\s*([\d\.,]+)\s+no\s+(.+)/i,
    ],
    expense: [
      /compra\s+de\s+R\$\s*([\d\.,]+)\s+aprovada\s+no\s+(.+)/i,
      /voc[eê]\s+comprou\s+R\$\s*([\d\.,]+)\s+no\s+(.+)/i,
      /compra\s+de\s+R\$\s*([\d\.,]+)\s+em\s+(.+)/i,
    ],
    pixOut: [
      /transfer[eê]ncia\s+de\s+R\$\s*([\d\.,]+)\s+para\s+(.+?)\s+enviada/i,
      /pix\s+enviado:\s*R\$\s*([\d\.,]+)\s+para\s+(.+)/i,
    ],
    pixIn: [
      /voc[eê]\s+recebeu\s+um\s+pix\s+de\s+R\$\s*([\d\.,]+)\s+de\s+(.+)/i,
    ]
  },

  // ITAÚ
  'com.itau': {
    refund: [
      /compra\s+cancelada\s+de\s+R\$\s*([\d\.,]+)\s+em\s+(.+)/i,
      /estorno\s+aprovado\s+de\s+R\$\s*([\d\.,]+)\s+em\s+(.+)/i,
    ],
    expense: [
      /compra\s+aprovada.*?R\$\s*([\d\.,]+)\s+em\s+(.+)/i,
      /compra\s+de\s+R\$\s*([\d\.,]+)\s+no\s+cart[aã]o.*?em\s+(.+)/i,
    ],
    pixOut: [
      /pix\s+enviado\s+no\s+valor\s+de\s+R\$\s*([\d\.,]+)\s+para\s+(.+)/i,
    ],
    pixIn: [
      /voc[eê]\s+recebeu\s+um\s+pix\s+de\s+R\$\s*([\d\.,]+)/i,
    ]
  },

  // BANCO INTER
  'br.com.intermedium': {
    refund: [
      /estorno\s+aprovado\s+de\s+R\$\s*([\d\.,]+)\s+em\s+(.+)/i,
      /compra\s+estornada\s+de\s+R\$\s*([\d\.,]+)/i,
    ],
    expense: [
      /compra\s+aprovada.*?:?\s*R\$\s*([\d\.,]+)\s+em\s+(.+)/i,
      /compra\s+de\s+R\$\s*([\d\.,]+)\s+no\s+cart[aã]o/i,
    ],
    pixOut: [
      /voc[eê]\s+transferiu\s+R\$\s*([\d\.,]+)\s+via\s+pix\s+para\s+(.+)/i,
    ],
    pixIn: [
      /voc[eê]\s+recebeu\s+um\s+pix\s+de\s+R\$\s*([\d\.,]+)/i,
    ]
  },

  // BRADESCO
  'com.bancobradesco': {
    refund: [
      /compra\s+cancelada.*?R\$\s*([\d\.,]+)\s+em\s+(.+)/i,
      /estorno\s+de\s+R\$\s*([\d\.,]+)/i,
    ],
    expense: [
      /compra\s+aprovada\s+R\$\s*([\d\.,]+)\s+em\s+(.+)/i,
    ],
    pixOut: [
      /pix\s+enviado\s+R\$\s*([\d\.,]+)\s+para\s+(.+)/i,
    ],
    pixIn: [
      /pix\s+recebido\s+R\$\s*([\d\.,]+)/i,
    ]
  },

  // C6 BANK
  'com.c6bank.app': {
    refund: [
      /estorno\s+realizado\s+de\s+R\$\s*([\d\.,]+)\s+em\s+(.+)/i,
      /compra\s+cancelada.*?R\$\s*([\d\.,]+)/i,
    ],
    expense: [
      /compra\s+aprovada.*?:?\s*R\$\s*([\d\.,]+)\s+n[ao]\s+(.+)/i,
    ],
    pixOut: [
      /pix\s+enviado\s+no\s+valor\s+de\s+R\$\s*([\d\.,]+)/i,
    ],
    pixIn: [
      /voc[eê]\s+recebeu\s+um\s+pix\s+de\s+R\$\s*([\d\.,]+)/i,
    ]
  },

  // MERCADO PAGO
  'com.mercadopago.wallet': {
    refund: [
      /pagamento\s+de\s+R\$\s*([\d\.,]+)\s+foi\s+devolvido/i,
      /estorno\s+de\s+R\$\s*([\d\.,]+)/i,
    ],
    expense: [
      /voc[eê]\s+pagou\s+R\$\s*([\d\.,]+)\s+para\s+(.+)/i,
      /compra\s+aprovada\s+no\s+valor\s+de\s+R\$\s*([\d\.,]+)/i,
    ],
    pixOut: [
      /voc[eê]\s+enviou\s+R\$\s*([\d\.,]+)\s+com\s+pix/i,
    ],
    pixIn: [
      /te\s+enviaram\s+R\$\s*([\d\.,]+)\s+com\s+pix/i,
    ]
  }
};
```

#### 3.3. Lógica de Reversão de Estornos
Quando o parser detecta um `REFUND`:
1. Busca no SQLite a última transação do mesmo banco com valor idêntico e estabelecimento similar nos últimos 30 dias.
2. Marca a transação original como `status = 'REFUNDED'`.
3. Registra uma transação compensatória negativa ou neutralizadora com badge visual de "Estornado".
4. Dispara recálculo imediato do orçamento da categoria correspondente.

### Módulo 4: Metas de Gastos com Efeito Líquido (Liquid Budgeting)
1. **Shader Skia:**
   - Um contêiner que simula um líquido em movimento com ondas senoidais dinâmicas reagindo à rolagem da lista de extrato.
2. **Estados Visuais de Alerta:**
   - 0% a 70%: Verde neon / Azul ciano, ondas calmas.
   - 71% a 90%: Âmbar / Laranja brilhante, frequência da onda aumenta.
   - 91% a 100%+: Vermelho carmim pulsante, líquido atinge o topo com micro-vibração no aparelho.

### Módulo 5: Stories & Wrapped Periódico (Agendamentos Automáticos)
1. **Agendamento em Segundo Plano:**
   - **Todo Domingo às 20h:** Notificação de Fechamento Semanal.
   - **Dia 01 de cada mês às 09h:** Notificação da Retrospectiva do Mês Anterior.
   - **Dia 01 de Janeiro às 10h:** Notificação do "Ano em Revista" (Annual Wrapped).
2. **Experiência de Exibição:**
   - Interface idêntica a Stories (Instagram / Spotify Wrapped).
   - Telas sequenciais com barras de progresso temporizadas:
     - Slide 1: Total gasto e comparativo percentual com o período anterior.
     - Slide 2: O maior estabelecimento individual (ex: "Seu lugar favorito foi o Posto Shell").
     - Slide 3: Gráfico de rosca dinâmico mostrando a categoria que mais consumiu recursos.
     - Slide 4: Conquista ou mensagem motivacional gerada com base nos dados.

### Módulo 6: Modo Privacidade (Stealth Mode)
1. **Gesto de Ativação:**
   - Ao agitar o celular (`shake`) ou ao virar o telefone com a tela para baixo, o app aplica uma camada de desfoque gaussiano (Blur) sobre todos os saldos e valores da tela.
2. **Desbloqueio:**
   - Toque sobre o valor ocultado dispara a autenticação biométrica nativa (`BiometricPrompt`).

---

## 5. Arquitetura de Sobrevivência do NotificationListenerService (Anti-Kill & Doze Mode)

Para garantir que o serviço nunca seja interrompido por fabricantes agressivos (Xiaomi MIUI/HyperOS, Samsung OneUI, Huawei) ou pelo Doze Mode do Android, aplicam-se **4 camadas de redundância nativa**:

### Camada 1: Desativação de Otimização de Bateria
Solicitação explícita ao sistema operacional para ignorar otimizações de economia de energia:
- Permissão: `<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"/>`
- Intent invocado durante o onboarding:
```kotlin
if (!powerManager.isIgnoringBatteryOptimizations(packageName)) {
    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
        data = Uri.parse("package:$packageName")
    }
    context.startActivity(intent)
}
```

### Camada 2: Helper de Autostart para OEMs Específicos
Módulo nativo que detecta a fabricante do aparelho (`Build.MANUFACTURER`) e abre a tela oculta de "Início Automático / Sem restrições":
- **Xiaomi (MIUI):** `com.miui.securitycenter/com.miui.permcenter.autostart.AutoStartManagementActivity`
- **Samsung:** `com.samsung.android.lool` ou `DeviceCareActivity`
- **Huawei:** `com.huawei.systemmanager/.startupmgr.ui.StartupNormalAppListActivity`
- **Oppo/Realme:** `com.coloros.safecenter/com.coloros.safecenter.permission.startup.StartupAppListActivity`

### Camada 3: O Truque de Auto-Ressuscitação do Componente (Rebind Hack)
Quando o Android suspende silenciosamente o listener após limpeza de memória, o sistema não religa o serviço sozinho. Criamos um helper nativo que força o `NotificationManagerService` do Android a religar o serviço sem precisar de reinicialização do celular:
```kotlin
object NotificationListenerResurrector {
    fun forceRebind(context: Context) {
        val componentName = ComponentName(context, BankNotificationListener::class.java)
        val packageManager = context.packageManager
        
        // Desabilita e reabilita o componente instantaneamente sem matar o app
        packageManager.setComponentEnabledSetting(
            componentName,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP
        )
        packageManager.setComponentEnabledSetting(
            componentName,
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
            PackageManager.DONT_KILL_APP
        )
    }
}
```

### Camada 4: Watchdog com Android WorkManager (Checagem a cada 15 min)
Configuração de um `PeriodicWorkRequest` de 15 minutos (tempo mínimo do Android) que age como cão de guarda:
1. Verifica se a permissão continua ativa em `NotificationManagerCompat.getEnabledListenerPackages()`.
2. Se a permissão estiver ativa mas o serviço nativo não registrou heartbeat nos últimos 20 minutos, invoca o `NotificationListenerResurrector.forceRebind(context)`.
3. Garante que qualquer notificação perdida em fila seja processada assim que a conexão se restabelecer.


### 5.5. Configuração no AndroidManifest.xml
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Permissões de Sobrevivência e Notificação -->
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />

    <application>
        <!-- Serviço Ouvinte de Notificações Bancárias -->
        <service
            android:name=".notification.BankNotificationListener"
            android:label="Leitor Inteligente de Gastos"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>

        <!-- Receptor de Reinicialização do Aparelho (Boot) -->
        <receiver
            android:name=".notification.BootReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
            </intent-filter>
        </receiver>
    </application>
</manifest>
```

---

## 6. Critérios de Performance e Qualidade
- **Taxa de Quadros:** Todas as animações de transição de rota e gestos de toque devem rodar exclusivamente na thread de UI (via Worklets do Reanimated).
- **Consumo de Memória:** Imagens de wallpapers de cartões devem ser redimensionadas e armazenadas em resolução máxima de 1080x720 para evitar estouro de memória (OOM).
- **Isolamento de Erros:** Nenhuma falha na leitura ou no parser de uma notificação pode travar o aplicativo ou interromper o serviço nativo.

---

## 7. Módulo de UI/UX: Guia Visual de Permissão por Fabricante (Onboarding)

O fluxo de Onboarding possui uma etapa dedicada com detecção dinâmica da fabricante do dispositivo (`Platform.constants.Manufacturer` ou `react-native-device-info`).

### 7.1. Especificação do Componente `ManufacturerPermissionStep.tsx`

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, NativeModules, Platform } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { GlassView } from '@/components/ui/GlassView';
import { Icon } from '@/components/ui/Icon';

interface OEMGuide {
  title: string;
  badge: string;
  steps: string[];
  actionLabel: string;
  nativeAction: string;
}

const OEM_CONFIGS: Record<string, OEMGuide> = {
  xiaomi: {
    title: 'Configuração Xiaomi / HyperOS',
    badge: 'Atenção Necessária',
    steps: [
      '1. Toque no botão abaixo para abrir a Central de Segurança.',
      '2. Ative a chave "Início Automático" para o app.',
      '3. Em "Economia de Bateria", selecione "Sem Restrições".'
    ],
    actionLabel: 'Abrir Segurança da Xiaomi',
    nativeAction: 'OPEN_XIAOMI_AUTOSTART'
  },
  samsung: {
    title: 'Configuração Samsung One UI',
    badge: 'Uso em Segundo Plano',
    steps: [
      '1. Toque abaixo para abrir a Assistência do Aparelho.',
      '2. Acesse "Bateria" > "Limites de uso em 2º plano".',
      '3. Adicione o app na lista "Aplicativos nunca suspensos".'
    ],
    actionLabel: 'Configurar Bateria Samsung',
    nativeAction: 'OPEN_SAMSUNG_BATTERY'
  },
  generic: {
    title: 'Otimização de Bateria',
    badge: 'Desempenho Contínuo',
    steps: [
      '1. Toque no botão abaixo.',
      '2. Na caixa de diálogo do sistema, escolha "Permitir" para que o app continue registrando gastos mesmo com a tela apagada.'
    ],
    actionLabel: 'Desativar Otimização',
    nativeAction: 'REQUEST_IGNORE_BATTERY'
  }
};

export const ManufacturerPermissionStep: React.FC<{ onCompleted: () => void }> = ({ onCompleted }) => {
  const brand = (Platform.constants as any)?.Manufacturer?.toLowerCase() || 'generic';
  const config = OEM_CONFIGS[brand] || OEM_CONFIGS.generic;

  const handleOpenSettings = async () => {
    try {
      await NativeModules.AutostartHelper.openSetting(config.nativeAction);
    } catch {
      await NativeModules.AutostartHelper.openSetting('REQUEST_IGNORE_BATTERY');
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{config.badge}</Text>
        </View>
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.subtitle}>
          Para registrar seus gastos automaticamente sem conexão com a internet ou servidores externos, precisamos que o Android não congele o aplicativo.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).duration(600)}>
        <GlassView style={styles.cardSteps}>
          {config.steps.map((step, idx) => (
            <View key={idx} style={styles.stepRow}>
              <Icon name="check-circle" size={20} color="#00FF88" />
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </GlassView>
      </Animated.View>

      <View style={styles.footer}>
        <Pressable style={styles.primaryButton} onPress={handleOpenSettings}>
          <Text style={styles.primaryButtonText}>{config.actionLabel}</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={onCompleted}>
          <Text style={styles.secondaryButtonText}>Já configurei, continuar →</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'space-between', backgroundColor: '#0B0D13' },
  header: { marginTop: 40 },
  badgeContainer: { backgroundColor: 'rgba(0, 255, 136, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 12 },
  badgeText: { color: '#00FF88', fontSize: 12, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#8F9CAE', lineHeight: 22 },
  cardSteps: { padding: 20, borderRadius: 16, gap: 16, marginVertical: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepText: { color: '#E1E7EC', fontSize: 14, flex: 1, lineHeight: 20 },
  footer: { gap: 12, marginBottom: 20 },
  primaryButton: { backgroundColor: '#00FF88', height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: '#0B0D13', fontSize: 16, fontWeight: '700' },
  secondaryButton: { height: 48, justifyContent: 'center', alignItems: 'center' },
  secondaryButtonText: { color: '#8F9CAE', fontSize: 14, fontWeight: '600' }
});
```

---

## 8. Declaração Oficial para o Google Play Console (Formulário de Conformidade)

Ao publicar o app na Google Play Store, o console exige o preenchimento da seção **"Declaração de Acesso Especial: Ignorar Otimizações de Bateria"**. Abaixo está o texto exato pronto para submissão (em Inglês, língua oficial dos revisores, e Português):

### 8.1. Pergunta do Console: Qual a funcionalidade principal que exige a permissão `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`?
**Seleção no formulário:** `Task Management / Financial Tracker / Real-time Local Processing`

### 8.2. Texto de Justificativa Oficial (Copy & Paste para o Google Reviewer):

#### Versão em Inglês (Recomendada para o Console da Google):
> **Core Purpose:**
> Our application is a 100% local-first personal financial manager designed to respect user privacy by strictly avoiding the storage or transmission of sensitive financial data to any external cloud servers.
> 
> **Why Firebase Cloud Messaging (FCM) is not an option:**
> Because the application does not have a backend server or access to users' private bank APIs, it cannot receive remote push notifications about transactions. Instead, the application relies on the on-device `NotificationListenerService` to locally capture transaction alerts generated by authorized Brazilian banking apps (e.g., Nubank, Itaú) at the exact moment a purchase or refund occurs.
>
> **Why Battery Optimization Exemption is critical:**
> When the device enters Doze Mode or is subject to aggressive OEM battery-saver policies (such as Xiaomi or Samsung task cleaners), background notification delivery to local listeners is frozen or terminated. Without the `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` exemption, financial transactions made while the screen is locked would be permanently missed, resulting in inaccurate expense tracking and broken core functionality.
>
> **User Transparency & Consent:**
> The app explicitly requests this permission during an educational onboarding step where users are informed about why it is needed. Users retain full control to enable or disable this permission at any time in system settings without degrading any other offline feature of the app.

#### Versão em Português:
> **Finalidade Principal:**
> Nosso aplicativo é um gerenciador financeiro 100% local-first, desenvolvido com foco na privacidade do usuário, sem transmitir nem armazenar dados em servidores externos na nuvem.
> 
> **Por que FCM não é viável:**
> Como o app não possui backend ou acesso a credenciais bancárias, ele depende exclusivamente do `NotificationListenerService` no dispositivo para detectar, em tempo real, as notificações emitidas pelos bancos autorizados no momento da transação.
> 
> **Necessidade da Isenção de Bateria:**
> Sem essa isenção, o Doze Mode do Android ou os limpadores de memória das fabricantes congelam o ouvinte nativo, fazendo com que compras realizadas com a tela bloqueada sejam perdidas, inviabilizando a função central do app.

