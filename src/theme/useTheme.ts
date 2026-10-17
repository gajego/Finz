import { create } from 'zustand';
import { Appearance } from 'react-native';
import { DarkTheme, LightTheme, ThemeColors } from './colors';

interface ThemeState {
  mode: 'dark' | 'light';
  colors: ThemeColors;
  toggleTheme: () => void;
  setMode: (mode: 'dark' | 'light') => void;
}

const initialMode: 'dark' | 'light' = Appearance.getColorScheme() === 'light' ? 'light' : 'dark';

export const useTheme = create<ThemeState>((set) => ({
  mode: initialMode,
  colors: initialMode === 'light' ? LightTheme : DarkTheme,
  toggleTheme: () =>
    set((state) => {
      const nextMode = state.mode === 'dark' ? 'light' : 'dark';
      return {
        mode: nextMode,
        colors: nextMode === 'light' ? LightTheme : DarkTheme,
      };
    }),
  setMode: (mode) =>
    set({
      mode,
      colors: mode === 'light' ? LightTheme : DarkTheme,
    }),
}));
