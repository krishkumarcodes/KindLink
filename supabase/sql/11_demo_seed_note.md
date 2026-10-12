# KindLink - Demo Seed Data Guide

This note explains how to populate your KindLink Supabase database with realistic demo accounts and community requests across West Bengal and Jharkhand (Asansol, Durgapur, Dhanbad, Ranchi, Kolkata).

---

## 1. What the Seed Script Creates

When you run `npm run seed`, the script automatically provisions:

1. **8 Realistic Demo Users**:
   - `priya_nurse`: Verified nurse in Asansol (`priya.nurse@kindlink.demo`)
   - `rahul_aec`: AEC Engineering student (`rahul.aec@kindlink.demo`)
   - `dr_sen`: Verified physician (`dr.sen@kindlink.demo`)
   - `amit_dhanbad`: Blood donor volunteer in Dhanbad (`amit.dhanbad@kindlink.demo`)
   - `swati_durgapur`: Verified NGO coordinator (`swati.durgapur@kindlink.demo`)
   - `vikram_driver`: Emergency transport driver (`vikram.driver@kindlink.demo`)
   - `ananya_books`: Student book donor in Kolkata (`ananya.books@kindlink.demo`)
   - `admin_kindlink`: Demo admin account (`admin@kindlink.demo`)
   - **Password for all demo accounts**: `KindLink#2026`

2. **25 Realistic Help Requests**:
   - Critical blood emergencies (O-negative, B-positive at Asansol District Hospital, Mission Hospital Durgapur)
   - Wheelchair and oxygen concentrator equipment sharing
   - Elderly medicine delivery and accompaniment
   - Academic textbooks and semester notes
   - Emergency midnight hospital transport

3. **Active Offers, Notifications, and Mutual Ratings**:
   - Pre-populated offers demonstrating the accepted helper flow
   - Contact reveal between matched helpers and requesters
   - 5-star mutual ratings updating user averages

---

## 2. How to Run the Seed Script

Ensure your `.env.local` has your `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`:

```bash
# Populate demo data
npm run seed

# To clean up / reset demo data (optional flag):
npm run seed -- --clean
```

The script is idempotent—you can run it multiple times safely without duplicate key errors.
