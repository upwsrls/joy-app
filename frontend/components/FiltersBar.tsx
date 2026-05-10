import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { COLORS, SPACING, RADIUS, CATEGORIE } from '../lib/theme';
import { Filters, DistanceOption, activeFilterCount } from '../lib/filters';

type Props = {
  filters: Filters;
  onChange: (next: Filters) => void;
  onClear: () => void;
  hasUserPos: boolean;
};

const DISTANCES: { label: string; value: DistanceOption }[] = [
  { label: 'Tutti', value: 0 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '20 km', value: 20 },
];

export default function FiltersBar({ filters, onChange, onClear, hasUserPos }: Props) {
  const activeCount = activeFilterCount(filters);

  const toggleCategory = (nome: string) => {
    const next = filters.categorie.includes(nome)
      ? filters.categorie.filter((c) => c !== nome)
      : [...filters.categorie, nome];
    onChange({ ...filters, categorie: next });
  };

  const setDistance = (v: DistanceOption) => onChange({ ...filters, maxKm: v });

  return (
    <View style={styles.wrap} testID="filters-bar">
      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          testID="filters-search-input"
          style={styles.searchInput}
          placeholder="Cerca per titolo, categoria…"
          placeholderTextColor={COLORS.textMedium}
          value={filters.q}
          onChangeText={(t) => onChange({ ...filters, q: t })}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {filters.q.length > 0 && (
          <TouchableOpacity
            testID="filters-search-clear"
            onPress={() => onChange({ ...filters, q: '' })}
            style={styles.clearBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.clearTxt}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Categorie chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {CATEGORIE.map((c) => {
          const selected = filters.categorie.includes(c.nome);
          return (
            <TouchableOpacity
              key={c.nome}
              testID={`filter-cat-${c.nome}`}
              onPress={() => toggleCategory(c.nome)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {c.icon} {c.nome}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Distance chips + clear */}
      <View style={styles.distanceRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={{ flex: 1 }}
        >
          {DISTANCES.map((d) => {
            const selected = filters.maxKm === d.value;
            const disabled = d.value > 0 && !hasUserPos;
            return (
              <TouchableOpacity
                key={d.label}
                testID={`filter-dist-${d.value}`}
                onPress={() => !disabled && setDistance(d.value)}
                disabled={disabled}
                style={[
                  styles.chipDistance,
                  selected && styles.chipSelected,
                  disabled && styles.chipDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected && styles.chipTextSelected,
                    disabled && styles.chipTextDisabled,
                  ]}
                >
                  📏 {d.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {activeCount > 0 && (
          <TouchableOpacity
            testID="filters-clear-all"
            onPress={onClear}
            style={styles.clearAllBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.clearAllText}>Pulisci ({activeCount})</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.s,
    paddingBottom: SPACING.s,
    backgroundColor: COLORS.background,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.medium,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchIcon: { fontSize: 16, marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textDark,
    paddingVertical: 8,
  },
  clearBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  clearTxt: { color: COLORS.textMedium, fontSize: 16, fontWeight: '700' },
  chipRow: {
    paddingVertical: SPACING.s,
    paddingRight: SPACING.s,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.round,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.white,
    marginRight: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipDistance: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.round,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.white,
    marginRight: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  chipTextDisabled: {
    color: COLORS.textMedium,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 4,
  },
  clearAllText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});
