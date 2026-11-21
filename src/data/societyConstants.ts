import type {
  ActivityEntry,
  DiscussionTopic,
  ExpenseItem,
  MaintenanceRequest,
  NoticeItem,
  PaymentRecord,
  UnitDirectoryEntry,
} from '../types/society';

export const SOCIETY_ID = 'tower3-duliajan' as const;
export const SOCIETY_NAME = 'Tower 3 HD Oil Housing Society';
export const SOCIETY_ORG = 'Oil India Ltd., Duliajan';
export const SOCIETY_ADDRESS =
  'Tower 3, New Horizontal Enclave, Oil Housing Area, OIL India Ltd., Duliajan, Assam 786602';

export const TOTAL_UNITS = 24;
export const UNITS_PER_FLOOR = 4;
export const TOTAL_FLOORS = 6;
export const FIRST_UNIT_NUM = 49;
export const LAST_UNIT_NUM = 72;

export const BOOTSTRAPPED_ADMIN_EMAIL = 'subhasish.toons@gmail.com';
export const ADMIN_DEFAULT_PASSCODE = 'tower3admin';

// Fixed monthly maintenance is strictly cleaner salary (Rs. 11,000 fixed).
// Zero electricity, water, or gas charges (OIL India Ltd. resident complex).
export const FIXED_CLEANER_SALARY = 11000;

export const CURRENT_BILLING_MONTH = '2026-11';
export const AVAILABLE_MONTHS = [
  { value: '2026-11', label: 'November 2026' },
  { value: '2026-10', label: 'October 2026' },
  { value: '2026-09', label: 'September 2026' },
];

export interface EmergencyContact {
  id: string;
  service: string;
  numbers: string[];
  description: string;
  availability: string;
}

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'fire',
    service: 'Fire',
    numbers: ['0374-2807333'],
    description: 'OIL India Industrial & Residential Fire Station, Duliajan',
    availability: '24/7 Emergency Response',
  },
  {
    id: 'ambulance',
    service: 'Ambulance',
    numbers: ['0374-2806361'],
    description: 'OIL Hospital Ambulance & Medical Dispatch, Duliajan',
    availability: '24/7 Emergency Response',
  },
  {
    id: 'electrical',
    service: 'Electrical',
    numbers: ['0374-2807396'],
    description: 'OIL Housing Electrical Maintenance & Fault Control',
    availability: '24/7 Fault Helpline',
  },
  {
    id: 'gas-water',
    service: 'Gas Water Supply',
    numbers: ['0374-2807222', '0374-2808877'],
    description: 'Domestic Gas Pipeline & Water Supply Control Room',
    availability: '24/7 Utility Desk',
  },
];

export interface TowerRepresentative {
  id: string;
  name: string;
  phone: string;
  role: string;
}

export const TOWER_REPRESENTATIVES: TowerRepresentative[] = [
  {
    id: 'rep-arindam',
    name: 'Arindam Choudhury',
    phone: '8876358668',
    role: 'Tower 3 Representative',
  },
  {
    id: 'rep-akash',
    name: 'Akash N Das',
    phone: '8723041655',
    role: 'Tower 3 Representative',
  },
];

// All 24 units (049 to 072) start with no hardcoded names; Admin or residents can assign names.
export const DEFAULT_UNIT_ROSTER: UnitDirectoryEntry[] = Array.from(
  { length: TOTAL_UNITS },
  (_, index) => {
    const unitNum = FIRST_UNIT_NUM + index;
    return {
      unitNumber: String(unitNum).padStart(3, '0'),
      floor: Math.floor(index / UNITS_PER_FLOOR) + 1,
      occupantName: '',
    };
  }
);

export const SEED_EXPENSES: ExpenseItem[] = [
  {
    id: 'exp-nov-1',
    societyId: SOCIETY_ID,
    title: 'Ground Floor & Staircase Disinfectant Bulk Pack',
    category: 'Cleaning Supplies',
    amount: 960,
    perUnitShare: 40,
    month: '2026-11',
    description:
      'Monthly phenyl, floor mop refills, and bin liners procured for Tower 3 common landings (Floors 1 to 6).',
    addedByUid: 'admin-tower3',
    addedByName: 'Society Administrator',
    addedByUnit: 'ADM',
    createdAt: '2026-11-04T09:15:00.000Z',
  },
  {
    id: 'exp-nov-2',
    societyId: SOCIETY_ID,
    title: 'Main Entrance Gate Latch & Hinge Welding',
    category: 'Common Area Repair',
    amount: 1440,
    perUnitShare: 60,
    month: '2026-11',
    description: 'Emergency alignment and hinge reinforcement of Tower 3 pedestrian entry gate.',
    addedByUid: 'admin-tower3',
    addedByName: 'Society Administrator',
    addedByUnit: 'ADM',
    createdAt: '2026-11-11T14:30:00.000Z',
  },
  {
    id: 'exp-oct-1',
    societyId: SOCIETY_ID,
    title: 'Staircase LED Batten Replacement (Floors 2 & 5)',
    category: 'Security & Lighting',
    amount: 1200,
    perUnitShare: 50,
    month: '2026-10',
    description:
      'Replaced four flickering 20W LED batten tubes along Floor 2 and Floor 5 stairwell landings.',
    addedByUid: 'admin-tower3',
    addedByName: 'Society Administrator',
    addedByUnit: 'ADM',
    createdAt: '2026-10-14T11:00:00.000Z',
  },
];

export const SEED_NOTICES: NoticeItem[] = [
  {
    id: 'notice-1',
    societyId: SOCIETY_ID,
    title: 'Overhead Water Pipeline Valve Inspection — Brief Supply Pause',
    content:
      'OIL Housing Gas & Water Supply team will inspect the Tower 3 rooftop header valve on Saturday between 10:00 AM and 12:30 PM. Residents from Units 049 to 072 are requested to store drinking water beforehand. For urgent faults contact 0374-2807222.',
    category: 'Emergency Work',
    priority: 'urgent',
    effectiveDate: '21 Nov 2026, 10:00 AM',
    authorUid: 'admin-tower3',
    authorName: 'Society Administrator',
    authorUnit: 'ADM',
    status: 'active',
    createdAt: '2026-11-19T08:40:00.000Z',
  },
  {
    id: 'notice-2',
    societyId: SOCIETY_ID,
    title: 'November Cleaner Salary & Shared Expense Collection Due by 25th',
    content:
      'Monthly cleaner salary remains fixed at Rs. 11,000 (Rs. 458.33 per unit across 24 units) plus Rs. 100.00 per unit for November common area supplies and gate welding. Please settle dues online or with Tower Representatives before 25 November.',
    category: 'Society Meeting',
    priority: 'normal',
    effectiveDate: '25 Nov 2026',
    authorUid: 'admin-tower3',
    authorName: 'Society Administrator',
    authorUnit: 'ADM',
    status: 'active',
    createdAt: '2026-11-15T10:15:00.000Z',
  },
  {
    id: 'notice-3',
    societyId: SOCIETY_ID,
    title: 'Lift Shaft Preventive Servicing Scheduled by OIL Maintenance Wing',
    content:
      'Routine elevator inspection and lubrication is scheduled on Monday from 2:00 PM to 4:00 PM. Staircases will remain open and cleaned prior to maintenance.',
    category: 'Maintenance',
    priority: 'normal',
    effectiveDate: '23 Nov 2026, 02:00 PM',
    authorUid: 'admin-tower3',
    authorName: 'Society Administrator',
    authorUnit: 'ADM',
    status: 'active',
    createdAt: '2026-11-12T16:20:00.000Z',
  },
];

export const SEED_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay-2026-11-049',
    societyId: SOCIETY_ID,
    month: '2026-11',
    unitNumber: '049',
    residentUid: 'local-049',
    residentName: '',
    cleanerShare: 458.33,
    extraExpensesShare: 100,
    totalAmount: 558.33,
    paymentMethod: 'UPI',
    referenceNumber: 'UPI-T3-049-8841',
    status: 'paid',
    createdAt: '2026-11-12T10:12:00.000Z',
  },
  {
    id: 'pay-2026-11-050',
    societyId: SOCIETY_ID,
    month: '2026-11',
    unitNumber: '050',
    residentUid: 'local-050',
    residentName: '',
    cleanerShare: 458.33,
    extraExpensesShare: 100,
    totalAmount: 558.33,
    paymentMethod: 'UPI',
    referenceNumber: 'UPI-T3-050-3190',
    status: 'paid',
    createdAt: '2026-11-12T18:45:00.000Z',
  },
  {
    id: 'pay-2026-11-057',
    societyId: SOCIETY_ID,
    month: '2026-11',
    unitNumber: '057',
    residentUid: 'local-057',
    residentName: '',
    cleanerShare: 458.33,
    extraExpensesShare: 100,
    totalAmount: 558.33,
    paymentMethod: 'Bank Transfer',
    referenceNumber: 'IMPS-T3-057-2041',
    status: 'paid',
    createdAt: '2026-11-15T14:10:00.000Z',
  },
  {
    id: 'pay-2026-11-061',
    societyId: SOCIETY_ID,
    month: '2026-11',
    unitNumber: '061',
    residentUid: 'local-061',
    residentName: '',
    cleanerShare: 458.33,
    extraExpensesShare: 100,
    totalAmount: 558.33,
    paymentMethod: 'UPI',
    referenceNumber: 'UPI-T3-061-9920',
    status: 'paid',
    createdAt: '2026-11-12T08:05:00.000Z',
  },
  {
    id: 'pay-2026-11-069',
    societyId: SOCIETY_ID,
    month: '2026-11',
    unitNumber: '069',
    residentUid: 'local-069',
    residentName: '',
    cleanerShare: 458.33,
    extraExpensesShare: 100,
    totalAmount: 558.33,
    paymentMethod: 'Bank Transfer',
    referenceNumber: 'NEFT-T3-069-5501',
    status: 'paid',
    createdAt: '2026-11-18T10:50:00.000Z',
  },
];

export const SEED_MAINTENANCE: MaintenanceRequest[] = [
  {
    id: 'mnt-1',
    societyId: SOCIETY_ID,
    title: 'Damp Seepage Near Floor 4 Stairwell Window Frame',
    location: 'Floor 4 Common Staircase Landing',
    category: 'Structural & Masonry',
    urgency: 'High',
    description:
      'Rainwater seepage around the outer window sill on Floor 4 is causing plaster flaking along the landing wall. Needs OIL Civil Maintenance inspection.',
    status: 'in_progress',
    resolutionNote: 'Escalated to OIL Civil Maintenance wing; site visit scheduled.',
    reporterUid: 'local-063',
    reporterName: 'Unit 063 Resident',
    reporterUnit: '063',
    createdAt: '2026-11-16T07:50:00.000Z',
    updatedAt: '2026-11-18T11:20:00.000Z',
  },
  {
    id: 'mnt-2',
    societyId: SOCIETY_ID,
    title: 'Ground Floor Lobby Motion Light Flickering',
    location: 'Ground Floor Entrance Lobby',
    category: 'Electrical Fixture',
    urgency: 'Medium',
    description:
      'Ceiling LED panel near the notice board flickers continuously after 6 PM. Logged with OIL Electrical desk (0374-2807396).',
    status: 'reported',
    resolutionNote: '',
    reporterUid: 'local-052',
    reporterName: 'Unit 052 Resident',
    reporterUnit: '052',
    createdAt: '2026-11-18T19:10:00.000Z',
    updatedAt: '2026-11-18T19:10:00.000Z',
  },
  {
    id: 'mnt-3',
    societyId: SOCIETY_ID,
    title: 'Terrace Drain Grate Blocked with Dry Leaves',
    location: 'Floor 6 Terrace North Corner',
    category: 'Plumbing & Leakage',
    urgency: 'Low',
    description:
      'North corner rainwater outlet on the terrace had accumulated leaves and silt; cleared and flushed clean.',
    status: 'resolved',
    resolutionNote: 'Cleared by society cleaner and inspected on 14 Nov.',
    reporterUid: 'local-071',
    reporterName: 'Unit 071 Resident',
    reporterUnit: '071',
    createdAt: '2026-11-13T08:15:00.000Z',
    updatedAt: '2026-11-14T15:00:00.000Z',
  },
];

export const SEED_DISCUSSIONS: DiscussionTopic[] = [
  {
    id: 'disc-1',
    societyId: SOCIETY_ID,
    title: 'Dedicated Two-Wheeler Parking Markings in Ground Bay',
    category: 'Parking & Entry',
    body:
      'Several residents noted that scooters parked near the staircase exit narrow the walkway during evening hours. Should we paint simple numbered bays for Units 049–072 along the east side wall?',
    authorUid: 'local-057',
    authorName: 'Unit 057 Resident',
    authorUnit: '057',
    status: 'open',
    replyCount: 1,
    replies: [
      {
        id: 'rep-1',
        societyId: SOCIETY_ID,
        topicId: 'disc-1',
        body: 'Keeping a clear 4-foot path near the staircase door will help senior citizens and emergency access.',
        authorUid: 'admin-tower3',
        authorName: 'Society Administrator',
        authorUnit: 'ADM',
        createdAt: '2026-11-17T10:15:00.000Z',
      },
    ],
    createdAt: '2026-11-17T08:30:00.000Z',
    updatedAt: '2026-11-17T10:15:00.000Z',
  },
  {
    id: 'disc-2',
    societyId: SOCIETY_ID,
    title: 'Morning Waste Collection Timing Alignment Across Floors 1–6',
    category: 'Cleanliness',
    body:
      'Can we standardize keeping segregated bins outside doors before 7:45 AM so the cleaner completes all six floors before the morning school bus rush?',
    authorUid: 'local-067',
    authorName: 'Unit 067 Resident',
    authorUnit: '067',
    status: 'open',
    replyCount: 0,
    replies: [],
    createdAt: '2026-11-18T07:20:00.000Z',
    updatedAt: '2026-11-18T07:20:00.000Z',
  },
];

export const SEED_ACTIVITIES: ActivityEntry[] = [
  {
    id: 'act-1',
    societyId: SOCIETY_ID,
    scope: 'society',
    actorUid: 'admin-tower3',
    actorName: 'Society Administrator',
    actorUnit: 'ADM',
    actionType: 'notice',
    summary: 'Published Emergency Work notice: Overhead Water Pipeline Valve Inspection',
    targetSection: 'notices',
    createdAt: '2026-11-19T08:40:00.000Z',
  },
  {
    id: 'act-2',
    societyId: SOCIETY_ID,
    scope: 'society',
    actorUid: 'local-052',
    actorName: 'Unit 052 Resident',
    actorUnit: '052',
    actionType: 'maintenance',
    summary: 'Reported building damage: Ground Floor Lobby Motion Light Flickering',
    targetSection: 'maintenance',
    createdAt: '2026-11-18T19:10:00.000Z',
  },
  {
    id: 'act-3',
    societyId: SOCIETY_ID,
    scope: 'society',
    actorUid: 'local-069',
    actorName: 'Unit 069 Resident',
    actorUnit: '069',
    actionType: 'payment',
    summary: 'Paid November 2026 monthly dues (Rs. 558.33) via Bank Transfer',
    targetSection: 'bills',
    createdAt: '2026-11-18T10:50:00.000Z',
  },
  {
    id: 'act-4',
    societyId: SOCIETY_ID,
    scope: 'society',
    actorUid: 'admin-tower3',
    actorName: 'Society Administrator',
    actorUnit: 'ADM',
    actionType: 'expense',
    summary: 'Added common expense: Main Entrance Gate Latch & Hinge Welding (Rs. 1,440)',
    targetSection: 'bills',
    createdAt: '2026-11-11T14:30:00.000Z',
  },
];
