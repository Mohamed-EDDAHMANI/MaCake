import React from "react";
import { View, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";
import successAnimation from "../../lottie/Success.json";

const LottieAnimation = () => {
  return (
    <View style={styles.container}>
      <LottieView
        source={successAnimation}
        autoPlay
        loop
        style={styles.animation}
      />
    </View>
  );
};

export default LottieAnimation;

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center"
  },
  animation: {
    width: 300,
    height: 300
  }
});