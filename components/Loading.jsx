import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet } from 'react-native';

const Loading = ({ size = 'large', color = '#7C3AED', style }) => {
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const counterRotateAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Fade in entire component on mount
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();

        // Clockwise rotation (Inner ring)
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 1200,
                easing: Easing.bezier(0.4, 0, 0.2, 1),
                useNativeDriver: true,
            })
        ).start();

        // Counter-clockwise rotation (Outer ring)
        Animated.loop(
            Animated.timing(counterRotateAnim, {
                toValue: 1,
                duration: 1800,
                easing: Easing.bezier(0.4, 0, 0.2, 1),
                useNativeDriver: true,
            })
        ).start();

        // Pulsing logo
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0,
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, [rotateAnim, counterRotateAnim, pulseAnim, fadeAnim]);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const spinCounter = counterRotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['360deg', '0deg'],
    });

    const logoScale = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.9, 1.1],
    });

    // Determine dimensions based on size prop
    const containerSize = size === 'large' ? 68 : 36;
    const innerRingSize = size === 'large' ? 54 : 28;
    const logoSize = size === 'large' ? 38 : 20;
    const borderWidth = size === 'large' ? 2.5 : 1.5;

    return (
        <Animated.View style={[styles.container, { width: containerSize, height: containerSize, opacity: fadeAnim }, style]}>
            {/* Outer Counter-Rotating Ring */}
            <Animated.View
                style={[
                    styles.ring,
                    {
                        width: containerSize,
                        height: containerSize,
                        borderRadius: containerSize / 2,
                        borderWidth: borderWidth,
                        borderColor: color,
                        borderTopColor: 'transparent',
                        borderBottomColor: 'transparent',
                        opacity: 0.4,
                        transform: [{ rotate: spinCounter }],
                    },
                ]}
            />

            {/* Inner Main Rotating Ring */}
            <Animated.View
                style={[
                    styles.ring,
                    {
                        width: innerRingSize,
                        height: innerRingSize,
                        borderRadius: innerRingSize / 2,
                        borderWidth: borderWidth,
                        borderColor: color,
                        borderLeftColor: 'transparent',
                        borderRightColor: 'transparent',
                        transform: [{ rotate: spin }],
                    },
                ]}
            />

            {/* Centered Pulsing Logo */}
            <Animated.View style={[styles.logoContainer, { width: logoSize, height: logoSize, borderRadius: logoSize / 2, transform: [{ scale: logoScale }] }]}>
                <Image
                    source={require('../assets/images/letitout_logo.png')}
                    style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: logoSize / 2,
                    }}
                    resizeMode="cover"
                />
            </Animated.View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    ring: {
        position: 'absolute',
    },
    logoContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
});

export default Loading;
