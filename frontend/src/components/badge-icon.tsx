import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { badgeImages } from '@/constants/badge-images';

type Props = {
  badgeId: string;
  icon: string;
  size?: number;
  locked?: boolean;
};

export function BadgeIcon({ badgeId, icon, size = 56, locked = false }: Props) {
  const image = badgeImages[badgeId];

  return (
    <View
      style={[
        styles.wrapper,
        { width: size, height: size, borderRadius: size / 2 },
        locked && styles.locked,
      ]}>
      {image ? (
        <Image source={image} style={styles.image} resizeMode="contain" />
      ) : (
        <Ionicons name={icon as any} size={size * 0.55} color={locked ? '#475569' : '#CF8444'} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  locked: {
    opacity: 0.45,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
