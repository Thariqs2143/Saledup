import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LogOut, FileDown } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="p-4 space-y-6 sm:p-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Business Hours</CardTitle>
          <CardDescription>Configure default attendance windows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="default-start-time">Default Start Time</Label>
            <Input id="default-start-time" type="time" defaultValue="09:00" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="default-end-time">Default End Time</Label>
            <Input id="default-end-time" type="time" defaultValue="17:00" />
          </div>
          <Button className="w-full">Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
          <CardDescription>Export attendance data in CSV format.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full">
            <FileDown className="mr-2 h-4 w-4" /> Export Data (CSV)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Manage notification preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <Label htmlFor="reminders" className="flex flex-col space-y-1">
              <span>Attendance Reminders</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Send reminders to employees.
              </span>
            </Label>
            <Switch id="reminders" defaultChecked />
          </div>
        </CardContent>
      </Card>

      <div className="pt-4">
        <Button asChild variant="destructive" className="w-full">
          <Link href="/">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Link>
        </Button>
      </div>
    </div>
  );
}
