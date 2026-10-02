import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

type Props = {
  description: string;
  results: string[];
  children: ReactNode;
};

export function DemoScreen({ description, results, children }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.description}>{description}</Text>
      {children}
      {results.map((result, index) => (
        <Text key={index} style={index === 0 ? styles.latest : styles.result}>
          {result}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 16,
  },
  description: {
    color: '#444444',
    lineHeight: 20,
  },
  latest: {
    fontWeight: '600',
  },
  result: {
    color: '#777777',
  },
});
