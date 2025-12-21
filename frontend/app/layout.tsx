import '../src/styles/global.css';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import UmamiAnalytics from '@/src/components/UmamiAnalytics';
import {ContentLayout} from '@/app/ContentLayout';

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="de">
        <body>
        <Header />
        <main>
            <ContentLayout>
                {children}
            </ContentLayout>
        </main>
        <Footer />
        <UmamiAnalytics />
        </body>
        </html>
    );
}
