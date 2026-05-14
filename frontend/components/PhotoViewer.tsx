import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StatusBar,
  Platform,
  Pressable,
} from 'react-native';
import { COLORS } from '../lib/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Props = {
  visible: boolean;
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
};

export default function PhotoViewer({
  visible,
  photos,
  initialIndex = 0,
  onClose,
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const listRef = useRef<FlatList<string>>(null);

  // Reset to the requested index whenever the modal is (re)opened
  useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
      // wait one tick so the FlatList exists
      const t = setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: initialIndex * SCREEN_W, animated: false });
      }, 0);
      return () => clearTimeout(t);
    }
  }, [visible, initialIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.length > 0 && viewableItems[0].index != null) {
      setIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const renderItem = useCallback(({ item }: { item: string }) => (
    <Pressable
      testID="photoviewer-backdrop"
      onPress={onClose}
      style={s.page}
    >
      <Image
        source={{ uri: item }}
        style={s.image}
        resizeMode="contain"
      />
    </Pressable>
  ), [onClose]);

  if (!visible || photos.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={s.container}>
        <FlatList
          ref={listRef}
          data={photos}
          keyExtractor={(item, i) => `${i}-${item}`}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />

        {/* Close button (top-right) */}
        <TouchableOpacity
          testID="photoviewer-close"
          onPress={onClose}
          style={s.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={s.closeText}>{'\u2715'}</Text>
        </TouchableOpacity>

        {/* Page counter (top-center) */}
        {photos.length > 1 && (
          <View pointerEvents="none" style={s.counter}>
            <Text style={s.counterText}>
              {index + 1} / {photos.length}
            </Text>
          </View>
        )}

        {/* Dot indicators (bottom) */}
        {photos.length > 1 && (
          <View pointerEvents="none" style={s.dotsRow}>
            {photos.map((_, i) => (
              <View
                key={i}
                style={[s.dot, i === index && s.dotActive]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  page: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  closeText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 24,
  },
  counter: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
  },
  counterText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dotsRow: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 56 : 36,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: COLORS.white,
    width: 20,
  },
});
