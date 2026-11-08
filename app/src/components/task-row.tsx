import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, R } from '@/constants/theme';
import type { Task } from '@/lib/types';

type Props = {
  task: Task;
  subtitle?: string;
  onToggle: () => void;
  onLongPress?: () => void;
  right?: React.ReactNode;
};

export function TaskRow({ task, subtitle, onToggle, onLongPress, right }: Props) {
  const done = !!task.done_at;
  return (
    <Pressable onPress={onToggle} onLongPress={onLongPress} style={[styles.row, done && styles.rowDone]} accessibilityRole="checkbox" accessibilityState={{ checked: done }}>
      <View style={[styles.box, done && styles.boxOn]}>{done ? <Text style={styles.mark}>✓</Text> : null}</View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, done && styles.titleDone]}>{task.title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {task.minutes ? <Text style={styles.min}>{task.minutes}분</Text> : null}
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: R.md, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.white },
  rowDone: { backgroundColor: '#F7FFE6', borderColor: '#DFF5A8' },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: '#C9C7BF', alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: C.ink, borderColor: C.ink },
  mark: { color: C.lime, fontWeight: '900' },
  title: { fontSize: 15, fontWeight: '700', color: C.ink },
  titleDone: { textDecorationLine: 'line-through', color: C.muted },
  sub: { fontSize: 12, color: C.muted, marginTop: 2 },
  min: { fontSize: 12, color: C.muted },
});
