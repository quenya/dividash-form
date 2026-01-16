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

import { render, screen } from '@testing-library/react';
import App from './App';

test('renders App and Layout elements', () => {
    render(<App />);
    const titleElements = screen.getAllByText(/Dividash/i);
    expect(titleElements.length).toBeGreaterThan(0);

    expect(screen.getByText(/대시보드/i)).toBeInTheDocument();
    expect(screen.getByText(/입력/i)).toBeInTheDocument();
});
