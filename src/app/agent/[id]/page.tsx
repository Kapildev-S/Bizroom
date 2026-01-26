
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, updateDoc, Timestamp, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MapPin, Phone, ExternalLink, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BillEaseLogo } from '@/components/icons/BillEaseLogo';

type DeliveryTask = {
  id: string;
  customerName: string;
  address: string;
  phone: string;
  status: 'Pending' | 'In Transit' | 'Delivered' | 'Failed';
  createdAt: Timestamp;
  ownerId: string;
  originalTaskId: string;
};

const getStatusBadgeVariant = (status: DeliveryTask['status']) => {
    switch (status) {
        case 'Delivered': return 'default';
        case 'In Transit': return 'secondary';
        case 'Failed': return 'destructive';
        case 'Pending':
        default: return 'outline';
    }
};

export default function AgentDashboardPage() {
    const params = useParams();
    const agentId = params.id as string;
    const { toast } = useToast();

    const [tasks, setTasks] = useState<DeliveryTask[]>([]);
    const [agentName, setAgentName] = useState('Agent'); // Default name
    const [loading, setLoading] = useState(true);
    const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

    const fetchAgentTasks = useCallback(async () => {
        if (!agentId) return;
        setLoading(true);

        try {
            const tasksQuery = query(
                collection(db, `agentTasks/${agentId}/tasks`)
            );
            const tasksSnapshot = await getDocs(tasksQuery);
            const fetchedTasks = tasksSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DeliveryTask));
            
            // Sort tasks by creation date, most recent first
            fetchedTasks.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            
            setTasks(fetchedTasks);
            
            // In a real app, you might fetch agent details separately to get their name.
            // For now, we'll just use a generic title.
            
        } catch (error) {
            console.error("Error fetching tasks:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load delivery tasks. Please check your connection and the link.' });
        } finally {
            setLoading(false);
        }
    }, [agentId, toast]);

    useEffect(() => {
        fetchAgentTasks();
    }, [fetchAgentTasks]);
    
    const handleStatusUpdate = async (task: DeliveryTask, newStatus: DeliveryTask['status']) => {
        setUpdatingTaskId(task.id);
        try {
            // Update the public agent task
            const agentTaskDocRef = doc(db, `agentTasks/${agentId}/tasks`, task.id);
            await updateDoc(agentTaskDocRef, { status: newStatus });
            
            // Also update the original task in the user's private collection
            if (task.ownerId && task.originalTaskId) {
              const originalTaskDocRef = doc(db, `users/${task.ownerId}/deliveryTasks`, task.originalTaskId);
              await updateDoc(originalTaskDocRef, { status: newStatus });
            }

            toast({ title: 'Status Updated', description: `Task marked as ${newStatus}.` });
            fetchAgentTasks(); // Refresh the list
        } catch (error) {
            console.error("Failed to update status:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not update status." });
        } finally {
            setUpdatingTaskId(null);
        }
    };
    
    const openGoogleMaps = (address: string) => {
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        window.open(url, '_blank');
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-muted p-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading tasks...</p>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-muted">
            <header className="bg-background shadow-sm sticky top-0 z-10">
                <div className="container mx-auto p-4 flex justify-between items-center">
                    <BillEaseLogo className="h-8 w-auto" />
                    <h1 className="text-lg font-semibold">Delivery Dashboard</h1>
                </div>
            </header>
            
            <main className="container mx-auto p-4 space-y-4">
                 <h2 className="text-xl font-bold">Your Assigned Deliveries</h2>
                {tasks.length === 0 ? (
                    <Card className="text-center p-8">
                        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                        <CardTitle>All Clear!</CardTitle>
                        <CardDescription>You have no deliveries assigned to you yet.</CardDescription>
                    </Card>
                ) : (
                   <div className="space-y-4">
                        {tasks.map(task => (
                            <Card key={task.id} className="shadow-md">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle>{task.customerName}</CardTitle>
                                            <CardDescription className="flex items-center gap-2 pt-1">
                                                <MapPin className="h-4 w-4" /> {task.address}
                                            </CardDescription>
                                        </div>
                                        <Badge variant={getStatusBadgeVariant(task.status)}>
                                            {task.status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <Phone className="h-4 w-4" />
                                        <a href={`tel:${task.phone}`} className="text-primary hover:underline">{task.phone}</a>
                                    </div>
                                     <div className="mt-4 flex flex-col sm:flex-row gap-2">
                                        <Button onClick={() => openGoogleMaps(task.address)} className="flex-1">
                                            <ExternalLink className="mr-2 h-4 w-4" /> Navigate
                                        </Button>
                                        <Select
                                            onValueChange={(value: DeliveryTask['status']) => handleStatusUpdate(task, value)}
                                            disabled={updatingTaskId === task.id || task.status === 'Delivered' || task.status === 'Failed'}
                                            value={task.status}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Update Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="In Transit">Start Delivery (In Transit)</SelectItem>
                                                <SelectItem value="Delivered">Mark as Delivered</SelectItem>
                                                <SelectItem value="Failed">Mark as Failed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {updatingTaskId === task.id && <Loader2 className="h-5 w-5 animate-spin" />}
                                     </div>
                                </CardContent>
                            </Card>
                        ))}
                   </div>
                )}
            </main>
        </div>
    );
}

  