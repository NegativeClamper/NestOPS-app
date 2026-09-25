import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

export default function RegisterScreen({ navigation }: any) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const register = useAuthStore(state => state.register);

  const handleRegister = async () => {
    if (!firstName || !username || !password) {
      Alert.alert('Error', 'First Name, Username, and Password are required.');
      return;
    }
    
    setIsLoading(true);
    try {
      await register({
        first_name: firstName,
        last_name: lastName,
        phone,
        username,
        password,
      });
      // App navigates automatically since isAuthenticated becomes true
    } catch (error: any) {
      const msg = error.response?.data?.detail 
        || error.response?.data?.username?.[0] 
        || 'Registration failed. Please check your details.';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.screen} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to manage your hostels independently</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="John"
          />
          <Input
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Doe"
          />
          <Input
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="9999999999"
            keyboardType="phone-pad"
          />
          <Input
            label="Username / Email"
            value={username}
            onChangeText={setUsername}
            placeholder="john@example.com"
            autoCapitalize="none"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />

          <Button
            title={isLoading ? 'Signing up...' : 'Sign Up'}
            onPress={handleRegister}
            loading={isLoading}
            fullWidth
            style={{ marginTop: Spacing[4] }}
          />
          
          <TouchableOpacity 
            style={styles.linkBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.linkText}>Already have an account? Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing[6],
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    marginBottom: Spacing[8],
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing[2],
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  form: {
    gap: Spacing[4],
  },
  linkBtn: {
    alignItems: 'center',
    padding: Spacing[3],
    marginTop: Spacing[2],
  },
  linkText: {
    color: Colors.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
});
