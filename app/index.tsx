import { StatusBar } from 'expo-status-bar';
import React from 'react';
import MainApp from './MainApp';

export default function App() {
  return (
    <>
      <MainApp />
      <StatusBar style="auto" />
    </>
  );
}