import React from 'react'
import {AuthorType} from '../types/authorType'
import styles from './Author.module.scss'

interface AuthorProps {
    author: AuthorType;
}

export default function Author(props: AuthorProps): JSX.Element {
    console.log(props.author)

    return (
        <div className={styles.author}>
            <h4>{props.author.name}</h4>
            <img src={props.author.image_url} alt={props.author.name} width='200px' />
            <a href={props.author.url}>Alle Posts {'-->'}</a>
        </div>
    )
}
