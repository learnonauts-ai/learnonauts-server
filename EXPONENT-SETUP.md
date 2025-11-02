# Learnonauts Expo App - Authentication Setup

To complete the user authentication system, you need to create the corresponding Expo app with login, signup, and password reset screens. Here's a guide to implement them:

## 1. Install Required Dependencies

```bash
npx create-expo-app Learnonauts
cd Learnonauts
npx expo install @react-navigation/native @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated
npx expo install expo-constants expo-linking
npm install axios react-native-dotenv
```

## 2. Environment Configuration

Create a `.env` file in your Expo app root:

```env
API_BASE_URL=http://localhost:8787  # Update for production
```

## 3. Authentication Context

Create an authentication context to manage user state:

`contexts/AuthContext.js`:
```javascript
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: null,
  isLoading: true,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'RESTORE_TOKEN':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
      };
    case 'SIGN_IN':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
      };
    case 'SIGN_OUT':
      return {
        ...state,
        user: null,
        token: null,
      };
    default:
      return state;
  }
}

function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const bootstrapAsync = async () => {
      let user = null;
      let token = null;

      try {
        token = await AsyncStorage.getItem('userToken');
        if (token) {
          // Verify token is still valid by fetching user profile
          const response = await axios.get(`${process.env.API_BASE_URL}/api/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          user = response.data.user;
        }
      } catch (e) {
        // Error occurred, possibly token is invalid
      }

      dispatch({ type: 'RESTORE_TOKEN', payload: { user, token } });
    };

    bootstrapAsync();
  }, []);

  const signIn = async (email, password) => {
    try {
      const response = await axios.post(`${process.env.API_BASE_URL}/api/login`, {
        email,
        password,
      });

      const { user, token } = response.data;

      await AsyncStorage.setItem('userToken', token);

      dispatch({ type: 'SIGN_IN', payload: { user, token } });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const signUp = async (email, password, displayName, username) => {
    try {
      const response = await axios.post(`${process.env.API_BASE_URL}/api/register`, {
        email,
        password,
        displayName,
        username,
      });

      const { user, token } = response.data;

      await AsyncStorage.setItem('userToken', token);

      dispatch({ type: 'SIGN_IN', payload: { user, token } });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('userToken');
    dispatch({ type: 'SIGN_OUT' });
  };

  const forgotPassword = async (email) => {
    try {
      await axios.post(`${process.env.API_BASE_URL}/api/forgot-password`, {
        email,
      });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Request failed' 
      };
    }
  };

  const resetPassword = async (resetKey, newPassword) => {
    try {
      await axios.post(`${process.env.API_BASE_URL}/api/reset-password`, {
        resetKey,
        newPassword,
      });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Password reset failed' 
      };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(`${process.env.API_BASE_URL}/api/me`, profileData, {
        headers: { Authorization: `Bearer ${state.token}` }
      });

      dispatch({ type: 'SIGN_IN', payload: { user: response.data.user, token: state.token } });
      return { success: true, user: response.data.user };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Update failed' 
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        forgotPassword,
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthProvider, useAuth };
```

## 4. Authentication Screens

### Login Screen
`screens/LoginScreen.js`:
```javascript
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Login Error', result.error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <Button 
        title={loading ? "Logging in..." : "Login"} 
        onPress={handleLogin} 
        disabled={loading}
      />
      
      <TouchableOpacity 
        onPress={() => navigation.navigate('ForgotPassword')}
        style={styles.link}
      >
        <Text style={styles.linkText}>Forgot Password?</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => navigation.replace('Signup')}
        style={styles.link}
      >
        <Text style={styles.linkText}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  link: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
  },
});

export default LoginScreen;
```

### Signup Screen
`screens/SignupScreen.js`:
```javascript
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

function SignupScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signUp } = useAuth();

  const handleSignup = async () => {
    if (!email || !password || !displayName || !username) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await signUp(email, password, displayName, username);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Signup Error', result.error);
    } else {
      Alert.alert(
        'Success', 
        'Account created! Please check your email to verify your account.', 
        [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Display Name"
        value={displayName}
        onChangeText={setDisplayName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Username (@handle)"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <Button 
        title={loading ? "Creating..." : "Sign Up"} 
        onPress={handleSignup} 
        disabled={loading}
      />
      
      <TouchableOpacity 
        onPress={() => navigation.replace('Login')}
        style={styles.link}
      >
        <Text style={styles.linkText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  link: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
  },
});

export default SignupScreen;
```

### Forgot Password Screen
`screens/ForgotPasswordScreen.js`:
```javascript
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { forgotPassword } = useAuth();

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);

    if (result.success) {
      Alert.alert(
        'Success', 
        'Password reset instructions have been sent to your email.', 
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    } else {
      Alert.alert('Error', result.error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>
        Enter your email and we'll send you a link to reset your password
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <Button 
        title={loading ? "Sending..." : "Send Reset Link"} 
        onPress={handleForgotPassword} 
        disabled={loading}
      />
      
      <TouchableOpacity 
        onPress={() => navigation.goBack()}
        style={styles.link}
      >
        <Text style={styles.linkText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  link: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
  },
});

export default ForgotPasswordScreen;
```

### App Navigation Setup

`App.js`:
```javascript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import HomeScreen from './screens/HomeScreen'; // Your main app screen

const Stack = createStackNavigator();

function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    // Show a loading screen while checking for existing session
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          // User is logged in
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ headerShown: false }} 
          />
        ) : (
          // User is not logged in
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="Signup" 
              component={SignupScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="ForgotPassword" 
              component={ForgotPasswordScreen} 
              options={{ headerShown: false }} 
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
```

## 5. Session Management

The authentication system maintains the session as long as the JWT token is valid (30 days by default). The session persists across app restarts because the token is stored in AsyncStorage. The user must explicitly log out to clear the session.

To implement logout functionality, add this button to your main app screen:

```javascript
import { useAuth } from '../contexts/AuthContext';

// Inside your component
const { signOut } = useAuth();

// In your JSX
<Button title="Logout" onPress={signOut} />
```

## 6. API Security

All API requests to endpoints like `/api/gemini` require authentication. The server will reject requests without a valid JWT token.

This completes the full authentication system with both server-side and client-side components!