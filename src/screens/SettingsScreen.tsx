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

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { colors, typography, spacing, borderRadius, themeMode, setThemeMode } = useTheme();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [backendUrl, setBackendUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);

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

  const handleTestConnection = async () => {
    const trimmed = backendUrl.trim();
    if (!trimmed) {
      Alert.alert('Backend URL Required', 'Please enter a backend server URL to test (e.g. http://192.168.88.12:8000).');
      return;
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      Alert.alert('Invalid URL', 'Backend URL must start with http:// or https://');
      return;
    }

    setIsTesting(true);
    setTestStatus(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const targetEndpoint = `${trimmed.replace(/\/$/, '')}/health`;
      const res = await fetch(targetEndpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const engineStatus = data.ytdlp_available ? 'yt-dlp Ready' : 'Online';

      setTestStatus({
        success: true,
        message: `Connected successfully! (${engineStatus} • FFmpeg: ${data.ffmpeg_available ? 'Yes' : 'No'})`,
      });
    } catch (err: any) {
      setTestStatus({
        success: false,
        message:
          err.name === 'AbortError'
            ? 'Connection timed out. Check that "npm run backend" is running on your PC.'
            : `Connection failed: ${err.message || 'Server unreachable'}. If using a phone, use your PC's Wi-Fi IP (http://192.168.88.12:8000) instead of localhost.`,
      });
    } finally {
      clearTimeout(timeout);
      setIsTesting(false);
    }
  };

  const handleSaveApiConfig = async () => {
    const trimmed = backendUrl.trim();
    if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      Alert.alert('Invalid URL', 'Backend URL must start with http:// or https:// (e.g. http://localhost:3000)');
      return;
    }

    const updated = await settingsStorage.updateSettings({
      customBackendEndpoint: trimmed || undefined,
      customApiKey: apiKey.trim() || undefined,
    });
    setSettings(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    Alert.alert('Settings Saved', 'API backend configuration updated successfully.');
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

        {/* Backend & API Configuration */}
        <ClayCard level="medium" style={{ marginBottom: spacing.md }}>
          <View style={styles.apiHeaderRow}>
            <Text style={[typography.headline, { color: colors.text }]}>
              Media Retrieval Backend
            </Text>
            <View style={[styles.optionalTag, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={[typography.captionBold, { color: colors.primary, fontSize: 10 }]}>Required for IG</Text>
            </View>
          </View>

          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            ChimtuDrop connects to your free FastAPI + yt-dlp backend. Supports Instagram, YouTube, X (Twitter), Facebook, and Direct media. No paid API keys or subscriptions required.
          </Text>

          <Text style={[typography.captionBold, { color: colors.textSecondary, marginBottom: 4 }]}>
            Backend Server URL:
          </Text>
          <View
            style={[
              styles.inputBox,
              { backgroundColor: colors.inset, borderRadius: borderRadius.md, borderColor: colors.border },
            ]}
          >
            <TextInput
              value={backendUrl}
              onChangeText={(val) => {
                setBackendUrl(val);
                setTestStatus(null);
              }}
              placeholder="http://localhost:8000 or https://your-app.onrender.com"
              placeholderTextColor={colors.textMuted}
              style={[typography.body, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Quick preset buttons */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: spacing.sm }}>
            <Pressable
              onPress={() => {
                setBackendUrl('http://192.168.88.12:8000');
                setTestStatus(null);
              }}
              style={({ pressed }) => [
                styles.presetBtn,
                { backgroundColor: colors.primary, borderColor: colors.primary, borderRadius: borderRadius.sm },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[typography.captionBold, { color: '#FFFFFF', fontSize: 11 }]}>
                📱 Phone Wi-Fi (192.168.88.12)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setBackendUrl('http://localhost:8000');
                setTestStatus(null);
              }}
              style={({ pressed }) => [
                styles.presetBtn,
                { backgroundColor: colors.cardSecondary, borderColor: colors.border, borderRadius: borderRadius.sm },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[typography.captionBold, { color: colors.textSecondary, fontSize: 11 }]}>
                💻 Web Browser (Localhost)
              </Text>
            </Pressable>
          </View>

          {/* Connection Test Feedback */}
          {testStatus && (
            <View
              style={[
                styles.testStatusBox,
                {
                  backgroundColor: testStatus.success ? '#E8F5E9' : '#FFEBEE',
                  borderColor: testStatus.success ? '#4CAF50' : '#F44336',
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Ionicons
                name={testStatus.success ? 'checkmark-circle' : 'alert-circle'}
                size={16}
                color={testStatus.success ? '#2E7D32' : '#C62828'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  typography.caption,
                  { color: testStatus.success ? '#2E7D32' : '#C62828', flex: 1 },
                ]}
              >
                {testStatus.message}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.sm }}>
            <ClayButton
              title={isTesting ? 'Testing...' : 'Test Connection'}
              onPress={handleTestConnection}
              variant="ghost"
              size="sm"
              loading={isTesting}
              style={{ flex: 1 }}
              icon={<Ionicons name="flash-outline" size={15} color={colors.primary} />}
            />
            <ClayButton
              title={isSaved ? 'Saved!' : 'Save Settings'}
              onPress={handleSaveApiConfig}
              variant="secondary"
              size="sm"
              style={{ flex: 1 }}
            />
          </View>

          {/* Optional Bearer token for protected backends */}
          <Text style={[typography.captionBold, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: 4 }]}>
            Authorization Token (optional):
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
              placeholder="Bearer token (if your backend requires auth)..."
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              style={[typography.body, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
            Leave blank if your local backend does not require a custom Bearer token.
          </Text>
        </ClayCard>

        {/* Data & Privacy */}
        <ClayCard level="medium" style={{ marginBottom: spacing.md }}>
          <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.sm }]}>
            Data & Privacy
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            ChimtuDrop saves media directly to your phone gallery. No browsing history, tracking, analytics, or background telemetry are collected.
          </Text>
        </ClayCard>

        {/* About & Version */}
        <ClayCard level="soft" style={{ marginBottom: spacing.xxl }}>
          <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
            <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
            <Text style={[typography.headline, { color: colors.text, marginTop: 6 }]}>
              ChimtuDrop v1.0.0
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
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  testStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  },
});
