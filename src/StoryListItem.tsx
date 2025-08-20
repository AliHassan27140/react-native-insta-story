import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Animated,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  ActivityIndicator,
  View,
  Platform,
  SafeAreaView,
  I18nManager,
} from 'react-native';
import GestureRecognizer from 'react-native-swipe-gestures';
import Video, { OnProgressData, VideoRef } from 'react-native-video';
import { useNetInfo } from '@react-native-community/netinfo';

import { usePrevious, isNullOrWhitespace } from './helpers';
import {
  IUserStoryItem,
  NextOrPrevious,
  StoryListItemProps,
} from './interfaces';

const { width, height } = Dimensions.get('window');

const StoryListItem = ({
  index,
  userId,
  profileImage,
  profileName,
  duration,
  onFinish,
  onClosePress,
  stories,
  currentPage,
  onStorySeen,
  renderCloseComponent,
  renderSwipeUpComponent,
  renderTextComponent,
  loadedAnimationBarStyle,
  unloadedAnimationBarStyle,
  animationBarContainerStyle,
  storyUserContainerStyle,
  storyImageStyle,
  storyAvatarImageStyle,
  storyContainerStyle,
  ...props
}: StoryListItemProps) => {
  const videoRef = useRef<VideoRef>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [current, setCurrent] = useState(0);
  const [content, setContent] = useState<IUserStoryItem[]>(
    stories.map((x) => ({
      ...x,
      finish: 0,
    })),
  );
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [isVideoError, setIsVideoError] = useState(false);
  const netInfo = useNetInfo();

  const progress = useRef(new Animated.Value(0)).current;
  const prevCurrentPage = usePrevious(currentPage);
  const animationDurationRef = useRef(duration * 1000);
  const animationPausedValue = useRef(0);
  const totalVideoDurationRef = useRef(1);
  const isMediaLoadingRef = useRef(false);

  const imageAnimationFrameRef = useRef<number | null>(null);
  const imageStartTimeRef = useRef<number>(0);
  const imageElapsedRef = useRef<number>(0);

  const dragThreshold = 4;
  const touchStartY = useRef<number>(0);
  const touchMoved = useRef<boolean>(false);

  const isActiveStoryListItem = currentPage === index;

  useEffect(() => {
    console.log("Network Listener Effect - isConnected:", netInfo.isConnected, "isLoading:", isLoading, "isBuffering:", isBuffering, "isPaused:", isPaused, "isNetworkError:", isNetworkError);
    if (netInfo.isConnected) {
      setIsNetworkError(false);
    } else {
      setIsNetworkError(true);
    }
  }, [netInfo.isConnected]);

  useEffect(() => {
    let isPrevious = !!prevCurrentPage && prevCurrentPage > currentPage;
    if (isPrevious) {
      setCurrent(content.length - 1);
    } else {
      setCurrent(0);
    }

    let data = [...content];
    data.forEach((x, i) => {
      x.finish = isPrevious && i !== content.length - 1 ? 1 : 0;
    });

    setContent(data);
    loadCurrentMedia();
  }, [currentPage]);

  const prevCurrent = usePrevious(current);

  useEffect(() => {
    if (!isNullOrWhitespace(prevCurrent)) {
      loadCurrentMedia();
    }
  }, [current]);

  useEffect(() => {
    if (isActiveStoryListItem && !isNullOrWhitespace(prevCurrent)) {
      loadCurrentMedia();
    }
  }, [current, isActiveStoryListItem]);

  const loadCurrentMedia = useCallback(() => {
    console.log("loadCurrentMedia - current:", current);
    if (imageAnimationFrameRef.current) {
      cancelAnimationFrame(imageAnimationFrameRef.current);
      imageAnimationFrameRef.current = null;
    }
    imageElapsedRef.current = 0;
    setIsLoading(true);
    isMediaLoadingRef.current = true;
    setIsBuffering(false);
    setIsVideoError(false);
    setIsNetworkError(false);
  }, [current]);


  function startStoryAnimation() {
    if (isMediaLoadingRef.current || isBuffering || isPaused || isLoading || isVideoError) {
      return;
    }
    progress.setValue(animationPausedValue.current);
    Animated.timing(progress, {
      toValue: 1,
      duration: animationDurationRef.current * (1 - animationPausedValue.current),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        next();
      }
    });
    console.log("startStoryAnimation - started");
  }

  const startImageProgressAnimation = () => {
    imageStartTimeRef.current = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - imageStartTimeRef.current + imageElapsedRef.current;
      const progressVal = Math.min(elapsed / animationDurationRef.current, 1);
      progress.setValue(progressVal);

      if (progressVal < 1) {
        imageAnimationFrameRef.current = requestAnimationFrame(animate);
      } else if (progressVal >= 1) {
        next();
      }
    };

    imageAnimationFrameRef.current = requestAnimationFrame(animate);
  };

  const onMediaLoad = (meta?: { duration?: number }) => {
    console.log("onMediaLoad triggered");

    if (content[current].type === 'video' && meta?.duration) {
      animationDurationRef.current = Math.ceil(meta.duration) * 1000;
      totalVideoDurationRef.current = Math.ceil(meta.duration);
    } else {
      animationDurationRef.current = duration;
      totalVideoDurationRef.current = duration;

      progress.setValue(0);
      imageElapsedRef.current = 0;
      startImageProgressAnimation();
    }

    setIsLoading(false);
    isMediaLoadingRef.current = false;
  };


  const onBuffer = ({ isBuffering }: { isBuffering: boolean }) => {
    console.log("onBuffer triggered - isBuffering:", isBuffering, "netInfo.isConnected:", netInfo.isConnected);
    setIsBuffering(isBuffering);
    if (isBuffering && !netInfo.isConnected) {
      setIsNetworkError(true);
    } else {
      setIsNetworkError(false);
    }
  };


  const onVideoError = (error: any) => {
    console.error("VideoError:", error);
    setIsLoading(false);
    setIsBuffering(false);
    setIsVideoError(true);
  };


  const onVideoProgress = (data: OnProgressData) => {
    if (totalVideoDurationRef.current) {
      const progressValue = data.currentTime / totalVideoDurationRef.current;
      progress.setValue(progressValue);
    }
  };

  const retryLoadMedia = () => {
    console.log("retryLoadMedia called");
    setIsVideoError(false);
    loadCurrentMedia();
  };


  function next() {
    console.log("next - current:", current, "content.length:", content.length);
    if (imageAnimationFrameRef.current) {
      cancelAnimationFrame(imageAnimationFrameRef.current);
      imageAnimationFrameRef.current = null;
    }
    imageElapsedRef.current = 0;
    if (current < content.length - 1) {
      let data = [...content];
      data[current].finish = 1;
      setContent(data);
      setCurrent(current + 1);
      animationPausedValue.current = 0;
      progress.setValue(0);
      setIsPaused(false);
      loadCurrentMedia();
    } else {
      close('next');
    }
  }

  function previous() {
    console.log("previous - current:", current);
    if (imageAnimationFrameRef.current) {
      cancelAnimationFrame(imageAnimationFrameRef.current);
      imageAnimationFrameRef.current = null;
    }
    imageElapsedRef.current = 0;
    if (current > 0) {
      let data = [...content];
      data[current].finish = 0;
      setContent(data);
      setCurrent(current - 1);
      animationPausedValue.current = 0;
      progress.setValue(0);
      setIsPaused(false);
      loadCurrentMedia();
    } else {
      close('previous');
    }
  }

  function close(state: NextOrPrevious) {
    console.log("close - state:", state);
    if (imageAnimationFrameRef.current) {
      cancelAnimationFrame(imageAnimationFrameRef.current);
      imageAnimationFrameRef.current = null;
    }
    imageElapsedRef.current = 0;
    let data = [...content].map((x) => ({ ...x, finish: 0 }));
    setContent(data);
    progress.setValue(0);
    animationPausedValue.current = 0;
    setIsLoading(false);
    setIsPaused(false);
    setIsVideoError(false);
    setIsNetworkError(false);
    if (currentPage === index && onFinish) {
      onFinish(state);
    }
  }

  return (
    <GestureRecognizer
      onSwipeDown={onClosePress}
      style={[styles.container, storyContainerStyle]}
      onTouchEnd={() => {
        if (isPaused) {
          setIsPaused(false);
          if (content[current].type !== 'video') {
            imageStartTimeRef.current = Date.now();
            startImageProgressAnimation();
          } else {
            startStoryAnimation();
          }
        }
      }}
    >
      <SafeAreaView>
        <View style={styles.backgroundContainer}>
          {isActiveStoryListItem && (
            <>
              {(isLoading || isBuffering) && !isVideoError && (
                <View style={styles.spinnerContainer}>
                  <ActivityIndicator size="large" color="white" />
                </View>
              )}
              {content[current].type === 'video' && !isVideoError ? (
                <Video
                  key={current}
                  source={{ uri: content[current].story_image }}
                  ref={videoRef}
                  paused={isPaused || isNetworkError || isVideoError}
                  resizeMode="contain"
                  onLoad={onMediaLoad}
                  onProgress={onVideoProgress}
                  onBuffer={onBuffer}
                  onError={onVideoError}
                  onEnd={next}
                  style={styles.video}
                />
              ) : !isVideoError ? (
                <Image
                  onLoadEnd={() => onMediaLoad()}
                  source={{ uri: content[current].story_image }}
                  style={[styles.image, storyImageStyle]}
                />
              ) : <></>}
            </>
          )}
        </View>
      </SafeAreaView>

      {
        isActiveStoryListItem && (
          <>
            <View style={[styles.animationBarContainer, animationBarContainerStyle]}>
              {content.map((_, key) => (
                <View key={key} style={[styles.animationBackground, unloadedAnimationBarStyle]}>
                  <Animated.View
                    style={[
                      {
                        flex: current === key ? progress : content[key].finish,
                        height: 2,
                        backgroundColor: 'white',
                      },
                      loadedAnimationBarStyle,
                    ]}
                  />
                </View>
              ))}
            </View>

            {/* User Info & Close Button */}
            <View style={[styles.userContainer, storyUserContainerStyle]}>
              <View style={styles.flexRowCenter}>
                <View style={{
                  height: 45,
                  width: 45,
                  backgroundColor: '#04196C',
                  borderRadius: 50,
                  overflow: 'hidden',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Image
                    style={[styles.avatarImage, storyAvatarImageStyle]}
                    source={{ uri: profileImage }}
                  />
                </View>
                {typeof renderTextComponent === 'function' ? (
                  renderTextComponent({
                    item: content[current],
                    profileName,
                  })
                ) : (
                  <Text style={styles.avatarText}>{profileName}</Text>
                )}
              </View>
              <View style={styles.closeIconContainer}>
                {typeof renderCloseComponent === 'function' ? (
                  renderCloseComponent({
                    onPress: onClosePress,
                    item: content[current],
                  })
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      if (onClosePress) {
                        onClosePress();
                      }
                    }}
                  >
                    <Text style={styles.whiteText}>X</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Left / Right Tap Navigation */}
            <View style={styles.pressContainer}>
              <TouchableWithoutFeedback
                onPress={previous}
                onPressIn={(e) => {
                  touchMoved.current = false;
                  touchStartY.current = e.nativeEvent.pageY;
                }}
                onLongPress={() => {
                  setIsPaused(true);
                  if (content[current].type !== 'video') {
                    if (imageAnimationFrameRef.current) {
                      cancelAnimationFrame(imageAnimationFrameRef.current);
                      imageAnimationFrameRef.current = null;
                    }
                    imageElapsedRef.current += Date.now() - imageStartTimeRef.current;
                  } else {
                    progress.stopAnimation((value) => {
                      animationPausedValue.current = value;
                    });
                  }
                }}
                onPressOut={(e) => {
                  const touchEndY = e.nativeEvent.pageY;
                  const deltaY = Math.abs(touchEndY - touchStartY.current);
                  if (deltaY < dragThreshold) {
                    if (isPaused) {
                      setIsPaused(false);
                      if (content[current].type !== 'video') {
                        imageStartTimeRef.current = Date.now();
                        startImageProgressAnimation();
                      } else {
                        startStoryAnimation();
                      }
                    }
                  }
                }}
              >
                <View style={{ flex: 1 }} />
              </TouchableWithoutFeedback>
              <TouchableWithoutFeedback
                onPress={next}
                onPressIn={(e) => {
                  touchMoved.current = false;
                  touchStartY.current = e.nativeEvent.pageY;
                }}
                onLongPress={() => {
                  setIsPaused(true);
                  if (content[current].type !== 'video') {
                    if (imageAnimationFrameRef.current) {
                      cancelAnimationFrame(imageAnimationFrameRef.current);
                      imageAnimationFrameRef.current = null;
                    }
                    imageElapsedRef.current += Date.now() - imageStartTimeRef.current;
                  } else {
                    progress.stopAnimation((value) => {
                      animationPausedValue.current = value;
                    });
                  }
                }}
                onPressOut={(e) => {
                  const touchEndY = e.nativeEvent.pageY;
                  const deltaY = Math.abs(touchEndY - touchStartY.current);
                  if (deltaY < dragThreshold) {
                    if (isPaused) {
                      setIsPaused(false);
                      if (content[current].type !== 'video') {
                        imageStartTimeRef.current = Date.now();
                        startImageProgressAnimation();
                      } else {
                        startStoryAnimation();
                      }
                    }
                  }
                }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  {(isNetworkError || isVideoError) && !isLoading && !isBuffering && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.networkErrorText}>
                        {isVideoError
                          ? I18nManager.isRTL ? "تعذّر تحميل الفيديو بسبب مشكلة في الشبكة." : "Video could not be loaded due to a network issue."
                          : I18nManager.isRTL ? "تم فقدان الاتصال بالشبكة.\nيرجى التحقق من اتصالك." : "Network connection lost.\nPlease check your connection."
                        }
                      </Text>
                      <TouchableOpacity
                        style={styles.retryButton}
                        onPress={retryLoadMedia}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.retryButtonText}>{I18nManager.isRTL ? "إعادة المحاولة" : "Retry"}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableWithoutFeedback>
              <TouchableWithoutFeedback
                onPress={next}
                onPressIn={(e) => {
                  touchMoved.current = false;
                  touchStartY.current = e.nativeEvent.pageY;
                }}
                onLongPress={() => {
                  setIsPaused(true);
                  if (content[current].type !== 'video') {
                    if (imageAnimationFrameRef.current) {
                      cancelAnimationFrame(imageAnimationFrameRef.current);
                      imageAnimationFrameRef.current = null;
                    }
                    imageElapsedRef.current += Date.now() - imageStartTimeRef.current;
                  } else {
                    progress.stopAnimation((value) => {
                      animationPausedValue.current = value;
                    });
                  }
                }}
                onPressOut={(e) => {
                  const touchEndY = e.nativeEvent.pageY;
                  const deltaY = Math.abs(touchEndY - touchStartY.current);
                  if (deltaY < dragThreshold) {
                    if (isPaused) {
                      setIsPaused(false);
                      if (content[current].type !== 'video') {
                        imageStartTimeRef.current = Date.now();
                        startImageProgressAnimation();
                      } else {
                        startStoryAnimation();
                      }
                    }
                  }
                }}
              >
                <View style={{ flex: 1 }} />
              </TouchableWithoutFeedback>
            </View>
          </>
        )
      }
    </GestureRecognizer >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  flex: {
    flex: 1
  },
  flexCol: {
    flex: 1,
    flexDirection: 'column',
  },
  flexRowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20
  },
  image: {
    width: width,
    height: height,
    resizeMode: 'cover',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  spinnerContainer: {
    zIndex: 5,
    position: 'absolute',
    justifyContent: 'center',
    alignSelf: 'center',
    alignItems: 'center',
    height: height,
  },
  errorContainer: {
    zIndex: 5,
    position: 'absolute',
    justifyContent: 'center',
    alignSelf: 'center',
    alignItems: 'center',
    height: height,
    width: width
  },
  animationBarContainer: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  animationBackground: {
    height: 2,
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(117, 117, 117, 0.5)',
    marginHorizontal: 2,
  },
  userContainer: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  avatarImage: {
    height: 20,
    width: 20,
    borderRadius: 100,
  },
  avatarText: {
    fontWeight: 'bold',
    color: 'white',
    paddingLeft: 10,
  },
  closeIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    paddingHorizontal: 15,
  },
  pressContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  swipeUpBtn: {
    position: 'absolute',
    right: 0,
    left: 0,
    alignItems: 'center',
    bottom: Platform.OS == 'ios' ? 20 : 50,
  },
  whiteText: {
    color: 'white',
  },
  swipeText: {
    color: 'white',
    marginTop: 5,
  },
  video: {
    width: width,
    height: height,
    resizeMode: 'cover'
  },
  networkErrorText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 10
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
    alignSelf: 'center'
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  }
});

export default StoryListItem;