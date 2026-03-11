import { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { BACKGROUND_LIGHT, PRIMARY, SLATE_400, TEXT_PRIMARY } from "@/constants/colors";

const ITEM_HEIGHT = 56;
const TOP_BOTTOM_SPACER = 84;

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildDateRange(days = 21): Date[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

type Props = {
  value: string;
  onChange: (date: string) => void;
};

export default function DeliveryDateScroller({ value, onChange }: Props) {
  const scrollRef = useRef<ScrollView | null>(null);
  const dates = useMemo(() => buildDateRange(21), []);
  const keys = useMemo(() => dates.map(formatDateKey), [dates]);

  useEffect(() => {
    const index = Math.max(0, keys.indexOf(value));
    const y = index * ITEM_HEIGHT;
    const id = setTimeout(() => scrollRef.current?.scrollTo({ y, animated: false }), 0);
    return () => clearTimeout(id);
  }, [keys, value]);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, keys.length - 1));
    onChange(keys[clamped]);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={styles.content}
      >
        <View style={{ height: TOP_BOTTOM_SPACER }} />
        {dates.map((date) => {
          const key = formatDateKey(date);
          const selected = key === value;
          const label = date.toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            weekday: "short",
          });
          return (
            <View key={key} style={styles.item}>
              <Text style={[styles.itemText, selected && styles.itemTextSelected]}>{label}</Text>
            </View>
          );
        })}
        <View style={{ height: TOP_BOTTOM_SPACER }} />
      </ScrollView>
      <View pointerEvents="none" style={styles.focusBand} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: BACKGROUND_LIGHT,
    position: "relative",
  },
  content: {
    paddingHorizontal: 8,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 18,
    color: SLATE_400,
    fontWeight: "500",
  },
  itemTextSelected: {
    color: TEXT_PRIMARY,
    fontWeight: "800",
  },
  focusBand: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: ITEM_HEIGHT,
    marginTop: -ITEM_HEIGHT / 2,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: `${PRIMARY}33`,
    backgroundColor: `${PRIMARY}10`,
  },
});
