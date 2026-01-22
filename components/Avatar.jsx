import { Image } from "expo-image";

const getAvatarUrl = (seed) =>
    `https://api.dicebear.com/9.x/lorelei/png?seed=${seed}`;

export default function Avatar({ seed, size = 40, style, square = false }) {
    const borderRadius = square ? 12 : size / 2;

    return (
        <Image
            source={{ uri: getAvatarUrl(seed || "default") }}
            style={[
                {
                    width: size,
                    height: size,
                    borderRadius: borderRadius,
                    backgroundColor: "#EFE8FF",
                },
                style,
            ]}
        />
    );
}
