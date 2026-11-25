let GoogleSignin = null;
let isGoogleSignInAvailable = false;

try {
  GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
  isGoogleSignInAvailable = true;
} catch (error) {
  console.log("Google Sign-In not available:", error?.message);
}

export { GoogleSignin, isGoogleSignInAvailable };
