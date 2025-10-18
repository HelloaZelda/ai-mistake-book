import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, User } from '@supabase/supabase-js';

import { generateId } from './uuid';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export interface Mistake {
  id: string;
  user_id: string;
  image_url: string | null;
  analysis: any;
  created_at: string;
}

export async function signInAnonymously(): Promise<User | null> {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user ?? null;
}

export function subscribeAuthChanges(callback: (user: User | null) => void) {
  let cancelled = false;

  supabase.auth.getUser().then(({ data }) => {
    if (!cancelled) {
      callback(data.user ?? null);
    }
  });

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!cancelled) {
      callback(session?.user ?? null);
    }
  });

  return () => {
    cancelled = true;
    listener?.subscription.unsubscribe();
  };
}

export async function fetchMistakes(userId: string): Promise<Mistake[]> {
  const { data, error } = await supabase
    .from('mistakes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(item => ({
    ...item,
    analysis: typeof item.analysis === 'string' ? safeParse(item.analysis) : item.analysis,
  }));
}

export async function uploadMistakeImage(userId: string, file: Blob | File, name: string) {
  const ext = name.split('.').pop() || 'jpg';
  const filePath = `${userId}/${generateId()}.${ext}`;
  const { error } = await supabase.storage.from('mistakes').upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: (file as any).type || `image/${ext}`,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('mistakes').getPublicUrl(filePath);
  return data.publicUrl;
}

export async function insertMistake(userId: string, imageUrl: string): Promise<Mistake> {
  const { data, error } = await supabase
    .from('mistakes')
    .insert({ user_id: userId, image_url: imageUrl, analysis: null })
    .select()
    .single();
  if (error) throw error;
  return {
    ...data,
    analysis: data.analysis ?? null,
  } as Mistake;
}

export async function updateMistakeAnalysis(id: string, analysis: any): Promise<Mistake> {
  const payload = { analysis };
  const { data, error } = await supabase.from('mistakes').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return {
    ...data,
    analysis,
  } as Mistake;
}

function safeParse(value: string) {
  try {
    return JSON.parse(value);
  } catch (err) {
    console.warn('解析分析字段失败，将返回原始字符串', err);
    return value;
  }
}
