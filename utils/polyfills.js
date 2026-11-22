import * as ReactNative from "react-native";

// Polyfill InteractionManager for React Native 0.88+ where it was removed from core
const interactionManagerPolyfill = {
  runAfterInteractions(task) {
    let handle;
    const promise = new Promise((resolve) => {
      const runner = () => {
        try {
          const result = task ? task() : undefined;
          resolve(result);
        } catch (e) {
          resolve();
        }
      };

      if (typeof requestIdleCallback === "function") {
        handle = requestIdleCallback(runner);
      } else {
        handle = setTimeout(runner, 0);
      }
    });

    return {
      then: promise.then.bind(promise),
      done: (...args) => {
        if (typeof promise.done === "function") {
          promise.done(...args);
        } else {
          promise.then(...args);
        }
      },
      cancel: () => {
        if (typeof cancelIdleCallback === "function") {
          cancelIdleCallback(handle);
        } else {
          clearTimeout(handle);
        }
      },
    };
  },
  createInteractionHandle: () => 0,
  clearInteractionHandle: () => {},
  setDeadline: () => {},
};

try {
  Object.defineProperty(ReactNative, "InteractionManager", {
    configurable: true,
    enumerable: true,
    writable: true,
    value: interactionManagerPolyfill,
  });
} catch (_e) {
  try {
    ReactNative.InteractionManager = interactionManagerPolyfill;
  } catch (_e2) {}
}

export default interactionManagerPolyfill;

