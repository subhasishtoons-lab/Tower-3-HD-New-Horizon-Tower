import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCollectionSummary,
  calculateMonthlyBill,
  generateTowerUnits,
  getFloorForUnit,
  isValidUnitNumber,
  validateDiscussionInput,
  validateExpenseInput,
  validateMaintenanceInput,
  validateNoticeInput,
  validatePaymentInput,
  validateSignupInput,
} from './billing';
import {
  EMERGENCY_CONTACTS,
  FIXED_CLEANER_SALARY,
  SEED_EXPENSES,
  SEED_PAYMENTS,
  SOCIETY_ADDRESS,
  TOTAL_UNITS,
  TOWER_REPRESENTATIVES,
} from '../data/societyConstants';

test('Tower 3 has exactly 24 units from 049 to 072 across 6 floors (4 per floor) with no default names', () => {
  const units = generateTowerUnits();
  assert.equal(units.length, 24);
  assert.equal(units[0].unitNumber, '049');
  assert.equal(units[0].floor, 1);
  assert.equal(units[3].unitNumber, '052');
  assert.equal(units[3].floor, 1);
  assert.equal(units[4].unitNumber, '053');
  assert.equal(units[4].floor, 2);
  assert.equal(units[23].unitNumber, '072');
  assert.equal(units[23].floor, 6);

  for (const unit of units) {
    assert.equal(unit.occupantName, '');
  }

  for (let floor = 1; floor <= 6; floor += 1) {
    assert.equal(units.filter((u) => u.floor === floor).length, 4);
  }
});

test('Unit validation accepts 049–072 and rejects out-of-range values', () => {
  assert.equal(isValidUnitNumber('049'), true);
  assert.equal(isValidUnitNumber('060'), true);
  assert.equal(isValidUnitNumber('072'), true);
  assert.equal(isValidUnitNumber('048'), false);
  assert.equal(isValidUnitNumber('073'), false);
  assert.equal(isValidUnitNumber('099'), false);
  assert.equal(getFloorForUnit('049'), 1);
  assert.equal(getFloorForUnit('061'), 4);
  assert.equal(getFloorForUnit('072'), 6);
  assert.throws(() => getFloorForUnit('099'));
});

test('Monthly maintenance is fixed Rs. 11,000 cleaner salary with zero utility charges', () => {
  const baseBill = calculateMonthlyBill('2026-08', []);
  assert.equal(baseBill.fixedCleanerSalaryTotal, 11000);
  assert.equal(FIXED_CLEANER_SALARY, 11000);
  assert.equal(baseBill.totalUnits, TOTAL_UNITS);
  assert.equal(baseBill.cleanerSharePerUnit, 458.33);
  assert.equal(baseBill.electricityCharge, 0);
  assert.equal(baseBill.waterCharge, 0);
  assert.equal(baseBill.gasCharge, 0);
  assert.equal(baseBill.extraExpensesPerUnit, 0);
  assert.equal(baseBill.totalPayablePerUnit, 458.33);
});

test('Different Expenses add equal per-unit share on top of fixed cleaner salary', () => {
  const novBill = calculateMonthlyBill('2026-11', SEED_EXPENSES);
  // Seed November expenses: 960 + 1440 = 2400 -> 2400 / 24 = 100.00 per unit
  assert.equal(novBill.extraExpensesTotal, 2400);
  assert.equal(novBill.extraExpensesPerUnit, 100);
  assert.equal(novBill.totalSocietyPool, 13400);
  assert.equal(novBill.totalPayablePerUnit, 558.33);

  const withExtra = calculateMonthlyBill('2026-11', [
    ...SEED_EXPENSES,
    {
      id: 'exp-test',
      societyId: 'tower3-duliajan',
      title: 'Staircase LED Bulbs',
      category: 'Security & Lighting',
      amount: 1200,
      perUnitShare: 50,
      month: '2026-11',
      description: 'Test extra charge',
      addedByUid: 'u1',
      addedByName: 'Test Resident',
      addedByUnit: '054',
      createdAt: '2026-11-20T10:00:00.000Z',
    },
  ]);
  assert.equal(withExtra.extraExpensesTotal, 3600);
  assert.equal(withExtra.extraExpensesPerUnit, 150);
  assert.equal(withExtra.totalPayablePerUnit, 608.33);
});

test('Collection summary counts paid and pending units accurately with blank unit names', () => {
  const summary = calculateCollectionSummary('2026-11', SEED_EXPENSES, SEED_PAYMENTS);
  assert.equal(summary.rows.length, 24);
  assert.equal(summary.paidCount, 5);
  assert.equal(summary.pendingCount, 19);
  assert.equal(summary.rows.find((r) => r.unitNumber === '049')?.status, 'paid');
  assert.equal(summary.rows.find((r) => r.unitNumber === '049')?.occupantName, '');
  assert.equal(summary.rows.find((r) => r.unitNumber === '054')?.status, 'pending');
  assert.equal(summary.rows.find((r) => r.unitNumber === '054')?.occupantName, '');
});

test('Emergency contacts, representatives, and official Duliajan address match requirements', () => {
  assert.equal(
    SOCIETY_ADDRESS,
    'Tower 3, New Horizontal Enclave, Oil Housing Area, OIL India Ltd., Duliajan, Assam 786602'
  );
  assert.deepEqual(EMERGENCY_CONTACTS.find((c) => c.id === 'fire')?.numbers, ['0374-2807333']);
  assert.deepEqual(EMERGENCY_CONTACTS.find((c) => c.id === 'ambulance')?.numbers, ['0374-2806361']);
  assert.deepEqual(EMERGENCY_CONTACTS.find((c) => c.id === 'electrical')?.numbers, ['0374-2807396']);
  assert.deepEqual(EMERGENCY_CONTACTS.find((c) => c.id === 'gas-water')?.numbers, [
    '0374-2807222',
    '0374-2808877',
  ]);
  assert.equal(TOWER_REPRESENTATIVES[0].name, 'Arindam Choudhury');
  assert.equal(TOWER_REPRESENTATIVES[0].phone, '8876358668');
  assert.equal(TOWER_REPRESENTATIVES[1].name, 'Akash N Das');
  assert.equal(TOWER_REPRESENTATIVES[1].phone, '8723041655');
});

test('Blueprint-synchronized validators reject invalid and empty payloads', () => {
  assert.equal(
    validateSignupInput({
      fullName: '',
      unitNumber: '099',
      phone: '123',
      email: 'bad',
      passcode: '12',
      requirePasscode: true,
    }).valid,
    false
  );
  assert.equal(
    validateSignupInput({
      fullName: 'Rituraj Kalita',
      unitNumber: '054',
      phone: '9864012345',
      email: 'resident@example.com',
      passcode: 'tower054',
      requirePasscode: true,
    }).valid,
    true
  );

  assert.equal(validateNoticeInput({ title: 'Hi', content: 'No', effectiveDate: '' }).valid, false);
  assert.equal(
    validateNoticeInput({
      title: 'Emergency Pump Repair',
      content: 'Main booster pump motor replacement scheduled today at 4 PM.',
      effectiveDate: '20 Nov 2026',
    }).valid,
    true
  );

  assert.equal(
    validateExpenseInput({ title: 'A', amount: -50, month: 'bad', description: '' }).valid,
    false
  );
  assert.equal(
    validateExpenseInput({
      title: 'Lobby Bulbs',
      amount: 1200,
      month: '2026-11',
      description: 'Replaced 6 LED bulbs',
    }).valid,
    true
  );

  assert.equal(validateMaintenanceInput({ title: '', location: '', description: '' }).valid, false);
  assert.equal(validateDiscussionInput({ title: 'ab', body: 'cd' }).valid, false);
  assert.equal(validatePaymentInput({ referenceNumber: '12' }).valid, false);
  assert.equal(validatePaymentInput({ referenceNumber: 'UPI-882910' }).valid, true);
});
