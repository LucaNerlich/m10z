import React from 'react';
import {AuthorType} from '../types/authorType';
// @ts-ignore
import styles from './Author.module.css';

interface AuthorProps {
    author: AuthorType;
}

export default function Author(props: AuthorProps) {
    return (
        <div className={styles.author}>
            <div className={styles.wrapper}>
                <a className={styles.link} href={`/authors/${props.author.id}`}>
                    <h2 className={styles.headline}>{props.author.name}</h2>
                </a>
                {props.author.image_url &&
                    <img className={styles.image} src={props.author.image_url} alt={props.author.id} />
                }
                <em>{props.author.id}</em>
                <hr />
                <a className={styles.link} href={`/authors/${props.author.id}`}>Alle Posts 🔗</a>
                {props.author?.description &&
                    <em>{props.author?.description}</em>
                }
            </div>
        </div>
    );
}
