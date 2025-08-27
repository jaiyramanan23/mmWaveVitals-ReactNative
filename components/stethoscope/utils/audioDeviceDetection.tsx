/**
 * Audio Device Detection Utilities (Simplified)
 * 
 * NOTE: GVAUDIO device detection has been removed to prevent recording cleanup errors.
 * This module now provides basic audio device functionality.
 */

import { Audio } from 'expo-av';

export interface AudioDevice {
    id: string;
    name: string;
    type: 'builtin' | 'usb' | 'bluetooth';
    isConnected: boolean;
}

/**
 * Get connected audio devices (simplified)
 */
export async function getConnectedAudioDevices(): Promise<AudioDevice[]> {
    const devices: AudioDevice[] = [];
    
    try {
        const { granted } = await Audio.requestPermissionsAsync();
        
        if (granted) {
            devices.push({
                id: 'builtin',
                name: 'Built-in Microphone',
                type: 'builtin',
                isConnected: true,
            });
        }
    } catch (error) {
        console.error('Error getting audio devices:', error);
    }
    
    return devices;
}

/**
 * Check audio device connection (simplified)
 */
export async function checkAudioDeviceConnection(): Promise<boolean> {
    try {
        const { granted } = await Audio.requestPermissionsAsync();
        return granted;
    } catch (error) {
        console.error('Error checking audio device connection:', error);
        return false;
    }
}

export default {
    getConnectedAudioDevices,
    checkAudioDeviceConnection,
};
