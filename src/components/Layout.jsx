import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    Calendar,
    Database,
    PlusCircle,
    Settings,
    Menu,
    Moon,
    Sun,
    PieChart,
    LineChart
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import NotificationCenter from './NotificationCenter';
import '../styles/App.css';

function Layout({ children, currentPage, setPage }) {
    const { isDarkMode, toggleTheme } = useTheme();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const navItems = [
        { id: 'chart', label: '대시보드', icon: LayoutDashboard },
        { id: 'calendar', label: '캘린더', icon: Calendar },
        { id: 'portfolio', label: '포트폴리오', icon: PieChart },
        { id: 'simulator', label: '시뮬레이터', icon: LineChart },
        { id: 'data', label: '데이터', icon: Database },
        { id: 'add', label: '입력', icon: PlusCircle },
    ];

    const NavContent = () => (
        <>
            <div style={{ marginBottom: '32px', padding: '0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: 'var(--accent-color)' }}>Dividash</h2>
                {!isMobile && <NotificationCenter />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setPage(item.id === 'add' ? 'form' : item.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            borderRadius: '8px',
                            backgroundColor: currentPage === item.id || (item.id === 'add' && ['form', 'ocr', 'text'].includes(currentPage))
                                ? 'var(--accent-color)'
                                : 'transparent',
                            color: currentPage === item.id || (item.id === 'add' && ['form', 'ocr', 'text'].includes(currentPage))
                                ? '#fff'
                                : 'var(--text-secondary)',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            textAlign: 'left',
                            width: '100%',
                            transition: 'all 0.2s'
                        }}
                    >
                        <item.icon size={20} />
                        {(!isMobile || window.innerWidth > 768) && <span>{item.label}</span>}
                    </button>
                ))}
            </div>

            <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)' }}>
                <button
                    onClick={toggleTheme}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        width: '100%',
                        padding: '8px'
                    }}
                >
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    <span>{isDarkMode ? '라이트 모드' : '다크 모드'}</span>
                </button>
            </div>
        </>
    );

    if (isMobile) {
        return (
            <div style={{ paddingBottom: '70px', minHeight: '100vh', background: 'var(--bg-primary)' }}>
                {/* Mobile Header */}
                <div style={{
                    padding: '16px',
                    background: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100
                }}>
                    <h3 style={{ margin: 0 }}>Dividash</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <NotificationCenter />
                        <button onClick={toggleTheme} style={{ background: 'transparent', color: 'var(--text-primary)', padding: 4, border: 'none' }}>
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <main style={{ padding: '16px' }}>
                    {children}
                </main>

                {/* Mobile Bottom Tab */}
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-secondary)',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-around',
                    padding: '8px 0',
                    zIndex: 1000
                }}>
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setPage(item.id === 'add' ? 'form' : item.id)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                color: currentPage === item.id || (item.id === 'add' && ['form', 'ocr', 'text'].includes(currentPage))
                                    ? 'var(--accent-color)'
                                    : 'var(--text-secondary)',
                                fontSize: '0.75rem'
                            }}
                        >
                            <item.icon size={24} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Desktop Layout
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Sidebar */}
            <aside style={{
                width: '250px',
                backgroundColor: 'var(--bg-secondary)',
                borderRight: '1px solid var(--border-color)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                position: 'sticky',
                top: 0,
                height: '100vh'
            }}>
                <NavContent />
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
                {children}
            </main>
        </div>
    );
}

export default Layout;
