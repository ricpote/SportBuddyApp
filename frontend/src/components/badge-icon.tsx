import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { badgeImages } from '@/constants/badge-images';

type Props = {
  badgeId: string;
  icon: string;
  size?: number;
};

export function BadgeIcon({ badgeId, icon, size = 56 }: Props) {
  const image = badgeImages[badgeId];

  return (
    <View style={[styles.wrapper, { width: size, height: size, borderRadius: size / 2 }]}>
      {image ? (
        <Image source={image} style={styles.image} resizeMode="contain" />
      ) : (
        <Ionicons name={icon as any} size={size * 0.55} color="#CF8444" />
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
  image: {
    width: '100%',
    height: '100%',
  },
});
