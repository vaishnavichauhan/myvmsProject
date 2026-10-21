import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '../constants/theme';
import { CustomIcon } from './CustomIcon';

export const HeaderBar = ({
  title,
  subtitle,
  showBack = false,
  rightAction,
  rightActionIcon,
  onRightActionPress,
}) => {
  const navigation = useNavigation();

  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        {showBack && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <CustomIcon name="chevronLeft" size={26} color={THEME.colors.darkBrown} />
          </TouchableOpacity>
        )}
        <View style={styles.titleWrapper}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {rightAction ? (
        rightAction
      ) : rightActionIcon ? (
        <TouchableOpacity
          onPress={onRightActionPress}
          style={styles.actionButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <CustomIcon name={rightActionIcon} size={20} color={THEME.colors.clay} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.sand,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.sandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrapper: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.sandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
