import React from 'react';
import { View, Text, TouchableOpacity, Pressable, Modal, Platform, StatusBar } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { isMobile, isDesktop, fs, spacing, safeAreaTop } from '../utils/responsive';

/**
 * TenantHeader - Unified header component for Tenant screens
 * 
 * Features:
 * - Screen title and subtitle/date (left)
 * - Theme toggle and logout buttons (right)
 * - Proper safe area handling
 * - Consistent spacing and touch targets
 */
export default function TenantHeader({ 
  title = 'Home',
  subtitle = null,
  onLogout,
  onSettingsPress,
  isDark,
  onThemeToggle,
}) {
  const { colors } = useTheme();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [logoutConfirmationVisible, setLogoutConfirmationVisible] = useState(false);

  const topInset =
  Platform.OS === 'ios'
    ? safeAreaTop
    : Platform.OS === 'android'
    ? StatusBar.currentHeight || 0
    : 0;

  const headerHeight = isMobile ? 56 : 64;
  const buttonSize = 40;
  const iconSize = 22;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.cardBorder,
        paddingTop: topInset,
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
          android: {
            elevation: 2,
          },
          web: {
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          },
        }),
      }}
    >
      <View
        style={{
          height: headerHeight,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
        }}
      >
        {/* Left Section: Title and Subtitle */}
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            style={{
              fontSize: fs(20),
              fontWeight: '800',
              color: colors.text,
              lineHeight: fs(24),
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={{
                fontSize: fs(12),
                fontWeight: '500',
                color: colors.textMuted,
                lineHeight: fs(16),
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {/* Profile menu */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={onThemeToggle}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            style={{
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={19} color={isDark ? '#fbbf24' : colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setProfileMenuVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open profile menu"
            accessibilityState={{ expanded: profileMenuVisible }}
            style={{
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="person-circle-outline" size={25} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={profileMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileMenuVisible(false)}
      >
        <View style={{ flex: 1, alignItems: 'flex-end', paddingTop: topInset + headerHeight + 6, paddingHorizontal: 14 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close profile menu"
            onPress={() => setProfileMenuVisible(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.18)' }}
          />
          <View style={{
            width: 248,
            borderRadius: 16,
            padding: 8,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18 },
              android: { elevation: 8 },
              web: { boxShadow: '0 12px 32px rgba(15, 23, 42, 0.2)' },
            }),
          }}>
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, textTransform: 'uppercase' }}>
              Profile
            </Text>

            <TouchableOpacity
              onPress={() => {
                setProfileMenuVisible(false);
                onSettingsPress?.();
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 11 }}
            >
              <Ionicons name="settings-outline" size={19} color={colors.textSecondary} />
              <Text style={{ flex: 1, marginLeft: 12, color: colors.text, fontSize: 14, fontWeight: '600' }}>Settings</Text>
            </TouchableOpacity>

            {onLogout && (
              <TouchableOpacity
                onPress={() => {
                  setProfileMenuVisible(false);
                  setLogoutConfirmationVisible(true);
                }}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Log out"
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 11, marginTop: 2 }}
              >
                <Ionicons name="log-out-outline" size={19} color={colors.danger} />
                <Text style={{ marginLeft: 12, color: colors.danger, fontSize: 14, fontWeight: '600' }}>Log out</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={logoutConfirmationVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutConfirmationVisible(false)}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15, 23, 42, 0.42)' }}>
          <View style={{
            width: '100%',
            maxWidth: 360,
            padding: 22,
            borderRadius: 18,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18 },
              android: { elevation: 8 },
              web: { boxShadow: '0 12px 32px rgba(15, 23, 42, 0.2)' },
            }),
          }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.dangerBg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Ionicons name="log-out-outline" size={22} color={colors.dangerText} />
            </View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Log out?</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 7 }}>
              Are you sure you want to log out of your tenant account?
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <TouchableOpacity
                onPress={() => setLogoutConfirmationVisible(false)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Cancel logout"
                style={{ minHeight: 42, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 11, backgroundColor: colors.bg }}
              >
                <Text style={{ color: '#4A4640', fontSize: 14, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setLogoutConfirmationVisible(false);
                  onLogout?.();
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Confirm logout"
                style={{ minHeight: 42, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 11, backgroundColor: colors.dangerText }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Log out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
