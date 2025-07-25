import React from 'react'
// @ts-ignore
import styles from './SingleFormat.module.css'
// @ts-ignore
import Link from '@docusaurus/Link'

interface SingleFormatProps {
    title: string,
    link: string,
    imagePath?: string,
    children?: any
}

export default function SingleFormat(props: SingleFormatProps): React.ReactElement {
    return (
        <article className={styles.wrapper}>
            <h2>{props.title ?? 'I am a SingleFormat'}</h2>
            {props.imagePath && (
                <div className={styles.imageContainer}>
                    <img src={props.imagePath} alt={props.title} />
                </div>
            )}
            <div className={styles.content}>
                {props.children}
            </div>
            {props.link && (
                <Link to={props.link} className={styles.linkButton}>
                    Alle Posts dieser Kategorie
                </Link>
            )}
        </article>
    )
}
