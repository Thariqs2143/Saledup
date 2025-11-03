export type Employee = {
    id: string;
    name: string;
    email: string;
    status: 'active' | 'inactive';
};

export const mockEmployees: Employee[] = [
    { id: 'E-001', name: 'Alice Johnson', email: 'alice@example.com', status: 'active' },
    { id: 'E-002', name: 'Bob Williams', email: 'bob@example.com', status: 'active' },
    { id: 'E-003', name: 'Charlie Brown', email: 'charlie@example.com', status: 'inactive' },
    { id: 'E-004', name: 'Diana Miller', email: 'diana@example.com', status: 'active' },
    { id: 'E-005', name: 'Ethan Davis', email: 'ethan@example.com', status: 'active' },
    { id: 'E-006', name: 'Fiona Garcia', email: 'fiona@example.com', status: 'inactive' },
];

export type AttendanceRecord = {
    id: string;
    date: string;
    time: string;
};

export const mockAttendanceHistory: AttendanceRecord[] = [
    { id: 'A-001', date: '2024-07-21', time: '09:02 AM' },
    { id: 'A-002', date: '2024-07-20', time: '08:58 AM' },
    { id: 'A-003', date: '2024-07-19', time: '09:05 AM' },
    { id: 'A-004', date: '2024-07-18', time: '08:55 AM' },
    { id: 'A-005', date: '2024-07-17', time: '09:01 AM' },
    { id: 'A-006', date: '2024-07-16', time: '09:00 AM' },
    { id: 'A-007', date: '2024-07-15', time: '08:59 AM' },
];
