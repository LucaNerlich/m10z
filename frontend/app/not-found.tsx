import {Metadata} from 'next';

export const metadata: Metadata = {
    title: 'Seite nicht gefunden | m10z',
    description: 'Die gesuchte Seite wurde nicht gefunden. Entdecken Sie unser Angebot auf einer unserer anderen Seiten.',
    robots: {
        index: false,
        follow: true,
    },
};

export default function NotFound() {
    return (
        <p>404</p>
    );
}
