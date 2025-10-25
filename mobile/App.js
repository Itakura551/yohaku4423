import * as React from 'react';
import {
  StyleSheet,
  View,
  Text,
  AppState,
  Animated,
  PanResponder,
  TouchableOpacity,
  Dimensions,
  Easing,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import videoSource from './videoSource';

export default function App() {
  const videoRef = React.useRef(null);
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;
  const overlayVisible = React.useRef(false);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const timerOpacity = React.useRef(new Animated.Value(0)).current;
  const [timerVisible, setTimerVisible] = React.useState(false);

  // Down-swipe overlay (slide from top)
  const SCREEN_HEIGHT_LOCAL = Dimensions.get('window').height;
  const downOpacity = React.useRef(new Animated.Value(0)).current;
  const downTranslate = React.useRef(new Animated.Value(-SCREEN_HEIGHT_LOCAL)).current;
  const [downVisible, setDownVisible] = React.useState(false);

  const showTimer = React.useCallback(() => {
    setTimerVisible(true);
    Animated.timing(timerOpacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [timerOpacity]);

  const hideTimer = React.useCallback(() => {
    Animated.timing(timerOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setTimerVisible(false);
    });
  }, [timerOpacity]);

  // Down-swipe screen show/hide
  const showDownScreen = React.useCallback(() => {
    setDownVisible(true);
    Animated.parallel([
      Animated.timing(downOpacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(downTranslate, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [downOpacity, downTranslate]);

  const hideDownScreen = React.useCallback(() => {
    Animated.parallel([
      Animated.timing(downOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(downTranslate, {
        toValue: -SCREEN_HEIGHT_LOCAL,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setDownVisible(false);
    });
  }, [downOpacity, downTranslate]);

  React.useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      const video = videoRef.current;
      try {
        if (!video) return;
        if (nextState === 'active') {
          if (isPlaying) await video.playAsync();
        } else {
          await video.pauseAsync();
        }
      } catch (e) {
        // ignore
      }
    });
    return () => sub.remove();
  }, [isPlaying]);

  const showOverlay = React.useCallback(() => {
    if (overlayVisible.current) return;
    overlayVisible.current = true;
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [overlayOpacity]);

  const hideOverlay = React.useCallback(() => {
    if (!overlayVisible.current) return;
    overlayVisible.current = false;
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [overlayOpacity]);

  const pan = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 12,
      onPanResponderMove: (_, g) => {
        // Downward swipe opens the specified screen
        if (!downVisible && g.dy > 28) {
          showDownScreen();
          return;
        }
        // Upward swipe closes the down screen
        if (downVisible && g.dy < -28) {
          hideDownScreen();
          return;
        }
        // Existing overlay: respond only to upward swipe to show controls
        if (!downVisible && g.dy < -12) {
          showOverlay();
        }
      },
      onPanResponderRelease: (_, g) => {
        if (!downVisible && g.dy < -20) {
          showOverlay();
        }
        if (downVisible && g.dy < -26) {
          hideDownScreen();
        }
      },
    })
  ).current;

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const status = await video.getStatusAsync();
      if (status.isPlaying) {
        await video.pauseAsync();
        setIsPlaying(false);
      } else {
        await video.playAsync();
        setIsPlaying(true);
      }
    } catch (e) {
      // ignore
    }
  };

  const seek = async (deltaMs) => {
    const v = videoRef.current;
    if (!v) return;
    try {
      const s = await v.getStatusAsync();
      const next = Math.max(0, (s.positionMillis || 0) + deltaMs);
      await v.setPositionAsync(next);
    } catch (e) {
      // ignore
    }
  };

  return (
    <View style={styles.container} {...pan.panHandlers}>
      <Video
        ref={videoRef}
        style={styles.video}
        source={videoSource}
        resizeMode={ResizeMode.COVER}
        isMuted
        isLooping
        shouldPlay
        onPlaybackStatusUpdate={(s) => setIsPlaying(!!s.isPlaying)}
      />
      <Text style={styles.brand}>Yohaku</Text>

      {/* 影＋操作UI */}
      <Animated.View style={[styles.overlayWrap, { opacity: overlayOpacity }, (timerVisible || downVisible) && { display: 'none' }]}>

        {/* 画面全体のグラデーション影 */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.20)', 'rgba(0,0,0,0.20)', 'rgba(0,0,0,0.0)']}
          locations={[0, 0.58, 0.78, 1]}
          style={styles.overlayGradient}
        />

        {/* アイコン行用の下部影 */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.0)']}
          locations={[0, 1]}
          style={styles.bottomShadow}
        />

        {/* 再生コントロール（中央） */}
        <View style={[styles.controlsRow, timerVisible && { display: 'none' }]}>
          <TouchableOpacity style={styles.sideButton} onPress={() => seek(-10000)}>
            <Ionicons name="play-skip-back" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.playButton} onPress={togglePlay}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={30} color="#fff" style={styles.iconShadow} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideButton} onPress={() => seek(10000)}>
            <Ionicons name="play-skip-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* 下部の小アイコン群 */}
        <View style={[styles.bottomRow, timerVisible && { display: 'none' }]}>
          <TouchableOpacity style={styles.smallCircle}>
            <Ionicons name="search" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallCircle} onPress={showTimer}>
            <Ionicons name="time-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallCircle}>
            <Ionicons name="list" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallCircle}>
            <Ionicons name="heart-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>
      {downVisible && (
        <Animated.View style={[styles.downOverlay, { opacity: downOpacity, transform: [{ translateY: downTranslate }] }]}>
          <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.45)']} locations={[0, 1]} style={StyleSheet.absoluteFillObject} />
          <View style={styles.downHeader}>
            <Text style={styles.downTitle}>サウンドミキサー</Text>
            <TouchableOpacity style={styles.downClose} onPress={hideDownScreen}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
      {timerVisible && (
        <Animated.View style={[styles.timerOverlayWrap, { opacity: timerOpacity }]}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0.48)', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0.0)']}
            locations={[0, 0.50, 0.92, 1]}
            style={styles.timerOverlayGradient}
          />
          {/* タイマー用ボトム帯グラデーション（影帯） */}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.0)']}
            locations={[0, 0.2, 0.8, 1]}
            style={styles.timerBottomBand}
          />

          <View style={styles.timerSectionDividerOverlay} />
          <Text style={[styles.timerTitle, styles.timerTitleOverlay]}>アラーム</Text>
          <TouchableOpacity style={styles.timerCloseOverlay} onPress={hideTimer}>
            <Ionicons name="close" size={20} color="#fff" style={styles.iconShadow} />
          </TouchableOpacity>
          <View style={styles.timerIconsRowOverlay}>
            <TouchableOpacity style={styles.timerIconCircle}>
              <Ionicons name="timer-outline" size={22} color="#fff" style={styles.iconShadow} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.timerIconCircle}>
              <Ionicons name="book-outline" size={22} color="#fff" style={styles.iconShadow} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.timerIconCircle}>
              <Ionicons name="moon-outline" size={22} color="#fff" style={styles.iconShadow} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.timerIconCircle}>
              <Ionicons name="alarm-outline" size={22} color="#fff" style={styles.iconShadow} />
            </TouchableOpacity>
          </View>
          <View style={styles.clockWrap}>
            <Text style={styles.bigClock}>00:30</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const OVERLAY_HEIGHT = Math.round(SCREEN_HEIGHT * 0.54);
const PANEL_HEIGHT = Math.round(OVERLAY_HEIGHT * 0.33);
const BOTTOM_SHADOW_HEIGHT = Math.round(OVERLAY_HEIGHT * 0.6);
const TIMER_OVERLAY_HEIGHT = Math.round(SCREEN_HEIGHT * 0.48);
   const TIMER_BOTTOM_BAND_HEIGHT = Math.round(SCREEN_HEIGHT * 0.14);
   const TIMER_ICONS_BOTTOM = Math.round(SCREEN_HEIGHT * 0.30);
   const TIMER_TITLE_BOTTOM = TIMER_ICONS_BOTTOM + 100;
   const TIMER_SECTION_DIVIDER_BOTTOM = TIMER_TITLE_BOTTOM - 18;
   const TIMER_SHADOW_BOUNDARY_BOTTOM = TIMER_OVERLAY_HEIGHT;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  brand: {
    position: 'absolute',
    top: 16,
    left: 16,
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  overlayWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  // Down-swipe overlay styles
  downOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 25,
  },
  downHeader: {
    position: 'absolute',
    top: 74,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  downTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.95,
    textAlign: 'center',
  },
  downClose: {
    position: 'absolute',
    right: 0,
    top: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  overlayGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: OVERLAY_HEIGHT,
  },
  bottomShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BOTTOM_SHADOW_HEIGHT,
  },

  controlsRow: {
    position: 'absolute',
    width: '100%',
    bottom: Math.round(OVERLAY_HEIGHT * 0.30),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomRow: {
    position: 'absolute',
    bottom: 56,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerOverlayWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  timerOverlayGradient: {
     position: 'absolute',
     left: 0,
     right: 0,
     bottom: 0,
     height: TIMER_OVERLAY_HEIGHT,
   },
   timerBottomBand: {
     position: 'absolute',
     left: 0,
     right: 0,
     bottom: 0,
     height: TIMER_BOTTOM_BAND_HEIGHT,
   },
   timerShadowBoundary: {
       position: 'absolute',
       left: 0,
       right: 0,
       bottom: TIMER_SHADOW_BOUNDARY_BOTTOM,
       height: 2,
       backgroundColor: 'rgba(0,0,0,0.32)',
     },
   timerTitleOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: TIMER_TITLE_BOTTOM,
    },
    timerSectionDividerOverlay: {
       position: 'absolute',
       left: 0,
       right: 0,
       bottom: TIMER_SECTION_DIVIDER_BOTTOM,
       height: 1,
       backgroundColor: 'rgba(255,255,255,0.18)',
     },
   timerCloseOverlay: {
      position: 'absolute',
      right: 24,
      bottom: TIMER_TITLE_BOTTOM,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.10)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
   timerIconsRowOverlay: {
      position: 'absolute',
      left: 24,
      right: 24,
      bottom: TIMER_ICONS_BOTTOM,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
  timerPanel: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: Math.round(SCREEN_HEIGHT * 0.26),
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  timerTitle: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.9,
    marginBottom: 16,
  },
  timerClose: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  timerIconsRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
  },
  timerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  clockWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Math.round(SCREEN_HEIGHT * 0.14),
    alignItems: 'center',
  },
  bigClock: {
    color: '#fff',
    fontSize: 60,
    letterSpacing: 2,
    fontWeight: '300',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  iconShadow: {
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});
