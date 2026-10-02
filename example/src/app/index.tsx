import { Link, Stack, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

const DEMOS: { href: Href; title: string; description: string }[] = [
  {
    href: '/basics',
    title: 'Basics',
    description: 'Results, swipe-down, lazy loading and preload',
  },
  {
    href: '/stacking',
    title: 'Stacking',
    description: "stackBehavior 'switch', 'push' and 'replace'; unique sheets",
  },
  {
    href: '/navigation/1',
    title: 'Navigation',
    description:
      'Sheets above every screen or inside their own screen, across pushes, pops and Android back; app-level sheets stay open',
  },
  {
    href: '/scopes',
    title: 'Scopes',
    description: 'A nested scope unmounting inside one screen',
  },
  {
    href: '/errors',
    title: 'Errors',
    description: 'A sheet that fails to load, and one that crashes',
  },
];

export default function Home() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'sheet-scope' }} />
      {DEMOS.map(({ href, title, description }) => (
        <Link key={title} href={href} asChild>
          <Pressable accessibilityRole="link" style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d0d7de',
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  description: {
    color: '#555555',
  },
});
