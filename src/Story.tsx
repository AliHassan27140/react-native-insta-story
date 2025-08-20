import React, { Fragment, useRef, useState, useEffect } from 'react';
import { Dimensions, View, Platform, StyleSheet } from 'react-native';
import Modal from 'react-native-modalbox';

import StoryListItem from './StoryListItem';
import StoryCircleListView from './StoryCircleListView';
import { isNullOrWhitespace } from './helpers';
import AndroidCubeEffect from './components/AndroidCubeEffect';
import CubeNavigationHorizontal from './components/CubeNavigationHorizontal';
import { IUserStory, NextOrPrevious, StoryProps } from './interfaces';

const { height, width } = Dimensions.get('window');

export const Story = ({
  data,
  unPressedBorderColor,
  pressedBorderColor,
  unPressedAvatarTextColor,
  pressedAvatarTextColor,
  style,
  onStart,
  onClose,
  duration,
  swipeText,
  avatarSize,
  showAvatarText,
  avatarTextStyle,
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
  avatarImageStyle,
  avatarWrapperStyle,
  avatarFlatListProps,
}: StoryProps) => {
  const [dataState, setDataState] = useState<IUserStory[]>(data);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [selectedData, setSelectedData] = useState<IUserStory[]>([]);
  const cube = useRef<CubeNavigationHorizontal | AndroidCubeEffect>();

  // Component Functions
  const _handleStoryItemPress = (item: IUserStory, index?: number) => {
    if (onStart) {
      onStart(item);
    }

    setSelectedData(dataState);
    setCurrentPage(index ?? 0);
    setIsModalOpen(true);

    setTimeout(() => {
      cube?.current?.scrollTo(index ?? 0, false);
    }, 0);
  };

  useEffect(() => {
    handleSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handleSeen = () => {
    const seen = selectedData[currentPage];
    const seenIndex = dataState.indexOf(seen);
    if (seenIndex > 0) {
      if (!dataState[seenIndex]?.seen) {
        let tempData = dataState;
        dataState[seenIndex] = {
          ...dataState[seenIndex],
          seen: true,
        };
        setDataState(tempData);
      }
    }
  };

  function onStoryFinish(state: NextOrPrevious) {
    if (!isNullOrWhitespace(state)) {
      if (state === 'next') {
        const newPage = currentPage + 1;
        if (newPage < selectedData.length) {
          setCurrentPage(newPage);
          cube?.current?.scrollTo(newPage);
        } else {
          setIsModalOpen(false);
          setCurrentPage(0);
          if (onClose) {
            onClose(selectedData[selectedData.length - 1]);
          }
        }
      } else if (state === 'previous') {
        const newPage = currentPage - 1;
        if (newPage < 0) {
          setIsModalOpen(false);
          setCurrentPage(0);
        } else {
          setCurrentPage(newPage);
          cube?.current?.scrollTo(newPage);
        }
      }
    }
  }

  const renderStoryList = () =>
    selectedData.map((x, i) => {
      return (
        <StoryListItem
          duration={duration * 1000}
          key={i + currentPage * 1000}
          userId={x.user_id}
          profileName={x.user_name}
          profileImage={x.user_image}
          stories={x.stories}
          currentPage={currentPage}
          onFinish={onStoryFinish}
          swipeText={swipeText}
          renderSwipeUpComponent={renderSwipeUpComponent}
          renderCloseComponent={renderCloseComponent}
          renderTextComponent={renderTextComponent}
          onClosePress={() => {
            setIsModalOpen(false);
            if (onClose) {
              onClose(x);
            }
          }}
          index={i}
          onStorySeen={onStorySeen}
          unloadedAnimationBarStyle={unloadedAnimationBarStyle}
          animationBarContainerStyle={animationBarContainerStyle}
          loadedAnimationBarStyle={loadedAnimationBarStyle}
          storyUserContainerStyle={storyUserContainerStyle}
          storyImageStyle={storyImageStyle}
          storyAvatarImageStyle={storyAvatarImageStyle}
          storyContainerStyle={storyContainerStyle}
        />
      );
    });

  const renderCube = () => {
    if (Platform.OS == 'ios') {
      return (
        <CubeNavigationHorizontal
          ref={cube as React.LegacyRef<CubeNavigationHorizontal>}
          callBackAfterSwipe={(x: any) => {
            if (x != currentPage) {
              setCurrentPage(parseInt(x));
            }
          }}
        >
          {renderStoryList()}
        </CubeNavigationHorizontal>
      );
    } else {
      return (
        <AndroidCubeEffect
          ref={cube as React.LegacyRef<AndroidCubeEffect>}
          callBackAfterSwipe={(x: any) => {
            if (x != currentPage) {
              setCurrentPage(parseInt(x));
            }
          }}
        >
          {renderStoryList()}
        </AndroidCubeEffect>
      );
    }
  };

  return (
    <Fragment>
      <View style={style}>
        <StoryCircleListView
          handleStoryItemPress={_handleStoryItemPress}
          data={dataState}
          avatarSize={avatarSize}
          unPressedBorderColor={unPressedBorderColor}
          pressedBorderColor={pressedBorderColor}
          unPressedAvatarTextColor={unPressedAvatarTextColor}
          pressedAvatarTextColor={pressedAvatarTextColor}
          showText={showAvatarText}
          avatarTextStyle={avatarTextStyle}
          avatarWrapperStyle={avatarWrapperStyle}
          avatarImageStyle={avatarImageStyle}
          avatarFlatListProps={avatarFlatListProps}
        />
      </View>
      <Modal
        style={styles.modal}
        isOpen={isModalOpen}
        onClosed={() => setIsModalOpen(false)}
        onOpened={() => {
          if (cube?.current) {
            cube.current.scrollTo(currentPage);
          }
        }}
        position="top"
        swipeToClose
        swipeArea={250}
        backButtonClose
        coverScreen={true}
        animationDuration={200}
        backdropOpacity={0.5}
      >
        {renderCube()}
      </Modal>
    </Fragment>
  );
};

const styles = StyleSheet.create({
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: height,
    width: width,
  },
});

export default Story;

Story.defaultProps = {
  showAvatarText: true,
};
