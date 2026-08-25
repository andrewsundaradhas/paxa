import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import * as Sentry from '@sentry/react-native';
import {colors, fonts, radius} from '../theme';

type Props = {children: React.ReactNode};
type State = {hasError: boolean};

/**
 * App-wide crash guard. A render/runtime error in any screen is caught here and
 * shown as a calm recovery screen instead of a white screen or native crash —
 * the error is reported to Sentry (when configured) and the user can retry.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {hasError: false};

  static getDerivedStateFromError(): State {
    return {hasError: true};
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    try {
      Sentry.captureException(error, {extra: {componentStack: info.componentStack}});
    } catch {
      // Sentry not configured — swallow so the boundary itself never throws.
    }
  }

  private reset = () => this.setState({hasError: false});

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <View style={styles.wrap}>
        <View style={styles.badge}>
          <Text style={styles.badgeGlyph}>!</Text>
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>The app hit an unexpected error. Your data is safe — let's try that again.</Text>
        <TouchableOpacity activeOpacity={0.85} onPress={this.reset} style={styles.btn}>
          <Text style={styles.btnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32},
  badge: {width: 60, height: 60, borderRadius: 20, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 22},
  badgeGlyph: {fontFamily: fonts.display, fontWeight: '800', fontSize: 30, color: colors.lime},
  title: {fontFamily: fonts.display, fontWeight: '700', fontSize: 22, color: colors.ink, marginBottom: 8, textAlign: 'center'},
  body: {fontSize: 14.5, color: colors.muted, fontWeight: '500', textAlign: 'center', lineHeight: 21, marginBottom: 26, maxWidth: 300},
  btn: {backgroundColor: colors.lime, borderRadius: radius.md, paddingVertical: 15, paddingHorizontal: 40},
  btnText: {fontFamily: fonts.display, fontWeight: '700', fontSize: 15, color: colors.ink},
});
