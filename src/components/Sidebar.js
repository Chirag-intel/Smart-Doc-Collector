'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { href: '/', icon: '📊', label: 'Dashboard' },
        { href: '/cases/new', icon: '➕', label: 'New Case' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-icon">T</div>
                <div>
                    <div className="logo-text">Tartan</div>
                    <div className="logo-sub">DocCollect Console</div>
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
                <div className="env-badge">Prototype Environment</div>
            </div>
        </aside>
    );
}
