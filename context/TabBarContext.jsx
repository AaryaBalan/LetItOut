import React, { createContext, useContext, useRef } from "react";
import { Animated } from "react-native";

const TabBarContext = createContext({
  translateY: new Animated.Value(0),
  showTabBar: () => {},
  hideTabBar: () => {},
});

export const TabBarProvider = ({ children }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const isHidden = useRef(false);

  const showTabBar = () => {
    if (!isHidden.current) return;
    isHidden.current = false;
    Animated.timing(translateY, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const hideTabBar = () => {
    if (isHidden.current) return;
    isHidden.current = true;
    Animated.timing(translateY, {
      toValue: 100, // Safe buffer to slide completely below the screen
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TabBarContext.Provider value={{ translateY, showTabBar, hideTabBar }}>
      {children}
    </TabBarContext.Provider>
  );
};

export const useTabBar = () => useContext(TabBarContext);
