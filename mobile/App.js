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
  ScrollView,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import videoSource from './videoSource';

// サウンドデータ
const SOUNDS = [
  { id: 1, name: '雨', icon: '🌧️', category: '自然', color: '#4A90E2' },
  { id: 2, name: '焚き火', icon: '🔥', category: '自然', color: '#E27755' },
  { id: 3, name: '波', icon: '🌊', category: '自然', color: '#5AB9EA' },
  { id: 4, name: '森の音', icon: '🌲', category: '自然', color: '#50C878' },
  { id: 5, name: '風', icon: '💨', category: '自然', color: '#87CEEB' },
  { id: 6, name: '鳥の声', icon: '🐦', category: '自然', color: '#FFD700' },
  { id: 7, name: '雷', icon: '⚡', category: '自然', color: '#9B59B6' },
  { id: 8, name: '風鈴', icon: '🔔', category: 'リラックス', color: '#E8B4B8' },
  { id: 9, name: 'カフェ', icon: '☕', category: '集中', color: '#8B4513' },
  { id: 10, name: 'ピアノ', icon: '🎹', category: 'リラックス', color: '#F0E68C' },
  { id: 11, name: 'ホワイトノイズ', icon: '📻', category: '集中', color: '#CCCCCC' },
  { id: 12, name: '川のせせらぎ', icon: '💧', category: '自然', color: '#00CED1' },
];

const CATEGORIES = ['すべて', '自然', 'リラックス', '集中'];

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

  // サウンドミキサーの状態管理
  const [soundVolumes, setSoundVolumes] = React.useState(
    SOUNDS.reduce((acc, sound) => ({ ...acc, [sound.id]: 0 }), {})
  );
  const [selectedCategory, setSelectedCategory] = React.useState('すべて');

  const showTimer = React.useCallback(() => {
    setTimerVisible(true);
    Animated.spring(timerOpacity, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [timerOpacity]);

  const hideTimer = React.useCallback(() => {
    Animated.timing(timerOpacity, {
      toValue: 0,
      duration: 250,
      easing: Easing.bezier(0.4, 0, 0.6, 1),
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
        duration: 350,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
      Animated.spring(downTranslate, {
        toValue: 0,
        friction: 9,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [downOpacity, downTranslate]);

  const hideDownScreen = React.useCallback(() => {
    Animated.parallel([
      Animated.timing(downOpacity, {
        toValue: 0,
        duration: 280,
        easing: Easing.bezier(0.4, 0, 0.6, 1),
        useNativeDriver: true,
      }),
      Animated.timing(downTranslate, {
        toValue: -SCREEN_HEIGHT_LOCAL,
        duration: 320,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
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
    Animated.spring(overlayOpacity, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [overlayOpacity]);

  const hideOverlay = React.useCallback(() => {
    if (!overlayVisible.current) return;
    overlayVisible.current = false;
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 250,
      easing: Easing.bezier(0.4, 0, 0.6, 1),
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

  // サウンドボリューム変更
  const handleVolumeChange = (soundId, value) => {
    setSoundVolumes((prev) => ({ ...prev, [soundId]: value }));
  };

  // フィルタリングされたサウンド
  const filteredSounds = React.useMemo(() => {
    if (selectedCategory === 'すべて') return SOUNDS;
    return SOUNDS.filter((sound) => sound.category === selectedCategory);
  }, [selectedCategory]);

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
          colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.0)']}
          locations={[0, 0.5, 0.75, 1]}
          style={styles.overlayGradient}
        />

        {/* アイコン行用の下部影 */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.0)']}
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
          <LinearGradient
            pointerEvents="none"
            colors={['#0f1419', '#1a2332', '#0d1520']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* ヘッダー */}
          <View style={styles.mixerHeader}>
            <View style={styles.mixerHeaderContent}>
              <Text style={styles.mixerTitle}>サウンドミキサー</Text>
              <TouchableOpacity style={styles.mixerClose} onPress={hideDownScreen}>
                <Ionicons name="close-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* カテゴリフィルター */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === cat && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* サウンドグリッド */}
          <ScrollView
            style={styles.soundScrollView}
            contentContainerStyle={styles.soundGrid}
            showsVerticalScrollIndicator={false}
          >
            {filteredSounds.map((sound) => {
              const volume = soundVolumes[sound.id];
              const isActive = volume > 0;

              return (
                <View key={sound.id} style={styles.soundCard}>
                  <LinearGradient
                    colors={
                      isActive
                        ? [sound.color + '40', sound.color + '20']
                        : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']
                    }
                    style={styles.soundCardGradient}
                  >
                    {/* アイコンとタイトル */}
                    <View style={styles.soundCardHeader}>
                      <Text style={styles.soundIcon}>{sound.icon}</Text>
                      <Text style={styles.soundName}>{sound.name}</Text>
                    </View>

                    {/* ボリュームスライダー */}
                    <View style={styles.soundCardSlider}>
                      <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={100}
                        value={volume}
                        onValueChange={(value) => handleVolumeChange(sound.id, value)}
                        minimumTrackTintColor={sound.color}
                        maximumTrackTintColor="rgba(255,255,255,0.2)"
                        thumbTintColor={isActive ? sound.color : '#fff'}
                      />
                      <Text style={styles.volumeText}>{Math.round(volume)}%</Text>
                    </View>
                  </LinearGradient>
                </View>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}
      {timerVisible && (
        <Animated.View style={[styles.timerOverlayWrap, { opacity: timerOpacity }]}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.0)']}
            locations={[0, 0.45, 0.88, 1]}
            style={styles.timerOverlayGradient}
          />
          {/* タイマー用ボトム帯グラデーション（影帯） */}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.0)']}
            locations={[0, 0.15, 0.85, 1]}
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
    top: 50,
    left: 24,
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
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
  // サウンドミキサーヘッダー
  mixerHeader: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  mixerHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  mixerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  mixerClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  // カテゴリフィルター
  categoryScroll: {
    marginTop: 8,
  },
  categoryScrollContent: {
    paddingRight: 24,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: 12,
  },
  categoryChipActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  categoryChipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  // サウンドグリッド
  soundScrollView: {
    flex: 1,
    marginTop: 20,
  },
  soundGrid: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  soundCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  soundCardGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  soundCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  soundIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  soundName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  soundCardSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  volumeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'right',
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
    width: 84,
    height: 84,
    borderRadius: 42,
    marginHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sideButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
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
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.2)',
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
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
    fontSize: 72,
    letterSpacing: 4,
    fontWeight: '200',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  iconShadow: {
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
});
