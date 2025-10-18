import React from 'react';
import { ActivityIndicator, Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';

interface LoginScreenProps {
  onLogin: () => void;
  loading?: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, loading }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>欢迎使用 AI 错题本</Text>
        <Text style={styles.subtitle}>一键登录，开始收集并分析你的错题。</Text>
        {loading ? (
          <ActivityIndicator style={styles.spinner} />
        ) : (
          <Button title="快速登录" onPress={onLogin} />
        )}
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#4b5563',
    marginBottom: 24,
  },
  spinner: {
    marginTop: 12,
  },
});
