import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Text,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTheme } from '../../theme/ThemeContext';

interface MediaVideoPreviewProps {
  previewUrl?: string;
  thumbnailUrl?: string;
  mediaType?: 'video' | 'image' | 'carousel';
  durationSeconds?: number;
  aspectRatio?: number;
}

export const MediaVideoPreview: React.FC<MediaVideoPreviewProps> = ({
  previewUrl,
  thumbnailUrl,
  mediaType = 'video',
  durationSeconds,
  aspectRatio = 16 / 9,
}) => {
  const { colors, borderRadius, typography } = useTheme();

  const [hasVideoError, setHasVideoError] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(durationSeconds || 0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const isScrubbingRef = useRef(false);
  const trackRef = useRef<View>(null);
  const trackPageXRef = useRef(0);
  const trackWidthRef = useRef(1);

  // Playable video URL check
  const isPlayable = Boolean(
    mediaType === 'video' &&
    previewUrl &&
    previewUrl.startsWith('http') &&
    !hasVideoError
  );

  // Setup expo-video player with loop and high-frequency time updates
  const player = useVideoPlayer(isPlayable ? previewUrl! : null, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.2;
  });

  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const effectiveDuration = Math.max(
    videoDuration,
    durationSeconds || 0,
    player?.duration || 0
  );

  // Controls auto-hide after 3.5s when playing and not scrubbing
  useEffect(() => {
    if (!isPlaying || isScrubbing || !showControls) return;
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, [isPlaying, isScrubbing, showControls]);

  // Player listeners
  useEffect(() => {
    if (!player) return;

    const playSub = player.addListener('playingChange', (event) => {
      setIsPlaying(event.isPlaying);
    });

    const timeSub = player.addListener('timeUpdate', (event) => {
      if (!isScrubbingRef.current) {
        setCurrentTime(event.currentTime);
      }
      if (player.duration && player.duration > 0 && (!videoDuration || videoDuration <= 0)) {
        setVideoDuration(player.duration);
      }
    });

    const sourceSub = player.addListener('sourceLoad', (event) => {
      if (event.duration && event.duration > 0) {
        setVideoDuration(event.duration);
      }
    });

    const errorSub = player.addListener('statusChange', (event) => {
      if (event.status === 'error') {
        setHasVideoError(true);
      }
    });

    return () => {
      playSub.remove();
      timeSub.remove();
      sourceSub.remove();
      errorSub.remove();
    };
  }, [player, videoDuration]);

  const togglePlayback = () => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) {
      p.pause();
    } else {
      p.play();
    }
    setShowControls(true);
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '00:00';
    const total = Math.floor(secs);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Measure scrubber track dimensions
  const updateTrackMeasurement = useCallback(() => {
    trackRef.current?.measureInWindow((x, _y, width) => {
      if (x !== undefined && x > 0) trackPageXRef.current = x;
      if (width && width > 0) trackWidthRef.current = width;
    });
  }, []);

  const handleSeekFromPageX = useCallback(
    (pageX: number) => {
      if (trackWidthRef.current <= 0 || effectiveDuration <= 0) return;
      const relativeX = pageX - trackPageXRef.current;
      const ratio = Math.max(0, Math.min(1, relativeX / trackWidthRef.current));
      const targetTime = ratio * effectiveDuration;

      setScrubTime(targetTime);
      setCurrentTime(targetTime);

      const p = playerRef.current;
      if (p) {
        p.currentTime = targetTime;
      }
    },
    [effectiveDuration]
  );

  const onScrubberGrant = (e: GestureResponderEvent) => {
    isScrubbingRef.current = true;
    setIsScrubbing(true);
    setShowControls(true);
    updateTrackMeasurement();
    handleSeekFromPageX(e.nativeEvent.pageX);
  };

  const onScrubberMove = (e: GestureResponderEvent) => {
    handleSeekFromPageX(e.nativeEvent.pageX);
  };

  const onScrubberRelease = (e: GestureResponderEvent) => {
    handleSeekFromPageX(e.nativeEvent.pageX);
    isScrubbingRef.current = false;
    setIsScrubbing(false);
  };

  const onScrubberTerminate = () => {
    isScrubbingRef.current = false;
    setIsScrubbing(false);
  };

  const isControlsVisible = !isPlaying || isScrubbing || showControls;
  const displayTime = isScrubbing ? scrubTime : currentTime;
  const progressPercent =
    effectiveDuration > 0
      ? Math.max(0, Math.min(1, displayTime / effectiveDuration)) * 100
      : 0;

  // Case 1: Real Playable Video Stream with custom controls (Only play/pause and draggable scrubber line, no fullscreen)
  if (isPlayable && player) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: '#0A0812',
            borderRadius: borderRadius.lg,
            aspectRatio: Math.min(16 / 9, Math.max(9 / 16, aspectRatio)),
          },
        ]}
      >
        <VideoView
          style={[styles.fill, { borderRadius: borderRadius.lg }]}
          player={player}
          contentFit="contain"
          nativeControls={false}
          fullscreenOptions={{ enable: false }}
        />

        {/* Video touch area to toggle controls / play-pause */}
        <Pressable
          style={styles.touchOverlay}
          onPress={() => {
            if (isControlsVisible) {
              togglePlayback();
            } else {
              setShowControls(true);
            }
          }}
        >
          {/* Center Play / Pause Button */}
          {isControlsVisible && (
            <View style={styles.centerControlWrapper}>
              <Pressable
                onPress={togglePlayback}
                style={styles.centerPlayButton}
                hitSlop={16}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={32}
                  color="#FFFFFF"
                  style={isPlaying ? undefined : { marginLeft: 3 }}
                />
              </Pressable>
            </View>
          )}

          {/* Bottom Custom Bar: Current Time, Interactive Duration Scrubber, Total Duration (No Fullscreen, No Extra Buttons) */}
          {isControlsVisible && (
            <View
              style={styles.bottomBarContainer}
              // Prevent parent pressable from triggering play/pause when interacting with the bar
              onStartShouldSetResponder={() => true}
            >
              {/* Current Elapsed Time */}
              <Text style={[typography.captionBold, styles.timeText]}>
                {formatTime(displayTime)}
              </Text>

              {/* Interactive Duration Scrubber Line (Draggable Forward/Backward) */}
              <View
                style={styles.scrubberTouchableZone}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={onScrubberGrant}
                onResponderMove={onScrubberMove}
                onResponderRelease={onScrubberRelease}
                onResponderTerminate={onScrubberTerminate}
              >
                <View
                  ref={trackRef}
                  onLayout={updateTrackMeasurement}
                  style={styles.trackBackground}
                >
                  <View
                    style={[
                      styles.trackProgress,
                      { width: `${progressPercent}%`, backgroundColor: colors.primary },
                    ]}
                  />
                  <View
                    style={[
                      styles.trackThumb,
                      { left: `${progressPercent}%` },
                    ]}
                  />
                </View>
              </View>

              {/* Total Duration Time */}
              <Text style={[typography.captionBold, styles.timeText]}>
                {formatTime(effectiveDuration)}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    );
  }

  // Case 2: Real Thumbnail Fallback (No fake video box, no fake play button)
  if (thumbnailUrl && !hasImageError) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.cardSecondary,
            borderRadius: borderRadius.lg,
            aspectRatio: Math.min(16 / 9, Math.max(9 / 16, aspectRatio)),
          },
        ]}
      >
        <Image
          source={{ uri: thumbnailUrl }}
          style={[styles.fill, { borderRadius: borderRadius.lg }]}
          resizeMode="cover"
          onLoadStart={() => setIsImageLoading(true)}
          onLoadEnd={() => setIsImageLoading(false)}
          onError={() => setHasImageError(true)}
        />

        {isImageLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {durationSeconds && durationSeconds > 0 ? (
          <View style={styles.durationBadge}>
            <Text style={[typography.captionBold, { color: '#FFFFFF', fontSize: 11 }]}>
              {formatTime(durationSeconds)}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  // Case 3: No valid video or thumbnail exists -> Clean compact information, no fake black box
  return null;
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  touchOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  centerControlWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPlayButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(15, 12, 28, 0.75)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(10, 8, 20, 0.85)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    minWidth: 42,
    textAlign: 'center',
  },
  scrubberTouchableZone: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  trackBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  trackProgress: {
    height: '100%',
    borderRadius: 2,
  },
  trackThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    marginLeft: -7,
    top: -5,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
});
