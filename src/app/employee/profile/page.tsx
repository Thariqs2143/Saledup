import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LogOut, Edit } from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const employeeInfo = {
  id: 'E-002',
  name: 'Bob Williams',
  email: 'bob@example.com',
  phone: '123-456-7890',
};

export default function ProfilePage() {
  const placeholder = PlaceHolderImages[1];

  return (
    <div className="p-4 space-y-6 sm:p-6">
      <div className="flex flex-col items-center space-y-4 pt-8">
        <Avatar className="h-24 w-24 border-2 border-primary">
          <AvatarImage
            src={placeholder.imageUrl}
            data-ai-hint={placeholder.imageHint}
          />
          <AvatarFallback className="text-3xl">
            {employeeInfo.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h1 className="text-2xl font-bold">{employeeInfo.name}</h1>
          <p className="text-muted-foreground">{employeeInfo.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Employee ID</span>
            <span className="font-medium">{employeeInfo.id}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Phone</span>
            <span className="font-medium">{employeeInfo.phone}</span>
          </div>
        </CardContent>
      </Card>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Edit className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" defaultValue={employeeInfo.name} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" defaultValue={employeeInfo.phone} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
