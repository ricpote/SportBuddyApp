import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BadgeIcon } from '@/components/badge-icon';
import { Spacing } from '@/constants/theme';
import { getBadgeCatalog, getMyBadges, setDisplayedBadge } from '@/services/badges';
import { Badge } from '@/types/badge';

type DisplayBadge = Badge & {
  unlocked: boolean;
  isDisplayed: boolean;
};

export function BadgesSection() {
  const [badges, setBadges] = useState<DisplayBadge[] | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([getBadgeCatalog(), getMyBadges()])
      .then(([catalog, mine]) => {
        const mineById = new Map(mine.map((badge) => [badge.id, badge]));
        const merged: DisplayBadge[] = catalog.map((badge) => {
          const unlocked = mineById.get(badge.id);
          return {
            ...badge,
            unlocked: !!unlocked,
            isDisplayed: unlocked?.isDisplayed ?? false,
          };
        });
        setBadges(merged);
      })
      .catch(() => setBadges(null));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handlePress(badge: DisplayBadge) {
    if (!badge.unlocked) {
      Alert.alert(badge.name, badge.description);
      return;
    }

    if (updatingId) return;
    setUpdatingId(badge.id);
    try {
      await setDisplayedBadge(badge.isDisplayed ? null : badge.id);
      load();
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível atualizar o badge.');
    } finally {
      setUpdatingId(null);
    }
  }

  if (!badges || badges.length === 0) return null;

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>Badges</ThemedText>
      <ThemedText type="small" style={styles.subtitle}>
        Toca num badge desbloqueado para o mostrar no teu perfil.
      </ThemedText>

      <View style={styles.grid}>
        {badges.map((badge) => (
          <Pressable
            key={badge.id}
            onPress={() => handlePress(badge)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <View style={badge.isDisplayed ? styles.displayedRing : styles.ringPlaceholder}>
              <BadgeIcon badgeId={badge.id} icon={badge.icon} locked={!badge.unlocked} />
            </View>
            <ThemedText type="small" style={styles.badgeName} numberOfLines={2}>
              {badge.name}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  title: {
    color: '#FFFFFF',
  },
  subtitle: {
    color: '#64748B',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  item: {
    width: 76,
    alignItems: 'center',
    gap: 4,
  },
  pressed: {
    opacity: 0.7,
  },
  displayedRing: {
    borderWidth: 2,
    borderColor: '#CF8444',
    borderRadius: 32,
    padding: 2,
  },
  ringPlaceholder: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 32,
    padding: 2,
  },
  badgeName: {
    color: '#A0AEC0',
    textAlign: 'center',
  },
});
