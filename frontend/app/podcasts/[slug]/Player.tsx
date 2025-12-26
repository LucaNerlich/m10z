'use client';

import React from 'react';
import ReactPlayer from 'react-player';
import styles from './Player.module.css';

type PlayerProps = {
    src: string;
};

type ReactPlayerProps = React.ComponentProps<typeof ReactPlayer>;

export function PodcastPlayer({src}: PlayerProps) {
    if (!src) return null;

    const playerProps: ReactPlayerProps = {
        src: src,
        width: '100%',
        height: '50px',
        controls: true,
    };

    return (
        <div className={styles.player}>
            <ReactPlayer {...playerProps} />
        </div>
    );
}

