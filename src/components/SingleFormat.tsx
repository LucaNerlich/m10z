import React from 'react'
// @ts-ignore
import styles from './SingleFormat.module.scss'
import Link from '@docusaurus/Link'

interface SingleFormatProps {
    title: string,
    link: string,
    imagePath?: string,
    children?: any
}

export default function SingleFormat(props: SingleFormatProps): React.ReactElement {
    return (
        <div className={styles.wrapper}>
            <h2>{props.title ?? 'I am a SingleFormat'}</h2>
            {props.imagePath &&
                <img src={props.imagePath} alt={props.title} />
            }
            <div className={styles.content}>
                {props.children}
            </div>
            {props.link &&
                <Link to={props.link}>
                    <p>Alle Posts dieser Kategorie</p>
                </Link>
            }
        </div>
    )
}
