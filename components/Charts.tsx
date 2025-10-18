// components/Charts.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryPie } from 'victory-native';

export default function Charts({ items }: { items: any[] }) {
  // 统计知识点频率
  const kpCount: Record<string, number> = {};
  for (const it of items) {
    const kps: string[] = it.knowledge_points || [];
    kps.forEach(k => (kpCount[k] = (kpCount[k] || 0) + 1));
  }
  const kpData = Object.entries(kpCount).map(([x, y]) => ({ x, y }));

  // 错误类型（用 analysis_json.error 或 error_analysis 的关键词简单归类）
  const typeCount: Record<string, number> = {};
  for (const it of items) {
    const t = (it.analysis_json?.error_type || '其它').toString();
    typeCount[t] = (typeCount[t] || 0) + 1;
  }
  const typeData = Object.entries(typeCount).map(([x, y]) => ({ x, y }));

  return (
    <View style={{ padding: 12 }}>
      <Text style={{ fontWeight: '700', fontSize: 18, marginBottom: 8 }}>知识点分布</Text>
      {kpData.length ? (
        <VictoryChart domainPadding={20}>
          <VictoryAxis style={{ tickLabels: { angle: -25, fontSize: 10 } }} />
          <VictoryAxis dependentAxis />
          <VictoryBar data={kpData} x="x" y="y" />
        </VictoryChart>
      ) : (
        <Text>暂无数据</Text>
      )}

      <Text style={{ fontWeight: '700', fontSize: 18, marginVertical: 8 }}>错误类型占比</Text>
      {typeData.length ? (
        <VictoryPie data={typeData} x="x" y="y" innerRadius={50} />
      ) : (
        <Text>暂无数据</Text>
      )}
    </View>
  );
}
