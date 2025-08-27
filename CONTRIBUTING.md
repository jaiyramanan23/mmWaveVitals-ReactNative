# Contributing to mmWave Vitals

Thank you for your interest in contributing to mmWave Vitals! This document provides guidelines for contributing to this project.

## Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/mmWaveVitals-ReactNative.git
   cd mmWaveVitals-ReactNative
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Copy the environment file and configure it:
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase and backend configurations
   ```

5. Start the development server:
   ```bash
   npx expo start
   ```

## Project Structure

- `app/` - Main application screens and navigation
- `components/` - Reusable UI components organized by feature
- `services/` - API integrations and business logic
- `constants/` - Application constants and configuration
- `assets/` - Images, fonts, and other static assets

## Code Style

- Use TypeScript for all new code
- Follow the existing code style and patterns
- Use meaningful variable and function names
- Add comments for complex logic

## Testing

- Test your changes on both iOS and Android
- Ensure Bluetooth functionality works properly
- Test with real mmWave devices when possible

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear, descriptive commits
3. Test thoroughly on both platforms
4. Update documentation if needed
5. Submit a pull request with a clear description

## Reporting Issues

When reporting issues, please include:
- Device type and OS version
- Expo version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots or videos if helpful

## Questions?

Feel free to open an issue for questions or reach out to the maintainers.
