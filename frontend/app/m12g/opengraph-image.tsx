import {ImageResponse} from 'next/og';

import {OgImageFrame, truncateToLength} from '@/src/lib/og/contentOgImage';
import {getM12GArchive} from '@/src/lib/m12g/m12gArchive';
import {computeM12GStats} from '@/src/lib/m12g/m12gStats';
import {getErrorMessage} from '@/src/lib/errors';

export const alt = 'M12G Statistik – Mindestens 10 Zeichen';
export const size = {width: 1200, height: 630};
export const contentType = 'image/png';

export default async function Image() {
    let top3: {name: string; totalVotes: number}[] = [];
    try {
        const archive = await getM12GArchive();
        const stats = computeM12GStats(archive);
        top3 = stats.leaderboard.slice(0, 3).map((e) => ({name: e.name, totalVotes: e.totalVotes}));
    } catch (error) {
        // Fall back to a generic card if data can't be loaded, but keep the failure observable.
        console.error('M12G OG image: failed to load archive:', getErrorMessage(error));
    }

    return new ImageResponse(
        (
            <OgImageFrame label="M12G">
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        height: '100%',
                        marginTop: '20px',
                    }}>
                    <div style={{fontSize: '48px', fontWeight: 700, marginBottom: '32px', lineHeight: 1.1}}>
                        All-Time Top 3
                    </div>

                    {top3.length === 0 ? (
                        <div style={{fontSize: '28px', color: 'rgba(255, 255, 255, 0.7)'}}>
                            Mindestens 12 Games – monatliche Community-Abstimmungen
                        </div>
                    ) : (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                            {top3.map((entry, i) => (
                                <div
                                    key={entry.name}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '24px',
                                    }}>
                                    <div
                                        style={{
                                            fontSize: '52px',
                                            fontWeight: 700,
                                            color: i === 0 ? '#ff6b35' : 'rgba(255, 255, 255, 0.4)',
                                            width: '70px',
                                            textAlign: 'right',
                                        }}>
                                        {`#${i + 1}`}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '36px',
                                            fontWeight: 700,
                                            flex: 1,
                                            overflow: 'hidden',
                                        }}>
                                        {truncateToLength(entry.name, 38)}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '28px',
                                            color: 'rgba(255, 255, 255, 0.7)',
                                        }}>
                                        {`${entry.totalVotes} Stimmen`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </OgImageFrame>
        ),
        size,
    );
}
