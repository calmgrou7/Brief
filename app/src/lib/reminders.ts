import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

// 리마인드 알림 (기기 로컬 알림 — 서버 비용 없음, 오프라인에서도 동작)
//  - 무료: 아침 알림 1회 (09:00 고정)
//  - 프리미엄: 아침 시간 선택 + 저녁 마무리 알림

export type ReminderPrefs = {
  enabled: boolean;
  morning: string; // 'HH:MM'
  evening: string | null; // null = 끔
};

export const DEFAULT_PREFS: ReminderPrefs = { enabled: false, morning: '09:00', evening: null };
export const MORNING_OPTIONS = ['07:00', '08:00', '09:00', '10:00'];
export const EVENING_OPTIONS = ['20:00', '21:00', '22:00'];

const KEY = 'doit.reminders.v1';
const CHANNEL = 'reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function loadPrefs(): Promise<ReminderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: '리마인드',
      importance: AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

const hm = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return { hour: h, minute: m };
};

/**
 * 설정을 저장하고 알림을 다시 예약한다. 무료 사용자는 아침 09:00 하나로 강제.
 * 권한이 거부되면 false.
 */
export async function applyPrefs(prefs: ReminderPrefs, isPremium: boolean): Promise<boolean> {
  const effective: ReminderPrefs = isPremium ? prefs : { ...prefs, morning: '09:00', evening: null };
  if (Platform.OS === 'web') return false;

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (effective.enabled) {
    if (!(await ensurePermission())) {
      await AsyncStorage.setItem(KEY, JSON.stringify({ ...effective, enabled: false }));
      return false;
    }
    await Notifications.scheduleNotificationAsync({
      content: { title: '오늘의 DO 3를 골라 볼까요? ☀️', body: '딱 3개만 정하면 하루가 가벼워져요.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, channelId: CHANNEL, ...hm(effective.morning) },
    });
    if (effective.evening) {
      await Notifications.scheduleNotificationAsync({
        content: { title: '오늘 하나라도 끝냈나요? 🔥', body: '1개만 체크해도 연속 기록이 이어져요.' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, channelId: CHANNEL, ...hm(effective.evening) },
      });
    }
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(effective));
  return true;
}
