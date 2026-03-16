/**
 * A modern, iOS-style "glass" header with blur effect.
 * Positioned at the top, full width, with subtle border and high zIndex.
 */
import { View, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { ReactNode } from "react";

const BLUR_INTENSITY = 50;
const HEADER_CONTENT_HEIGHT = 48;
const HORIZONTAL_PADDING = 16;
const BORDER_COLOR = "rgba(0,0,0,0.06)";
const Z_INDEX = 1000;

export interface GlassHeaderProps {
  /** Left-aligned content (e.g. back button, title) */
  leftContent?: ReactNode;
  /** Center content (e.g. title). If omitted, space is distributed. */
  centerContent?: ReactNode;
  /** Right-aligned content (e.g. avatar, actions) */
  rightContent?: ReactNode;
  /** Top padding (e.g. from useSafeAreaInsets().top). Default 0. */
  topInset?: number;
  /** Optional style for the outer wrapper (position already set). */
  style?: object;
}

export function GlassHeader({
  leftContent,
  centerContent,
  rightContent,
  topInset = 0,
  style,
}: GlassHeaderProps) {
  const blurProps =
    Platform.OS === "android"
      ? { experimentalBlurMethod: "dimezisBlurView" as const }
      : {};

  return (
    <View style={[styles.wrapper, { paddingTop: topInset }, style]}>
      <BlurView
        intensity={BLUR_INTENSITY}
        tint="light"
        style={StyleSheet.absoluteFill}
        {...blurProps}
      />
      <View style={styles.border} />
      <View style={styles.row}>
        <View style={styles.slot}>{leftContent}</View>
        <View style={styles.centerSlot}>{centerContent}</View>
        <View style={styles.slot}>{rightContent}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    minHeight: HEADER_CONTENT_HEIGHT,
    justifyContent: "flex-end",
    overflow: "hidden",
    zIndex: Z_INDEX,
  },
  border: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: BORDER_COLOR,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: HORIZONTAL_PADDING,
    height: HEADER_CONTENT_HEIGHT,
  },
  slot: {
    minWidth: 0,
    flex: 0,
  },
  centerSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
});
