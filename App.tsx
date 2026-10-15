import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  LogBox,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from '@expo-google-fonts/space-mono';

// Ignore known informational warnings in Expo Go
LogBox.ignoreLogs([
  'Due to changes in Androids permission requirements, Expo Go can no longer provide full access to the media library',
  'SafeAreaView has been deprecated',
]);
import { HomeScreen } from './src/screens/HomeScreen';
import { MediaPreviewScreen } from './src/screens/MediaPreviewScreen';
import { DownloadManagerScreen } from './src/screens/DownloadManagerScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { MediaMetadata, MediaItem } from './src/types/media';

type ScreenState =
  | { name: 'home' }
  | { name: 'preview'; metadata: MediaMetadata }
  | { name: 'download'; metadata: MediaMetadata; selectedItem: MediaItem; customFilename?: string }
  | { name: 'settings' };

const MainNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [currentScreen, setCurrentScreen] = useState<ScreenState>({ name: 'home' });

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {currentScreen.name === 'home' && (
        <HomeScreen
          onNavigateToSettings={() => setCurrentScreen({ name: 'settings' })}
        />
      )}

      {currentScreen.name === 'preview' && (
        <MediaPreviewScreen
          metadata={currentScreen.metadata}
          onBack={() => setCurrentScreen({ name: 'home' })}
          onStartDownload={(item, customFilename) =>
            setCurrentScreen({
              name: 'download',
              metadata: currentScreen.metadata,
              selectedItem: item,
              customFilename,
            })
          }
          onStartBatchDownload={(items, baseFilename) => {
            // Start download with first selected item
            if (items.length > 0) {
              setCurrentScreen({
                name: 'download',
                metadata: currentScreen.metadata,
                selectedItem: items[0],
                customFilename: baseFilename ? `${baseFilename}_1` : undefined,
              });
            }
          }}
        />
      )}

      {currentScreen.name === 'download' && (
        <DownloadManagerScreen
          metadata={currentScreen.metadata}
          selectedItem={currentScreen.selectedItem}
          customFilename={currentScreen.customFilename}
          onBackToHome={() => setCurrentScreen({ name: 'home' })}
        />
      )}

      {currentScreen.name === 'settings' && (
        <SettingsScreen onBack={() => setCurrentScreen({ name: 'home' })} />
      )}
    </SafeAreaView>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
