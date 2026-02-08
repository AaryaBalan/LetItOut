import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

const Loading = ({ size = 'large', color = '#9575cd', style }) => {
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const startRotation = () => {
            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        };

        startRotation();
    }, [rotateAnim]);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // Determine dimensions based on size prop
    const containerSize = size === 'large' ? 60 : 30;
    const logoSize = size === 'large' ? 40 : 20;
    const borderWidth = size === 'large' ? 3 : 2;

    return (
        <View style={[styles.container, { width: containerSize, height: containerSize }, style]}>
            {/* Rotating Ring */}
            <Animated.View
                style={[
                    styles.ring,
                    {
                        width: containerSize,
                        height: containerSize,
                        borderRadius: containerSize / 2,
                        borderWidth: borderWidth,
                        borderColor: color,
                        borderTopColor: 'transparent', // Create the gap for rotation effect
                        transform: [{ rotate: spin }],
                    },
                ]}
            />

            {/* Centered Logo */}
            <View style={[styles.logoContainer, { width: logoSize, height: logoSize, borderRadius: logoSize / 2 }]}>
                <Image
                    source={require('../assets/images/letitout_logo.png')}
                    style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: logoSize / 2,
                    }}
                    resizeMode="cover"
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    ring: {
        position: 'absolute',
    },
    logoContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: 'white', // Optional: background for the logo
    },
});

export default Loading;
