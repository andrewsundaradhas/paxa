import React from 'react';
import {View, StyleSheet, TouchableWithoutFeedback, Modal, ScrollView} from 'react-native';
import {colors} from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Dark graphite variant for the Settle "real-money" moment. */
  dark?: boolean;
  /** Scroll the body (Add expense / Create group). */
  scroll?: boolean;
  children: React.ReactNode;
};

/**
 * Premium bottom sheet — slides up over a blurred dim. Warm canvas by default
 * (Add expense / Create group); ink when `dark` (Settle). Soft 36–38px top
 * radius + a drag handle, no hard border.
 */
export const Sheet: React.FC<Props> = ({visible, onClose, dark, scroll, children}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.fill}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <View style={[styles.sheet, dark ? styles.dark : styles.light]}>
        <View style={[styles.handle, dark ? styles.handleDark : styles.handleLight]} />
        {scroll ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {children}
          </ScrollView>
        ) : (
          <View>{children}</View>
        )}
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  fill: {flex: 1, justifyContent: 'flex-end'},
  backdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,12,10,0.45)'},
  sheet: {borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28, maxHeight: '92%'},
  light: {backgroundColor: colors.canvas},
  dark: {backgroundColor: colors.ink, borderTopLeftRadius: 38, borderTopRightRadius: 38},
  scrollContent: {paddingBottom: 8},
  handle: {width: 42, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 18},
  handleLight: {backgroundColor: '#cfccc2'},
  handleDark: {backgroundColor: 'rgba(255,255,255,0.25)'},
});
