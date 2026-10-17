import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Pressable } from 'react-native';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';

interface OnboardingModalProps {
  visible: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ visible, onClose }) => {
  const { colors, mode } = useTheme();
  const profile = useWalletStore((s) => s.profile);
  const setProfile = useWalletStore((s) => s.setProfile);

  const [step, setStep] = useState<1 | 2>(1);
  const [nickname, setNickname] = useState(profile.nickname || '');
  const [fullName, setFullName] = useState(profile.fullName || '');
  const [birthDate, setBirthDate] = useState(profile.birthDate || '');

  const handleNext = () => {
    if (step === 1) {
      if (nickname.trim().length > 0) {
        setStep(2);
      }
    } else {
      setProfile({
        nickname: nickname.trim(),
        fullName: fullName.trim(),
        birthDate: birthDate.trim(),
        onboardingCompleted: true,
      });
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: mode === 'dark' ? colors.surface : colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Badge */}
          <View style={[styles.badge, { backgroundColor: colors.surfaceSubtle }]}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              {step === 1 ? 'Bem-vindo ao Finz' : 'Dados Pessoais'}
            </Text>
          </View>


          {step === 1 ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Como podemos chamar você?</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Seu apelido será exibido nas saudações e nos seus relatórios semanais.
              </Text>

              <TextInput
                placeholder="Ex: Wesley, Mari, Rick..."
                placeholderTextColor={colors.textMuted}
                value={nickname}
                onChangeText={setNickname}
                autoFocus
                style={[
                  styles.input,
                  {
                    backgroundColor: mode === 'dark' ? colors.background : colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
              />
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Quase pronto!</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Informe seus dados para personalizar seus relatórios de aniversário e histórico.
              </Text>

              <TextInput
                placeholder="Nome Completo"
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
                style={[
                  styles.input,
                  {
                    backgroundColor: mode === 'dark' ? colors.background : colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                    marginBottom: 12,
                  },
                ]}
              />

              <TextInput
                placeholder="Data de Nascimento (DD/MM/AAAA)"
                placeholderTextColor={colors.textMuted}
                value={birthDate}
                onChangeText={setBirthDate}
                keyboardType="numeric"
                style={[
                  styles.input,
                  {
                    backgroundColor: mode === 'dark' ? colors.background : colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
              />
            </>
          )}

          {/* Botão de Ação */}
          <Pressable
            onPress={handleNext}
            style={[
              styles.button,
              {
                backgroundColor: colors.primary,
                opacity: step === 1 && !nickname.trim() ? 0.6 : 1,
              },
            ]}
            disabled={step === 1 && !nickname.trim()}
          >
            <Text style={styles.buttonText}>{step === 1 ? 'Continuar' : 'Concluir'}</Text>
            {step === 1 ? (
              <ArrowRight size={18} color="#0B0D13" />
            ) : (
              <CheckCircle2 size={18} color="#0B0D13" />
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 28,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  input: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 18,
    fontSize: 15,
    marginBottom: 20,
  },
  button: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#0B0D13',
    fontSize: 16,
    fontWeight: '800',
  },
});
