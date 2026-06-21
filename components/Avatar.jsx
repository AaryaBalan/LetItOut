import { Image } from "expo-image";

const getAvatarUrl = (seed) =>
    `https://api.dicebear.com/9.x/lorelei/png?seed=${seed}`;

export default function Avatar({ seed, size = 40, style, square = false, bgColor = "#EFE8FF" }) {
    let actualSeed = seed;
    let actualBg = bgColor;
    
    // Support saving both seed and color in the database field
    if (typeof seed === 'string' && seed.includes('|')) {
        const parts = seed.split('|');
        actualSeed = parts[0];
        if (parts[1]) actualBg = parts[1];
    }

    const borderRadius = square ? 12 : size / 2;

    return (
        <Image
            source={{ uri: getAvatarUrl(actualSeed || "default") }}
            style={[
                {
                    width: size,
                    height: size,
                    borderRadius: borderRadius,
                    backgroundColor: actualBg },
                style,
            ]}
        />
    );
}
