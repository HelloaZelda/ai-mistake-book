import React, { useMemo } from 'react';
import { Button, Dimensions, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { VictoryAxis, VictoryBar, VictoryChart, VictoryLine, VictoryPie, VictoryTheme } from 'victory-native';

import { Mistake } from '../lib/supabase';

interface AnalysisScreenProps {
  mistakes: Mistake[];
  onBack: () => void;
  onReanalyze: () => void;
  loading: boolean;
  analyzing: boolean;
}

const chartWidth = Math.min(Dimensions.get('window').width - 40, 420);

const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ mistakes, onBack, onReanalyze, loading, analyzing }) => {
  const { knowledgeData, typeData, trendData } = useMemo(() => {
    const knowledgeCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    const trendCounts = new Map<string, number>();

    mistakes.forEach(item => {
      const analysis = (item.analysis || {}) as any;
      const knowledgePoints: string[] = analysis?.knowledgePoints || [];
      const questionType: string = analysis?.questionType || '未分类';

      knowledgePoints.forEach(point => {
        knowledgeCounts.set(point, (knowledgeCounts.get(point) || 0) + 1);
      });

      typeCounts.set(questionType, (typeCounts.get(questionType) || 0) + 1);

      const dayKey = new Date(item.created_at).toISOString().slice(0, 10);
      trendCounts.set(dayKey, (trendCounts.get(dayKey) || 0) + 1);
    });

    return {
      knowledgeData: Array.from(knowledgeCounts.entries()).map(([x, y]) => ({ x, y })),
      typeData: Array.from(typeCounts.entries()).map(([x, y]) => ({ x, y })),
      trendData: Array.from(trendCounts.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([x, y]) => ({ x, y })),
    };
  }, [mistakes]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.buttonRow}>
        <Button title="返回错题列表" onPress={onBack} />
        <Button title="重新分析" onPress={onReanalyze} disabled={loading || analyzing} />
      </View>

      {mistakes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>暂无数据，请先上传题目并完成 AI 分析。</Text>
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>知识点分布</Text>
            {knowledgeData.length === 0 ? (
              <Text style={styles.helper}>暂无知识点标签</Text>
            ) : (
              <VictoryPie
                width={chartWidth}
                height={chartWidth}
                data={knowledgeData}
                labels={({ datum }: { datum: { x: string; y: number } }) => `${datum.x}\n${datum.y}题`}
                colorScale="qualitative"
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>题型统计</Text>
            {typeData.length === 0 ? (
              <Text style={styles.helper}>暂无题型数据</Text>
            ) : (
              <VictoryChart width={chartWidth} theme={VictoryTheme.material} domainPadding={20}>
                <VictoryAxis style={{ tickLabels: { fontSize: 12, angle: Platform.OS === 'web' ? 0 : -30 } }} />
                <VictoryAxis dependentAxis tickFormat={(value: number) => `${value}`} />
                <VictoryBar data={typeData} style={{ data: { fill: '#3b82f6', width: 24 } }} />
              </VictoryChart>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>错题数量趋势</Text>
            {trendData.length === 0 ? (
              <Text style={styles.helper}>暂无趋势数据</Text>
            ) : (
              <VictoryChart width={chartWidth} theme={VictoryTheme.material}>
                <VictoryAxis style={{ tickLabels: { fontSize: 12, angle: Platform.OS === 'web' ? 0 : -30 } }} />
                <VictoryAxis dependentAxis tickFormat={(value: number) => `${value}`} />
                <VictoryLine data={trendData} style={{ data: { stroke: '#ef4444', strokeWidth: 2 } }} />
              </VictoryChart>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
};

export default AnalysisScreen;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 80,
    backgroundColor: '#f8fafc',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  section: {
    marginBottom: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  helper: {
    color: '#475569',
  },
  empty: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
  },
  emptyText: {
    color: '#92400e',
    fontWeight: '600',
  },
});
