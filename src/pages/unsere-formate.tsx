import React from 'react'
// @ts-ignore
import styles from './unsere-formate.module.scss'
import Layout from '@theme/Layout'
import SingleFormat from '../components/SingleFormat'

export default function Formate() {
    return (
        <Layout title='Unsere Formate' description='Welche Formate wir im Programm haben'>
            <div className={styles.wrapper}>
                <h1 className={styles.headline}>Unsere Formate</h1>
                <SingleFormat title='Fundbüro' link='/tags/fundbuero' />
                <SingleFormat title='Ginas Gedankensuppe' link='/tags/gedankensuppe' />
                <SingleFormat title='Metaebene' link='/tags/metaebene' />
                <SingleFormat title='Mindestens 10 Zeichen' link='/tags/m-10-z' />
                <SingleFormat title='Once we were Gamers' link='/tags/owwg' />
                <SingleFormat title='Virtuelle Verse' link='/tags/lyrik' />
            </div>
        </Layout>
    )
}
