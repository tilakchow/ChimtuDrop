import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { MediaPreviewScreen } from './src/screens/MediaPreviewScreen';
import { DownloadManagerScreen } from './src/screens/DownloadManagerScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { MediaMetadata, MediaItem } from './src/types/media';
import { DownloadItem } from './src/types/download';

type ScreenState =
  | { name: 'home' }
  | { name: 'preview'; metadata: MediaMetadata }
  | { name: 'download'; metadata: MediaMetadata; selectedItem: MediaItem; customFilename?: string }
  | { name: 'history' }
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
          paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight || 24 : 0,
        },
      ]}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {currentScreen.name === 'home' && (
        <HomeScreen
          onMediaFetched={(metadata) => setCurrentScreen({ name: 'preview', metadata })}
          onNavigateToHistory={() => setCurrentScreen({ name: 'history' })}
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
          onNavigateToHistory={() => setCurrentScreen({ name: 'history' })}
        />
      )}

      {currentScreen.name === 'history' && (
        <HistoryScreen
          onBack={() => setCurrentScreen({ name: 'home' })}
          onSelectItem={(item: DownloadItem) => {
            // Optional: View completed item in download manager or preview
          }}
        />
      )}

      {currentScreen.name === 'settings' && (
        <SettingsScreen onBack={() => setCurrentScreen({ name: 'home' })} />
      )}
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <MainNavigator />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
