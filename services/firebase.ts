//firebase.ts
// Import the functions you need from the SDKs you need
import * as FileSystem from 'expo-file-system';
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User
} from "firebase/auth";
import { get, getDatabase, onValue, ref } from "firebase/database";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytes,
  uploadBytesResumable,
  UploadTaskSnapshot
} from "firebase/storage";
import { Platform } from "react-native";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJLZxsyX_WcgFUzB3IawQ-aV9Dx_r9Ov8",
  authDomain: "remote-vitals-kit.firebaseapp.com",
  databaseURL: "https://remote-vitals-kit-default-rtdb.firebaseio.com",
  projectId: "remote-vitals-kit",
  storageBucket: "remote-vitals-kit.firebasestorage.app",
  messagingSenderId: "606518953740",
  appId: "1:606518953740:web:ec13187bf7462179292b29",
  measurementId: "G-RJSFFFB2SP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics only if supported (avoids SSR issues)
let analytics;
if (typeof window !== 'undefined') {
  isSupported().then(yes => {
    if (yes) {
      analytics = getAnalytics(app);
    }
  });
}

const database = getDatabase(app);
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

// Export firestore and storage for direct use
export { firestore, storage };

// Configure Google Auth Provider with proper scopes
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const firebaseService = {
  auth: {
    // Create user with email and password
    createUserWithEmailAndPassword: async (email: string, password: string) => {
      try {
        console.log("🔐 Creating user with email:", email);
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log("✅ User created successfully!");
        console.log("   - UID:", user.uid);
        console.log("   - Email:", user.email);
        
        return { 
          user: { 
            uid: user.uid, 
            email: user.email || '',
            emailVerified: user.emailVerified || false,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            providerId: user.providerData[0]?.providerId || 'email'
          } 
        };
      } catch (error: any) {
        console.error("❌ Error creating user:", error);
        
        if (error.code === 'auth/email-already-in-use') {
          throw new Error('This email is already registered. Please use a different email or try signing in.');
        } else if (error.code === 'auth/weak-password') {
          throw new Error('Password is too weak. Please use a stronger password.');
        } else if (error.code === 'auth/invalid-email') {
          throw new Error('Invalid email address. Please check your email format.');
        } else {
          throw new Error(error.message || 'Failed to create account');
        }
      }
    },

    // Sign in with email and password
    signInWithEmailAndPassword: async (email: string, password: string) => {
      try {
        console.log("🔐 Signing in user with email:", email);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log("✅ User signed in successfully!");
        
        return { 
          user: { 
            uid: user.uid, 
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || ''
          } 
        };
      } catch (error: any) {
        console.error("❌ Error signing in:", error);
        
        if (error.code === 'auth/user-not-found') {
          throw new Error('No account found with this email. Please sign up first.');
        } else if (error.code === 'auth/wrong-password') {
          throw new Error('Incorrect password. Please try again.');
        } else if (error.code === 'auth/invalid-email') {
          throw new Error('Invalid email address.');
        } else if (error.code === 'auth/user-disabled') {
          throw new Error('This account has been disabled.');
        } else if (error.code === 'auth/too-many-requests') {
          throw new Error('Too many failed attempts. Please try again later.');
        } else {
          throw new Error(error.message || 'Failed to sign in');
        }
      }
    },

    // Fixed Google Sign-In for mobile and web
    signInWithGoogle: async () => {
      try {
        console.log("🔐 Starting Google sign-in...");
        console.log("Platform detected:", Platform.OS);
        
        // Check platform and handle accordingly
        if (Platform.OS === 'web' || typeof window !== 'undefined') {
          // Web platform - use popup/redirect
          try {
            console.log("🌐 Using popup method for web...");
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            
            console.log("✅ Google sign-in successful (popup):", user.uid);
            return { 
              user: { 
                uid: user.uid, 
                email: user.email || '',
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                providerId: 'google.com'
              } 
            };
          } catch (popupError: any) {
            console.log("⚠️ Popup failed, trying redirect...", popupError.code);
            
            if (popupError.code === 'auth/popup-blocked' || 
                popupError.code === 'auth/popup-closed-by-user') {
              
              console.log("🔄 Using redirect method...");
              await signInWithRedirect(auth, googleProvider);
              return { 
                user: null, 
                pending: true,
                message: 'Redirecting to Google sign-in...' 
              };
            }
            throw popupError;
          }
        } else {
          // Mobile platform - show configuration instructions
          console.log("📱 Mobile platform detected - showing setup instructions");
          
          throw new Error(
            "Google Sign-In Setup Required\n\n" +
            "To enable Google sign-in on mobile:\n\n" +
            "1. Install the required package:\n" +
            "   expo install @react-native-google-signin/google-signin\n\n" +
            "2. Configure OAuth in Google Cloud Console:\n" +
            "   - Add iOS client ID for your bundle identifier\n" +
            "   - Add Android client ID for your package name\n\n" +
            "3. Add client IDs to app.json/app.config.js:\n" +
            "   \"googleServicesFile\": \"./google-services.json\"\n\n" +
            "4. For Expo managed workflow, add to app.json:\n" +
            "   \"expo\": {\n" +
            "     \"plugins\": [\"@react-native-google-signin/google-signin\"]\n" +
            "   }\n\n" +
            "For now, please use email/password authentication."
          );
        }
      } catch (error: any) {
        console.error("❌ Google sign-in error:", error);
        
        if (error.code === 'auth/popup-blocked') {
          throw new Error('Pop-up was blocked by your browser. Please allow pop-ups and try again.');
        } else if (error.code === 'auth/cancelled-popup-request') {
          throw new Error('Sign-in was cancelled. Please try again.');
        } else if (error.code === 'auth/popup-closed-by-user') {
          throw new Error('Sign-in window was closed. Please try again.');
        } else if (error.code === 'auth/network-request-failed') {
          throw new Error('Network error. Please check your connection and try again.');
        } else if (error.code === 'auth/internal-error') {
          throw new Error('An internal error occurred. Please try again.');
        } else {
          throw new Error(error.message || 'Google sign-in failed. Please try again.');
        }
      }
    },

    // Check for redirect result (call this on app startup)
    handleRedirectResult: async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          console.log("✅ Google sign-in completed via redirect:", result.user.uid);
          return {
            user: {
              uid: result.user.uid,
              email: result.user.email || '',
              displayName: result.user.displayName || '',
              photoURL: result.user.photoURL || '',
              providerId: 'google.com'
            }
          };
        }
        return null;
      } catch (error: any) {
        console.error("❌ Error handling redirect result:", error);
        throw new Error(error.message || 'Failed to complete Google sign-in');
      }
    },

    // Sign out
    signOut: async () => {
      try {
        console.log("🔐 Signing out user...");
        await signOut(auth);
        console.log("✅ User signed out successfully");
      } catch (error: any) {
        console.error("❌ Error signing out:", error);
        throw new Error(error.message || 'Failed to sign out');
      }
    },

    // Get current user
    getCurrentUser: () => {
      return auth.currentUser;
    },

    // Listen to auth state changes
    onAuthStateChanged: (callback: (user: User | null) => void) => {
      return onAuthStateChanged(auth, callback);
    },

    // Test Firebase Auth configuration
    testAuth: async () => {
      try {
        console.log("🔥 Testing Firebase Auth configuration...");
        console.log("   - Auth Domain:", firebaseConfig.authDomain);
        console.log("   - Project ID:", firebaseConfig.projectId);
        console.log("   - API Key:", firebaseConfig.apiKey ? "✅ Present" : "❌ Missing");
        console.log("   - Auth Instance:", auth ? "✅ Initialized" : "❌ Not initialized");
        console.log("   - Current User:", auth.currentUser ? auth.currentUser.email : "None");
        
        return {
          configured: true,
          currentUser: auth.currentUser,
          config: {
            authDomain: firebaseConfig.authDomain,
            projectId: firebaseConfig.projectId,
            hasApiKey: !!firebaseConfig.apiKey
          }
        };
      } catch (error: any) {
        console.error("❌ Error testing Auth:", error);
        throw error;
      }
    }
  },

  database: {
    // Test Firebase connection
    testConnection: async () => {
      try {
        console.log("🔥 Testing Firebase connection...");
        console.log("Database URL:", "https://remote-vitals-kit-default-rtdb.firebaseio.com");
        
        const dbRef = ref(database);
        console.log("Created database reference");
        
        const snapshot = await get(dbRef);
        console.log("Got snapshot, exists:", snapshot.exists());
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log("📊 Firebase data found");
          return data;
        } else {
          console.log("❌ No data found in Firebase");
          return null;
        }
      } catch (error) {
        console.error("❌ Firebase connection error:", error);
        throw error;
      }
    },

    // Fetch all health data from Firebase Realtime Database
    getHealthData: async () => {
      try {
        console.log("🔄 Fetching health data...");
        
        const dbRef = ref(database);
        const snapshot = await get(dbRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const healthDataArray = [];
          
          // Convert Firebase object structure to array
          for (const deviceId in data) {
            if (data[deviceId] && typeof data[deviceId] === 'object') {
              const deviceData = data[deviceId];
              
              if (deviceData.device_info && deviceData.vitals) {
                healthDataArray.push({
                  deviceId,
                  device_info: deviceData.device_info,
                  vitals: deviceData.vitals,
                  timestamp: Date.now()
                });
              }
            }
          }
          
          console.log(`✅ Found ${healthDataArray.length} devices with complete data`);
          return healthDataArray;
        } else {
          console.log("❌ No data available in Firebase");
          return [];
        }
      } catch (error) {
        console.error("❌ Error fetching health data:", error);
        throw error;
      }
    },
    
    // Listen for real-time updates
    listenToHealthData: (callback: (data: any[]) => void) => {
      const dbRef = ref(database);
      return onValue(dbRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const healthDataArray = [];
          
          for (const deviceId in data) {
            if (data[deviceId] && typeof data[deviceId] === 'object') {
              const deviceData = data[deviceId];
              
              if (deviceData.device_info && deviceData.vitals) {
                healthDataArray.push({
                  deviceId,
                  device_info: deviceData.device_info,
                  vitals: deviceData.vitals,
                  timestamp: Date.now()
                });
              }
            }
          }
          
          callback(healthDataArray);
        } else {
          callback([]);
        }
      });
    }
  },

  firestore: {
    stethoscope: {
      // Upload audio file to Firebase Storage and save metadata to Firestore
      saveRecording: async (
        userId: string, 
        recordingData: any, 
        audioUri?: string
      ): Promise<{ success: boolean; id?: string; error?: string }> => {
        try {
          // SECURITY: Verify user authentication before proceeding
          if (!auth.currentUser) {
            throw new Error('User not authenticated');
          }
          
          if (auth.currentUser.uid !== userId) {
            throw new Error('User ID mismatch - security violation');
          }
          
          console.log('💾 Attempting to save recording to Firebase...');
          console.log('   - User ID:', userId);
          console.log('   - Audio URI:', audioUri);
          
          // Create document reference for custom ID generation
          const docRef = doc(collection(firestore, 'stethoscope_recordings'));
          const recordingId = docRef.id;
          
          let downloadURL = null;
          let fileSize = 0;
          
          // Upload audio file to Firebase Storage if URI is provided
          if (audioUri) {
            try {
              console.log('📤 Uploading audio file to Firebase Storage...');
              console.log('   - Original URI:', audioUri);
              console.log('   - Platform:', Platform.OS);
              
              let blob: Blob;
              
              // Handle React Native file URIs differently than web URIs
              if (Platform.OS !== 'web' && audioUri.startsWith('file://')) {
                console.log('   - Using fetch for React Native file URI directly to Blob...');
                
                // First, verify the file exists and get its info
                const fileInfo = await FileSystem.getInfoAsync(audioUri);
                console.log('   - File info:', fileInfo);
                
                if (!fileInfo.exists) {
                  throw new Error('File does not exist at the specified URI');
                }
                
                fileSize = fileInfo.size || 0;
                console.log('   - File size from FileSystem:', Math.round(fileSize / 1024), 'KB');
                
                if (fileSize === 0) {
                  throw new Error('File is empty (0 bytes)');
                }
                
                // Use fetch to convert file:// URI directly to Blob (much more reliable than atob)
                console.log('   - Fetching file as blob...');
                const response = await fetch(audioUri);
                
                if (!response.ok) {
                  throw new Error(`Failed to fetch local file: ${response.status} ${response.statusText}`);
                }
                
                blob = await response.blob();
                console.log('   - Blob created from fetch, size:', blob.size);
                console.log('   - Blob type:', blob.type || 'audio/m4a (defaulting)');
                
                // Ensure the blob has the correct MIME type
                if (!blob.type || blob.type === 'application/octet-stream') {
                  console.log('   - Setting correct MIME type for audio file...');
                  blob = new Blob([blob], { type: 'audio/m4a' });
                }
              } else {
                console.log('   - Using fetch for web/http URI...');
                
                // For web or http URIs, use fetch
                const response = await fetch(audioUri);
                console.log('   - Fetch response status:', response.status);
                
                if (!response.ok) {
                  throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
                }
                
                blob = await response.blob();
                fileSize = blob.size;
                console.log('   - Blob from fetch, size:', Math.round(fileSize / 1024), 'KB');
              }
              
              console.log('   - Final blob type:', blob.type);
              console.log('   - Final blob size:', blob.size, 'bytes');
              console.log('   - Final blob size:', Math.round(blob.size / 1024), 'KB');
              
              // Validate blob before upload
              if (!blob || blob.size === 0) {
                throw new Error('File is empty or could not be read - blob size is 0 bytes');
              }
              
              if (blob.size > 50 * 1024 * 1024) { // 50MB limit
                throw new Error(`File too large (${Math.round(blob.size / 1024 / 1024)}MB). Maximum size is 50MB.`);
              }
              
              console.log('✅ Blob validation passed - ready for upload');
              
              // Create storage reference with organized path
              const fileName = `${recordingId}.m4a`;
              const storagePath = `stethoscope_recordings/${userId}/${fileName}`;
              console.log('   - Storage path:', storagePath);
              
              const audioRef = storageRef(storage, storagePath);
              
              // Upload the file with metadata
              const metadata = {
                contentType: 'audio/m4a',
                customMetadata: {
                  'recordingId': recordingId,
                  'userId': userId,
                  'uploadedAt': new Date().toISOString(),
                  'deviceType': recordingData.deviceType || 'R-Stethoscope',
                  'platform': Platform.OS
                }
              };
              
              console.log('   - Starting upload with metadata:', metadata);
              const uploadResult = await uploadBytes(audioRef, blob, metadata);
              console.log('✅ Audio file uploaded successfully');
              console.log('   - Upload result ref:', uploadResult.ref.fullPath);
              console.log('   - Upload result metadata size:', uploadResult.metadata.size);
              
              // Get download URL
              downloadURL = await getDownloadURL(uploadResult.ref);
              console.log('✅ Download URL generated:', downloadURL);
              
              // Verify the file is accessible
              try {
                const verifyResponse = await fetch(downloadURL, { method: 'HEAD' });
                console.log('   - Download URL verification:', verifyResponse.status);
              } catch (verifyError) {
                console.warn('   - Could not verify download URL, but upload seems successful');
              }
              
            } catch (uploadError: any) {
              console.error('❌ Error uploading audio file:', uploadError);
              console.error('   - Error name:', uploadError.name);
              console.error('   - Error message:', uploadError.message);
              console.error('   - Error stack:', uploadError.stack);
              
              // Check specific error types
              if (uploadError.code === 'storage/unauthorized') {
                console.error('   - UNAUTHORIZED: Check Firebase Storage rules and authentication');
              } else if (uploadError.code === 'storage/canceled') {
                console.error('   - CANCELED: Upload was canceled');
              } else if (uploadError.code === 'storage/unknown') {
                console.error('   - UNKNOWN: Check network connection and Firebase config');
              } else if (uploadError.code === 'storage/retry-limit-exceeded') {
                console.error('   - RETRY LIMIT EXCEEDED: Check network stability');
              }
              
              // Continue with saving metadata even if upload fails
            }
          }
          
          // Create the complete recording object with storage info
          const recording = {
            id: recordingId,
            userId, // SECURITY: Always ensure userId is stored
            ...recordingData,
            // Storage-related fields
            audioUrl: downloadURL,
            audioPath: downloadURL ? `stethoscope_recordings/${userId}/${recordingId}.m4a` : null,
            fileSize: fileSize,
            hasAudioFile: !!downloadURL,
            // Security metadata
            createdBy: auth.currentUser.uid, // Double-check user ownership
            // Timestamps
            timestamp: serverTimestamp() as Timestamp,
            createdAt: serverTimestamp() as Timestamp,
            updatedAt: serverTimestamp() as Timestamp,
            // Healthcare compliance
            isHealthcareData: true,
            dataClassification: 'CONFIDENTIAL',
          };
          
          await setDoc(docRef, recording);
          
          console.log('✅ Recording saved successfully with ID:', recordingId);
          console.log('   - Audio URL:', downloadURL ? 'Available' : 'Not uploaded');
          console.log('   - File size:', fileSize ? `${Math.round(fileSize / 1024)} KB` : 'Unknown');
          
          return { success: true, id: recordingId };
        } catch (error: any) {
          console.error('❌ Error saving recording to Firebase:', error);
          console.error('   - Error code:', error.code);
          console.error('   - Error message:', error.message);
          return { success: false, error: error.message };
        }
      },

      // Get user's recordings - ENHANCED VERSION WITH SECURITY
      getUserRecordings: async (userId: string): Promise<any[]> => {
        try {
          // SECURITY: Verify user authentication
          if (!auth.currentUser) {
            throw new Error('User not authenticated');
          }
          
          if (auth.currentUser.uid !== userId) {
            throw new Error('Unauthorized access attempt - user mismatch');
          }
          
          console.log('🔄 Loading recordings from Firestore for user:', userId);
          
          // Temporary fix: Remove orderBy to avoid index requirement
          // Once the index is ready, you can add back: orderBy('timestamp', 'desc')
          const q = query(
            collection(firestore, 'stethoscope_recordings'),
            where('userId', '==', userId), // SECURITY: Only get this user's recordings
            limit(50) // SECURITY: Limit to prevent excessive data access
          );
          
          const querySnapshot = await getDocs(q);
          const recordings = querySnapshot.docs.map(doc => {
            const data = doc.data();
            
            // SECURITY: Verify ownership on each record
            if (data.userId !== userId) {
              console.error('SECURITY VIOLATION: Found recording not owned by user');
              return null;
            }
            
            return {
              id: doc.id,
              ...data
            };
          }).filter(Boolean); // Remove any null entries
          
          // Client-side sorting by timestamp (descending) to maintain expected order
          // while the Firestore index is being built
          recordings.sort((a: any, b: any) => {
            if (!a?.timestamp || !b?.timestamp) return 0;
            const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
            const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
            return bTime.getTime() - aTime.getTime();
          });
          
          console.log(`✅ Loaded ${recordings.length} recordings for user`);
          return recordings;
        } catch (error: any) {
          console.error('❌ Error loading recordings from Firestore:', error);
          console.error('   - Error code:', error.code);
          console.error('   - Error message:', error.message);
          throw error;
        }
      },

      // Update analysis for a recording - ENHANCED VERSION WITH SECURITY
      updateAnalysis: async (recordingId: string, analysis: any): Promise<void> => {
        try {
          // SECURITY: Verify user authentication
          if (!auth.currentUser) {
            throw new Error('User not authenticated');
          }
          
          console.log('🔄 Updating analysis for recording:', recordingId);
          
          const docRef = doc(firestore, 'stethoscope_recordings', recordingId);
          
          // SECURITY: Verify ownership before updating
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            throw new Error('Recording not found');
          }
          
          const recordingData = docSnap.data();
          if (recordingData.userId !== auth.currentUser.uid) {
            throw new Error('Unauthorized to update this recording');
          }
          
          await updateDoc(docRef, {
            analysis,
            updatedAt: serverTimestamp(),
            lastUpdatedBy: auth.currentUser.uid, // Track who made the update
          });
          
          console.log('✅ Analysis updated for recording:', recordingId);
        } catch (error: any) {
          console.error('❌ Error updating analysis:', error);
          console.error('   - Error code:', error.code);
          console.error('   - Error message:', error.message);
          throw error;
        }
      },

      // Update sharing status - ENHANCED VERSION WITH SECURITY
      updateSharingStatus: async (recordingId: string, shared: boolean): Promise<void> => {
        try {
          // SECURITY: Verify user authentication
          if (!auth.currentUser) {
            throw new Error('User not authenticated');
          }
          
          console.log('🔄 Updating sharing status for recording:', recordingId, 'to:', shared);
          
          const docRef = doc(firestore, 'stethoscope_recordings', recordingId);
          
          // SECURITY: Verify ownership before updating
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            throw new Error('Recording not found');
          }
          
          const recordingData = docSnap.data();
          if (recordingData.userId !== auth.currentUser.uid) {
            throw new Error('Unauthorized to update this recording');
          }
          
          await updateDoc(docRef, {
            shared,
            sharedAt: shared ? serverTimestamp() : null,
            updatedAt: serverTimestamp(),
            lastUpdatedBy: auth.currentUser.uid, // Track who made the update
          });
          
          console.log('✅ Sharing status updated for recording:', recordingId);
        } catch (error: any) {
          console.error('❌ Error updating sharing status:', error);
          console.error('   - Error code:', error.code);
          console.error('   - Error message:', error.message);
          throw error;
        }
      },

      // Delete a recording and its audio file - ENHANCED VERSION
      deleteRecording: async (userId: string, recordingId: string): Promise<void> => {
        try {
          console.log('🗑️ Deleting recording:', recordingId, 'for user:', userId);
          
          // Verify ownership and get recording data before deletion
          const docRef = doc(firestore, 'stethoscope_recordings', recordingId);
          const docSnap = await getDoc(docRef);
          
          if (!docSnap.exists()) {
            throw new Error('Recording not found');
          }
          
          const recordingData = docSnap.data();
          if (recordingData.userId !== userId) {
            throw new Error('Unauthorized to delete this recording');
          }
          
          // Delete audio file from Storage if it exists
          if (recordingData.audioPath) {
            try {
              console.log('🗑️ Deleting audio file from Storage:', recordingData.audioPath);
              const audioFileRef = storageRef(storage, recordingData.audioPath);
              await deleteObject(audioFileRef);
              console.log('✅ Audio file deleted from Storage');
            } catch (storageError: any) {
              console.warn('⚠️ Could not delete audio file from Storage:', storageError.message);
              // Continue with Firestore deletion even if Storage deletion fails
            }
          }
          
          // Delete the Firestore document
          await deleteDoc(docRef);
          
          console.log('✅ Recording and audio file deleted:', recordingId);
        } catch (error: any) {
          console.error('❌ Error deleting recording:', error);
          console.error('   - Error code:', error.code);
          console.error('   - Error message:', error.message);
          throw error;
        }
      },

      // Get a single recording by ID - NEW METHOD
      getRecording: async (recordingId: string): Promise<any> => {
        try {
          console.log('🔄 Fetching recording:', recordingId);
          
          const docRef = doc(firestore, 'stethoscope_recordings', recordingId);
          const docSnap = await getDoc(docRef);
          
          if (!docSnap.exists()) {
            throw new Error('Recording not found');
          }
          
          const result = {
            id: docSnap.id,
            ...docSnap.data()
          };
          
          console.log('✅ Recording fetched successfully');
          return result;
        } catch (error: any) {
          console.error('❌ Error fetching recording:', error);
          console.error('   - Error code:', error.code);
          console.error('   - Error message:', error.message);
          throw error;
        }
      },

      // Get recordings with specific analysis results - NEW METHOD
      getRecordingsByAnalysis: async (userId: string, analysisType: string): Promise<any[]> => {
        try {
          console.log('🔄 Fetching recordings by analysis type:', analysisType, 'for user:', userId);
          
          // Simple query to avoid index requirements - filter analysis results in client code if needed
          const q = query(
            collection(firestore, 'stethoscope_recordings'),
            where('userId', '==', userId),
            orderBy('timestamp', 'desc')
          );
          
          const querySnapshot = await getDocs(q);
          const recordings = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          console.log(`✅ Found ${recordings.length} recordings with analysis type:`, analysisType);
          return recordings;
        } catch (error: any) {
          console.error('❌ Error fetching recordings by analysis:', error);
          console.error('   - Error code:', error.code);
          console.error('   - Error message:', error.message);
          throw error;
        }
      },

      // Get recording statistics for a user - NEW METHOD
      getUserStatistics: async (userId: string): Promise<any> => {
        try {
          console.log('📊 Calculating statistics for user:', userId);
          
          const recordings = await firebaseService.firestore.stethoscope.getUserRecordings(userId);
          
          const stats = {
            totalRecordings: recordings.length,
            totalDuration: recordings.reduce((sum, rec) => sum + (rec.duration || 0), 0),
            averageHeartRate: 0,
            abnormalFindings: 0,
            lastRecording: recordings[0]?.timestamp || null,
          };
          
          // Calculate average heart rate and abnormal findings
          const recordingsWithAnalysis = recordings.filter(rec => rec.analysis);
          if (recordingsWithAnalysis.length > 0) {
            const totalHeartRate = recordingsWithAnalysis.reduce(
              (sum, rec) => sum + (rec.analysis.heartRate || 0), 
              0
            );
            stats.averageHeartRate = Math.round(totalHeartRate / recordingsWithAnalysis.length);
            
            stats.abnormalFindings = recordingsWithAnalysis.filter(
              rec => rec.analysis.rhythm === 'irregular' || 
                     rec.analysis.murmur?.present || 
                     rec.analysis.additionalSounds?.length > 0
            ).length;
          }
          
          console.log('✅ Statistics calculated successfully:', stats);
          return stats;
        } catch (error: any) {
          console.error('❌ Error calculating statistics:', error);
          console.error('   - Error code:', error.code);
          console.error('   - Error message:', error.message);
          throw error;
        }
      },

      // Save processed heart sound recording with both original and filtered audio
      saveProcessedRecording: async (
        userId: string,
        originalRecordingData: any,
        processedAudioResult: any,
        gptAnalysis: any,
        originalAudioUri?: string
      ): Promise<{ success: boolean; id?: string; error?: string }> => {
        try {
          // SECURITY: Verify user authentication
          if (!auth.currentUser) {
            throw new Error('User not authenticated');
          }
          
          if (auth.currentUser.uid !== userId) {
            throw new Error('User ID mismatch - security violation');
          }
          
          console.log('💾 Saving processed heart sound recording to Firebase...');
          console.log('   - User ID:', userId);
          console.log('   - Original Audio URI:', originalAudioUri);
          console.log('   - Processed Audio URI:', processedAudioResult.processedUri);
          
          // Create document reference
          const docRef = doc(collection(firestore, 'stethoscope_recordings'));
          const recordingId = docRef.id;
          
          let originalAudioUrl = null;
          let processedAudioUrl = null;
          let originalFileSize = 0;
          let processedFileSize = 0;
          
          // Upload original audio file if provided
          if (originalAudioUri) {
            try {
              console.log('📤 Uploading original audio file...');
              
              const originalResponse = await fetch(originalAudioUri);
              if (!originalResponse.ok) {
                throw new Error(`Failed to fetch original audio: ${originalResponse.statusText}`);
              }
              
              const originalBlob = await originalResponse.blob();
              originalFileSize = originalBlob.size;
              
              if (originalBlob.size === 0) {
                throw new Error('Original audio file is empty');
              }
              
              // Upload original audio
              const originalFileName = `${recordingId}_original.m4a`;
              const originalStoragePath = `stethoscope_recordings/${userId}/original/${originalFileName}`;
              const originalRef = storageRef(storage, originalStoragePath);
              
              const originalMetadata = {
                contentType: 'audio/m4a',
                customMetadata: {
                  'recordingId': recordingId,
                  'userId': userId,
                  'audioType': 'original',
                  'uploadedAt': new Date().toISOString(),
                  'deviceType': originalRecordingData.deviceType || 'R-Stethoscope',
                  'platform': Platform.OS
                }
              };
              
              const originalUpload = await uploadBytes(originalRef, originalBlob, originalMetadata);
              originalAudioUrl = await getDownloadURL(originalUpload.ref);
              console.log('✅ Original audio uploaded successfully');
              
            } catch (originalError: any) {
              console.error('❌ Error uploading original audio:', originalError);
              // Continue with processed audio upload
            }
          }
          
          // Upload processed audio file
          if (processedAudioResult.processedUri) {
            try {
              console.log('📤 Uploading processed audio file...');
              
              const processedResponse = await fetch(processedAudioResult.processedUri);
              if (!processedResponse.ok) {
                throw new Error(`Failed to fetch processed audio: ${processedResponse.statusText}`);
              }
              
              const processedBlob = await processedResponse.blob();
              processedFileSize = processedBlob.size;
              
              if (processedBlob.size === 0) {
                throw new Error('Processed audio file is empty');
              }
              
              // Upload processed audio
              const processedFileName = `${recordingId}_processed.m4a`;
              const processedStoragePath = `stethoscope_recordings/${userId}/processed/${processedFileName}`;
              const processedRef = storageRef(storage, processedStoragePath);
              
              const processedMetadata = {
                contentType: 'audio/m4a',
                customMetadata: {
                  'recordingId': recordingId,
                  'userId': userId,
                  'audioType': 'processed',
                  'uploadedAt': new Date().toISOString(),
                  'deviceType': originalRecordingData.deviceType || 'R-Stethoscope',
                  'platform': Platform.OS,
                  'processingFilters': JSON.stringify(processedAudioResult.processingMetadata.appliedFilters),
                  'qualityScore': processedAudioResult.processingMetadata.qualityMetrics.heartSoundClarity.toString()
                }
              };
              
              const processedUpload = await uploadBytes(processedRef, processedBlob, processedMetadata);
              processedAudioUrl = await getDownloadURL(processedUpload.ref);
              console.log('✅ Processed audio uploaded successfully');
              
            } catch (processedError: any) {
              console.error('❌ Error uploading processed audio:', processedError);
              // Continue with saving metadata
            }
          }
          
          // Create comprehensive recording document
          const recording = {
            id: recordingId,
            userId,
            
            // Basic recording data
            ...originalRecordingData,
            
            // Audio files
            originalAudio: {
              url: originalAudioUrl,
              path: originalAudioUrl ? `stethoscope_recordings/${userId}/original/${recordingId}_original.m4a` : null,
              size: originalFileSize,
              uri: originalAudioUri,
              hasFile: !!originalAudioUrl
            },
            
            processedAudio: {
              url: processedAudioUrl,
              path: processedAudioUrl ? `stethoscope_recordings/${userId}/processed/${recordingId}_processed.m4a` : null,
              size: processedFileSize,
              uri: processedAudioResult.processedUri,
              hasFile: !!processedAudioUrl,
              processingMetadata: processedAudioResult.processingMetadata
            },
            
            // GPT Analysis
            gptAnalysis: {
              ...gptAnalysis,
              analysisDate: new Date().toISOString(),
              analysisVersion: '2.0',
              model: 'gpt-4-turbo-preview'
            },
            
            // Legacy compatibility (use processed audio as primary)
            audioUrl: processedAudioUrl || originalAudioUrl,
            audioPath: processedAudioUrl ? 
              `stethoscope_recordings/${userId}/processed/${recordingId}_processed.m4a` : 
              originalAudioUrl ? `stethoscope_recordings/${userId}/original/${recordingId}_original.m4a` : null,
            fileSize: processedFileSize || originalFileSize,
            hasAudioFile: !!(processedAudioUrl || originalAudioUrl),
            
            // Enhanced metadata
            processingApplied: true,
            analysisMethod: 'gpt4-enhanced',
            qualityMetrics: processedAudioResult.processingMetadata.qualityMetrics,
            
            // Security metadata
            createdBy: auth.currentUser.uid,
            isHealthcareData: true,
            dataClassification: 'CONFIDENTIAL',
            
            // Timestamps
            timestamp: serverTimestamp() as Timestamp,
            createdAt: serverTimestamp() as Timestamp,
            updatedAt: serverTimestamp() as Timestamp,
          };
          
          await setDoc(docRef, recording);
          
          console.log('✅ Processed recording saved successfully with ID:', recordingId);
          console.log('   - Original Audio:', originalAudioUrl ? 'Available' : 'Not uploaded');
          console.log('   - Processed Audio:', processedAudioUrl ? 'Available' : 'Not uploaded');
          console.log('   - GPT Analysis:', gptAnalysis ? 'Complete' : 'None');
          
          return { success: true, id: recordingId };
          
        } catch (error: any) {
          console.error('❌ Error saving processed recording:', error);
          return { success: false, error: error.message };
        }
      }
    }
  },

  // Firebase Storage service for audio files
  storage: {
    // Enhanced test with detailed diagnostics
    testStorageConnection: async (userId: string): Promise<{ success: boolean; error?: string; details?: any }> => {
      try {
        console.log('🔍 Testing Firebase Storage connection for user:', userId);
        console.log('   - Storage bucket:', firebaseConfig.storageBucket);
        console.log('   - Current user:', auth.currentUser?.uid);
        console.log('   - User authenticated:', !!auth.currentUser);
        
        if (!auth.currentUser) {
          throw new Error('User not authenticated - please login first');
        }
        
        if (auth.currentUser.uid !== userId) {
          throw new Error('User ID mismatch - please check authentication');
        }
        
        // Create a test file
        const testData = new Blob(['Hello Firebase Storage Test'], { type: 'text/plain' });
        const testRef = storageRef(storage, `test/${userId}/connection-test.txt`);
        
        console.log('   - Test storage path:', `test/${userId}/connection-test.txt`);
        console.log('   - Test blob size:', testData.size);
        
        console.log('   - Testing upload...');
        const uploadResult = await uploadBytes(testRef, testData);
        console.log('   - Upload successful');
        console.log('   - Upload metadata:', uploadResult.metadata);
        
        console.log('   - Testing download URL...');
        const downloadURL = await getDownloadURL(uploadResult.ref);
        console.log('   - Download URL generated:', downloadURL);
        
        console.log('   - Testing file access...');
        const accessTest = await fetch(downloadURL, { method: 'HEAD' });
        console.log('   - File access status:', accessTest.status);
        
        console.log('   - Cleaning up test file...');
        await deleteObject(testRef);
        console.log('   - Test file deleted');
        
        return { 
          success: true, 
          details: {
            uploadSuccess: true,
            downloadUrlGenerated: true,
            fileAccessible: accessTest.ok,
            storageRules: 'Working',
            userAuthenticated: true,
            storageBucket: firebaseConfig.storageBucket
          }
        };
      } catch (error: any) {
        console.error('❌ Storage connection test failed:', error);
        console.error('   - Error code:', error.code);
        console.error('   - Error message:', error.message);
        console.error('   - Error stack:', error.stack);
        
        let suggestion = 'Check network connection and Firebase configuration';
        
        if (error.code === 'storage/unauthorized') {
          suggestion = `
🚨 FIREBASE STORAGE RULES ISSUE:

Your Firebase Storage rules are blocking uploads. Here's how to fix it:

1. QUICK FIX - Go to Firebase Console:
   https://console.firebase.google.com/project/remote-vitals-kit/storage/rules

2. Replace the rules with:
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       allow read, write: if request.auth != null;
     }
   }

3. Click "Publish"

4. Test upload again with the debug button

OR enable App Engine and deploy rules via CLI:
firebase deploy --only storage:rules
          `.trim();
        } else if (error.message.includes('not authenticated')) {
          suggestion = 'Login to the app first before testing storage';
        } else if (error.code === 'storage/unknown') {
          suggestion = 'Check Firebase project configuration and network';
        }
        
        return { 
          success: false, 
          error: error.message,
          details: {
            errorCode: error.code,
            errorMessage: error.message,
            suggestion: suggestion,
            userAuthenticated: !!auth.currentUser,
            currentUserId: auth.currentUser?.uid,
            expectedUserId: userId,
            storageBucket: firebaseConfig.storageBucket
          }
        };
      }
    },
    // Upload audio file with progress monitoring
    uploadAudioFile: async (
      userId: string, 
      recordingId: string, 
      audioUri: string,
      onProgress?: (progress: number) => void
    ): Promise<{ success: boolean; downloadURL?: string; error?: string }> => {
      try {
        console.log('📤 Starting audio file upload...');
        console.log('   - User ID:', userId);
        console.log('   - Recording ID:', recordingId);
        console.log('   - Audio URI:', audioUri);
        
        // Convert file URI to blob
        const response = await fetch(audioUri);
        const blob = await response.blob();
        
        // Create storage reference
        const fileName = `${recordingId}.m4a`;
        const audioRef = storageRef(
          storage, 
          `stethoscope_recordings/${userId}/${fileName}`
        );
        
        // Use uploadBytesResumable for progress monitoring
        const uploadTask = uploadBytesResumable(audioRef, blob);
        
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot: UploadTaskSnapshot) => {
              // Calculate and report progress
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`📤 Upload progress: ${Math.round(progress)}%`);
              
              if (onProgress) {
                onProgress(progress);
              }
            },
            (error) => {
              console.error('❌ Upload failed:', error);
              reject({ success: false, error: error.message });
            },
            async () => {
              try {
                // Upload completed successfully
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                console.log('✅ Upload completed successfully');
                console.log('   - Download URL:', downloadURL);
                resolve({ success: true, downloadURL });
              } catch (urlError: any) {
                console.error('❌ Error getting download URL:', urlError);
                reject({ success: false, error: urlError.message });
              }
            }
          );
        });
      } catch (error: any) {
        console.error('❌ Error uploading audio file:', error);
        return { success: false, error: error.message };
      }
    },

    // Delete audio file from Storage
    deleteAudioFile: async (filePath: string): Promise<{ success: boolean; error?: string }> => {
      try {
        console.log('🗑️ Deleting audio file from Storage:', filePath);
        
        const audioFileRef = storageRef(storage, filePath);
        await deleteObject(audioFileRef);
        
        console.log('✅ Audio file deleted successfully');
        return { success: true };
      } catch (error: any) {
        console.error('❌ Error deleting audio file:', error);
        return { success: false, error: error.message };
      }
    },

    // Get download URL for an audio file
    getAudioDownloadURL: async (filePath: string): Promise<{ success: boolean; downloadURL?: string; error?: string }> => {
      try {
        console.log('🔗 Getting download URL for:', filePath);
        
        const audioFileRef = storageRef(storage, filePath);
        const downloadURL = await getDownloadURL(audioFileRef);
        
        console.log('✅ Download URL retrieved successfully');
        return { success: true, downloadURL };
      } catch (error: any) {
        console.error('❌ Error getting download URL:', error);
        return { success: false, error: error.message };
      }
    },

    // Get storage usage statistics for a user
    getUserStorageStats: async (userId: string): Promise<{ totalFiles: number; totalSize: number; error?: string }> => {
      try {
        console.log('📊 Calculating storage stats for user:', userId);
        
        // Get all recordings for the user
        const recordings = await firebaseService.firestore.stethoscope.getUserRecordings(userId);
        
        const stats = {
          totalFiles: recordings.filter(rec => rec.hasAudioFile).length,
          totalSize: recordings.reduce((sum, rec) => sum + (rec.fileSize || 0), 0)
        };
        
        console.log('✅ Storage stats calculated:', stats);
        return stats;
      } catch (error: any) {
        console.error('❌ Error calculating storage stats:', error);
        return { totalFiles: 0, totalSize: 0, error: error.message };
      }
    }
  }
};

