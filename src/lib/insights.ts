
import type { User } from '@/app/admin/employees/page';
import { Timestamp } from 'firebase/firestore';

type AttendanceRecord = {
  id: string;
  userId: string;
  userName: string;
  checkInTime: Timestamp;
  checkOutTime?: Timestamp;
  status: 'On-time' | 'Late' | 'Manual' | 'Absent';
};

export const generateWeeklyBriefing = (employees: User[], weeklyAttendance: AttendanceRecord[]): string => {
    if (employees.length === 0) {
        return "No employee data available to generate a briefing.";
    }
    
    if (weeklyAttendance.length === 0) {
        return "There were no attendance records last week, so no briefing could be generated. Keep encouraging your team to check in!";
    }

    const onTimeCheckIns = weeklyAttendance.filter(r => r.status === 'On-time').length;
    const totalCheckIns = weeklyAttendance.length;
    const punctuality = totalCheckIns > 0 ? Math.round((onTimeCheckIns / totalCheckIns) * 100) : 0;

    const pointsMap = new Map<string, number>();
    const lateMap = new Map<string, number>();

    weeklyAttendance.forEach(record => {
        if (record.status === 'On-time') {
            pointsMap.set(record.userId, (pointsMap.get(record.userId) || 0) + 10);
        } else if (record.status === 'Late') {
            pointsMap.set(record.userId, (pointsMap.get(record.userId) || 0) - 5);
            lateMap.set(record.userId, (lateMap.get(record.userId) || 0) + 1);
        }
    });

    let topPerformerId: string | null = null;
    let maxPoints = -Infinity;
    pointsMap.forEach((points, userId) => {
        if (points > maxPoints) {
            maxPoints = points;
            topPerformerId = userId;
        }
    });
    const topPerformer = employees.find(e => e.id === topPerformerId);
    
    let attentionEmployeeId: string | null = null;
    let maxLates = 0;
    lateMap.forEach((lates, userId) => {
        if (lates > maxLates && lates > 1) { // Only flag if more than 1 late day
            maxLates = lates;
            attentionEmployeeId = userId;
        }
    });
    const attentionEmployee = employees.find(e => e.id === attentionEmployeeId);

    // Build the briefing string
    let briefing = `Good morning! Here is your summary for the past week:\n\n`;
    briefing += `• **Team Punctuality:** Your team's overall on-time performance was **${punctuality}%** across ${totalCheckIns} total check-ins.\n`;

    if (topPerformer) {
        briefing += `• **Top Performer:** **${topPerformer.name}** showed great commitment, earning the most points this week!\n`;
    } else {
        briefing += `• **Top Performer:** No standout top performer this week. A great opportunity to motivate the team!\n`;
    }

    if (attentionEmployee) {
        briefing += `• **Area for Attention:** **${attentionEmployee.name}** was late ${maxLates} times. This might be a good opportunity for a quick, supportive chat to ensure everything is okay.\n`;
    } else {
        briefing += `• **Areas for Attention:** Great work! No employees were consistently late this week.\n`;
    }

    briefing += `\nKeep up the great work motivating your team!`;

    return briefing;
};
