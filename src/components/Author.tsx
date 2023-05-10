import React from 'react'
import {AuthorType} from '../types/authorType'

interface AuthorProps {
    author: AuthorType;
}

export default function Author(props: AuthorProps): JSX.Element {
    return (
        <>
            <h4>{props.author.name}</h4>
        </>
    )
}
