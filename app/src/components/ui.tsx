import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, R, S } from '@/constants/theme';

export function Screen({ children, scroll = true, edges }: { children: ReactNode; scroll?: boolean; edges?: ('top' | 'bottom')[] }) {
  return (
    <SafeAreaView style={styles.screen} edges={edges ?? ['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function H1(props: TextProps) {
  return <Text {...props} style={[styles.h1, props.style]} />;
}
export function H2(props: TextProps) {
  return <Text {...props} style={[styles.h2, props.style]} />;
}
export function Body(props: TextProps & { muted?: boolean }) {
  return <Text {...props} style={[styles.body, props.muted && { color: C.muted }, props.style]} />;
}

type BtnProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'dark' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};
export function Button({ title, onPress, variant = 'primary', loading, disabled, style }: BtnProps) {
  const v = btnVariants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.btn, v.box, (disabled || loading) && { opacity: 0.5 }, pressed && { opacity: 0.8 }, style]}>
      {loading ? <ActivityIndicator color={v.text.color} /> : <Text style={[styles.btnText, v.text]}>{title}</Text>}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {props.label ? <Text style={styles.label}>{props.label}</Text> : null}
      <TextInput placeholderTextColor="#A4A3AA" {...props} style={[styles.input, props.style]} />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Check({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: ReactNode }) {
  return (
    <Pressable onPress={onPress} style={styles.checkRow} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={[styles.checkBox, checked && styles.checkBoxOn]}>{checked ? <Text style={styles.checkMark}>✓</Text> : null}</View>
      <View style={{ flex: 1 }}>{typeof label === 'string' ? <Body>{label}</Body> : label}</View>
    </Pressable>
  );
}

export function Center({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper }}>{children}</View>;
}

const btnVariants = {
  primary: { box: { backgroundColor: C.lime }, text: { color: C.ink } },
  dark: { box: { backgroundColor: C.ink }, text: { color: C.white } },
  ghost: { box: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.ink }, text: { color: C.ink } },
  danger: { box: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.danger }, text: { color: C.danger } },
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.md, paddingBottom: 120 },
  h1: { fontSize: 30, fontWeight: '900', color: C.ink, letterSpacing: -0.8 },
  h2: { fontSize: 20, fontWeight: '800', color: C.ink, letterSpacing: -0.4 },
  body: { fontSize: 15, lineHeight: 22, color: C.ink },
  btn: { minHeight: 52, borderRadius: R.pill, paddingHorizontal: S.lg, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontWeight: '800' },
  label: { fontSize: 14, fontWeight: '700', color: C.ink },
  input: { borderWidth: 1.5, borderColor: C.line, backgroundColor: C.white, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: C.ink },
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, padding: S.md, gap: S.sm },
  checkRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 6 },
  checkBox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: '#C9C7BF', alignItems: 'center', justifyContent: 'center', marginTop: 0 },
  checkBoxOn: { backgroundColor: C.ink, borderColor: C.ink },
  checkMark: { color: C.lime, fontWeight: '900', fontSize: 14 },
});
