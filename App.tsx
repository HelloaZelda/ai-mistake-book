import 'react-native-reanimated';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Buffer } from 'buffer';

import AnalysisScreen from './components/AnalysisScreen';
import LoginScreen from './components/LoginScreen';
import MistakeList from './components/MistakeList';
import {
  Mistake,
  fetchMistakes,
  insertMistake,
  signInAnonymously,
  subscribeAuthChanges,
  uploadMistakeImage,
  updateMistakeAnalysis,
} from './lib/supabase';
import { analyzeMistakeImage } from './lib/silicon';
import { generateId } from './lib/uuid';

if (typeof (global as any).Buffer === 'undefined') {
  (global as any).Buffer = Buffer;
}

export type RootScreen = 'list' | 'analysis';

export default function App() {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [screen, setScreen] = useState<RootScreen>('list');

  const loadMistakes = useCallback(
    async (uid = userId) => {
      if (!uid) return;
      setLoading(true);
      try {
        const data = await fetchMistakes(uid);
        setMistakes(data);
      } catch (err) {
        console.error('Failed to load mistakes', err);
        Alert.alert('读取失败', '无法读取错题，请稍后重试');
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    const unsubscribe = subscribeAuthChanges(async newUser => {
      if (newUser) {
        setUserId(newUser.id);
        await loadMistakes(newUser.id);
      } else {
        setUserId(null);
        setMistakes([]);
      }
      setReady(true);
    });

    return () => {
      unsubscribe();
    };
  }, [loadMistakes]);

  const handleLogin = useCallback(async () => {
    setLoading(true);
    try {
      const sessionUser = await signInAnonymously();
      if (sessionUser) {
        setUserId(sessionUser.id);
        await loadMistakes(sessionUser.id);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('登录失败', '请检查网络或 Supabase 配置');
    } finally {
      setLoading(false);
    }
  }, [loadMistakes]);

  const handleCapture = useCallback(async () => {
    if (!userId) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('权限不足', '需要相机权限以拍摄错题');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, base64: false });
    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    setLoading(true);
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const publicUrl = await uploadMistakeImage(userId, blob, asset.fileName || `camera-${generateId()}.jpg`);
      const saved = await insertMistake(userId, publicUrl);
      setMistakes(prev => [saved, ...prev]);
    } catch (err) {
      console.error('Upload from camera failed', err);
      Alert.alert('上传失败', '无法上传照片，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleUploadFile = useCallback(
    async (file: File) => {
      if (!userId) return;
      setLoading(true);
      try {
        const publicUrl = await uploadMistakeImage(userId, file, file.name);
        const saved = await insertMistake(userId, publicUrl);
        setMistakes(prev => [saved, ...prev]);
      } catch (err) {
        console.error('Upload from file failed', err);
        Alert.alert('上传失败', '无法上传图片，请稍后再试');
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  }, []);

  const downloadBase64 = useCallback(async (url: string) => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!userId) return;
    if (!selectedIds.length) {
      Alert.alert('提示', '请先选择需要分析的题目');
      return;
    }

    setAnalyzing(true);
    try {
      for (const id of selectedIds) {
        const mistake = mistakes.find(item => item.id === id);
        if (!mistake?.image_url) continue;

        const base64 = await downloadBase64(mistake.image_url);
        const analysis = await analyzeMistakeImage(base64);
        const updated = await updateMistakeAnalysis(id, analysis);
        setMistakes(prev => prev.map(item => (item.id === id ? updated : item)));
      }
      setSelectedIds([]);
      Alert.alert('完成', 'AI 分析已更新');
    } catch (err) {
      console.error('Analyze error', err);
      Alert.alert('分析失败', '调用 AI 服务失败，请检查网络和 API Key');
    } finally {
      setAnalyzing(false);
    }
  }, [downloadBase64, mistakes, selectedIds, userId]);

  const showAnalysis = screen === 'analysis';

  if (!ready) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.hint}>正在初始化...</Text>
      </SafeAreaView>
    );
  }

  if (!userId) {
    return <LoginScreen onLogin={handleLogin} loading={loading} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
      <View style={styles.header}>
        <Text style={styles.title}>AI 错题本</Text>
        <Text style={styles.subtitle}>用户：{userId.slice(0, 8)}...</Text>
      </View>
      {showAnalysis ? (
        <AnalysisScreen
          mistakes={mistakes}
          onBack={() => setScreen('list')}
          onReanalyze={() => {
            setSelectedIds(mistakes.map(item => item.id));
            setScreen('list');
          }}
          loading={loading}
          analyzing={analyzing}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.flexGrow}>
          <MistakeList
            mistakes={mistakes}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onCapture={handleCapture}
            onUploadFile={handleUploadFile}
            onRefresh={() => loadMistakes()}
            onAnalyze={handleAnalyze}
            onOpenAnalysis={() => setScreen('analysis')}
            loading={loading}
            analyzing={analyzing}
          />
        </ScrollView>
      )}
      {!showAnalysis && (
        <View style={styles.footer}>
          <Button title="查看分析图表" onPress={() => setScreen('analysis')} />
          <View style={styles.footerSpacing} />
          <Button title="刷新列表" onPress={() => loadMistakes()} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  flexGrow: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: '#111827',
  },
  title: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9ca3af',
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  footerSpacing: {
    width: 16,
  },
  hint: {
    marginTop: 12,
    color: '#4b5563',
  },
});
