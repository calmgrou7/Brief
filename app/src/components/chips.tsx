import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/theme';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
};

export function Chips<T extends string>({ options, value, onChange, disabled }: Props<T>) {
  return (
    <View style={styles.row}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, disabled }}
            style={[styles.chip, on && styles.on, disabled && !on && { opacity: 0.4 }]}>
            <Text style={[styles.text, on && styles.textOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.white },
  on: { backgroundColor: C.ink, borderColor: C.ink },
  text: { fontSize: 14, fontWeight: '700', color: C.ink },
  textOn: { color: C.lime },
});
