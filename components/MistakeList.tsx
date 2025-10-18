import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Button,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Mistake } from '../lib/supabase';

declare global {
  // 让 TypeScript 知道 web 环境下存在 input 标签
  namespace JSX {
    interface IntrinsicElements {
      input: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
    }
  }
}

interface MistakeListProps {
  mistakes: Mistake[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onCapture: () => void;
  onUploadFile: (file: File) => void;
  onRefresh: () => void;
  onAnalyze: () => void;
  onOpenAnalysis: () => void;
  loading: boolean;
  analyzing: boolean;
}

const MistakeList: React.FC<MistakeListProps> = ({
  mistakes,
  selectedIds,
  onToggleSelect,
  onCapture,
  onUploadFile,
  onRefresh,
  onAnalyze,
  onOpenAnalysis,
  loading,
  analyzing,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUploadFile(file);
      event.target.value = '';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.actionsRow}>
        <Button title="📷 拍照上传" onPress={onCapture} />
        {Platform.OS === 'web' && (
          <>
            <Button title="🖼️ 选择图片" onPress={() => inputRef.current?.click()} />
            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          </>
        )}
        <Button title="🔄 刷新" onPress={onRefresh} />
      </View>

      <View style={styles.actionsRow}>
        <Button title={`⚙️ 一键AI分析 (${selectedIds.length})`} onPress={onAnalyze} disabled={analyzing} />
        <Button title="📊 查看图表" onPress={onOpenAnalysis} />
      </View>

      {(loading || analyzing) && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>{analyzing ? 'AI 分析中…' : '加载中…'}</Text>
        </View>
      )}

      {mistakes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>还没有错题，先上传一张吧！</Text>
        </View>
      ) : (
        mistakes.map(item => {
          const isSelected = selectedIds.includes(item.id);
          const analysis = item.analysis as any;
          return (
            <Pressable key={item.id} onPress={() => onToggleSelect(item.id)} style={[styles.card, isSelected && styles.cardSelected]}>
              {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} /> : null}
              <View style={styles.cardBody}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>错题 {item.id.slice(0, 6)}</Text>
                  <View style={[styles.badge, analysis ? styles.badgeSuccess : styles.badgePending]}>
                    <Text style={styles.badgeText}>{analysis ? '已分析' : '待分析'}</Text>
                  </View>
                </View>
                {analysis?.questionType && <Text style={styles.cardMeta}>题型：{analysis.questionType}</Text>}
                {analysis?.knowledgePoints?.length ? (
                  <Text style={styles.cardMeta}>知识点：{analysis.knowledgePoints.join('、')}</Text>
                ) : null}
                <Text style={styles.cardMeta}>创建时间：{new Date(item.created_at).toLocaleString()}</Text>
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );
};

export default MistakeList;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 160,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadingText: {
    color: '#475569',
  },
  empty: {
    marginTop: 48,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#e0f2fe',
  },
  emptyText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardSelected: {
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 180,
  },
  cardBody: {
    padding: 16,
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cardMeta: {
    color: '#475569',
    fontSize: 13,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeSuccess: {
    backgroundColor: '#bbf7d0',
  },
  badgePending: {
    backgroundColor: '#fde68a',
  },
  badgeText: {
    fontSize: 12,
    color: '#0f172a',
  },
});
