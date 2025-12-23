import localFont from 'next/font/local';

// Poppins font
export const poppins = localFont({
    src: [
        {
            path: '../../public/fonts/Poppins-Regular.woff2',
            weight: '400',
            style: 'normal',
        },
        {
            path: '../../public/fonts/Poppins-Bold.woff2',
            weight: '700',
            style: 'normal',
        },
    ],
    display: 'swap',
    variable: '--font-poppins',
    preload: true, // Preload default font
});

// Monaspace variable fonts
export const argon = localFont({
    src: [
        {
            path: '../../public/fonts/MonaspaceArgonVar.woff2',
        },
    ],
    display: 'swap',
    variable: '--font-argon',
    preload: false,
});

export const krypton = localFont({
    src: [
        {
            path: '../../public/fonts/MonaspaceKryptonVar.woff2',
        },
    ],
    display: 'swap',
    variable: '--font-krypton',
    preload: false,
});

export const neon = localFont({
    src: [
        {
            path: '../../public/fonts/MonaspaceNeonVar.woff2',
        },
    ],
    display: 'swap',
    variable: '--font-neon',
    preload: false,
});

export const radon = localFont({
    src: [
        {
            path: '../../public/fonts/MonaspaceRadonVar.woff2',
        },
    ],
    display: 'swap',
    variable: '--font-radon',
    preload: false,
});

export const xenon = localFont({
    src: [
        {
            path: '../../public/fonts/MonaspaceXenonVar.woff2',
        },
    ],
    display: 'swap',
    variable: '--font-xenon',
    preload: false,
});

