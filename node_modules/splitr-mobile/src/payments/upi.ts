import {Linking, Platform} from 'react-native';

export type UpiParams = {
  /** Payee VPA, e.g. "priya@okaxis". */
  vpa: string;
  /** Payee display name. */
  name: string;
  /** Amount in rupees. */
  amount: number;
  /** Transaction note shown in the UPI app. */
  note?: string;
};

/**
 * Build a UPI deep link per the NPCI URL spec. Opening this hands the payment
 * off to whichever UPI app the user has installed (GPay / PhonePe / Paytm /
 * bank app) — money moves directly payer→payee, peer-to-peer. paxa never
 * touches the funds and takes no fee.
 */
export const buildUpiUrl = ({vpa, name, amount, note}: UpiParams): string => {
  const q = new URLSearchParams({
    pa: vpa,
    pn: name,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note || 'paxa settlement',
  });
  return `upi://pay?${q.toString()}`;
};

export type UpiResult = 'opened' | 'no-app' | 'error';

/**
 * Launch the user's UPI app(s) for this payment.
 *
 * Android: a plain `upi://pay` intent resolves to the system chooser listing
 * every installed UPI app — exactly "redirect to any UPI app on their phone".
 *
 * iOS: there is no universal UPI scheme; `upi://` usually won't resolve, so we
 * report `no-app` and the caller should fall back (e.g. show the VPA to copy,
 * or open a specific app's scheme like `phonepe://` / `paytmmp://` / `gpay://`
 * if you choose to register them in Info.plist LSApplicationQueriesSchemes).
 */
export async function payViaUpi(params: UpiParams): Promise<UpiResult> {
  const url = buildUpiUrl(params);
  try {
    if (Platform.OS === 'ios') {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        return 'no-app';
      }
    }
    await Linking.openURL(url);
    return 'opened';
  } catch {
    return 'error';
  }
}
