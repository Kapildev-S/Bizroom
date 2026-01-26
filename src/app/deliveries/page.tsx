
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, MoreHorizontal, Edit, Trash2, LinkIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { collection, query, getDocs, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, writeBatch, setDoc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Types
type DeliveryAgent = {
  id: string;
  name: string;
  phone: string;
  ownerId: string;
};

type DeliveryTask = {
  id: string;
  customerName: string;
  address: string;
  phone: string;
  agentId?: string;
  status: 'Pending' | 'In Transit' | 'Delivered' | 'Failed';
  createdAt: Timestamp;
  ownerId: string;
};

// Zod Schemas
const agentFormSchema = z.object({
  name: z.string().min(2, "Name is required."),
  phone: z.string().min(10, "A valid phone number is required."),
});
type AgentFormValues = z.infer<typeof agentFormSchema>;

const deliveryFormSchema = z.object({
    customerName: z.string().min(2, "Customer name is required."),
    address: z.string().min(10, "A valid delivery address is required."),
    phone: z.string().min(10, "A valid phone number is required."),
    agentId: z.string().optional(),
    status: z.enum(['Pending', 'In Transit', 'Delivered', 'Failed']).default('Pending'),
});
type DeliveryFormValues = z.infer<typeof deliveryFormSchema>;


// Agent Form
function AgentForm({ onSave, agent, onOpenChange }: { onSave: (data: AgentFormValues) => void, agent: DeliveryAgent | null, onOpenChange: (open: boolean) => void }) {
    const form = useForm<AgentFormValues>({
        resolver: zodResolver(agentFormSchema),
        defaultValues: agent ? { name: agent.name, phone: agent.phone } : { name: "", phone: "" },
    });
    
    return (
         <DialogContent>
            <DialogHeader>
                <DialogTitle>{agent ? 'Edit Agent' : 'Add New Agent'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 py-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Agent Name</FormLabel><FormControl><Input placeholder="e.g. Suresh Kumar" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="e.g. 9876543210" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Save Agent</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    );
}

// Delivery Form
function DeliveryForm({ onSave, delivery, agents, onOpenChange }: { onSave: (data: DeliveryFormValues) => void, delivery: DeliveryTask | null, agents: DeliveryAgent[], onOpenChange: (open: boolean) => void }) {
    const form = useForm<DeliveryFormValues>({
        resolver: zodResolver(deliveryFormSchema),
        defaultValues: delivery ? {
            ...delivery,
            agentId: delivery.agentId || "",
        } : { customerName: "", address: "", phone: "", agentId: "", status: 'Pending' },
    });
    
    return (
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{delivery ? 'Edit Delivery' : 'Add New Delivery'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 py-4">
                    <FormField control={form.control} name="customerName" render={({ field }) => (
                        <FormItem><FormLabel>Customer Name</FormLabel><FormControl><Input placeholder="e.g. Ravi Kumar" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem><FormLabel>Delivery Address</FormLabel><FormControl><Textarea placeholder="Full address for delivery" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Customer Phone</FormLabel><FormControl><Input type="tel" placeholder="Customer's contact number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="agentId" render={({ field }) => (
                        <FormItem><FormLabel>Assign Agent (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select an agent" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {agents.map(agent => <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage /></FormItem>
                    )} />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Save Delivery</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    );
}


export default function DeliveriesPage() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    
    // Data states
    const [agents, setAgents] = useState<DeliveryAgent[]>([]);
    const [deliveries, setDeliveries] = useState<DeliveryTask[]>([]);

    // Dialog states
    const [isAgentFormOpen, setIsAgentFormOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<DeliveryAgent | null>(null);
    const [deletingAgent, setDeletingAgent] = useState<DeliveryAgent | null>(null);
    
    const [isDeliveryFormOpen, setIsDeliveryFormOpen] = useState(false);
    const [editingDelivery, setEditingDelivery] = useState<DeliveryTask | null>(null);
    const [deletingDelivery, setDeletingDelivery] = useState<DeliveryTask | null>(null);

    // Fetching logic
    const fetchData = useCallback(async (userId: string) => {
        setLoading(true);
        try {
            const agentsQuery = query(collection(db, `users/${userId}/deliveryAgents`), orderBy("name"));
            const deliveriesQuery = query(collection(db, `users/${userId}/deliveryTasks`), orderBy("createdAt", "desc"));

            const [agentsSnapshot, deliveriesSnapshot] = await Promise.all([
                getDocs(agentsQuery),
                getDocs(deliveriesQuery)
            ]);
            
            setAgents(agentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryAgent)));
            setDeliveries(deliveriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryTask)));

        } catch (error) {
            console.error("Failed to fetch delivery data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load delivery data.' });
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setCurrentUser(user);
            if (user) {
                fetchData(user.uid);
            } else {
                setLoading(false);
                setAgents([]);
                setDeliveries([]);
            }
        });
        return () => unsubscribe();
    }, [fetchData]);

    const agentMap = useMemo(() => new Map(agents.map(agent => [agent.id, agent.name])), [agents]);

    // Agent Handlers
    const handleSaveAgent = async (data: AgentFormValues) => {
        if (!currentUser) return;
        const agentData = { ...data, ownerId: currentUser.uid };
        try {
            if (editingAgent) {
                await updateDoc(doc(db, `users/${currentUser.uid}/deliveryAgents`, editingAgent.id), agentData);
                toast({ title: "Agent Updated" });
            } else {
                await addDoc(collection(db, `users/${currentUser.uid}/deliveryAgents`), agentData);
                toast({ title: "Agent Added" });
            }
            fetchData(currentUser.uid);
            setIsAgentFormOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save agent.' });
        }
    };

    const confirmDeleteAgent = async () => {
        if (!deletingAgent || !currentUser) return;
        try {
            await deleteDoc(doc(db, `users/${currentUser.uid}/deliveryAgents`, deletingAgent.id));
            toast({ title: "Agent Deleted" });
            fetchData(currentUser.uid);
            setDeletingAgent(null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete agent.' });
        }
    };

    const handleCopyAgentLink = async (agentId: string) => {
        if (!currentUser) return;
        try {
            // This is a simplified approach. A more robust solution might involve
            // pre-fetching tasks and embedding them or using a secure token.
            // For now, we generate a direct link.
            const agentDocRef = doc(db, `users/${currentUser.uid}/deliveryAgents`, agentId);
            const agentDoc = await getDoc(agentDocRef);
    
            if (!agentDoc.exists()) {
                toast({ variant: 'destructive', title: 'Error', description: 'Agent not found.' });
                return;
            }
            
            const url = `${window.location.origin}/agent/${agentId}`;
            navigator.clipboard.writeText(url);
            toast({ title: "Link Copied!", description: "Agent dashboard link copied to clipboard." });
    
        } catch (error) {
            console.error("Error generating agent link:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not generate agent link.' });
        }
    };
    
    const handleSaveDelivery = async (data: DeliveryFormValues) => {
        if (!currentUser) return;

        const batch = writeBatch(db);
        const wasPreviouslyAssignedAgentId = editingDelivery?.agentId;
        const isNowAssignedAgentId = data.agentId;

        try {
            let deliveryId: string;
            let taskDataForAgent: any;

            if (editingDelivery) {
                // UPDATE existing delivery
                deliveryId = editingDelivery.id;
                const originalTaskRef = doc(db, `users/${currentUser.uid}/deliveryTasks`, deliveryId);
                const updates = { ...data, agentId: data.agentId || null };
                batch.update(originalTaskRef, updates);
                taskDataForAgent = { ...editingDelivery, ...updates };

            } else {
                // CREATE new delivery
                const newTaskRef = doc(collection(db, `users/${currentUser.uid}/deliveryTasks`));
                deliveryId = newTaskRef.id;
                const taskData = {
                    ...data,
                    agentId: data.agentId || null,
                    ownerId: currentUser.uid,
                    createdAt: Timestamp.now(),
                    status: 'Pending' as const
                };
                batch.set(newTaskRef, taskData);
                taskDataForAgent = taskData;
            }

            // Logic to manage the public agentTasks collection
            const agentTaskData = {
                ...taskDataForAgent,
                originalTaskId: deliveryId
            };

            if (wasPreviouslyAssignedAgentId && wasPreviouslyAssignedAgentId !== isNowAssignedAgentId) {
                // Task was reassigned or unassigned, so delete from old agent's public list
                const oldAgentTaskRef = doc(db, `agentTasks/${wasPreviouslyAssignedAgentId}/tasks`, deliveryId);
                batch.delete(oldAgentTaskRef);
            }

            if (isNowAssignedAgentId) {
                // Task is assigned (or has a new assignment), so create/update in new agent's public list
                const agentTaskRef = doc(db, `agentTasks/${isNowAssignedAgentId}/tasks`, deliveryId);
                batch.set(agentTaskRef, agentTaskData);
            }

            await batch.commit();

            toast({ title: editingDelivery ? "Delivery Updated" : "Delivery Added" });
            fetchData(currentUser.uid);
            setIsDeliveryFormOpen(false);
            setEditingDelivery(null);

        } catch (error) {
            console.error("Error saving delivery:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save delivery task.' });
        }
    };

    
    const confirmDeleteDelivery = async () => {
        if (!deletingDelivery || !currentUser) return;
        try {
            const batch = writeBatch(db);

            // Delete from private user collection
            const privateTaskRef = doc(db, `users/${currentUser.uid}/deliveryTasks`, deletingDelivery.id);
            batch.delete(privateTaskRef);

            // If it was assigned to an agent, delete from public collection too
            if (deletingDelivery.agentId) {
                const publicTaskRef = doc(db, `agentTasks/${deletingDelivery.agentId}/tasks`, deletingDelivery.id);
                batch.delete(publicTaskRef);
            }

            await batch.commit();
            
            toast({ title: "Delivery Deleted" });
            fetchData(currentUser.uid);
            setDeletingDelivery(null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete delivery task.' });
        }
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

    if (loading) {
        return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

  return (
    <>
      {/* Dialogs */}
      <Dialog open={isAgentFormOpen} onOpenChange={setIsAgentFormOpen}><AgentForm onSave={handleSaveAgent} agent={editingAgent} onOpenChange={setIsAgentFormOpen} /></Dialog>
      <AlertDialog open={!!deletingAgent} onOpenChange={() => setDeletingAgent(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Agent?</AlertDialogTitle><AlertDialogDescription>This will permanently delete {deletingAgent?.name}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteAgent} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      
      <Dialog open={isDeliveryFormOpen} onOpenChange={(open) => { setIsDeliveryFormOpen(open); if (!open) setEditingDelivery(null); }}><DeliveryForm onSave={handleSaveDelivery} delivery={editingDelivery} agents={agents} onOpenChange={setIsDeliveryFormOpen} /></Dialog>
      <AlertDialog open={!!deletingDelivery} onOpenChange={() => setDeletingDelivery(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Delivery Task?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the delivery task for {deletingDelivery?.customerName}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteDelivery} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      
      <div className="space-y-6">
        <PageHeader title="Delivery Dashboard" description="Manage and track all your delivery tasks and agents." />
        <Tabs defaultValue="deliveries" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <TabsList className="grid w-full grid-cols-2 md:w-auto">
                <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
                <TabsTrigger value="agents">Agents</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                  <Button className="w-full sm:w-auto" onClick={() => { setEditingDelivery(null); setIsDeliveryFormOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" /> Add New Delivery</Button>
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setEditingAgent(null); setIsAgentFormOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" /> Add New Agent</Button>
              </div>
          </div>
          
          <TabsContent value="deliveries" className="mt-6">
             <Card>
                <CardHeader><CardTitle>Current Deliveries</CardTitle><CardDescription>List of all ongoing and completed delivery tasks.</CardDescription></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Address</TableHead><TableHead>Agent</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {deliveries.length > 0 ? deliveries.map(task => (
                                <TableRow key={task.id}>
                                    <TableCell><div>{task.customerName}</div><div className="text-xs text-muted-foreground">{task.phone}</div></TableCell>
                                    <TableCell className="text-muted-foreground">{task.address}</TableCell>
                                    <TableCell>{task.agentId ? agentMap.get(task.agentId) || 'Unassigned' : 'Unassigned'}</TableCell>
                                    <TableCell><Badge variant={getStatusBadgeVariant(task.status)}>{task.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => { setEditingDelivery(task); setIsDeliveryFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setDeletingDelivery(task)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                        </DropdownMenuContent></DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )) : (<TableRow><TableCell colSpan={5} className="text-center h-24">No deliveries found.</TableCell></TableRow>)}
                        </TableBody>
                    </Table>
                </CardContent>
             </Card>
          </TabsContent>
  
          <TabsContent value="agents" className="mt-6">
            <Card>
                <CardHeader><CardTitle>Delivery Agents</CardTitle><CardDescription>Manage your team of delivery agents.</CardDescription></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Agent Name</TableHead><TableHead>Phone Number</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {agents.length > 0 ? agents.map(agent => (
                                <TableRow key={agent.id}>
                                    <TableCell className="font-medium">{agent.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{agent.phone}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleCopyAgentLink(agent.id)}><LinkIcon className="mr-2 h-4 w-4" /> Copy Agent Link</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => { setEditingAgent(agent); setIsAgentFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setDeletingAgent(agent)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                        </DropdownMenuContent></DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )) : (<TableRow><TableCell colSpan={3} className="text-center h-24">No agents found.</TableCell></TableRow>)}
                        </TableBody>
                    </Table>
                </CardContent>
             </Card>
          </TabsContent>
  
        </Tabs>
      </div>
    </>
  );
}

  