# UMLoop — Campus Circular Economy & Item Exchange Platform

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)

**UMLoop** is a student-to-student resource circulation web application built for Universiti Malaya (UM). It enables verified students to exchange, donate, resell, and recycle campus items while tracking real-time sustainability metrics.

---

## Key Features & Architecture

- **UM Student Authentication (`KAN-49`):** Powered by Firebase Authentication with strict `@siswa.um.edu.my` domain verification. All listings and transaction requests are cryptographically bound to authenticated student UIDs.
- **Real-Time Listing & Request Workflow (`KAN-50` & `KAN-51`):**
  - Live synchronization of item listings (`Exchange`, `Donation`, `Affordable Resale`, `Recyclable`) via Cloud Firestore `onSnapshot` listeners.
  - Built-in validation rules preventing unauthenticated actions, self-requests (`owner_uid == requester_uid`), and duplicate active requests.
  - Owner request management dashboard supporting atomic status transitions (`Available` -> `Reserved` -> `Completed` / `Rejected`).
- **Sustainability Metrics & Test Data Separation (`KAN-52`):** Separates developer test runs (`is_test: true`) from real campus handovers (`is_test: false`) to ensure accurate sustainability reuse counters.
- **Grounded AI FAQ Assistant (`KAN-53`):** Server-side Next.js API route (`/api/faq`) integrating Google Gemini 2.5 Flash to answer approved platform policy questions while keeping API credentials strictly isolated from client bundles.

---

## Getting Started for Developers

### 1. Clone the Repository
```bash
git clone [https://github.com/star-fire1/umloop.git](https://github.com/star-fire1/umloop.git)
cd umloop
