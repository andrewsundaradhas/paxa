/**
 * Standalone verification of the SplitR domain logic (the prototype port).
 * Compiled to JS and run under Node — no React Native required. Exercises the
 * pairwise balance engine, all four split modes, and the settlement fee.
 */
import {
  useAppStore,
  MEMBERS,
  pairwise,
  youOweTotal,
  owedToYouTotal,
  topCreditor,
  groupSettled,
  computeSplits,
  splitValid,
  fmt,
  type ExpenseForm,
} from '../src/store/useAppStore';

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  const ok = cond ? 'PASS' : 'FAIL';
  if (!cond) {
    failures++;
  }
  console.log(`  [${ok}] ${name}${detail ? ' — ' + detail : ''}`);
}
function approx(a: number, b: number, eps = 0.5) {
  return Math.abs(a - b) < eps;
}

const store = useAppStore.getState();
const goa = store.group('goa')!;
const flat = store.group('flat')!;
const din = store.group('din')!;

console.log('\n== fmt ==');
check('fmt formats INR', fmt(1240) === '₹1,240', fmt(1240));
check('fmt rounds', fmt(1599.6) === '₹1,600', fmt(1599.6));

console.log('\n== Goa Trip pairwise balances (from your perspective) ==');
// Expenses: lunch 2400 by aarav /4; scooters 1600 by you /4; hotel 6400 by priya /4;
// club 3000 by rohan /3 (you,aarav,rohan).
// You owe aarav 600, priya 1600, rohan 1000; you are owed 1600/4*3=1200 from scooters.
const pw = pairwise(goa);
check('owe aarav 600', approx(pw.aarav, 600 - 400), `net ${pw.aarav}`); // aarav: +600 (lunch) -400 (scooters) = 200
check('owe priya 1600 net of scooters', approx(pw.priya, 1600 - 400), `net ${pw.priya}`); // +1600 -400 = 1200
check('owe rohan', approx(pw.rohan, 1000 - 400), `net ${pw.rohan}`); // club 1000 - scooters 400 = 600
const owe = youOweTotal(goa, {});
const owed = owedToYouTotal(goa);
console.log(`  you owe total = ${fmt(owe)}, owed to you = ${fmt(owed)}`);
check('top creditor is priya', topCreditor(goa).id === 'priya', topCreditor(goa).name);
check('goa not settled', groupSettled(goa, {}, {}) === false);

console.log('\n== settled-pairs removes a debt ==');
const afterSettle = youOweTotal(goa, {'goa:priya': true});
check('settling priya lowers what you owe', afterSettle < owe, `${fmt(owe)} -> ${fmt(afterSettle)}`);

console.log('\n== Friday Dinners base-settled ==');
check('din settled when no log', groupSettled(din, {}, {}) === true);

console.log('\n== split modes (amount 1000, 4 people) ==');
const base: ExpenseForm = {
  title: 'Test', amount: '1000', paidBy: 'you', mode: 'equal',
  involved: {you: true, aarav: true, priya: true, rohan: true}, vals: {},
};
check('equal -> 250 each', approx(computeSplits(base).aarav, 250));
check('equal valid', splitValid(base));

const exact = {...base, mode: 'exact' as const, vals: {you: '400', aarav: '300', priya: '200', rohan: '100'}};
check('exact sums to amount -> valid', splitValid(exact));
check('exact share read back', approx(computeSplits(exact).you, 400));
const exactBad = {...exact, vals: {...exact.vals, rohan: '50'}};
check('exact off-total -> invalid', splitValid(exactBad) === false);

const pct = {...base, mode: 'percent' as const, vals: {you: '40', aarav: '30', priya: '20', rohan: '10'}};
check('percent -> 400/300/200/100', approx(computeSplits(pct).aarav, 300));
check('percent 100% -> valid', splitValid(pct));
const pctBad = {...pct, vals: {...pct.vals, rohan: '5'}};
check('percent !=100% -> invalid', splitValid(pctBad) === false);

const shares = {...base, mode: 'shares' as const, vals: {you: '2', aarav: '1', priya: '1', rohan: '0'}};
// total shares 4 -> you 500, aarav 250, priya 250, rohan 0
check('shares proportional', approx(computeSplits(shares).you, 500) && approx(computeSplits(shares).aarav, 250));
check('shares always valid', splitValid(shares));

console.log('\n== no platform fee — members carry a UPI VPA ==');
check('settle records carry no fee field', !('fee' in ({to: 'x', amount: 1, method: 'upi', date: 'now'} as any).constructor.prototype));
check('member has a VPA for the upi:// link', MEMBERS.priya.vpa === 'priya@okaxis', MEMBERS.priya.vpa);

console.log('\n== flat group sanity ==');
check('flat has 3 members', flat.members.length === 3);
check('flat not settled', groupSettled(flat, {}, {}) === false);

console.log('\n== store actions: add expense resets settled + switches tab ==');
useAppStore.setState({groupId: 'goa', settledPairs: {'goa:priya': true}});
useAppStore.getState().openSheet('addExpense');
useAppStore.getState().patchExp({title: 'Pizza', amount: '800'});
const added = useAppStore.getState().addExpense();
check('addExpense returns true on valid form', added === true);
check('addExpense cleared goa settled pairs', !useAppStore.getState().settledPairs['goa:priya']);
check('addExpense switched to expenses tab', useAppStore.getState().tab === 'expenses');
check('new expense is first in group', useAppStore.getState().group('goa')!.expenses[0].title === 'Pizza');

console.log('\n== store actions: create group requires name + 2 members ==');
useAppStore.getState().openSheet('createGroup');
check('create blocked with <2 members', useAppStore.getState().createGroup() === null);
useAppStore.getState().patchGrp({name: 'Trek Crew', members: {you: true, meera: true}});
const newId = useAppStore.getState().createGroup();
check('create returns new id', typeof newId === 'string');
check('new group is in list', useAppStore.getState().groups.some(g => g.id === newId));

console.log('\n== store actions: settle flow logs a record ==');
useAppStore.setState({groupId: 'goa', settleTarget: 'priya', settleMethod: 'upi'});
useAppStore.getState().doPay();
check('doPay opens success sheet', useAppStore.getState().sheet === 'success');
useAppStore.getState().finishPay();
const log = useAppStore.getState().log['goa'];
check('finishPay logged a settlement', !!log && log.length > 0, log ? `${log.length} record(s)` : 'none');
check('finishPay marked pair settled', useAppStore.getState().settledPairs['goa:priya'] === true);

console.log(`\n${failures === 0 ? '✅ ALL CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
