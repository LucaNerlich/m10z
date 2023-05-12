import React from 'react'
import {AuthorType} from '../types/authorType'
// @ts-ignore
import styles from './Author.module.scss'

interface AuthorProps {
    author: AuthorType;
}

export default function Author(props: AuthorProps): JSX.Element {
    return (
        <div className={styles.author}>
            <div className={styles.wrapper}>
                <h2 className={styles.headline}>{props.author.name}</h2>
                {props.author.image_url &&
                    <img className={styles.image} src={props.author.image_url} alt={props.author.name} />
                }
                <em>{props.author.id}</em>
                <hr />
                <a className={styles.link} href={props.author.url}>Alle Posts 🔗</a>
                {props.author?.title &&
                    <em>{props.author?.title}</em>
                }
            </div>
        </div>
    )
}
