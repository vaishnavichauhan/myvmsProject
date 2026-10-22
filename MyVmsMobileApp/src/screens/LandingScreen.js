import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  StatusBar,
  FlatList,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  Megaphone,
  Wrench,
  ShieldCheck,
  Headphones,
  CheckCircle2,
  Sparkles,
  PackageCheck,
  KeyRound,
  Users,
  BellRing,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const LandingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goToSlide = (index) => {
    if (index >= 0 && index <= 2) {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
      });
      setCurrentIndex(index);
    }
  };

  const handleNext = () => {
    if (currentIndex < 2) {
      goToSlide(currentIndex + 1);
    } else {
      navigation.navigate('Login');
    }
  };

  const handleSkip = () => {
    navigation.navigate('Login');
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const getItemLayout = (_, index) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  });

  /**
   * Reusable Consistent Header for All 3 Screens with Back button on screens 2 & 3
   */
  const renderHeader = (slideIndex = 0) => (
    <View style={[styles.slideTopHeader, { paddingTop: insets.top + 10 }]}>
      <View style={styles.brandRowSimple}>
        {slideIndex > 0 && (
          <TouchableOpacity
            onPress={() => goToSlide(slideIndex - 1)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.backBtnHeader}
            activeOpacity={0.7}
            accessibilityLabel="Previous slide"
          >
            <ArrowLeft size={18} color={THEME.colors.darkBrown} strokeWidth={2.4} />
          </TouchableOpacity>
        )}

        <View style={styles.brandLogoSquare}>
          <Building2 size={16} color="#FFFFFF" />
        </View>
        <Text style={styles.brandTitleText}>MYVMS</Text>
      </View>

      <TouchableOpacity
        onPress={handleSkip}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <Text style={styles.headerSkipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Reusable Consistent Bottom Bar with 3 Clickable Dots & Action Arrow Button
   */
  const renderBottomBar = (slideIndex, isLast = false) => (
    <View style={[styles.slideBottomBar, { paddingBottom: Math.max(insets.bottom, 22) }]}>
      {/* 3 Clickable Pagination Dots to jump directly to any previous/next slide */}
      <View style={styles.paginationDotsWrap}>
        {[0, 1, 2].map((idx) => {
          const isActive = slideIndex === idx;
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => goToSlide(idx)}
              hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Go to slide ${idx + 1}`}
            >
              <View
                style={[
                  styles.dotPill,
                  isActive ? styles.dotPillActive : styles.dotInactive,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Consistent Next / Get Started Arrow Button */}
      <TouchableOpacity
        style={styles.actionArrowBtn}
        onPress={handleNext}
        activeOpacity={0.85}
      >
        <Text style={styles.actionArrowBtnText}>
          {isLast ? 'Get Started' : 'Next'}
        </Text>
        <ArrowRight size={17} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );

  // -------------------------------------------------------------
  // SLIDE 1: "Modern, Secure & Connected Residential Living"
  // -------------------------------------------------------------
  const renderSlide1 = () => (
    <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
      {renderHeader(0)}

      <View style={styles.slide1Body}>
        {/* Title & Tagline */}
        <View style={styles.slide1HeadingWrap}>
          <Text style={styles.slide1Heading}>
            {'Modern, Secure &\nConnected\nResidential Living'}
          </Text>
          <Text style={styles.slide1SubHeading}>
            Experience seamless community living with smart visitor check-in, real-time alerts, and unified society controls.
          </Text>
        </View>

        {/* Hero Visual Showcase with community-hero.jpg */}
        <View style={styles.slide1ImageCard}>
          <Image
            source={require('../assets/images/community-hero.jpg')}
            style={styles.slideHeroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlayGradient} />


        </View>
      </View>

      {renderBottomBar(0, false)}
    </View>
  );

  // -------------------------------------------------------------
  // SLIDE 2: Features List (One Card Per Line with Alternating Offset)
  // -------------------------------------------------------------
  const renderSlide2 = () => {
    const featureChips = [
      {
        id: 'updates',
        title: 'Community Updates',
        icon: Megaphone,
        bg: '#E4F6EB', // Soft Mint
        border: '#B8E7C8',
        color: '#15803D',
      },
      {
        id: 'maintenance',
        title: 'Maintenance',
        icon: Wrench,
        bg: '#FEF3C7', // Warm Amber
        border: '#FDE68A',
        color: '#B45309',
      },
      {
        id: 'visitor',
        title: 'Smart Visitor',
        icon: ShieldCheck,
        bg: '#E0F2FE', // Sky Blue
        border: '#BAE6FD',
        color: '#0369A1',
      },
      {
        id: 'delivery',
        title: 'Courier & Delivery',
        icon: PackageCheck,
        bg: '#F3E8FF', // Soft Lavender
        border: '#DDD6FE',
        color: '#7C3AED',
      },
      {
        id: 'support',
        title: '24/7 Support',
        icon: Headphones,
        bg: '#F1EBE3', // Warm Beige
        border: '#DFD2C2',
        color: THEME.colors.darkBrown,
      },
    ];

    return (
      <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
        {renderHeader(1)}

        <View style={styles.slide2Body}>
          {/* Feature Cards: One Card Per Line, Alternating Offset */}
          <View style={styles.cardsOnePerLineList}>
            {featureChips.map((chip, index) => {
              const IconComp = chip.icon;
              const isOffset = index % 2 === 1; // 1st initial (0), 2nd left margin (1), 3rd initial (2)...
              return (
                <View
                  key={chip.id}
                  style={[
                    styles.featureChipCardFull,
                    {
                      backgroundColor: chip.bg,
                      borderColor: chip.border,
                      marginLeft: isOffset ? 44 : 0,
                      marginRight: isOffset ? 0 : 44,
                    },
                  ]}
                >
                  <View style={styles.chipIconBubble}>
                    <IconComp size={19} color={chip.color} strokeWidth={2.4} />
                  </View>
                  <Text style={[styles.chipCardTitleFull, { color: chip.color }]} numberOfLines={1}>
                    {chip.title}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Description & Heading */}
          <View style={styles.slide2TextContent}>
            <Text style={styles.slide2Heading}>
              A smarter way to manage your residential community.
            </Text>
            <Text style={styles.slide2Description}>
              Stay connected with your neighbours, manage daily society activities, and enjoy a safer, more organized living experience — all in one place.
            </Text>
          </View>
        </View>

        {renderBottomBar(1, false)}
      </View>
    );
  };

  // -------------------------------------------------------------
  // SLIDE 3: "Transform Your Society into a Smarter Community."
  // -------------------------------------------------------------
  const renderSlide3 = () => (
    <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
      {renderHeader(2)}

      <View style={styles.slide3Body}>
        {/* Visual Mockup with community-hero.jpg */}
        <View style={styles.slide3ImageCard}>
          <Image
            source={require('../assets/images/community-hero.jpg')}
            style={styles.slideHeroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlayGradient} />
        </View>



        {/* Lower Heading & Subtitle */}
        <View style={styles.slide3TextContent}>
          <Text style={styles.slide3Heading}>
            Transform Your Society into a Smarter Community.
          </Text>
          <Text style={styles.slide3Description}>
            Everything you need for effortless gate security, household management, and connected residential living.
          </Text>
        </View>
      </View>

      {renderBottomBar(2, true)}
    </View>
  );

  const slides = [
    { key: 'slide1', render: renderSlide1 },
    { key: 'slide2', render: renderSlide2 },
    { key: 'slide3', render: renderSlide3 },
  ];

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.colors.background} translucent />

      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => item.render()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background, // Sandy Beige (#F5F0E6)
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },

  // -------------------------------------------------------------
  // CONSISTENT TOP HEADER (IDENTICAL ON ALL 3 SCREENS)
  // -------------------------------------------------------------
  slideTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    minHeight: 48,
  },
  brandRowSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtnHeader: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(214, 194, 161, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  brandLogoSquare: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.clay,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  brandTitleText: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    letterSpacing: 1.2,
  },
  headerSkipText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.clayDark,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  // -------------------------------------------------------------
  // SLIDE 1 STYLES
  // -------------------------------------------------------------
  slide1Body: {
    flex: 1,
    justifyContent: 'space-evenly',
    paddingVertical: 10,
  },
  slide1HeadingWrap: {
    gap: 8,
  },
  slide1Heading: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  slide1SubHeading: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    fontWeight: '500',
  },
  slide1ImageCard: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.38,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: THEME.colors.white,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.float,
    position: 'relative',
  },
  slideHeroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlayGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(64, 54, 48, 0.16)',
  },
  floatingTagPill: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.card,
  },
  floatingTagText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },

  // -------------------------------------------------------------
  // SLIDE 2 STYLES (MATCHING REFERENCE IMAGE 2)
  // -------------------------------------------------------------
  slide2Body: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 14,
  },
  cardsOnePerLineList: {
    gap: 10,
    width: '100%',
  },
  featureChipCardFull: {
    width: SCREEN_WIDTH - 48 - 44,
    height: 54,
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: '#403630',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  chipIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  chipCardTitleFull: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    backgroundColor: 'transparent',
  },
  slide2TextContent: {
    gap: 8,
    paddingBottom: 4,
  },
  slide2Heading: {
    fontSize: 25,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  slide2Description: {
    fontSize: 13.5,
    color: THEME.colors.textMuted,
    lineHeight: 20,
    fontWeight: '500',
  },

  // -------------------------------------------------------------
  // SLIDE 3 STYLES
  // -------------------------------------------------------------
  slide3Body: {
    flex: 1,
    justifyContent: 'space-evenly',
    paddingVertical: 6,
  },
  slide3ImageCard: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.30,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: THEME.colors.white,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.card,
  },
  societyHighlightCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: THEME.colors.white,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.card,
  },
  highlightIconSquare: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(107, 142, 90, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTextCol: {
    flex: 1,
  },
  highlightCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 2,
  },
  highlightCardSub: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    lineHeight: 16,
    fontWeight: '500',
  },
  slide3TextContent: {
    gap: 6,
  },
  slide3Heading: {
    fontSize: 23,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  slide3Description: {
    fontSize: 12.5,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    fontWeight: '500',
  },

  // -------------------------------------------------------------
  // CONSISTENT BOTTOM BAR & ACTION BUTTON (IDENTICAL ON ALL 3 SCREENS)
  // -------------------------------------------------------------
  slideBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    minHeight: 56,
  },
  paginationDotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dotPill: {
    height: 8,
    borderRadius: 4,
  },
  dotInactive: {
    width: 8,
    backgroundColor: THEME.colors.sand,
  },
  dotPillActive: {
    width: 24,
    backgroundColor: THEME.colors.clay,
  },
  actionArrowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    ...THEME.shadows.button,
  },
  actionArrowBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: THEME.colors.white,
    letterSpacing: 0.3,
  },
});
