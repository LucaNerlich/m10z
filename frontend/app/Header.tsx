import React from 'react';

interface HeaderProps {
}

export default function Header(props: Readonly<HeaderProps>): React.ReactElement {
    return (
        <>
            <p>I am a Header</p>
        </>
    );
}
