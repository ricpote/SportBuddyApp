import { Ionicons } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { AvatarCircle } from './avatar-circle';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useChatBadge } from '@/contexts/chat-badge-context';

const NAV_ITEMS = [
  { href: '/',                 icon: 'home-outline',        label: 'Home'     },
  { href: '/explore',          icon: 'search-outline',      label: 'Discover' },
  { href: '/create-activity',  icon: 'add-outline',         label: 'Create'   },
  { href: '/chats',            icon: 'chatbubbles-outline', label: 'Chats'    },
  { href: '/map',              icon: 'map-outline',         label: 'Map'      },
] as const;

export function WebSidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const { unreadCount } = useChatBadge();

  return (
    <View style={styles.sidebar}>
      <Link href="/" style={styles.brandLink}>
        <View style={styles.brand}>
          <Image
            source={require('../../assets/images/sportbuddyIcon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <ThemedText type="smallBold" style={styles.brandName}>SportBuddy</ThemedText>
            <ThemedText style={styles.brandSlogan}>Connect & Play</ThemedText>
          </View>
        </View>
      </Link>

      <View style={styles.nav}>
        {NAV_ITEMS.map(item => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const badge = item.href === '/chats' ? unreadCount : 0;
          return (
            <Link key={item.href} href={item.href as any} asChild>
              <Pressable style={({ pressed }) => pressed && styles.pressed}>
                <View style={[styles.item, active && styles.itemActive]}>
                  <View style={styles.iconWrap}>
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={active ? '#e8823f' : '#8f8b85'}
                      style={styles.icon}
                    />
                    {badge > 0 && (
                      <View style={styles.badgeDot}>
                        <ThemedText style={styles.badgeText}>{badge > 99 ? '99+' : badge}</ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText type="smallBold" style={[styles.label, active && styles.labelActive]}>
                    {item.label}
                  </ThemedText>
                  {active && <View style={styles.dot} />}
                </View>
              </Pressable>
            </Link>
          );
        })}

        {profile?.role === 'admin' && (
          <Link href={'/admin' as any} asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <View style={[styles.item, pathname.startsWith('/admin') && styles.itemActive]}>
                <View style={styles.iconWrap}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={pathname.startsWith('/admin') ? '#e8823f' : '#8f8b85'}
                    style={styles.icon}
                  />
                </View>
                <ThemedText type="smallBold" style={[styles.label, pathname.startsWith('/admin') && styles.labelActive]}>
                  Admin
                </ThemedText>
                {pathname.startsWith('/admin') && <View style={styles.dot} />}
              </View>
            </Pressable>
          </Link>
        )}
      </View>

      {/* Perfil no rodapé: clicar vai para o perfil, o ícone à direita faz logout */}
      <View style={styles.footer}>
        <Link href="/profile" asChild>
          <Pressable style={({ pressed }) => [{ flex: 1 }, pressed && styles.pressed]}>
            <View style={[styles.footerProfile, pathname.startsWith('/profile') && styles.itemActive]}>
              <AvatarCircle name={profile?.name ?? '?'} avatarUrl={profile?.avatarUrl} size={38} />
              <View style={styles.footerText}>
                <ThemedText type="smallBold" style={styles.footerName} numberOfLines={1}>
                  {profile?.name ?? ''}
                </ThemedText>
                <ThemedText style={styles.footerHint}>Ver perfil</ThemedText>
              </View>
            </View>
          </Pressable>
        </Link>
        <Pressable
          onPress={signOut}
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
          hitSlop={4}>
          <Ionicons name="log-out-outline" size={20} color="#8f8b85" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 250,
    backgroundColor: '#0a0a0b',
    borderRightWidth: 1,
    borderRightColor: '#111012',
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  brandLink: { textDecorationLine: 'none' },
  brand: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 40, gap: 12,
    paddingHorizontal: Spacing.two,
  },
  logo: { width: 40, height: 40 },
  brandName: { color: '#f4f2ef', fontSize: 18 },
  brandSlogan: { color: '#e8823f', fontSize: 12 },

  nav: { gap: Spacing.two, flex: 1 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 12,
  },
  itemActive: { backgroundColor: 'rgba(207,132,68,0.15)' },
  iconWrap: { position: 'relative' },
  icon: { marginRight: 12 },
  badgeDot: {
    position: 'absolute', top: -6, right: -6,
    minWidth: 17, height: 17, borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#f4f2ef', fontSize: 10, fontFamily: 'HankenGrotesk_700Bold', lineHeight: 12 },
  label: { color: '#c9c5bf', fontSize: 16 },
  labelActive: { color: '#e8823f' },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#e8823f',
    marginLeft: 'auto' as any,
  },
  pressed: { opacity: 0.7 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: Spacing.three,
    marginTop: Spacing.three,
  },
  footerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 12,
  },
  footerText: { flex: 1, minWidth: 0 },
  footerName: { color: '#f4f2ef', fontSize: 14 },
  footerHint: { color: '#8f8b85', fontSize: 12 },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141315',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
});
