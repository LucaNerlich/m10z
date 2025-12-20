import '../src/styles/global.css';
import Header from '@/app/Header';
import Footer from '@/app/Footer';
import UmamiAnalytics from '@/src/components/UmamiAnalytics';

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="de">
        <body>
        <Header />
        {children}
        <Footer />
        <UmamiAnalytics />
        </body>
        </html>
    );
}
