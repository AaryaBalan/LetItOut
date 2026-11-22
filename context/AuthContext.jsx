import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, runTransaction } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../config/firebase";

// Try to import Google Sign-In, but make it optional
let GoogleSignin = null;
let isGoogleSignInAvailable = false;

try {
  GoogleSignin =
    require("@react-native-google-signin/google-signin").GoogleSignin;
  isGoogleSignInAvailable = true;
} catch (error) {
  console.log("Google Sign-In not available:", error.message);
}

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// Only publish non-sensitive profile fields. Never spread private account data.
async function createUserDocument(user, additionalData = {}) {
  if (!user) return;
  const ref = doc(db, "users", user.uid);
  const publicRef = doc(db, "publicProfiles", user.uid);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    const publicSnapshot = await transaction.get(publicRef);

    if (snapshot.exists()) {
      const existingData = snapshot.data();
      if (!publicSnapshot.exists()) {
        const createdAt = existingData.createdAt || serverTimestamp();
        transaction.set(publicRef, {
          displayName: existingData.displayName || user.displayName || "Member",
          photoURL: existingData.photoURL || user.photoURL || null,
          profileCode: typeof existingData.profileCode === 'string' && !existingData.profileCode.includes('@') ? existingData.profileCode : user.uid,
          bio: existingData.bio || "",
          createdAt,
          updatedAt: serverTimestamp(),
        });
      } else if (additionalData.displayName) {
        transaction.update(ref, { displayName: additionalData.displayName });
        transaction.set(publicRef, { displayName: additionalData.displayName }, { merge: true });
      }
      return;
    }
    const createdAt = serverTimestamp();
    const profile = {
      displayName: additionalData.displayName || user.displayName || "Member",
      photoURL: user.photoURL || null,
      profileCode: user.uid,
      bio: "", createdAt, updatedAt: createdAt,
    };
    transaction.set(ref, { ...profile, email: user.email, loveSent: 0, postCount: 0 });
    transaction.set(publicRef, profile);
  });
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configure Google Sign-In if available
    if (isGoogleSignInAvailable && GoogleSignin) {
      try {
        GoogleSignin.configure({
          webClientId:
            "976666516752-hljr8a48ih3uudb54keehkfnq8vov65b.apps.googleusercontent.com",
          offlineAccess: true,
        });
      } catch (error) {
        console.error("Error configuring Google Sign-In:", error);
      }
    }

    let unsubscribeSnapshot = () => {};
    let generation = 0;
    const unsubscribeAuth = onAuthStateChanged(auth, async firebaseUser => {
      const current = ++generation;
      unsubscribeSnapshot();
      unsubscribeSnapshot = () => {};
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const fallback = { uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName };
      const fail = error => {
        if (current !== generation) return;
        console.error("Profile loading failed", error);
        setUser(fallback);
        setLoading(false);
      };
      try {
        await createUserDocument(firebaseUser);
        if (current !== generation) return;
        unsubscribeSnapshot = onSnapshot(doc(db, "users", firebaseUser.uid), snapshot => {
          if (current !== generation) return;
          const profile = snapshot.data() || {};
          setUser({ ...profile, ...fallback, displayName: profile.displayName || firebaseUser.displayName });
          setLoading(false);
        }, fail);
      } catch (error) { fail(error); }
    });
    return () => {
      generation++;
      unsubscribeAuth();
      unsubscribeSnapshot();
    };
  }, []);

  const signup = async (email, password, displayName = "") => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // Update profile with display name if provided
      if (displayName) {
        await updateProfile(user, { displayName });
      }

      // Create user document in Firestore
      await createUserDocument(user, {
        displayName: displayName || email.split("@")[0],
      });

      return { success: true, user };
    } catch (error) {
      console.error("Signup error:", error);
      return { success: false, error: error.message };
    }
  };

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.log("Login error:", error);
      return { success: false, error: error.message };
    }
  };

  const loginWithGoogle = async () => {
    if (!isGoogleSignInAvailable || !GoogleSignin) {
      return {
        success: false,
        error: "Google Sign-In is not available on this device",
      };
    }

    try {
      // Check if device supports Google Play services
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();

      // Create a Google credential with the token
      const googleCredential = GoogleAuthProvider.credential(
        userInfo.data.idToken,
      );

      // Sign in to Firebase with the Google credential
      const userCredential = await signInWithCredential(
        auth,
        googleCredential,
      );

      // Create user document in Firestore
      await createUserDocument(userCredential.user);

      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Google Sign-In Error:", error);

      // Handle specific error codes
      if (error.code === "SIGN_IN_CANCELLED") {
        return { success: false, error: "Sign-in was cancelled" };
      } else if (error.code === "IN_PROGRESS") {
        return { success: false, error: "Sign-in is already in progress" };
      } else if (error.code === "PLAY_SERVICES_NOT_AVAILABLE") {
        return {
          success: false,
          error: "Google Play Services not available",
        };
      }

      return {
        success: false,
        error: error.message || "Google Sign-In failed",
      };
    }
  };

  const logout = async () => {
    try {
      // Sign out from Google if signed in and available
      if (isGoogleSignInAvailable && GoogleSignin) {
        try {
          await GoogleSignin.signOut();
        } catch (googleError) {
          // Ignore Google sign-out errors as the user might not be signed in with Google
          console.log("Google sign-out skipped:", googleError.message);
        }
      }

      // Sign out from Firebase
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    isGoogleSignInAvailable,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
