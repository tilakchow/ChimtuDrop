import { TextStyle } from 'react-native';

export const typography = {
  // Main impactful headlines (match "DROP A LINK." and "CHIMTU DROP.")
  hero: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
    textTransform: 'uppercase',
  } as TextStyle,

  title1: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  } as TextStyle,

  title2: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  } as TextStyle,

  headline: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  } as TextStyle,

  body: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  } as TextStyle,

  bodyBold: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  } as TextStyle,

  callout: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 13,
    fontWeight: '500',
  } as TextStyle,

  caption: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  } as TextStyle,

  captionBold: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  } as TextStyle,

  // Technical section labels & metadata (match "NO SETTINGS. NO GUESSWORK.", "01 / PUBLIC POST URL", "SAVE FROM THE SCROLL")
  monoLabel: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  } as TextStyle,

  monoCaption: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  } as TextStyle,

  // Action button typography (match "DOWNLOAD BEST QUALITY")
  button: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,

  buttonSm: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } as TextStyle,
};
