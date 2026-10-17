#!/usr/bin/env node

/**
 * KindLink - Database Demo Seeding Script (ESM)
 *
 * Populates realistic demo accounts, aid requests, offers, notifications,
 * and ratings across West Bengal & Jharkhand (Asansol, Durgapur, Dhanbad, Ranchi, Kolkata).
 *
 * Usage:
 *   node scripts/seed.mjs            # Seed demo data (idempotent)
 *   node scripts/seed.mjs --clean    # Delete all demo data
 *   node scripts/seed.mjs -c         # Alias for clean
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Environment Loading (reads .env.local, then .env, then process.env)
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.join(projectRoot, file);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        content.split('\n').forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if (
              (val.startsWith('"') && val.endsWith('"')) ||
              (val.startsWith("'") && val.endsWith("'"))
            ) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        });
      } catch {
        // Ignore file read errors
      }
    }
  }
}

loadEnv();

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://pwfvaajngfmnmsfmqgyx.supabase.co';

const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not defined.');
  console.error('Please configure it in .env.local or pass it in environment variables.');
  process.exit(1);
}

const DEMO_PASSWORD = 'KindLink#2026';

// 8 Realistic Demo Users
const DEMO_USERS = [
  {
    email: 'priya.nurse@kindlink.demo',
    username: 'priya_nurse',
    display_name: 'Priya Sharma (R.N.)',
    phone: '+91 98321 44512',
    role: 'user',
    verification_status: 'verified',
    city: 'Asansol',
    home_location: 'POINT(86.9742 23.6845)',
    rating_average: 4.95,
    rating_count: 24,
  },
  {
    email: 'rahul.student@kindlink.demo',
    username: 'rahul_student',
    display_name: 'Rahul Sen (Community)',
    phone: '+91 98320 12345',
    role: 'user',
    verification_status: 'unverified',
    city: 'Asansol',
    home_location: 'POINT(86.9661 23.6889)',
    rating_average: 5.0,
    rating_count: 2,
  },
  {
    email: 'dr.sen@kindlink.demo',
    username: 'dr_sen',
    display_name: 'Dr. Amitav Sen (M.D.)',
    phone: '+91 94340 19823',
    role: 'user',
    verification_status: 'verified',
    city: 'Durgapur',
    home_location: 'POINT(87.2941 23.5385)',
    rating_average: 4.98,
    rating_count: 36,
  },
  {
    email: 'amit.dhanbad@kindlink.demo',
    username: 'amit_dhanbad',
    display_name: 'Amit Kumar Mahato',
    phone: '+91 91223 45678',
    role: 'user',
    verification_status: 'verified',
    city: 'Dhanbad',
    home_location: 'POINT(86.4412 23.8143)',
    rating_average: 4.88,
    rating_count: 15,
  },
  {
    email: 'swati.durgapur@kindlink.demo',
    username: 'swati_durgapur',
    display_name: 'Swati Mukherjee (NGO Care)',
    phone: '+91 94740 88219',
    role: 'user',
    verification_status: 'verified',
    city: 'Durgapur',
    home_location: 'POINT(87.2800 23.5250)',
    rating_average: 4.92,
    rating_count: 29,
  },
  {
    email: 'vikram.driver@kindlink.demo',
    username: 'vikram_driver',
    display_name: 'Vikram Singh (Ambulance Escort)',
    phone: '+91 98001 22345',
    role: 'user',
    verification_status: 'verified',
    city: 'Asansol',
    home_location: 'POINT(86.9814 23.6791)',
    rating_average: 4.85,
    rating_count: 41,
  },
  {
    email: 'ananya.books@kindlink.demo',
    username: 'ananya_books',
    display_name: 'Ananya Roy (Student Volunteer)',
    phone: '+91 98300 77007',
    role: 'user',
    verification_status: 'unverified',
    city: 'Kolkata',
    home_location: 'POINT(88.3639 22.5726)',
    rating_average: 5.0,
    rating_count: 6,
  },
  {
    email: 'admin@kindlink.demo',
    username: 'admin_kindlink',
    display_name: 'KindLink Administrator',
    phone: '+91 98320 00000',
    role: 'admin',
    verification_status: 'verified',
    city: 'Asansol',
    home_location: 'POINT(86.9661 23.6889)',
    rating_average: 5.0,
    rating_count: 50,
  },
];

// 25 Realistic Requests across Asansol, Durgapur, Dhanbad, Ranchi, Kolkata
const DEMO_REQUESTS = [
  // --- Asansol (7) ---
  {
    id: '00000000-0000-4000-a000-000000000101',
    requester_username: 'priya_nurse',
    category: 'blood',
    urgency: 'critical',
    title: 'O- Negative Blood Urgently Needed for Emergency Surgery',
    description:
      'Emergency patient undergoing exploratory laparotomy at Asansol District Hospital. Verified donor needed within 2 hours. Replacement donor will be provided.',
    address_text: 'Asansol District Hospital, SB Gorai Road, Asansol',
    location: 'POINT(86.9742 23.6845)',
    status: 'open',
    details: {
      blood_group: 'O-',
      units_needed: 2,
      patient_age: 48,
      hospital: 'Asansol District Hospital',
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000102',
    requester_username: 'rahul_student',
    accepted_helper_username: 'vikram_driver',
    category: 'transport',
    urgency: 'critical',
    title: 'Emergency Patient Transport Escort to HLG Hospital',
    description:
      'Elderly cardiac patient needs vehicle assistance and an accompanying volunteer from Ushagram to HLG Memorial Hospital.',
    address_text: 'Ushagram Main Crossing, GT Road, Asansol',
    location: 'POINT(86.9814 23.6791)',
    status: 'accepted',
    details: {
      patient_age: 72,
      condition: 'Cardiac Emergency',
      destination: 'HLG Memorial Hospital',
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000103',
    requester_username: 'vikram_driver',
    accepted_helper_username: 'swati_durgapur',
    category: 'equipment',
    urgency: 'high',
    title: 'Foldable Wheelchair for Dialysis Patient (3 Days)',
    description:
      'Need a manual wheelchair for 3 days for clinic visits. Can pick up and return anywhere in Burnpur or Asansol.',
    address_text: 'Burnpur Riverside Road, Burnpur, Asansol',
    location: 'POINT(86.9388 23.6642)',
    status: 'accepted',
    details: {
      item_type: 'Wheelchair (Foldable)',
      item_duration: '3 days',
      patient_age: 65,
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000104',
    requester_username: 'rahul_student',
    category: 'elderly_help',
    urgency: 'high',
    title: 'Urgent Insulin & BP Medicine Delivery for Senior Citizen',
    description:
      'Senior citizen living alone near Community Kalyanpur road unable to step out due to knee pain. Prescription copy ready.',
    address_text: 'Kalyanpur Housing, Near Community Gate 2, Asansol',
    location: 'POINT(86.9612 23.6934)',
    status: 'open',
    details: {
      service_type: 'Medicine Delivery',
      patient_age: 81,
      prescription_ready: true,
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000105',
    requester_username: 'rahul_student',
    category: 'books',
    urgency: 'medium',
    title: 'Class 10 Madhyamik Maths & Physical Science Textbooks',
    description:
      'Deserving student preparing for West Bengal Madhyamik board examination needs standard reference books and question banks.',
    address_text: 'Chelidanga Market, Asansol',
    location: 'POINT(86.9855 23.6912)',
    status: 'open',
    details: {
      item_type: 'WBBSE Class 10 Textbooks',
      board: 'WBBSE',
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000106',
    requester_username: 'priya_nurse',
    category: 'elderly_help',
    urgency: 'medium',
    title: 'Assistance for Wheelchair Boarding at Asansol Junction',
    description:
      'Helping an 84-year-old grandmother board train 12301 at platform 3. Heavy luggage assistance needed.',
    address_text: 'Asansol Railway Junction, Platform 1 Entrance, Asansol',
    location: 'POINT(86.9531 23.6872)',
    status: 'open',
    details: {
      service_type: 'Station Escort & Luggage',
      patient_age: 84,
      train_number: '12301',
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000107',
    requester_username: 'rahul_student',
    category: 'equipment',
    urgency: 'low',
    title: 'Compressor Nebulizer for Child with Acute Bronchitis',
    description:
      'Looking to borrow a pediatric compressor nebulizer machine for 5 days. Willing to replace filter and sanitize thoroughly.',
    address_text: 'Court More, Old GT Road, Asansol',
    location: 'POINT(86.9710 23.6820)',
    status: 'open',
    details: {
      item_type: 'Compressor Nebulizer',
      duration_days: 5,
      child_age: 6,
      is_demo: true,
    },
  },

  // --- Durgapur (5) ---
  {
    id: '00000000-0000-4000-a000-000000000108',
    requester_username: 'dr_sen',
    category: 'blood',
    urgency: 'critical',
    title: 'B+ Platelet Donors Needed Urgently at Mission Hospital',
    description:
      'Dengue patient platelet count dropped below 15,000 at The Mission Hospital Durgapur. Single donor platelet (SDP) volunteer required.',
    address_text: 'The Mission Hospital, Sector 2C, Bidhannagar, Durgapur',
    location: 'POINT(87.2941 23.5385)',
    status: 'open',
    details: {
      blood_group: 'B+',
      units_needed: 3,
      component: 'SDP Platelets',
      hospital: 'The Mission Hospital',
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000109',
    requester_username: 'swati_durgapur',
    accepted_helper_username: 'dr_sen',
    category: 'equipment',
    urgency: 'high',
    title: 'Oxygen Concentrator (5L/min) for Post-Discharge Care',
    description:
      'Post-discharge COPD patient needs a concentrator for 48 hours until rented cylinder arrives tomorrow evening.',
    address_text: 'City Centre Commercial Complex, Durgapur',
    location: 'POINT(87.2980 23.5410)',
    status: 'completed',
    details: {
      item_type: 'Oxygen Concentrator 5L',
      item_duration: '2 days',
      patient_age: 70,
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000110',
    requester_username: 'swati_durgapur',
    category: 'elderly_help',
    urgency: 'high',
    title: 'Essential Grocery & Medicine Delivery for Bedridden Couple',
    description:
      'Elderly couple unable to visit local market due to illness. Need volunteer to drop weekly groceries and medicines.',
    address_text: 'Benachity Main Market, Durgapur',
    location: 'POINT(87.3112 23.5489)',
    status: 'open',
    details: {
      service_type: 'Care & Supplies Delivery',
      patient_age: 78,
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000111',
    requester_username: 'rahul_student',
    category: 'books',
    urgency: 'medium',
    title: 'B.Tech Computer Science Reference Books (Algorithms & OS)',
    description:
      '2nd-year engineering student in need of standard semester textbooks (CLRS Algorithms and Silberschatz Operating Systems).',
    address_text: 'NIT Durgapur Campus Gate, Mahatma Gandhi Avenue, Durgapur',
    location: 'POINT(87.2930 23.5532)',
    status: 'open',
    details: {
      item_type: 'CS Textbooks (CLRS & Galvin)',
      semester: '3rd/4th Sem CSE',
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000112',
    requester_username: 'swati_durgapur',
    category: 'transport',
    urgency: 'low',
    title: 'Shuttle Assistance for Regular Dialysis Patient to DSP Hospital',
    description:
      'Patient with limited mobility needs safe vehicle transit for Tuesday morning dialysis appointment.',
    address_text: 'DSP Main Hospital Area, Durgapur',
    location: 'POINT(87.2750 23.5620)',
    status: 'open',
    details: {
      vehicle_type: 'Car / Cab Ride',
      recurring: true,
      is_demo: true,
    },
  },

  // --- Dhanbad (5) ---
  {
    id: '00000000-0000-4000-a000-000000000113',
    requester_username: 'amit_dhanbad',
    category: 'blood',
    urgency: 'critical',
    title: 'A- Blood Platelets Replacement for Dengue Ward',
    description:
      'Platelet count dropped critically at SNMMCH Dhanbad. Replacement donor requested urgently.',
    address_text: 'SNMMCH Hospital, Dhanbad',
    location: 'POINT(86.4412 23.8143)',
    status: 'open',
    details: {
      blood_group: 'A-',
      units_needed: 1,
      patient_age: 32,
      hospital: 'SNMMCH Dhanbad',
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000114',
    requester_username: 'amit_dhanbad',
    category: 'transport',
    urgency: 'high',
    title: 'Emergency Road Transport to Bokaro General Hospital',
    description:
      'Spinal injury patient needs safe vehicle transport with backboard support from Bank More to Bokaro.',
    address_text: 'Bank More Commercial Hub, Dhanbad',
    location: 'POINT(86.4250 23.7925)',
    status: 'open',
    details: {
      destination: 'Bokaro General Hospital',
      distance_km: 42,
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000115',
    requester_username: 'amit_dhanbad',
    category: 'books',
    urgency: 'medium',
    title: 'GATE Mining & Mechanical Engineering Study Materials',
    description:
      'Final year diploma student preparing for national GATE exam seeks standard reference notes and test series booklets.',
    address_text:
      'IIT (ISM) Dhanbad Main Gate, Sardar Patel Nagar, Dhanbad',
    location: 'POINT(86.4410 23.8160)',
    status: 'open',
    details: {
      item_type: 'GATE Notes & Previous Solved Papers',
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000116',
    requester_username: 'amit_dhanbad',
    category: 'elderly_help',
    urgency: 'high',
    title: 'Prescription Eye Drops Delivery & Clinic Escort for Senior',
    description:
      'Post-cataract surgery senior citizen unable to travel alone for follow-up eye pressure test.',
    address_text: 'Saraidhela Main Road, Near Big Bazaar, Dhanbad',
    location: 'POINT(86.4520 23.8210)',
    status: 'open',
    details: {
      service_type: 'Medical Escort',
      patient_age: 76,
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000117',
    requester_username: 'amit_dhanbad',
    category: 'equipment',
    urgency: 'low',
    title: 'Folding Walker / Zimmer Frame for Leg Fracture Rehab',
    description:
      'Looking to borrow an adult folding walking frame for 3 weeks post-plaster recovery.',
    address_text: 'Dhanbad Railway Station South Gate, Dhanbad',
    location: 'POINT(86.4300 23.7915)',
    status: 'open',
    details: {
      item_type: 'Zimmer Frame / Walker',
      duration_weeks: 3,
      is_demo: true,
    },
  },

  // --- Ranchi (4) ---
  {
    id: '00000000-0000-4000-a000-000000000118',
    requester_username: 'dr_sen',
    category: 'blood',
    urgency: 'critical',
    title: 'AB+ Blood Required Immediately at RIMS Trauma Centre',
    description:
      'Accident victim admitted at RIMS Emergency Trauma Centre Bariatu. 2 units of whole blood needed.',
    address_text: 'RIMS Hospital, Bariatu, Ranchi',
    location: 'POINT(85.3450 23.3850)',
    status: 'open',
    details: {
      blood_group: 'AB+',
      units_needed: 2,
      hospital: 'RIMS Ranchi',
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000119',
    requester_username: 'admin_kindlink',
    category: 'elderly_help',
    urgency: 'medium',
    title: 'Digital Life Certificate & Pension KYC Escort for Senior',
    description:
      'Elderly citizen needs volunteer assistance with mobile biometric submission at bank branch.',
    address_text: 'Albert Ekka Chowk, Main Road, Ranchi',
    location: 'POINT(85.3250 23.3690)',
    status: 'open',
    details: {
      service_type: 'Digital Pension KYC Escort',
      patient_age: 83,
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000120',
    requester_username: 'ananya_books',
    category: 'books',
    urgency: 'low',
    title: 'NCERT Class 11 & 12 Science Reference Books for Student',
    description:
      'Dedicated student from rural outskirts preparing for NEET exam needs second-hand NCERT biology and chemistry books.',
    address_text: 'BIT Mesra Campus Gate, Ranchi',
    location: 'POINT(85.4390 23.4120)',
    status: 'open',
    details: {
      item_type: 'NCERT PCB Books',
      exam: 'NEET UG',
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000121',
    requester_username: 'vikram_driver',
    category: 'transport',
    urgency: 'high',
    title: 'Urgent Patient Escort from Hatia to Medanta Hospital',
    description:
      'Elderly stroke survivor needs non-emergency ambulance or vehicle transit to Medanta Irba.',
    address_text: 'Hatia Railway Colony, Ranchi',
    location: 'POINT(85.3120 23.3150)',
    status: 'open',
    details: {
      destination: 'Medanta Hospital Irba',
      patient_age: 74,
      is_demo: true,
    },
  },

  // --- Kolkata (4) ---
  {
    id: '00000000-0000-4000-a000-000000000122',
    requester_username: 'priya_nurse',
    category: 'blood',
    urgency: 'critical',
    title: 'O+ Fresh Blood Replacement for Pediatric Ward at SSKM',
    description:
      'Child undergoing pediatric cardiovascular surgery at SSKM Hospital / IPGMER. Verified donor needed.',
    address_text: 'SSKM Hospital, AJC Bose Road, Kolkata',
    location: 'POINT(88.3425 22.5390)',
    status: 'open',
    details: {
      blood_group: 'O+',
      units_needed: 2,
      child_age: 8,
      hospital: 'SSKM Hospital',
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000123',
    requester_username: 'ananya_books',
    category: 'books',
    urgency: 'medium',
    title: 'WBCS Civil Services Prelims & Mains General Studies Manual',
    description:
      'Community library loan request: standard reference manual for West Bengal Civil Services competitive examinations.',
    address_text: 'College Street Boi Para, Kolkata',
    location: 'POINT(88.3630 22.5744)',
    status: 'open',
    details: {
      item_type: 'WBCS Exam Manual & Bengali Literature',
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000124',
    requester_username: 'ananya_books',
    accepted_helper_username: 'swati_durgapur',
    category: 'equipment',
    urgency: 'high',
    title: 'Adjustable Hospital Bed Backrest & Air Mattress',
    description:
      'Post-surgery recovery at home requires anti-bedsore ripple air mattress and adjustable backrest frame for 2 weeks.',
    address_text: 'Salt Lake Sector V, Near Karunamoyee, Kolkata',
    location: 'POINT(88.4280 22.5800)',
    status: 'completed',
    details: {
      item_type: 'Air Mattress & Orthopedic Backrest',
      duration_weeks: 2,
      is_demo: true,
    },
  },
  {
    id: '00000000-0000-4000-a000-000000000125',
    requester_username: 'vikram_driver',
    category: 'transport',
    urgency: 'medium',
    title: 'Emergency Midnight Transport from Shyambazar to RG Kar',
    description:
      'Senior citizen with respiratory distress needs immediate ride to RG Kar Medical College emergency department.',
    address_text: 'Shyambazar 5-Point Crossing, North Kolkata',
    location: 'POINT(88.3715 22.6015)',
    status: 'open',
    details: {
      destination: 'RG Kar Medical College',
      vehicle_type: 'Emergency Vehicle',
      is_demo: true,
    },
  },
];

// Demo Offers
const DEMO_OFFERS = [
  {
    id: '00000000-0000-4000-a000-000000000201',
    request_id: '00000000-0000-4000-a000-000000000101',
    helper_username: 'amit_dhanbad',
    message: 'I am an O- registered donor, available immediately to donate at Asansol Hospital.',
    status: 'pending',
  },
  {
    id: '00000000-0000-4000-a000-000000000202',
    request_id: '00000000-0000-4000-a000-000000000102',
    helper_username: 'vikram_driver',
    message: 'Vehicle ready with portable oxygen support for emergency transit to HLG Hospital.',
    status: 'accepted',
  },
  {
    id: '00000000-0000-4000-a000-000000000103',
    request_id: '00000000-0000-4000-a000-000000000103',
    helper_username: 'swati_durgapur',
    message: 'Our community care unit has a clean foldable wheelchair ready for immediate pickup.',
    status: 'accepted',
  },
  {
    id: '00000000-0000-4000-a000-000000000105',
    request_id: '00000000-0000-4000-a000-000000000105',
    helper_username: 'ananya_books',
    message: 'I have the full WBBSE Class 10 reference books set and test papers to lend.',
    status: 'pending',
  },
  {
    id: '00000000-0000-4000-a000-000000000109',
    request_id: '00000000-0000-4000-a000-000000000109',
    helper_username: 'dr_sen',
    message: 'Can coordinate 5L oxygen concentrator handover from City Centre clinic.',
    status: 'accepted',
  },
];

// Demo Notifications
const DEMO_NOTIFICATIONS = [
  {
    id: '00000000-0000-4000-a000-000000000301',
    user_username: 'priya_nurse',
    request_id: '00000000-0000-4000-a000-000000000101',
    type: 'offer_received',
    title: '🤝 New Helper Stepped Up!',
    body: 'Amit Kumar Mahato offered to assist with: O- Negative Blood Urgently Needed for Emergency Surgery',
    is_read: false,
  },
  {
    id: '00000000-0000-4000-a000-000000000302',
    user_username: 'rahul_student',
    request_id: '00000000-0000-4000-a000-000000000103',
    type: 'new_nearby_request',
    title: '🚨 New Urgent Need: Foldable Wheelchair',
    body: 'Urgent aid requested at Burnpur Riverside Road (equipment). Help is just next door.',
    is_read: false,
  },
  {
    id: '00000000-0000-4000-a000-000000000303',
    user_username: 'vikram_driver',
    request_id: '00000000-0000-4000-a000-000000000102',
    type: 'offer_accepted',
    title: '✅ Offer Accepted!',
    body: 'Your offer was accepted for: Emergency Patient Transport Escort to HLG Hospital. Tap to coordinate contact details.',
    is_read: true,
  },
  {
    id: '00000000-0000-4000-a000-000000000304',
    user_username: 'dr_sen',
    request_id: '00000000-0000-4000-a000-000000000109',
    type: 'request_completed',
    title: '🌟 Act of Kindness Recorded!',
    body: 'Your assistance with Oxygen Concentrator (5L/min) was marked as completed. Thank you for your service!',
    is_read: true,
  },
  {
    id: '00000000-0000-4000-a000-000000000305',
    user_username: 'swati_durgapur',
    request_id: '00000000-0000-4000-a000-000000000109',
    type: 'request_completed',
    title: '🌟 Aid Completed! Please rate your helper',
    body: 'Thank you for using KindLink. Please leave a rating for your volunteer Dr. Amitav Sen.',
    is_read: true,
  },
];

// Demo Ratings
const DEMO_RATINGS = [
  {
    id: '00000000-0000-4000-a000-000000000401',
    request_id: '00000000-0000-4000-a000-000000000109',
    rater_username: 'swati_durgapur',
    ratee_username: 'dr_sen',
    stars: 5,
    comment:
      'Dr. Sen was extremely kind and coordinated the oxygen concentrator promptly. Excellent community support!',
  },
  {
    id: '00000000-0000-4000-a000-000000000402',
    request_id: '00000000-0000-4000-a000-000000000109',
    rater_username: 'dr_sen',
    ratee_username: 'swati_durgapur',
    stars: 5,
    comment:
      'Smooth coordination, very responsible communication and timely return of equipment.',
  },
  {
    id: '00000000-0000-4000-a000-000000000403',
    request_id: '00000000-0000-4000-a000-000000000124',
    rater_username: 'ananya_books',
    ratee_username: 'swati_durgapur',
    stars: 5,
    comment:
      'The hospital backrest support was in perfect condition. Thank you so much for the quick help!',
  },
];

async function main() {
  const isClean = process.argv.includes('--clean') || process.argv.includes('-c');

  console.log('--------------------------------------------------');
  console.log(` KindLink Seed Manager [${isClean ? 'CLEAN MODE' : 'SEED MODE'}]`);
  console.log(' Supabase URL:', SUPABASE_URL);
  console.log('--------------------------------------------------\n');

  let supabase;
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (err) {
    console.error('❌ Failed to initialize Supabase client:', err.message);
    process.exit(1);
  }

  // Connectivity & Auth verification
  let existingAuthUsers = [];
  try {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      throw error;
    }
    existingAuthUsers = data?.users || [];
    console.log(`🔌 Connected to Supabase Auth (${existingAuthUsers.length} total users in auth).`);
  } catch (err) {
    console.error('\n⚠️  Supabase Connection Notice:');
    console.error(`   Unable to reach Supabase Auth at: ${SUPABASE_URL}`);
    console.error(`   Details: ${err.message || err}`);
    console.log('   Please check your network connection or verify SUPABASE_SERVICE_ROLE_KEY.\n');
    process.exit(0);
  }

  const demoEmails = new Set(DEMO_USERS.map((u) => u.email.toLowerCase()));
  const demoRequestIds = DEMO_REQUESTS.map((r) => r.id);
  const demoOfferIds = DEMO_OFFERS.map((o) => o.id);
  const demoNotificationIds = DEMO_NOTIFICATIONS.map((n) => n.id);
  const demoRatingIds = DEMO_RATINGS.map((rt) => rt.id);

  // ==============================================================
  // CLEAN MODE
  // ==============================================================
  if (isClean) {
    console.log('🧹 Cleaning up demo records...');

    // 1. Delete ratings
    try {
      const { error } = await supabase
        .from('ratings')
        .delete()
        .in('id', demoRatingIds);
      if (!error) console.log('  ✓ Deleted demo ratings');
    } catch {
      // Table may not exist yet
    }

    // 2. Delete notifications
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', demoNotificationIds);
      if (!error) console.log('  ✓ Deleted demo notifications');
    } catch {
      // Table may not exist yet
    }

    // 3. Delete offers
    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .in('id', demoOfferIds);
      if (!error) console.log('  ✓ Deleted demo offers');
    } catch {
      // Table may not exist yet
    }

    // 4. Delete requests
    try {
      const { error } = await supabase
        .from('requests')
        .delete()
        .in('id', demoRequestIds);
      if (!error) console.log('  ✓ Deleted demo requests');
    } catch {
      // Table may not exist yet
    }

    // 5. Delete demo auth users (and cascaded profiles)
    let deletedCount = 0;
    for (const user of existingAuthUsers) {
      if (user.email && demoEmails.has(user.email.toLowerCase())) {
        try {
          // Explicitly delete profile first if cascade is absent
          await supabase.from('profiles').delete().eq('id', user.id);
          const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
          if (!delErr) deletedCount++;
        } catch (e) {
          console.warn(`  ! Could not delete auth user ${user.email}:`, e.message);
        }
      }
    }
    console.log(`  ✓ Removed ${deletedCount} demo auth accounts`);

    console.log('\n✨ Clean-up completed successfully. All demo records removed.\n');
    return;
  }

  // ==============================================================
  // SEED MODE (IDEMPOTENT)
  // ==============================================================
  console.log('🌱 Starting idempotent demo seeding...\n');

  // Step 1: Provision or update 8 Demo Users in Supabase Auth
  console.log('👤 [1/4] Provisioning 8 Demo Auth Users...');
  const userMap = new Map(); // username -> user.id

  const emailToExisting = new Map();
  for (const u of existingAuthUsers) {
    if (u.email) {
      emailToExisting.set(u.email.toLowerCase(), u);
    }
  }

  for (const demoUser of DEMO_USERS) {
    const existing = emailToExisting.get(demoUser.email.toLowerCase());
    let userId;

    if (existing) {
      userId = existing.id;
      // Ensure password and metadata match
      const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          username: demoUser.username,
          display_name: demoUser.display_name,
        },
      });
      if (updateErr) {
        console.warn(`  ! Warning updating user ${demoUser.username}:`, updateErr.message);
      } else {
        console.log(`  ✓ Verified existing auth user: ${demoUser.username} (${demoUser.email})`);
      }
    } else {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: demoUser.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          username: demoUser.username,
          display_name: demoUser.display_name,
        },
      });

      if (createErr) {
        console.error(`  ❌ Failed creating user ${demoUser.username}:`, createErr.message);
        continue;
      }
      userId = created.user.id;
      console.log(`  ✓ Created new auth user: ${demoUser.username} (${demoUser.email})`);
    }

    userMap.set(demoUser.username, userId);
  }

  // Step 2: Upsert public.profiles for all demo users
  console.log('\n📋 [2/4] Upserting public.profiles...');
  let profilesTableAvailable = true;

  for (const demoUser of DEMO_USERS) {
    const userId = userMap.get(demoUser.username);
    if (!userId) continue;

    const profileData = {
      id: userId,
      username: demoUser.username,
      display_name: demoUser.display_name,
      phone: demoUser.phone,
      role: demoUser.role,
      verification_status: demoUser.verification_status,
      home_location: demoUser.home_location,
      rating_average: demoUser.rating_average,
      rating_count: demoUser.rating_count,
      preferred_language: 'en',
      updated_at: new Date().toISOString(),
    };

    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (profileErr) {
      if (profileErr.code === 'PGRST205' || profileErr.message.includes('schema cache')) {
        profilesTableAvailable = false;
        console.warn('  ⚠️  Table public.profiles not found in database schema cache.');
        console.warn('     (Run supabase/sql/all_in_one.sql in Supabase SQL editor to create tables)');
        break;
      } else {
        console.warn(`  ! Could not upsert profile for ${demoUser.username}:`, profileErr.message);
      }
    } else {
      console.log(`  ✓ Upserted profile: ${demoUser.username} [${demoUser.role}, ${demoUser.verification_status}]`);
    }
  }

  if (!profilesTableAvailable) {
    console.log('\n💡 Note: Database tables have not yet been migrated to Supabase.');
    console.log('   All 8 demo auth accounts are ready! Apply supabase/sql/all_in_one.sql');
    console.log('   and run `npm run seed` again to populate requests, offers, and ratings.\n');
    return;
  }

  // Step 3: Upsert 25 Realistic Requests
  console.log('\n📍 [3/4] Upserting 25 Help Requests across 5 cities...');
  let insertedRequests = 0;

  for (const req of DEMO_REQUESTS) {
    const requesterId = userMap.get(req.requester_username);
    if (!requesterId) {
      console.warn(`  ! Skipped request "${req.title}" (requester ${req.requester_username} missing)`);
      continue;
    }

    const helperId = req.accepted_helper_username
      ? userMap.get(req.accepted_helper_username)
      : null;

    const requestRecord = {
      id: req.id,
      requester_id: requesterId,
      category: req.category,
      urgency: req.urgency,
      title: req.title,
      description: req.description,
      address_text: req.address_text,
      location: req.location,
      status: req.status,
      accepted_helper_id: helperId,
      details: req.details,
      created_at: new Date(Date.now() - Math.floor(Math.random() * 7200000)).toISOString(),
      accepted_at: req.status !== 'open' ? new Date().toISOString() : null,
      completed_at: req.status === 'completed' ? new Date().toISOString() : null,
    };

    const { error: reqErr } = await supabase
      .from('requests')
      .upsert(requestRecord, { onConflict: 'id' });

    if (reqErr) {
      console.warn(`  ! Failed upserting request "${req.title}":`, reqErr.message);
    } else {
      insertedRequests++;
    }
  }
  console.log(`  ✓ Successfully upserted ${insertedRequests}/25 requests.`);

  // Step 4: Upsert Offers, Notifications, and Ratings
  console.log('\n🤝 [4/4] Upserting Offers, Notifications & Ratings...');

  // 4a. Offers
  let offerCount = 0;
  for (const offer of DEMO_OFFERS) {
    const helperId = userMap.get(offer.helper_username);
    if (!helperId) continue;

    const { error: offerErr } = await supabase.from('offers').upsert(
      {
        id: offer.id,
        request_id: offer.request_id,
        helper_id: helperId,
        message: offer.message,
        status: offer.status,
      },
      { onConflict: 'request_id,helper_id' }
    );

    if (!offerErr) offerCount++;
  }
  console.log(`  ✓ Upserted ${offerCount}/${DEMO_OFFERS.length} demo offers`);

  // 4b. Notifications
  let notifCount = 0;
  for (const notif of DEMO_NOTIFICATIONS) {
    const userId = userMap.get(notif.user_username);
    if (!userId) continue;

    const { error: notifErr } = await supabase.from('notifications').upsert(
      {
        id: notif.id,
        user_id: userId,
        request_id: notif.request_id,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        is_read: notif.is_read,
      },
      { onConflict: 'id' }
    );

    if (!notifErr) notifCount++;
  }
  console.log(`  ✓ Upserted ${notifCount}/${DEMO_NOTIFICATIONS.length} demo notifications`);

  // 4c. Ratings
  let ratingCount = 0;
  for (const rt of DEMO_RATINGS) {
    const raterId = userMap.get(rt.rater_username);
    const rateeId = userMap.get(rt.ratee_username);
    if (!raterId || !rateeId) continue;

    const { error: ratingErr } = await supabase.from('ratings').upsert(
      {
        id: rt.id,
        request_id: rt.request_id,
        rater_id: raterId,
        ratee_id: rateeId,
        stars: rt.stars,
        comment: rt.comment,
      },
      { onConflict: 'request_id,rater_id' }
    );

    if (!ratingErr) ratingCount++;
  }
  console.log(`  ✓ Upserted ${ratingCount}/${DEMO_RATINGS.length} mutual ratings`);

  console.log('\n==================================================');
  console.log(' 🎉 KindLink Demo Seeding Finished Successfully!');
  console.log(' All accounts ready with password: KindLink#2026');
  console.log('==================================================\n');
}

main().catch((err) => {
  console.error('\n❌ Unexpected error during seeding:', err);
  process.exit(1);
});
