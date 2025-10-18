// lib/upload.ts
import { supabase } from './supabase';

/**
 * 把本地图片 URI（如 file:// 或 asset://）上传到
 * Supabase Storage 的 questions bucket，返回公开 URL
 */
export async function uploadImageToBucket(userId: string, uri: string) {
  // 生成存储路径：userId/时间戳.jpg
  const filePath = `${userId}/${Date.now()}.jpg`;

  // 取本地文件为 Blob（Expo 支持 fetch(file://...)）
  const resp = await fetch(uri);
  const blob = await resp.blob();

  const { data, error } = await supabase.storage
    .from('questions')
    .upload(filePath, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw error;

  // 取公开 URL（开发期用公开桶最省事）
  const { data: pub } = supabase.storage.from('questions').getPublicUrl(filePath);
  return pub.publicUrl; // 直接可用于 <Image source={{ uri }} />
}
