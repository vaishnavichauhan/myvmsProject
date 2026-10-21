import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';
import { CustomIcon } from './CustomIcon';

export const PrimaryButton = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  color = THEME.colors.clay,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: disabled ? THEME.colors.sand : color },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={THEME.colors.white} size="small" />
      ) : (
        <>
          {icon ? <CustomIcon name={icon} size={18} color={THEME.colors.white} style={styles.icon} /> : null}
          <Text style={[styles.text, textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export const OutlineButton = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  color = THEME.colors.clay,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.outlineButton, { borderColor: color }, style]}
    >
      {loading ? (
        <ActivityIndicator color={color} size="small" />
      ) : (
        <>
          {icon ? <CustomIcon name={icon} size={16} color={color} style={styles.icon} /> : null}
          <Text style={[styles.outlineText, { color }, textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: THEME.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    ...THEME.shadows.button,
  },
  text: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.white,
    letterSpacing: 0.2,
  },
  outlineButton: {
    height: 44,
    borderRadius: THEME.radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: THEME.colors.white,
  },
  outlineText: {
    fontSize: 14,
    fontWeight: '700',
  },
  icon: {
    marginRight: 8,
  },
});
