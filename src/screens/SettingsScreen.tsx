import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../theme/ThemeContext';
import { Header } from '../components/common/Header';
import { ClayCard } from '../components/common/ClayCard';
import { ClayButton } from '../components/common/ClayButton';
import { ThemeMode, AppSettings, DEFAULT_SETTINGS } from '../types/settings';
import { settingsStorage } from '../services/storage/settingsStorage';
import { historyStorage } from '../services/storage/historyStorage';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { colors, typography, spacing, borderRadius, themeMode, setThemeMode } = useTheme();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [backendUrl, setBackendUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await settingsStorage.getSettings();
      setSettings(s);
      setBackendUrl(s.customBackendEndpoint || '');
      setApiKey(s.customApiKey || '');
    })();
  }, []);

  const handleToggleAutoSave = async (value: boolean) => {
    const updated = await settingsStorage.updateSettings({ autoSaveToGallery: value });
    setSettings(updated);
  };

  const handleSaveApiConfig = async () => {
    const updated = await settingsStorage.updateSettings({
      customBackendEndpoint: backendUrl.trim() || undefined,
      customApiKey: apiKey.trim() || undefined,
    });
    setSettings(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    Alert.alert('Settings Saved', 'API configuration updated successfully.');
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear All History',
      'This will remove all recorded downloads and cached media files from device storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await historyStorage.clearHistory();
            Alert.alert('Success', 'History and cache cleared.');
          },
        },
      ]
    );
  };

  const downloadPath = `${FileSystem.documentDirectory}downloads/`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Settings" showBack onBack={onBack} />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance / Theme */}
        <ClayCard level="medium" style={{ marginBottom: spacing.md }}>
          <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.sm }]}>
            Appearance
          </Text>

          <View style={styles.themeRow}>
            {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => {
              const isSelected = themeMode === mode;
              const icon = mode === 'system' ? 'hardware-chip-outline' : mode === 'light' ? 'sunny-outline' : 'moon-outline';
              const label = mode === 'system' ? 'System' : mode === 'light' ? 'Light' : 'Dark';
              return (
                <Pressable
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={({ pressed }) => [
                    styles.themeBtn,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.cardSecondary,
                      borderRadius: borderRadius.md,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Ionicons name={icon} size={18} color={isSelected ? '#FFFFFF' : colors.text} style={{ marginBottom: 4 }} />
                  <Text style={[typography.captionBold, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ClayCard>

        {/* Download Preferences */}
        <ClayCard level="medium" style={{ marginBottom: spacing.md }}>
          <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.sm }]}>
            Download Preferences
          </Text>

          <View style={styles.settingItem}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={[typography.bodyBold, { color: colors.text }]}>Save to Device Gallery</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {"Automatically export downloaded videos and photos to your phone's gallery"}
              </Text>
            </View>
            <Switch
              value={settings.autoSaveToGallery}
              onValueChange={handleToggleAutoSave}
              trackColor={{ false: colors.inset, true: colors.primaryLight }}
              thumbColor={settings.autoSaveToGallery ? colors.primary : colors.cardSecondary}
            />
          </View>

          <View style={[styles.settingItem, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: colors.text }]}>Storage Location</Text>
              <Text numberOfLines={1} style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {downloadPath}
              </Text>
            </View>
          </View>
        </ClayCard>

        {/* API & Backend Configuration */}
        <ClayCard level="medium" style={{ marginBottom: spacing.md }}>
          <View style={styles.apiHeaderRow}>
            <Text style={[typography.headline, { color: colors.text }]}>
              Media Retrieval API
            </Text>
            <View style={[styles.optionalTag, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={[typography.captionBold, { color: colors.primary, fontSize: 10 }]}>Configurable</Text>
            </View>
          </View>

          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            For Instagram Reels, Stories, and authenticated X posts, you can connect your private server endpoint or API key.
          </Text>

          <Text style={[typography.captionBold, { color: colors.textSecondary, marginBottom: 4 }]}>
            Custom Backend URL (optional):
          </Text>
          <View
            style={[
              styles.inputBox,
              { backgroundColor: colors.inset, borderRadius: borderRadius.md, borderColor: colors.border },
            ]}
          >
            <TextInput
              value={backendUrl}
              onChangeText={setBackendUrl}
              placeholder="https://your-downloader-api.example.com"
              placeholderTextColor={colors.textMuted}
              style={[typography.body, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={[typography.captionBold, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: 4 }]}>
            API / Access Token (optional):
          </Text>
          <View
            style={[
              styles.inputBox,
              { backgroundColor: colors.inset, borderRadius: borderRadius.md, borderColor: colors.border },
            ]}
          >
            <TextInput
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Bearer token or API key..."
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              style={[typography.body, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <ClayButton
            title={isSaved ? 'Saved!' : 'Save API Settings'}
            onPress={handleSaveApiConfig}
            variant="secondary"
            size="sm"
            style={{ marginTop: spacing.md }}
          />
        </ClayCard>

        {/* Data & Privacy */}
        <ClayCard level="medium" style={{ marginBottom: spacing.md }}>
          <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.sm }]}>
            Data & Privacy
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            ClipDrop stores all history and files exclusively on your device. No user tracking, analytics, or background telemetry are collected.
          </Text>

          <ClayButton
            title="Clear Download History & Cache"
            onPress={handleClearHistory}
            variant="danger"
            size="sm"
            icon={<Ionicons name="trash-outline" size={16} color="#FFFFFF" />}
          />
        </ClayCard>

        {/* About & Version */}
        <ClayCard level="soft" style={{ marginBottom: spacing.xxl }}>
          <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
            <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
            <Text style={[typography.headline, { color: colors.text, marginTop: 6 }]}>
              ClipDrop v1.0.0
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
              Lightweight Social Media Media Downloader
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 8, textAlign: 'center' }]}>
              Built with React Native + Expo • Claymorphism Design System
            </Text>
          </View>
        </ClayCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  apiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  optionalTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inputBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
});
