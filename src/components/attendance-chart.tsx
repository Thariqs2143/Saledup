
'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';

export type ChartData = {
    date: string;
    'On-time'?: number;
    'Late'?: number;
    'New Shops'?: number;
    'New Employees'?: number;
};

interface AttendanceChartProps {
    data: ChartData[];
}

export function AttendanceChart({ data }: AttendanceChartProps) {
    // Determine which keys are present in the first data object to dynamically render bars
    const dataKeys = data.length > 0 ? Object.keys(data[0]).filter(key => key !== 'date') : [];

    const barColors: { [key: string]: string } = {
        'On-time': 'hsl(var(--primary))',
        'Late': 'hsl(var(--destructive))',
        'New Shops': 'hsl(var(--chart-1))',
        'New Employees': 'hsl(var(--chart-2))',
    };

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                        dataKey="date" 
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                        cursor={{ fill: 'hsl(var(--muted))' }}
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: 'var(--radius)'
                        }}
                    />
                    <Legend
                        iconType="circle"
                        iconSize={10}
                        wrapperStyle={{
                            paddingTop: '20px'
                        }}
                    />
                    {dataKeys.map(key => (
                        <Bar key={key} dataKey={key} fill={barColors[key] || '#8884d8'} radius={[4, 4, 0, 0]} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
