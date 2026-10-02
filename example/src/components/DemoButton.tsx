import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  title: string;
  onPress: () => void;
  onPressIn?: () => void;
};

export function DemoButton({ title, onPress, onPressIn }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={onPressIn}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.title}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#1f6feb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
});
