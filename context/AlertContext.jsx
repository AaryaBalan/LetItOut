import React, { createContext, useContext, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const { theme } = useTheme();
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const showAlert = (title, message, buttons = [{ text: 'OK' }]) => {
    setAlertConfig({ visible: true, title, message, buttons });
  };

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal
        transparent
        visible={alertConfig.visible}
        animationType="fade"
        onRequestClose={hideAlert}
      >
        <View style={styles.overlay}>
          <View style={[styles.alertBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>{alertConfig.title}</Text>
            {alertConfig.message ? (
              <Text style={[styles.message, { color: theme.textSecondary }]}>{alertConfig.message}</Text>
            ) : null}
            <View style={styles.buttonContainer}>
              {alertConfig.buttons.map((btn, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    btn.style === 'cancel' ? { backgroundColor: theme.card } : { backgroundColor: '#6366F1' },
                    { margin: 4 }
                  ]}
                  onPress={() => {
                    hideAlert();
                    if (btn.onPress) btn.onPress();
                  }}
                >
                  <Text style={[
                    styles.buttonText,
                    btn.style === 'cancel' ? { color: theme.text } : { color: '#FFFFFF' }
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Fredoka-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    fontFamily: 'Fredoka-Regular',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontFamily: 'Fredoka-Bold',
  },
});
