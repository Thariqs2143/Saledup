import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { QrCode, Users } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  // Mock data
  const todayAttendanceCount = 34;
  const activeEmployeesCount = 42;

  return (
    <div className="p-4 space-y-6 sm:p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Attendance
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAttendanceCount}</div>
            <p className="text-xs text-muted-foreground">
              marked present today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployeesCount}</div>
            <p className="text-xs text-muted-foreground">
              total active employees
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4">
        <Button
          asChild
          size="lg"
          className="w-full h-16 bg-accent text-accent-foreground hover:bg-accent/90 text-lg"
        >
          <Link href="/admin/qr-code">
            <QrCode className="mr-2 h-6 w-6" />
            Generate QR Code
          </Link>
        </Button>
      </div>
    </div>
  );
}
