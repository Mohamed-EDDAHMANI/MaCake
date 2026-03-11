import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { BACKGROUND_LIGHT, PRIMARY, SLATE_400, TEXT_PRIMARY } from "@/constants/colors";

const ITEM_HEIGHT = 56;
const TOP_BOTTOM_SPACER = 84;

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

type WheelProps = {
  values: string[];
  value: string;
  onChange: (next: string) => void;
};

function Wheel({ values, value, onChange }: WheelProps) {
  const ref = useRef<ScrollView | null>(null);

  useEffect(() => {
    const index = Math.max(0, values.indexOf(value));
    const y = index * ITEM_HEIGHT;
    const id = setTimeout(() => ref.current?.scrollTo({ y, animated: false }), 0);
    return () => clearTimeout(id);
  }, [value, values]);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, values.length - 1));
    onChange(values[clamped]);
  };

  return (
    <View style={styles.wheelRoot}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={styles.wheelContent}
      >
        <View style={{ height: TOP_BOTTOM_SPACER }} />
        {values.map((v) => {
          const selected = v === value;
          return (
            <View key={v} style={styles.wheelItem}>
              <Text style={[styles.wheelText, selected && styles.wheelTextSelected]}>{v}</Text>
            </View>
          );
        })}
        <View style={{ height: TOP_BOTTOM_SPACER }} />
      </ScrollView>
      <View pointerEvents="none" style={styles.focusBand} />
    </View>
  );
}

type Props = {
  value: string;
  onChange: (time: string) => void;
};

export default function DeliveryTimeScroller({ value, onChange }: Props) {
  const initial = useMemo(() => {
    const [h = "11", m = "00"] = (value || "11:00").split(":");
    return { h: HOURS.includes(h) ? h : "11", m: MINUTES.includes(m) ? m : "00" };
  }, [value]);
  const [hour, setHour] = useState(initial.h);
  const [minute, setMinute] = useState(initial.m);

  useEffect(() => {
    setHour(initial.h);
    setMinute(initial.m);
  }, [initial.h, initial.m]);

  useEffect(() => {
    onChange(`${hour}:${minute}`);
  }, [hour, minute, onChange]);

  return (
    <View style={styles.root}>
      <Wheel values={HOURS} value={hour} onChange={setHour} />
      <View style={styles.divider} />
      <Wheel values={MINUTES} value={minute} onChange={setMinute} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    gap: 8,
  },
  divider: {
    width: 1,
    backgroundColor: `${PRIMARY}26`,
    marginVertical: 28,
  },
  wheelRoot: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: BACKGROUND_LIGHT,
    position: "relative",
  },
  wheelContent: { paddingHorizontal: 8 },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelText: {
    fontSize: 20,
    color: SLATE_400,
    fontWeight: "500",
  },
  wheelTextSelected: {
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
