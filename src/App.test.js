// Mock Chart.js and plugins BEFORE importing components
jest.mock('chart.js', () => ({
    Chart: { register: jest.fn() },
    CategoryScale: jest.fn(),
    LinearScale: jest.fn(),
    BarElement: jest.fn(),
    Title: jest.fn(),
    Tooltip: jest.fn(),
    Legend: jest.fn(),
    ArcElement: jest.fn()
}));

jest.mock('chartjs-chart-treemap', () => ({
    TreemapController: jest.fn(),
    TreemapElement: jest.fn(),
}));

jest.mock('chartjs-plugin-datalabels', () => ({}));

// Mock react-chartjs-2
jest.mock('react-chartjs-2', () => ({
    Bar: () => <div>Bar Chart Mock</div>,
    Chart: () => <div>Chart Mock</div>,
    Doughnut: () => <div>Doughnut Chart Mock</div>
}));

// Mock react-calendar
jest.mock('react-calendar', () => {
    return function DummyCalendar(props) {
        return <div>Calendar Mock</div>;
    };
});

// Mock the hook with __esModule: true
jest.mock('./hooks/useDividendData', () => ({
    __esModule: true,
    useDividendData: jest.fn(() => ({
        data: [],
        loading: false,
        error: null,
        exchangeRate: 1300,
        tickersMap: {}
    }))
}));

jest.mock('./api/supabaseClient', () => ({
    supabase: {
        auth: {
            getSession: () => Promise.resolve({ data: { session: null } }),
            onAuthStateChange: () => ({
                data: {
                    subscription: {
                        unsubscribe: jest.fn()
                    }
                }
            }),
            signInWithPassword: () => Promise.resolve({ error: null }),
            signUp: () => Promise.resolve({ error: null }),
            signOut: () => Promise.resolve({ error: null })
        }
    }
}));

import { render, screen } from '@testing-library/react';
import App from './App';

test('renders authentication gate before dashboard access', async () => {
    render(<App />);

    expect(await screen.findByText(/DiviDash 로그인/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/이메일/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/비밀번호/i)).toBeInTheDocument();
});
