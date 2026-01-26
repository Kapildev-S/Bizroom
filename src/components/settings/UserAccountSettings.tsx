"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser, type User } from "firebase/auth";
import { Loader2, User as UserIcon, Lock, AlertTriangle, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Schema for profile update
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
});

// Schema for password update
const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Password must be at least 6 characters."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords do not match.",
  path: ["confirmPassword"],
});

interface UserAccountSettingsProps {
    currentUser: User | null;
}

export default function UserAccountSettings({ currentUser }: UserAccountSettingsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Profile Form
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: currentUser?.displayName || "" },
  });

  // Password Form
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const handleProfileUpdate = async (values: z.infer<typeof profileSchema>) => {
    if (!currentUser) return;
    try {
      await updateProfile(currentUser, { displayName: values.name });
      // Here you might also want to update the profile photo if that logic is added
      toast({ title: "Profile Updated", description: "Your name has been successfully updated." });
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    }
  };
  
  const handlePasswordUpdate = async (values: z.infer<typeof passwordSchema>) => {
    if (!currentUser || !currentUser.email) return;
    
    const credential = EmailAuthProvider.credential(currentUser.email, values.currentPassword);
    
    try {
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, values.newPassword);
      toast({ title: "Password Updated", description: "Your password has been changed successfully." });
      passwordForm.reset();
    } catch (error: any) {
      console.error("Password update error:", error);
      toast({ variant: "destructive", title: "Update Failed", description: error.code === 'auth/wrong-password' ? 'The current password is incorrect.' : error.message });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({ variant: "destructive", title: "Logout Failed", description: "Could not log you out. Please try again." });
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser || deleteConfirmation !== 'DELETE') return;
    setIsDeleting(true);
    try {
        await deleteUser(currentUser);
        toast({ title: "Account Deleted", description: "Your account has been permanently deleted." });
        router.push('/auth/signup');
    } catch (error: any) {
        console.error("Account deletion error:", error);
        toast({ variant: "destructive", title: "Deletion Failed", description: "This is a sensitive operation and may require a recent login. Please log out and log back in before trying again." });
    } finally {
        setIsDeleting(false);
    }
  };


  if (!currentUser) {
    return <Card><CardContent>User not found. Please log in again.</CardContent></Card>;
  }

  return (
    <div className="space-y-8">
        <Card className="shadow-lg">
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)}>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><UserIcon /> Profile Information</CardTitle>
                <CardDescription>Update your personal details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl><Input value={currentUser.email || ''} readOnly disabled /></FormControl>
                    <FormDescription>Email address cannot be changed.</FormDescription>
                </FormItem>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                  {profileForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Profile
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <Card className="shadow-lg">
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordUpdate)}>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Lock /> Change Password</CardTitle>
                <CardDescription>Update your account password.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl><Input type="password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl><Input type="password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl><Input type="password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                  {passwordForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      
      <Card className="shadow-lg border-destructive">
        <CardHeader>
          <CardTitle className="font-headline text-destructive flex items-center gap-2"><AlertTriangle /> Danger Zone</CardTitle>
          <CardDescription>These actions are irreversible. Please proceed with caution.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
            <Button variant="outline" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" /> Logout</Button>
            <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and all associated data, including customers, products, and invoices.
                    <br/><br/>
                    To confirm, please type <strong>DELETE</strong> in the box below.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <Input 
                    id="delete-confirm" 
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder='Type DELETE to confirm'
                    className="mt-2"
                />
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                    className="bg-destructive hover:bg-destructive/90"
                >
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete My Account
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
