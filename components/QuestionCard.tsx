// components/QuestionCard.tsx
import React from 'react';
import { View, Image, Text, Pressable } from 'react-native';

type Props = {
  item: any;
  selected: boolean;
  onToggle: () => void;
};

export default function QuestionCard({ item, selected, onToggle }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      style={{
        borderColor: selected ? '#3b82f6' : '#e5e7eb',
        borderWidth: 2,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={{ width: '100%', height: 160 }} />
      ) : null}
      <View style={{ padding: 12 }}>
        <Text style={{ fontWeight: '600', fontSize: 16, marginBottom: 6 }}>
          {item.question_text || '(未填题面)'}
        </Text>
        <Text style={{ color: '#6b7280' }}>
          状态：{item.status} · {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
    </Pressable>
  );
}
