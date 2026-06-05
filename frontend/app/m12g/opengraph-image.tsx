import {ImageResponse} from 'next/og';

import {getM12GArchive} from '@/src/lib/m12g/m12gArchive';
import {computeM12GStats} from '@/src/lib/m12g/m12gStats';

export const alt = 'M12G Statistik – Mindestens 10 Zeichen';
export const size = {width: 1200, height: 630};
export const contentType = 'image/png';

export default async function Image() {
    let top3: {name: string; totalVotes: number}[] = [];
    try {
        const archive = await getM12GArchive();
        const stats = computeM12GStats(archive);
        top3 = stats.leaderboard.slice(0, 3).map((e) => ({name: e.name, totalVotes: e.totalVotes}));
    } catch {
        // Fall back to a generic card if data can't be loaded.
    }

    function truncate(name: string, limit: number): string {
        return name.length > limit ? name.slice(0, limit - 1) + '…' : name;
    }

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '60px',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                    color: '#ffffff',
                }}>
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '6px',
                        background: '#ff6b35',
                    }}
                />

                <div
                    style={{
                        position: 'absolute',
                        top: '40px',
                        left: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}>
                    <div style={{fontSize: '24px', fontWeight: 700, color: '#ff6b35', letterSpacing: '0.02em'}}>
                        m10z.de
                    </div>
                    <div style={{fontSize: '18px', color: 'rgba(255, 255, 255, 0.5)', marginLeft: '8px'}}>
                        M12G
                    </div>
                </div>

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
                                        {truncate(entry.name, 38)}
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
            </div>
        ),
        size,
    );
}
