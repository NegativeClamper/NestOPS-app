import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Colors, Typography } from '../theme';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';

// Dashboard
import DashboardScreen from '../screens/dashboard/DashboardScreen';

// Residents
import ResidentListScreen from '../screens/residents/ResidentListScreen';
import ResidentDetailScreen from '../screens/residents/ResidentDetailScreen';
import ResidentCreateScreen from '../screens/residents/ResidentCreateScreen';
import ResidentEditScreen from '../screens/residents/ResidentEditScreen';

// Rooms
import RoomListScreen from '../screens/rooms/RoomListScreen';
import RoomDetailScreen from '../screens/rooms/RoomDetailScreen';
import RoomCreateScreen from '../screens/rooms/RoomCreateScreen';

// Payments / Fees
import DuesListScreen from '../screens/fees/DuesListScreen';
import RecordPaymentScreen from '../screens/fees/RecordPaymentScreen';
import PaymentListScreen from '../screens/fees/PaymentListScreen';

// Expenses
import ExpenseListScreen from '../screens/expenses/ExpenseListScreen';
import AddExpenseScreen from '../screens/expenses/AddExpenseScreen';

// Settings
import SettingsScreen from '../screens/settings/SettingsScreen';

// ─── Stacks ──────────────────────────────────────────────────────────────────
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Dashboard: '📊',
  Residents: '👤',
  Rooms: '🏠',
  Payments: '💰',
  Expenses: '📤',
  Settings: '⚙️',
};

const stackScreenOptions = {
  headerStyle: { backgroundColor: Colors.surface },
  headerTintColor: Colors.primary,
  headerTitleStyle: {
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.base,
  },
};

// ─── Individual Tab Stacks ────────────────────────────────────────────────────

function ResidentsStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="ResidentList" component={ResidentListScreen} options={{ title: 'Residents' }} />
      <Stack.Screen name="ResidentDetail" component={ResidentDetailScreen} options={{ title: 'Resident' }} />
      <Stack.Screen name="ResidentCreate" component={ResidentCreateScreen} options={{ title: 'Add Resident' }} />
      <Stack.Screen name="ResidentEdit" component={ResidentEditScreen} options={{ title: 'Edit Resident' }} />
    </Stack.Navigator>
  );
}

function RoomsStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="RoomList" component={RoomListScreen} options={{ title: 'Rooms' }} />
      <Stack.Screen name="RoomDetail" component={RoomDetailScreen} options={{ title: 'Room Detail' }} />
      <Stack.Screen name="RoomCreate" component={RoomCreateScreen} options={{ title: 'Add Room' }} />
      {/* RoomEdit — reuse RoomCreate with prefilled props in a future sprint */}
    </Stack.Navigator>
  );
}

function PaymentsStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="PaymentList"
        component={PaymentListScreen}
        options={({ navigation }) => ({
          title: 'Payments',
          headerRight: () => (
            <Text
              style={{ color: Colors.primary, fontSize: 13, fontWeight: '600', marginRight: 4 }}
              onPress={() => navigation.navigate('DuesList')}
            >
              Dues ›
            </Text>
          ),
        })}
      />
      <Stack.Screen name="DuesList" component={DuesListScreen} options={{ title: 'Pending Dues' }} />
      <Stack.Screen name="RecordPayment" component={RecordPaymentScreen} options={{ title: 'Record Payment' }} />
    </Stack.Navigator>
  );
}

function ExpensesStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="ExpenseList" component={ExpenseListScreen} options={{ title: 'Expenses' }} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Add Expense' }} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
}

// ─── App Tabs ─────────────────────────────────────────────────────────────────
function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
            {TAB_ICONS[route.name]}
          </Text>
        ),
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          backgroundColor: Colors.tabBackground,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: Typography.fontWeight.medium as any,
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerShown: true,
          headerTitle: 'HostelHQ',
          headerStyle: { backgroundColor: Colors.primary },
          headerTitleStyle: { color: Colors.white, fontWeight: Typography.fontWeight.bold as any },
        }}
      />
      <Tab.Screen name="Residents" component={ResidentsStack} />
      <Tab.Screen name="Rooms" component={RoomsStack} />
      <Tab.Screen name="Payments" component={PaymentsStack} />
      <Tab.Screen name="Expenses" component={ExpensesStack} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────────────
export default function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="App" component={AppTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
