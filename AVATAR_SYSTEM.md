# Dicebear Avatar System Implementation

## Overview

This document describes the implementation of a customizable avatar system using dicebear for the LetItOut app.

## Features Implemented

### 1. Avatar Component (`components/Avatar.jsx`)

- Renders dicebear avatars using the "lorelei" collection
- Uses SvgXml to display SVG avatars
- Accepts `seed`, `size`, and `style` props
- Memoized for performance

### 2. Avatar Selection Modal (`components/AvatarSelectionModal.jsx`)

- Displays 10 randomly generated avatar options
- Grid layout with selection highlighting
- Cancel and Select buttons
- Generates new random options each time modal opens

### 3. Profile Code System

- Added `profileCode` field to users collection in Firestore
- Initially set to user's email when account is created
- Can be updated when user selects a custom avatar
- Used as seed for dicebear avatar generation

### 4. Profile Page Integration

- Avatar display with edit button
- Edit button opens AvatarSelectionModal
- Updates `profileCode` in Firestore when user selects new avatar
- Shows success/error alerts

### 5. Author Display Integration

- **PostCard Component**: Shows dicebear avatar for non-anonymous posts
- **Post Detail Page**: Shows dicebear avatar in author section
- Fetches author's `profileCode` from Firestore
- Falls back to person icon for anonymous posts

## File Changes

### New Files

1. `components/Avatar.jsx` - Avatar rendering component
2. `components/AvatarSelectionModal.jsx` - Avatar selection modal

### Modified Files

1. `context/AuthContext.jsx`
   - Added `profileCode: email` to createUserDocument function

2. `app/(tabs)/profile.jsx`
   - Imported Avatar and AvatarSelectionModal components
   - Added state for `showAvatarModal` and `profileCode`
   - Added `handleAvatarSelect` function to update Firestore
   - Replaced static avatar with dicebear Avatar component
   - Added edit button with pencil icon
   - Added AvatarSelectionModal at end of return

3. `components/PostCard.jsx`
   - Imported Avatar component
   - Added `authorProfileCode` state
   - Added useEffect to fetch author's profileCode
   - Replaced static avatar with dicebear Avatar component

4. `app/post/[id].jsx`
   - Imported Avatar component
   - Added `authorProfileCode` state
   - Added code to fetch author's profileCode in main useEffect
   - Replaced static avatar with dicebear Avatar component

## Dependencies

- `@dicebear/core`: Core library for avatar generation
- `@dicebear/collection`: Contains avatar styles (lorelei)
- `react-native-svg`: Required to render SVG in React Native

## Usage

### Using Avatar Component

```jsx
import Avatar from "../components/Avatar";

// Basic usage
<Avatar seed={user.email} size={40} />

// With custom style
<Avatar seed={profileCode} size={100} style={{ marginTop: 20 }} />
```

### Opening Avatar Selection Modal

```jsx
import AvatarSelectionModal from "../components/AvatarSelectionModal";

const [showModal, setShowModal] = useState(false);
const [profileCode, setProfileCode] = useState(user.email);

const handleSelect = async (newSeed) => {
   // Update Firestore
   await updateDoc(doc(db, "users", user.uid), {
      profileCode: newSeed,
   });
   setProfileCode(newSeed);
};

<AvatarSelectionModal
   visible={showModal}
   onClose={() => setShowModal(false)}
   onSelect={handleSelect}
   currentSeed={profileCode}
/>;
```

## Data Structure

### User Document in Firestore

```javascript
{
    uid: "user123",
    email: "user@example.com",
    displayName: "John Doe",
    profileCode: "user@example.com", // Initially email, changes when user selects custom avatar
    createdAt: Timestamp,
    updatedAt: Timestamp,
}
```

## Flow

1. **New User Signup**
   - User creates account
   - `profileCode` is set to their email
   - Avatar displays using email as seed

2. **Custom Avatar Selection**
   - User clicks edit button on profile
   - Modal shows 10 random avatar options
   - User selects preferred avatar
   - `profileCode` is updated with random seed
   - Avatar updates throughout app

3. **Avatar Display**
   - PostCard shows author avatar (if not anonymous)
   - Post detail page shows author avatar (if not anonymous)
   - Profile page shows user's avatar
   - All use same Avatar component with appropriate seed

## Future Enhancements

- Add more dicebear collections (adventurer, bottts, etc.)
- Allow users to regenerate random options without selecting
- Add avatar customization options (colors, accessories)
- Cache avatar SVGs for performance
- Add avatar to comments section
