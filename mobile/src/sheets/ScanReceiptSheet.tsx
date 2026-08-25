import React, {useState} from 'react';
import {View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator} from 'react-native';
import {colors, fonts, radius, hairline} from '../theme';
import {LimeButton, GhostButton} from '../components/Buttons';
import {Sheet} from '../components/Sheet';
import {SPENDING_CATEGORIES} from '@shared/schemas';
import {useAppStore} from '../store/useAppStore';
import {captureAndScan, scanSupported, ScanUnavailable} from '../receipts/scan';
import {parseReceipt} from '../receipts/parseReceipt';
import {submitReceipt} from '../data/liveMutations';

type Phase = 'idle' | 'processing' | 'review';

/**
 * Take/Upload receipt → on-device OCR → extract → review/correct → create a
 * pre-filled money request. If the native camera/OCR modules aren't in the build,
 * it degrades to manual entry so the flow never dead-ends.
 */
export const ScanReceiptSheet: React.FC = () => {
  const sheet = useAppStore(s => s.sheet);
  const closeSheet = useAppStore(s => s.closeSheet);
  const openRequestSheet = useAppStore(s => s.openRequestSheet);
  const flash = useAppStore(s => s.flash);

  const visible = sheet === 'scanReceipt';

  const [phase, setPhase] = useState<Phase>('idle');
  const [merchant, setMerchant] = useState('');
  const [total, setTotal] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<string>('Other');
  const [rawText, setRawText] = useState('');
  const [items, setItems] = useState<{name: string; price: number}[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPhase('idle');
    setMerchant('');
    setTotal('');
    setDate('');
    setCategory('Other');
    setRawText('');
    setItems([]);
    setError(null);
  };

  const close = () => {
    reset();
    closeSheet();
  };

  if (!visible) {
    return <Sheet visible={false} onClose={close} children={null} />;
  }

  const runScan = async (source: 'camera' | 'library') => {
    setError(null);
    setPhase('processing');
    try {
      const res = await captureAndScan(source);
      if (!res) {
        setPhase('idle'); // cancelled
        return;
      }
      const parsed = parseReceipt(res.rawText);
      setMerchant(parsed.merchant ?? '');
      setTotal(parsed.total != null ? String(parsed.total) : '');
      setDate(parsed.date ?? '');
      setCategory(parsed.category);
      setItems(parsed.items);
      setRawText(res.rawText);
      setPhase('review');
    } catch (e) {
      if (e instanceof ScanUnavailable) {
        setError(`${e.message}. You can enter the details manually.`);
        setPhase('review'); // let them fill it in by hand
      } else {
        setError('Could not read that receipt. Try again or enter it manually.');
        setPhase('review');
      }
    }
  };

  const toRequest = async () => {
    const amt = parseFloat(total) || 0;
    let receiptId: string | undefined;
    try {
      receiptId = (await submitReceipt({
        merchant: merchant.trim() || undefined,
        amount: amt,
        category,
        receiptDate: date ? new Date(date).toISOString() : undefined,
        rawText: rawText || undefined,
        items: items.map(i => ({name: i.name, pricePaise: Math.round(i.price * 100)})),
      })) ?? undefined;
    } catch {
      // Non-fatal: still let them raise the request without a stored receipt.
      flash('Saved locally — receipt not synced');
    }
    reset();
    openRequestSheet({
      amount: amt > 0 ? String(amt) : '',
      note: merchant.trim() ? `${merchant.trim()} receipt` : 'Scanned receipt',
      category,
      receiptId,
    });
  };

  return (
    <Sheet visible={visible} onClose={close} scroll>
      <Text style={styles.title}>Scan a receipt</Text>
      <Text style={styles.sub}>Snap the bill — paxa reads the total and merchant for you.</Text>

      {phase === 'idle' && (
        <View style={styles.captureWrap}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            <Text style={styles.frameGlyph}>🧾</Text>
          </View>
          {!scanSupported() && (
            <Text style={styles.hint}>Camera scanning activates after the next app build — you can still enter details manually.</Text>
          )}
          <LimeButton label="Take photo" onPress={() => runScan('camera')} style={styles.cta} />
          <GhostButton label="Upload from gallery" onPress={() => runScan('library')} style={styles.ghost} textStyle={styles.ghostText} />
          <TouchableOpacity onPress={() => setPhase('review')} style={styles.manualRow}>
            <Text style={styles.manual}>Enter manually instead</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'processing' && (
        <View style={styles.processing}>
          <ActivityIndicator color={colors.ink} />
          <Text style={styles.processingText}>Reading your receipt…</Text>
        </View>
      )}

      {phase === 'review' && (
        <View>
          {error && <Text style={styles.error}>{error}</Text>}
          <Text style={styles.reviewNote}>Check the details and fix anything that looks off.</Text>

          <Text style={styles.label}>MERCHANT</Text>
          <TextInput style={styles.input} placeholder="e.g. Cafe Coffee Day" placeholderTextColor={colors.muted2} value={merchant} onChangeText={setMerchant} />

          <Text style={styles.label}>TOTAL</Text>
          <View style={styles.amountRow}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput style={styles.amountInput} placeholder="0" placeholderTextColor={colors.muted2} keyboardType="decimal-pad" value={total} onChangeText={setTotal} />
          </View>

          <Text style={styles.label}>DATE</Text>
          <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted2} value={date} onChangeText={setDate} autoCapitalize="none" />

          <Text style={styles.label}>CATEGORY</Text>
          <View style={styles.catWrap}>
            {SPENDING_CATEGORIES.map(c => {
              const on = category === c;
              return (
                <TouchableOpacity key={c} activeOpacity={0.85} onPress={() => setCategory(c)} style={[styles.cat, on && styles.catOn]}>
                  <Text style={[styles.catText, on && styles.catTextOn]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {items.length > 0 && (
            <View style={styles.itemsCard}>
              <Text style={styles.itemsTitle}>{items.length} items detected</Text>
              {items.slice(0, 6).map((it, i) => (
                <View key={`${it.name}-${i}`} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                  <Text style={styles.itemPrice}>₹{Math.round(it.price).toLocaleString('en-IN')}</Text>
                </View>
              ))}
            </View>
          )}

          <LimeButton label="Create request" onPress={toRequest} disabled={(parseFloat(total) || 0) <= 0} style={styles.cta} />
        </View>
      )}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  title: {fontFamily: fonts.display, fontWeight: '700', fontSize: 21, color: colors.ink},
  sub: {fontSize: 13.5, color: colors.muted, fontWeight: '500', marginTop: 3},

  captureWrap: {marginTop: 18},
  frame: {height: 180, borderRadius: radius.lg, backgroundColor: colors.white, ...hairline, alignItems: 'center', justifyContent: 'center', marginBottom: 18},
  frameGlyph: {fontSize: 54},
  corner: {position: 'absolute', width: 26, height: 26, borderColor: colors.limeDark},
  tl: {top: 14, left: 14, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 8},
  tr: {top: 14, right: 14, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 8},
  bl: {bottom: 14, left: 14, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 8},
  br: {bottom: 14, right: 14, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 8},
  hint: {fontSize: 12.5, color: colors.muted3, fontWeight: '500', textAlign: 'center', marginBottom: 14, lineHeight: 17},
  cta: {marginTop: 8, paddingVertical: 18},
  ghost: {marginTop: 12, paddingVertical: 15, borderRadius: radius.md},
  ghostText: {fontSize: 15},
  manualRow: {alignItems: 'center', marginTop: 16},
  manual: {fontSize: 13, fontWeight: '600', color: colors.muted3, textDecorationLine: 'underline'},

  processing: {alignItems: 'center', paddingVertical: 48, gap: 14},
  processingText: {fontSize: 14, fontWeight: '600', color: colors.muted3},

  error: {color: '#b00050', fontSize: 13, fontWeight: '600', marginTop: 14, marginHorizontal: 2, lineHeight: 18},
  reviewNote: {fontSize: 13, color: colors.muted, fontWeight: '500', marginTop: 16},

  label: {fontSize: 11.5, fontWeight: '700', letterSpacing: 0.5, color: colors.muted, marginTop: 18, marginBottom: 8, marginHorizontal: 2},
  input: {backgroundColor: colors.white, ...hairline, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16, fontSize: 15, fontWeight: '500', color: colors.ink},
  amountRow: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, ...hairline, borderRadius: radius.md, paddingHorizontal: 16},
  rupee: {fontFamily: fonts.display, fontWeight: '700', fontSize: 24, color: colors.ink, marginRight: 6},
  amountInput: {flex: 1, fontFamily: fonts.display, fontWeight: '700', fontSize: 28, color: colors.ink, paddingVertical: 12},

  catWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  cat: {backgroundColor: colors.white, ...hairline, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14},
  catOn: {backgroundColor: colors.ink, borderColor: colors.ink},
  catText: {fontSize: 13, fontWeight: '600', color: colors.muted3},
  catTextOn: {color: colors.white},

  itemsCard: {backgroundColor: colors.white, ...hairline, borderRadius: radius.md, padding: 14, marginTop: 18},
  itemsTitle: {fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 8, letterSpacing: 0.3},
  itemRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5},
  itemName: {flex: 1, fontSize: 14, fontWeight: '500', color: colors.ink, marginRight: 10},
  itemPrice: {fontFamily: fonts.display, fontWeight: '700', fontSize: 14, color: colors.ink},
});
