import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  ImageBackground,
} from 'react-native';

import { usePrevious } from './helpers/StateHelpers';
import { IUserStory, StoryCircleListItemProps } from './interfaces';

import DEFAULT_AVATAR from './assets/images/no_avatar.png';

const StoryCircleListItem = ({
  item,
  unPressedBorderColor,
  pressedBorderColor,
  unPressedAvatarTextColor,
  pressedAvatarTextColor,
  avatarSize = 60,
  showText,
  avatarTextStyle,
  handleStoryItemPress,
  avatarImageStyle,
  avatarWrapperStyle,
}: StoryCircleListItemProps) => {
  const [isPressed, setIsPressed] = useState(item?.seen);

  const prevSeen = usePrevious(item?.seen);

  useEffect(() => {
    if (prevSeen != item?.seen) {
      setIsPressed(item?.seen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.seen]);

  const _handleItemPress = (item: IUserStory) => {
    if (handleStoryItemPress) handleStoryItemPress(item);

    setIsPressed(true);
  };

  const avatarWrapperSize = avatarSize + 4;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => _handleItemPress(item)}
        style={{ height: avatarWrapperSize, width: avatarWrapperSize }}
      >
        <ImageBackground
          source={item.outerCircle}
          tintColor={isPressed ? pressedBorderColor : unPressedBorderColor}
          style={[
            styles.avatarWrapper,
            {
              height: avatarWrapperSize,
              width: avatarWrapperSize,
            },
          ]}
        >
          <View style={{
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 100,
            height: avatarSize - 5,
            width: avatarSize - 5,
            backgroundColor: "#04196C"
          }}>
            <Image
              style={[
                {
                  height: 28,
                  width: 28,
                },
                avatarImageStyle,
              ]}
              source={{ uri: item.user_image }}
              resizeMode='contain'
              defaultSource={Platform.OS === 'ios' ? DEFAULT_AVATAR : null}
            />
          </View>
        </ImageBackground>
      </TouchableOpacity>
      {showText && (
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            {
              maxWidth: avatarWrapperSize + 10,
              ...styles.text,
              ...avatarTextStyle,
            },
            isPressed
              ? { color: pressedAvatarTextColor || undefined }
              : { color: unPressedAvatarTextColor || undefined },
          ]}
        >
          {item.user_name}
        </Text>
      )}
    </View>
  );
};

export default StoryCircleListItem;

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
    marginRight: 16,
  },
  avatarWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 100,
    height: 64,
    width: 64,
  },
  text: {
    marginTop: 3,
    textAlign: 'center',
    alignItems: 'center',
    fontSize: 11,
  },
});
