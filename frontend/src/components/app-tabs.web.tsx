import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, Image, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';

import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';

export default function AppTabs() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768 || Platform.OS === 'web';

  return (
    <Tabs>
      <TabSlot style={{ flex: 1, marginLeft: isDesktop ? 250 : 0 }} />

      <TabList asChild>
        <CustomTabList isDesktop={isDesktop}>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon="home-outline">Home</TabButton>
          </TabTrigger>

          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton icon="search-outline">Discover</TabButton>
          </TabTrigger>

          <Link href="/create-activity" asChild>
            <TabButton icon="add-outline">Create</TabButton>
          </Link>

          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon="person-outline">Profile</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icon?: any };

export function TabButton({ children, isFocused, icon, ...props }: TabButtonProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View
        style={[
          styles.tabButtonView,
          isFocused && { backgroundColor: 'rgba(207, 132, 68, 0.15)' }
        ]}>

        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={isFocused ? '#CF8444' : '#64748B'}
            style={{ marginRight: 12 }}
          />
        )}

        <ThemedText
          type="smallBold"
          style={{ color: isFocused ? '#CF8444' : '#A0AEC0', fontSize: 16 }}>
          {children}
        </ThemedText>

        {isFocused && <View style={styles.activeDot} />}
      </View>
    </Pressable>
  );
}

type CustomTabListProps = TabListProps & { isDesktop: boolean };

export function CustomTabList({ isDesktop, ...props }: CustomTabListProps) {
  return (
    <View
      {...props}
      style={[
        styles.tabListContainer,
        isDesktop ? styles.sidebarContainer : styles.bottomBarContainer
      ]}>

      {isDesktop && (
        <View style={styles.brandContainer}>
          <Image
            source={require('../../assets/images/sportbuddyIcon.png')}
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <View>
            <ThemedText type="smallBold" style={styles.brandText}>SportBuddy</ThemedText>
            <ThemedText style={styles.brandSlogan}>Connect & Play</ThemedText>
          </View>
        </View>
      )}

      <View style={[styles.tabsWrapper, { flexDirection: isDesktop ? 'column' : 'row' }]}>
        {props.children}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    backgroundColor: '#0F172A',
  },
  sidebarContainer: {
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
  },
  bottomBarContainer: {
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    padding: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    gap: 12,
    paddingHorizontal: Spacing.two,
  },
  logoIcon: {
    width: 40,
    height: 40,
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  brandSlogan: {
    color: '#CF8444',
    fontSize: 12,
  },
  tabsWrapper: {
    gap: Spacing.two,
    justifyContent: 'space-around',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CF8444',
    marginLeft: 'auto',
  },
});