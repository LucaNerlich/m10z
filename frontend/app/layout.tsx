import '../src/styles/global.css';
import Header from '@/app/Header';
import Footer from '@/app/Footer';

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
        </body>
        </html>
    );
}
