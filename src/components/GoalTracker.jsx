import React, { useState, useEffect, useCallback } from 'react';
import { Target, Edit2, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '../api/supabaseClient';

function GoalTracker({ currentAmount }) {
    const [goal, setGoal] = useState(1000000); // Default fallback
    const [isEditing, setIsEditing] = useState(false);
    const [tempGoal, setTempGoal] = useState(1000000);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchGoal = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_goals')
                .select('value')
                .eq('key', 'monthly_dividend_goal')
                .single();

            if (error) {
                if (error.code !== 'PGRST116') { // Ignore "no rows found"
                    console.error('Error fetching goal:', error);
                }
            } else if (data) {
                setGoal(Number(data.value));
                setTempGoal(Number(data.value));
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGoal();
    }, [fetchGoal]);

    const handleSave = async () => {
        const newGoal = Number(tempGoal);
        if (newGoal <= 0) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('user_goals')
                .upsert({
                    key: 'monthly_dividend_goal',
                    value: newGoal,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            setGoal(newGoal);
            setIsEditing(false);
        } catch (err) {
            console.error('Error saving goal:', err);
            alert('목표 저장 중 오류가 발생했습니다: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const percentage = Math.min(100, Math.max(0, (currentAmount / goal) * 100));

    if (loading) {
        return (
            <div className="card" style={{ flex: 1, minWidth: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px' }}>
                <Loader2 className="animate-spin" color="var(--accent-color)" />
            </div>
        );
    }

    return (
        <div className="card" style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Target size={20} color="var(--accent-color)" />
                    <h4 style={{ margin: 0 }}>월 배당 목표 달성률</h4>
                </div>

                {isEditing ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{ padding: '4px', background: 'transparent', color: '#2ecc71', border: '1px solid #2ecc71', cursor: 'pointer' }}
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        </button>
                        <button
                            onClick={() => { setTempGoal(goal); setIsEditing(false); }}
                            disabled={saving}
                            style={{ padding: '4px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', cursor: 'pointer' }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsEditing(true)}
                        style={{ padding: '4px', background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
                    >
                        <Edit2 size={16} />
                    </button>
                )}
            </div>

            <div style={{ position: 'relative', height: '24px', backgroundColor: 'var(--bg-primary)', borderRadius: '12px', overflow: 'hidden' }}>
                <div
                    style={{
                        width: `${percentage}%`,
                        height: '100%',
                        backgroundColor: percentage >= 100 ? '#2ecc71' : 'var(--accent-color)',
                        transition: 'width 1s ease-in-out'
                    }}
                />
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)',
                    textShadow: '0 0 2px var(--bg-secondary)'
                }}>
                    {percentage.toFixed(1)}%
                </div>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span>현재 월평균: ₩ {currentAmount.toLocaleString()}</span>
                {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>목표: ₩</span>
                        <input
                            type="number"
                            value={tempGoal}
                            onChange={(e) => setTempGoal(e.target.value)}
                            style={{
                                width: '100px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-primary)'
                            }}
                            autoFocus
                        />
                    </div>
                ) : (
                    <span>목표: ₩ {goal.toLocaleString()}</span>
                )}
            </div>
        </div>
    );
}

export default GoalTracker;
