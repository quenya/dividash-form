import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    Calendar,
    Database,
    PlusCircle,
    Moon,
    Sun,
    PieChart,
    LineChart,
    List,
    LogOut
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';
import '../styles/App.css';

function Layout({ children, currentPage, setPage }) {
    const { isDarkMode, toggleTheme } = useTheme();
    const { user, signOut } = useAuth();
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
        { id: 'etf', label: 'ETF 분석', icon: List },
        { id: 'simulator', label: '시뮬레이터', icon: LineChart },
        { id: 'data', label: '데이터', icon: Database },
        { id: 'add', label: '입력', icon: PlusCircle },
    ];

    const isActive = (id) => currentPage === id || (id === 'add' && ['form', 'ocr', 'text'].includes(currentPage));
    const goTo = (id) => setPage(id === 'add' ? 'form' : id);
    const themeLabel = isDarkMode ? '라이트 모드' : '다크 모드';

    if (isMobile) {
        return (
            <div className="app-mobile-shell">
                <header className="app-mobile-header">
                    <h3>DiviDash</h3>
                    <div className="app-mobile-actions">
                        <NotificationCenter alignment="right" />
                        <button type="button" className="app-icon-button" onClick={toggleTheme} aria-label={`${themeLabel}로 전환`}>
                            {isDarkMode ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
                        </button>
                        <button type="button" className="app-icon-button" onClick={signOut} aria-label="로그아웃">
                            <LogOut size={20} aria-hidden="true" />
                        </button>
                    </div>
                </header>

                <main className="app-mobile-main">
                    {children}
                </main>

                <nav className="app-bottom-nav" aria-label="주 메뉴">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            type="button"
                            className={`app-bottom-nav-item${isActive(item.id) ? ' is-active' : ''}`}
                            aria-current={isActive(item.id) ? 'page' : undefined}
                            onClick={() => goTo(item.id)}
                        >
                            <item.icon size={24} aria-hidden="true" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
            </div>
        );
    }

    // Desktop Layout
    return (
        <div className="app-shell">
            <aside className="app-sidebar">
                <div className="app-brand">
                    <h2>DiviDash</h2>
                    <NotificationCenter alignment="left" />
                </div>

                <nav className="app-nav" aria-label="주 메뉴">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            type="button"
                            className={`app-nav-item${isActive(item.id) ? ' is-active' : ''}`}
                            aria-current={isActive(item.id) ? 'page' : undefined}
                            onClick={() => goTo(item.id)}
                        >
                            <item.icon size={20} aria-hidden="true" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="app-sidebar-footer">
                    {user?.email && (
                        <div className="app-user-email" title={user.email}>
                            {user.email}
                        </div>
                    )}
                    <button type="button" className="app-sidebar-action" onClick={toggleTheme}>
                        {isDarkMode ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
                        <span>{themeLabel}</span>
                    </button>
                    <button type="button" className="app-sidebar-action" onClick={signOut}>
                        <LogOut size={20} aria-hidden="true" />
                        <span>로그아웃</span>
                    </button>
                </div>
            </aside>

            <main className="app-main">
                {children}
            </main>
        </div>
    );
}

export default Layout;
