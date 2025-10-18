// App.tsx
// ------------------
// NOTE: 必须把 reanimated 放在最顶部，且在任何 react / react-native import 之前
import 'react-native-reanimated';

import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { supabase } from './lib/supabase';
import { getOrCreateUserId } from './lib/auth';
import { uploadImageToBucket } from './lib/upload';
import { solveOneImageBase64 } from './lib/ai';

import QuestionCard from './components/QuestionCard';
import Charts from './components/Charts';

/**
 * 简化版类型（可根据需要扩展）
 */
type Item = {
  id: number;
  user_id: string;
  status: string;
  question_text?: string;
  image_url?: string;
  ai_answer?: string;
  analysis_json?: any;
  knowledge_points?: string[];
  created_at: string;
};

export default function App() {
  const [userId, setUserId] = useState<string>('');
  const [tab, setTab] = useState<'todo' | 'mistake' | 'profile'>('todo');

  const [loading, setLoading] = useState(false);
  const [todoList, setTodoList] = useState<Item[]>([]);
  const [mistakeList, setMistakeList] = useState<Item[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [tip, setTip] = useState<string>('');

  // 游客快速登录并刷新数据（只执行一次）
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const id = await getOrCreateUserId();
        if (!mounted) return;
        setUserId(id);
        await refreshLists(id);
      } catch (e) {
        console.warn('初始化失败', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 刷新两张列表
  async function refreshLists(uid = userId) {
    if (!uid) return;
    setLoading(true);
    try {
      const { data: todos } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', uid)
        .eq('status', 'todo')
        .order('created_at', { ascending: false });

      const { data: mistakes } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', uid)
        .in('status', ['mistake', 'solved'])
        .order('created_at', { ascending: false });

      setTodoList(todos || []);
      setMistakeList(mistakes || []);
    } catch (e) {
      console.warn('refreshLists error', e);
    } finally {
      setLoading(false);
    }
  }

  // 拍照并入库
  async function addFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('权限', '需要相机权限以拍照上传');
      return;
    }

    const shot = await ImagePicker.launchCameraAsync({ base64: false, quality: 0.8 });
    if (shot.canceled) return;

    const img = shot.assets[0];

    // 轻量压缩/裁剪（可选）
    let localUri = img.uri;
    try {
      const m = await ImageManipulator.manipulateAsync(localUri, [], {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      localUri = m.uri;
    } catch (err) {
      // 如果压缩出错，不影响继续
      console.warn('Image manipulate failed', err);
    }

    setLoading(true);
    try {
      // 上传图片到 supabase storage
      const publicUrl = await uploadImageToBucket(userId, localUri);

      // 写入 items 表（待处理）
      const { error } = await supabase.from('items').insert([
        {
          user_id: userId,
          status: 'todo',
          question_text: '',
          image_url: publicUrl,
        },
      ]);
      if (error) throw error;

      await refreshLists();
      setTab('todo');
    } catch (e: any) {
      Alert.alert('入库失败', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // 选择/取消选择
  function toggleSelect(id: number) {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  // 把 Blob 转成 base64（用于发送给 AI）
  async function blobToBase64(blob: Blob): Promise<string> {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  }

  // 批量 AI 解答处理
  async function batchSolve() {
    if (!selectedIds.length) {
      Alert.alert('提示', '请先选择题目');
      return;
    }
    setLoading(true);
    setTip('AI 正在处理，请稍候...');
    try {
      const { data: picked } = await supabase.from('items').select('*').in('id', selectedIds);
      const items = (picked || []).filter((it: Item) => it.user_id === userId);

      for (const it of items) {
        try {
          // 下载图片为 blob
          const resp = await fetch(it.image_url!);
          const blob = await resp.blob();
          const base64 = await blobToBase64(blob);

          const json = await solveOneImageBase64(base64);

          const status = 'mistake'; // demo逻辑，实际可以由 AI 对比判定

          await supabase
            .from('items')
            .update({
              status,
              ai_answer: json.answer || '',
              analysis_json: json,
              knowledge_points: json.knowledge_points || [],
            })
            .eq('id', it.id);
        } catch (innerErr) {
          console.warn('处理单题失败', innerErr);
        }
      }

      setSelectedIds([]);
      await refreshLists();
      setTab('mistake');
      setTip('批量处理完成');
    } catch (err) {
      Alert.alert('批量处理失败', String(err));
    } finally {
      setLoading(false);
      setTimeout(() => setTip(''), 1500);
    }
  }

  // 顶栏、Tabs 与各 Tab UI
  function TopBar() {
    return (
      <View style={{ paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#111827' }}>
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 18 }}>AI 错题本</Text>
        <Text style={{ color: '#9ca3af' }}>ID: {userId ? userId.slice(0, 8) + '…' : '…'}</Text>
      </View>
    );
  }

  function TabBtn({ label, active, onPress }: any) {
    return (
      <View style={{ flex: 1 }}>
        <Text
          onPress={onPress}
          style={{
            textAlign: 'center',
            paddingVertical: 12,
            color: active ? '#111827' : '#6b7280',
            fontWeight: active ? '700' : '500',
          }}
        >
          {label}
        </Text>
      </View>
    );
  }

  function TodoTab() {
    return (
      <ScrollView style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Button title="📷 拍照入库" onPress={addFromCamera} />
          <Button title={`⚙️ 批量AI解答（已选${selectedIds.length}）`} onPress={batchSolve} />
        </View>

        {loading && <ActivityIndicator size="large" />}

        {tip ? <Text style={{ color: '#3b82f6', marginBottom: 8 }}>{tip}</Text> : null}

        {todoList.map(item => (
          <QuestionCard key={item.id} item={item} selected={selectedIds.includes(item.id)} onToggle={() => toggleSelect(item.id)} />
        ))}

        {todoList.length === 0 && <Text style={{ marginTop: 12 }}>暂无待处理题目，点击“拍照入库”添加。</Text>}
      </ScrollView>
    );
  }

  function MistakeTab() {
    return (
      <ScrollView style={{ padding: 16 }}>
        <Charts items={mistakeList} />
        <Text style={{ fontWeight: '700', fontSize: 18, marginVertical: 8 }}>错题列表</Text>
        {mistakeList.map(item => (
          <View key={item.id} style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, marginBottom: 12 }}>
            {item.image_url ? <Image source={{ uri: item.image_url }} style={{ width: '100%', height: 160, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} /> : null}
            <View style={{ padding: 12 }}>
              <Text style={{ fontWeight: '600', fontSize: 16, marginBottom: 6 }}>{item.question_text || '(未填题面)'}</Text>
              <Text style={{ color: '#6b7280', marginBottom: 6 }}>AI 答案：{item.ai_answer || '-'}</Text>
              {item.analysis_json?.error_analysis ? <Text style={{ color: '#374151' }}>错因：{item.analysis_json.error_analysis}</Text> : null}
              {!!(item.knowledge_points?.length) && <Text style={{ color: '#6b7280', marginTop: 4 }}>知识点：{item.knowledge_points.join(' / ')}</Text>}
            </View>
          </View>
        ))}
        {mistakeList.length === 0 && <Text>暂无错题记录。</Text>}
      </ScrollView>
    );
  }

  function ProfileTab() {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ fontWeight: '700', fontSize: 18, marginBottom: 12 }}>我的</Text>
        <Text style={{ marginBottom: 8 }}>游客ID：{userId}</Text>
        <View style={{ height: 12 }} />
        <Button title="刷新数据" onPress={() => refreshLists()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <TopBar />
      {tab === 'todo' && <TodoTab />}
      {tab === 'mistake' && <MistakeTab />}
      {tab === 'profile' && <ProfileTab />}
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: '#e5e7eb' }}>
        <TabBtn label="在做题本" active={tab === 'todo'} onPress={() => setTab('todo')} />
        <TabBtn label="错题本" active={tab === 'mistake'} onPress={() => setTab('mistake')} />
        <TabBtn label="我的" active={tab === 'profile'} onPress={() => setTab('profile')} />
      </View>
    </View>
  );
}
