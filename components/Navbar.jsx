import { Link } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Navbar() {
    return (
        <View style={styles.navbar}>
            <View style={styles.container}>
                <Link href="/" asChild>
                    <TouchableOpacity>
                        <Text style={styles.logo}>Let It Out</Text>
                    </TouchableOpacity>
                </Link>

                <View style={styles.navLinks}>
                    <Link href="/home" asChild>
                        <TouchableOpacity style={styles.navLink}>
                            <Text style={styles.navLinkText}>Home</Text>
                        </TouchableOpacity>
                    </Link>

                    <Link href="/create-post" asChild>
                        <TouchableOpacity style={styles.navLink}>
                            <Text style={styles.navLinkText}>Create Post</Text>
                        </TouchableOpacity>
                    </Link>

                    <Link href="/login" asChild>
                        <TouchableOpacity style={styles.loginButton}>
                            <Text style={styles.loginButtonText}>Login</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    navbar: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    logo: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#6366f1',
    },
    navLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    navLink: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    navLinkText: {
        color: '#374151',
        fontWeight: '500',
    },
    loginButton: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    loginButtonText: {
        color: '#ffffff',
        fontWeight: '500',
    },
});
