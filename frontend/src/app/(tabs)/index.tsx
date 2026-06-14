import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

// Filtros base (Podem ser estáticos ou vir da Base de Dados)
const FILTERS = ['Todos', 'Futebol', 'Basquetebol', 'Corrida', 'Ciclismo', 'Padel'];

export default function HomeScreen() {
  const { user } = useAuth();
  const firstName = (user?.displayName ?? user?.email ?? '').split(/[\s@]/)[0];

  // Estado para controlar o filtro selecionado (ex: 'Futebol')
  const [activeFilter, setActiveFilter] = useState('Todos');

  // Estado que vai receber as atividades vindas do Backend/Firebase (começa vazio)
  const [activities, setActivities] = useState<any[]>([]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#0F172A' }]}>
      <SafeAreaView style={styles.safeArea}>

        {/* CABEÇALHO */}
        <View style={styles.header}>
          <ThemedText type="title" style={{ color: '#FFFFFF' }}>
            Olá{firstName ? `, ${firstName}` : ''} 👋
          </ThemedText>
          <ThemedText style={{ color: '#A0AEC0' }}>
            Pronto para a tua próxima atividade?
          </ThemedText>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* SECÇÃO DE FILTROS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {FILTERS.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <Pressable
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={[
                    styles.filterChip,
                    isActive && styles.filterChipActive
                  ]}
                >
                  {filter === 'Todos' && (
                    <Ionicons
                      name="medal-outline"
                      size={16}
                      color={isActive ? "#0F172A" : "#A0AEC0"}
                      style={{ marginRight: 5 }}
                    />
                  )}
                  <ThemedText style={[
                    styles.filterText,
                    isActive && styles.filterTextActive
                  ]}>
                    {filter}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* SECÇÃO DE ATIVIDADES */}
          <View style={styles.activitiesHeader}>
            <ThemedText type="subtitle" style={{ color: '#FFFFFF', fontSize: 20 }}>
              Atividades Próximas
            </ThemedText>
            <ThemedText style={{ color: '#CF8444', fontWeight: 'bold' }}>
              Ver todas {'>'}
            </ThemedText>
          </View>

          <View style={styles.activitiesList}>
            {activities.length > 0 ? (
              // Se houver atividades na Base de Dados, desenha os cartões
              activities.map((activity) => (
                <View key={activity.id} style={styles.activityCard}>
                  <View style={styles.cardImagePlaceholder}>
                    <View style={styles.sportBadge}>
                      {/* @ts-ignore */}
                      <Ionicons name={activity.icon} size={14} color="#FFFFFF" />
                      <ThemedText style={styles.sportBadgeText}>{activity.sport}</ThemedText>
                    </View>
                    {activity.isFree && (
                      <View style={styles.freeBadge}>
                        <ThemedText style={styles.freeBadgeText}>Grátis</ThemedText>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardBody}>
                    <ThemedText type="subtitle" style={styles.activityTitle}>
                      {activity.title}
                    </ThemedText>

                    <View style={styles.infoRow}>
                      <Ionicons name="calendar-outline" size={14} color="#A0AEC0" />
                      <ThemedText style={styles.infoText}>{activity.date}</ThemedText>
                      <Ionicons name="time-outline" size={14} color="#A0AEC0" style={{ marginLeft: 10 }} />
                      <ThemedText style={styles.infoText}>{activity.duration}</ThemedText>
                    </View>

                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={14} color="#A0AEC0" />
                      <ThemedText style={styles.infoText}>{activity.location}</ThemedText>
                    </View>

                    <View style={styles.cardFooter}>
                      <View style={[
                        styles.difficultyBadge,
                        activity.difficulty === 'Avançado' ? { backgroundColor: '#FF6B6B' } : {}
                      ]}>
                        <ThemedText style={styles.difficultyText}>{activity.difficulty}</ThemedText>
                      </View>

                      <ThemedText style={styles.spotsText}>
                        <Ionicons name="people-outline" size={14} /> {activity.spots}{' '}
                        <ThemedText style={{ color: '#CF8444' }}>{activity.waiting}</ThemedText>
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              // Se a lista estiver vazia (O estado atual)
              <View style={styles.emptyState}>
                <Ionicons name="sad-outline" size={48} color="#334155" />
                <ThemedText style={styles.emptyStateTitle}>Nenhuma atividade encontrada</ThemedText>
                <ThemedText style={styles.emptyStateText}>
                  Não existem atividades de momento ou ainda estão a ser carregadas.
                </ThemedText>
              </View>
            )}
          </View>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingTop: TopTabInset + Spacing.two,
  },
  header: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
    gap: Spacing.one,
  },
  scrollContent: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    marginBottom: Spacing.five,
    height: 40,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#CF8444',
    borderColor: '#CF8444',
  },
  filterText: {
    color: '#A0AEC0',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#0F172A',
  },
  activitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  activitiesList: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  // Estado Vazio (Empty State)
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    color: '#A0AEC0',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyStateText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  activityCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardImagePlaceholder: {
    height: 120,
    backgroundColor: '#334155',
    padding: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  sportBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  freeBadge: {
    backgroundColor: '#CF8444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  freeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardBody: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  activityTitle: {
    color: '#CF8444',
    fontSize: 18,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    color: '#A0AEC0',
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  difficultyBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  spotsText: {
    color: '#A0AEC0',
    fontSize: 14,
  },
});