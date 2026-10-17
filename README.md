# 🏥 MediCare Plus - Smart Hospital Management System

A production-grade, enterprise-level hospital management system built with React, Firebase, and Tailwind CSS.
live preview: https://medicareplushospital.vercel.app
## 🚀 Features

### 👥 User Roles

- **Patient**: Self-registration, appointment booking, EMR access, billing, chat with doctors
- **Doctor**: Schedule management, EMR creation, prescriptions, lab requests, patient chat
- **Receptionist**: Walk-in registration, bed assignment, payment confirmation, triage
- **Lab**: Test request management, result upload, report generation
- **Admin**: Full system control, staff management, analytics, inventory, salary processing

### 🏥 Core Modules

- **Appointment Management**: Smart scheduling with availability checking
- **Electronic Medical Records (EMR)**: Structured format with vitals, diagnosis, prescriptions
- **Smart Prescription Builder**: Generate PDF prescriptions with medicine details
- **Lab Integration**: Request tests, upload results, automatic notifications
- **Billing System**: Auto-calculation, payment proof upload, confirmation workflow
- **Bed Management**: Real-time availability, assignment, occupancy tracking
- **Inventory Management**: Stock tracking, low stock alerts, usage analytics
- **Chat System**: Real-time messaging with file sharing, read receipts
- **Emergency Triage**: Color-coded priority system (Red/Yellow/Green)
- **Analytics Dashboard**: Revenue trends, department performance, insights

### 🔐 Security

- Role-based access control
- Email verification required
- Admin MFA simulation
- Audit logging for all actions
- Firestore security rules
- Data encryption at rest

## 🛠️ Tech Stack

- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS
- **State Management**: Context API
- **Backend**: Firebase (Auth, Firestore)
- **Charts**: Chart.js, Recharts
- **PDF Generation**: jsPDF
- **Icons**: FontAwesome
- **Hosting**: Vercel

## 📁 Project Structure

medicare-plus/
├── src/
│ ├── main.jsx # Entry point
│ ├── App.jsx # Main app component with routing
│ ├── firebase.js # Firebase configuration
│ ├── auth.js # Authentication logic
│ ├── database.js # All Firestore operations
│ ├── context/
│ │ └── AuthContext.jsx # Auth state management
│ ├── routes/
│ │ └── ProtectedRoute.jsx # Route protection
│ ├── pages/ # All page components
│ ├── components/ # Reusable components
│ └── utils/ # Utilities
├── .env # Environment variables
├── firestore.rules # Firestore security rules
└── package.json

text

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase account

### Installation

1. Clone the repository

git clone <https://github.com/usman0120/MediCarePlus-Hospital-system.git>
cd medicare-plus
Install dependencies

bash
npm install
Create Firebase project and enable:

Authentication (Email/Password, Google, Phone)

Firestore Database

Copy .env.example to .env and add your Firebase config

bash
cp .env.example .env
Update Firebase security rules

bash

# Copy firestore.rules to Firebase console

Start development server

bash
npm run dev
Default Admin Credentials

📦 Deployment
Deploy to Vercel
bash
npm run build
vercel --prod
Firestore Rules Deployment
bash
firebase deploy --only firestore:rules
🔒 Security Features
Authentication: Email verification, Google Sign-in, Phone OTP

Authorization: Role-based access in Firestore rules

Data Validation: Client-side and server-side validation

Audit Trail: All critical actions logged

Record Locking: Medical records locked after discharge

Payment Security: Invoice locking after payment

🤖 Automation Features
Automatic invoice calculation

Department revenue tracking

Salary calculation based on attendance

Inventory deduction on operations

Low stock alerts

Bed occupancy monitoring

Emergency case spike detection

📊 Analytics & Insights
Revenue trends by department

Doctor performance metrics

Peak hours identification

Bed occupancy rates

Inventory usage patterns

Patient visit statistics

🎨 UI/UX Features
Mobile-first responsive design

Dark/Light mode toggle

Role-based color themes

Skeleton loaders

Optimistic updates

Toast notifications

Keyboard navigation

Accessibility compliance

🧪 Testing
bash

# Run tests

npm test

# Run linting

npm run lint
🤝 Contributing
Fork the repository

Create feature branch (git checkout -b feature/AmazingFeature)

Commit changes (git commit -m 'Add AmazingFeature')

Push to branch (git push origin feature/AmazingFeature)

Open a Pull Request

📝 License
This project is licensed under the MIT License.

👥 Authors
Your Name - Initial work

🙏 Acknowledgments
Firebase for backend services

Vercel for hosting

All contributors and testers

📞 Support
For support, create an issue in the repository.

🚨 Important Notes
Never commit the .env file

Keep Firebase rules updated

Regular backups recommended

Monitor usage quotas

Test in staging before production

Built with ❤️ for better healthcare

text

### `package.json` (Already provided, but ensuring it's complete)
{
  "name": "medicare-plus-react-v2-0",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "chart.js": "^4.5.1",
    "firebase": "^12.9.0",
    "jspdf": "^4.2.0",
    "react": "^19.2.0",
    "react-chartjs-2": "^5.3.1",
    "react-dom": "^19.2.0",
    "react-hot-toast": "^2.6.0",
    "react-router-dom": "^7.13.0",
    "jspdf-autotable": "^3.5.29",
    "@fortawesome/fontawesome-svg-core": "^6.5.1",
    "@fortawesome/free-solid-svg-icons": "^6.5.1",
    "@fortawesome/react-fontawesome": "^0.2.0",
    "date-fns": "^2.30.0",
    "fuse.js": "^7.0.0",
    "pako": "^2.1.0",
    "react-phone-input-2": "^2.15.1",
    "react-select": "^5.8.0",
    "recharts": "^2.10.3",
    "emoji-picker-react": "^4.5.0",
    "react-datepicker": "^4.21.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "autoprefixer": "^10.4.24",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.19",
    "vite": "^7.3.1"
  }
}
