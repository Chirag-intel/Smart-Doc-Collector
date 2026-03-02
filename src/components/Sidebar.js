'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { href: '/', icon: '📊', label: 'Dashboard' },
        { href: '/cases/new', icon: '➕', label: 'New Case' },
    ];

    return (
        <aside className="sidebar">
            {/* ─── ABC Capital Logo ─── */}
            <div className="sidebar-logo" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '12px 8px', marginBottom: 28 }}>
                <Image
                    src="/abc-logo.png"
                    alt="Aditya Birla Capital"
                    width={180}
                    height={54}
                    style={{ objectFit: 'contain', width: '100%', maxWidth: 200 }}
                    priority
                />
                <div style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    marginTop: 6,
                    paddingLeft: 4,
                    borderLeft: '2px solid var(--abc-red)',
                    paddingLeft: 8,
                }}>
                    Document Pendency Console
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="env-badge">UAT Environment</div>
            </div>
        </aside>
    );
}
