'use client';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { mockAttendanceHistory, type AttendanceRecord } from '@/lib/data';

function AttendanceItem({ record }: { record: AttendanceRecord }) {
  return (
    <div className="flex items-center justify-between p-4 bg-card hover:bg-secondary/50 rounded-lg transition-colors">
      <div>
        <p className="font-semibold">
          {new Date(record.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <p className="text-sm text-muted-foreground">
          Checked in at {record.time}
        </p>
      </div>
      <Badge variant="default">Present</Badge>
    </div>
  );
}

export default function AttendanceHistoryPage() {
  return (
    <div className="p-4 space-y-6 sm:p-6">
      <h1 className="text-2xl font-bold">Attendance History</h1>

      <Tabs defaultValue="week">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
        </TabsList>
        <TabsContent value="week">
          <div className="space-y-2 pt-4">
            {mockAttendanceHistory.slice(0, 5).map((rec) => (
              <AttendanceItem key={rec.id} record={rec} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="month">
          <div className="space-y-2 pt-4">
            {mockAttendanceHistory.map((rec) => (
              <AttendanceItem key={rec.id} record={rec} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
