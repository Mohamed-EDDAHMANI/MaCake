import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const PRIMARY = "#da1b61";
const BG = "#FFF8F6";

export default function AppSplashScreen() {
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 0.35,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0.68,
          duration: 1200,
          useNativeDriver: false,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.85, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [progress, pulse]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.root}>
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      <View style={styles.center}>
        <View style={styles.logoWrap}>
          <MaterialIcons name="restaurant" size={58} color={PRIMARY} />
          <Text style={styles.logoM}>M</Text>
        </View>
        <Text style={styles.brand}>MaCack</Text>
        <Text style={styles.tagline}>Artisan Pastry Marketplace</Text>
      </View>

      <View style={styles.bottom}>
        <Animated.Text style={[styles.loadingText, { opacity: pulse }]}>
          Warming up the ovens...
        </Animated.Text>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width }]} />
        </View>
        <View style={styles.estDivider} />
        <Text style={styles.est}>EST. 2025</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 90,
    paddingBottom: 70,
    paddingHorizontal: 24,
  },
  topGlow: {
    position: "absolute",
    top: -120,
    right: -120,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: `${PRIMARY}12`,
  },
  bottomGlow: {
    position: "absolute",
    bottom: -120,
    left: -120,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: `${PRIMARY}12`,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoM: {
    position: "absolute",
    color: PRIMARY,
    fontSize: 34,
    fontWeight: "800",
  },
  brand: {
    fontSize: 42,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 1.5,
  },
  tagline: {
    marginTop: 8,
    color: `${PRIMARY}CC`,
    fontSize: 18,
    fontStyle: "italic",
  },
  bottom: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  progressTrack: {
    width: "100%",
    height: 3,
    borderRadius: 999,
    backgroundColor: `${PRIMARY}22`,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: PRIMARY,
  },
  estDivider: {
    width: 48,
    height: 1,
    marginTop: 10,
    backgroundColor: `${PRIMARY}44`,
  },
  est: {
    color: `${PRIMARY}AA`,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
});
