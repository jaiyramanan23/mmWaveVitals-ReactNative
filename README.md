# mmWave Vitals - React Native App

A React Native Expo application for monitoring vital signs using mmWave radar technology and Bluetooth connectivity.

## Features

- **mmWave Radar Integration**: Real-time vital signs monitoring using mmWave technology
- **Bluetooth Connectivity**: Seamless connection with mmWave devices
- **Heart Sound Analysis**: Advanced audio processing and analysis
- **Real-time Data Visualization**: Interactive charts and waveforms
- **Firebase Integration**: Cloud storage and real-time data sync
- **Cross-platform**: Runs on both iOS and Android

## Tech Stack

- **React Native** with Expo Router
- **TypeScript** for type safety
- **Firebase** for backend services
- **Expo AV** for audio processing
- **React Native BLE PLX** for Bluetooth connectivity
- **React Native Reanimated** for smooth animations

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jaiyramanan23/mmWaveVitals.git
cd mmWaveVitals
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npx expo start
```

4. Run on your preferred platform:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your device

## Project Structure

```
├── app/                    # App screens and navigation
├── components/             # Reusable UI components
│   ├── ai/                # AI and ML related components
│   ├── analysis/          # Data analysis components
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard components
│   ├── device/            # Device management components
│   └── stethoscope/       # Heart sound analysis components
├── constants/             # App constants and configuration
├── services/              # API and service integrations
└── assets/                # Images, fonts, and other assets
```

## Configuration

1. Create a `.env` file in the root directory:
```env
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_PROJECT_ID=your_firebase_project_id
```

2. Configure Firebase:
   - Add your Firebase configuration
   - Set up Firestore rules
   - Configure Firebase Storage

## Building for Production

### Android
```bash
npx expo build:android
```

### iOS
```bash
npx expo build:ios
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For questions and support, please contact [jaiyramanan23@gmail.com](mailto:jaiyramanan23@gmail.com)
