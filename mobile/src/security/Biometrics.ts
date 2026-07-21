import ReactNativeBiometrics from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics();

export async function authenticateWithBiometrics(reason: string): Promise<boolean> {
  try {
    const {available, biometryType} = await rnBiometrics.isSensorAvailable();

    if (!available || !biometryType) {
      return false;
    }

    const result = await rnBiometrics.simplePrompt({promptMessage: reason});
    return result.success;
  } catch {
    return false;
  }
}
