// lib/auth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from './uuid';

const KEY = 'ai_mb_user_id';

export async function getOrCreateUserId(): Promise<string> {
  let id = await AsyncStorage.getItem(KEY);
  if (!id) {
    id = randomUUID(); // 生成本地游客ID
    await AsyncStorage.setItem(KEY, id);
  }
  return id!;
}
