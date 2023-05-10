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
            <h2 className={styles.headline}>{props.author.name}</h2>
            <img src={props.author.image_url} alt={props.author.name} width='200px' />
            {props.author?.title &&
                <em>{props.author?.title}</em>
            }
            <a href={props.author.url}>Alle Posts</a>
        </div>
    )
}
