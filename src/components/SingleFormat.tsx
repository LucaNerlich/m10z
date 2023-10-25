import React from 'react'
// @ts-ignore
import styles from './SingleFormat.module.scss'
import Link from '@docusaurus/Link'

interface SingleFormatProps {
    title: string,
    link: string,
    children?: any
}

export default function SingleFormat(props: SingleFormatProps): React.ReactElement {
    return (
        <div className={styles.wrapper}>
            <h2>{props.title ?? 'I am a SingleFormat'}</h2>
            {props.children}
            {props.link &&
                <Link to={props.link}>Alle Posts dieser Kategorie</Link>
            }
        </div>
    )
}
