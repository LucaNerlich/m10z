import React from 'react';
import {AuthorType} from '../types/authorType';
// @ts-ignore
import styles from './Author.module.css';

interface AuthorProps {
    author: AuthorType;
}

export default function Author(props: AuthorProps) {
    return (
        <article className={styles.author}>
            <div className={styles.wrapper}>
                <div className={styles.imageContainer}>
                    {props.author.image_url && (
                        <img className={styles.image} src={props.author.image_url} alt={props.author.name} />
                    )}
                </div>
                
                <a className={styles.nameLink} href={`/authors/${props.author.id}`}>
                    <h3 className={styles.headline}>{props.author.name}</h3>
                </a>
                
                <div className={styles.username}>@{props.author.id}</div>
                
                {props.author?.description && (
                    <div className={styles.description}>{props.author.description}</div>
                )}
                
                <hr className={styles.divider} />
                
                <a className={styles.link} href={`/authors/${props.author.id}`}>
                    Alle Posts anzeigen
                </a>
            </div>
        </article>
    );
}
