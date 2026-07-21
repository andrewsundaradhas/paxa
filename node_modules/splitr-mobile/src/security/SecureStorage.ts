import * as Keychain from 'react-native-keychain';

const SERVICE_NAME = 'splitr_refresh_token';

export async function storeRefreshToken(token: string, deviceId: string): Promise<boolean> {
  const result = await Keychain.setGenericPassword(deviceId, token, {
    service: SERVICE_NAME,
    accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
  });
  
  return result !== false;
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: SERVICE_NAME,
      authenticationPrompt: {
        title: 'Unlock paxa',
        subtitle: 'Use biometrics to continue',
        description: 'Authenticate to retrieve your refresh token.',
      },
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    });

    return credentials ? credentials.password : null;
  } catch (error) {
    return null;
  }
}

export async function clearRefreshToken(): Promise<boolean> {
  return Keychain.resetGenericPassword({service: SERVICE_NAME});
}


