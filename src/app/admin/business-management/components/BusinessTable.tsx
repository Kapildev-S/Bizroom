"use client";

import React, { useState, useEffect } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { 
  MoreHorizontal, Search, UserCheck, LogIn, Crown, Ban, CheckCircle, 
  Trash2, Edit, KeySquare, TrendingUp, Users, FileText, ShoppingCart
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  fetchAllBusinesses, updateBusinessStatus, verifyBusiness, deleteBusiness, 
  getImpersonationToken, updateBusinessDetails, resetUserPassword
} from '@/app/actions/adminBusinessActions';
import { adminGrantPremium } from '@/app/actions/adminSubscriptionActions';
import { useAuth } from '@/lib/useAuth';
import { format } from 'date-fns';

export function BusinessTable() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
  // Edit Dialog State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<any>(null);
  const [editForm, setEditForm] = useState({
      businessName: '',
      ownerName: '',
      phone: '',
      email: '',
      gstNumber: ''
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (!user) return;
      const data = await fetchAllBusinesses(user.uid);
      setBusinesses(data);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredBusinesses = businesses.filter(b => 
    b.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.mobile.includes(searchTerm)
  );

  const paginatedBusinesses = filteredBusinesses.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredBusinesses.length / itemsPerPage);

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'suspended') => {
    try {
      await updateBusinessStatus(user!.uid, userId, newStatus);
      toast({ title: "Success", description: `Business marked as ${newStatus}` });
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleVerify = async (userId: string, verified: boolean) => {
    try {
      await verifyBusiness(user!.uid, userId, verified);
      toast({ title: "Success", description: `Business verified status updated` });
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleUpgrade = async (userId: string, currentPlan: string) => {
    try {
        if (currentPlan === 'premium') {
            toast({ title: "Already Premium", description: "This user is already on a premium plan." });
            return;
        }
        const idToken = await user!.getIdToken();
        await adminGrantPremium(idToken, userId, 365);
        toast({ title: "Success", description: `Premium plan granted for 1 year` });
        loadData();
    } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this business? This action cannot be undone.")) return;
    try {
      await deleteBusiness(user!.uid, userId);
      toast({ title: "Success", description: `Business deleted` });
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
      try {
          const res = await resetUserPassword(user!.uid, email);
          toast({ 
              title: "Reset Link Generated", 
              description: "A password reset link has been created.",
              duration: 10000 
          });
          // For demo purposes, we log the link since we aren't hooking up a mailer directly here
          console.log("PASSWORD RESET LINK:", res.link);
          alert(`Password Reset Link Generated:\n\n${res.link}\n\n(In production, this would be emailed directly to ${email})`);
      } catch (e: any) {
          toast({ title: "Error", description: e.message, variant: "destructive" });
      }
  };

  const handleLoginAs = async (userId: string) => {
    const newWindow = window.open('about:blank', '_blank');
    try {
      const res = await getImpersonationToken(user!.uid, userId);
      if (newWindow) {
          newWindow.location.href = `/admin/impersonate?token=${res.token}`;
      }
    } catch (e: any) {
      if (newWindow) newWindow.close();
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const openEditDialog = (b: any) => {
      setEditingBusiness(b);
      setEditForm({
          businessName: b.businessName,
          ownerName: b.ownerName,
          phone: b.mobile,
          email: b.email,
          gstNumber: b.gst === 'N/A' ? '' : b.gst
      });
      setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
      if (!editingBusiness) return;
      try {
          await updateBusinessDetails(user!.uid, editingBusiness.id, editForm);
          toast({ title: "Success", description: "Business profile updated successfully." });
          setIsEditDialogOpen(false);
          loadData();
      } catch (e: any) {
          toast({ title: "Error", description: e.message, variant: "destructive" });
      }
  };

  const formatDate = (isoString: string) => {
      try {
          return format(new Date(isoString), 'MMM dd, yyyy');
      } catch {
          return 'N/A';
      }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search businesses..." 
            className="pl-8" 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business Details</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Status & Plan</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading business data...</TableCell></TableRow>
            ) : paginatedBusinesses.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">No businesses found.</TableCell></TableRow>
            ) : (
              paginatedBusinesses.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="font-medium flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                          {b.businessName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                          <div className="flex items-center gap-1">
                              {b.businessName}
                              {b.verified && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                          </div>
                          <div className="text-xs text-muted-foreground">{b.ownerName} • {b.mobile}</div>
                          <div className="text-xs text-muted-foreground">{b.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                        <span className="text-muted-foreground">Joined: </span>
                        {formatDate(b.createdDate)}
                    </div>
                    <div className="text-sm">
                        <span className="text-muted-foreground">Last Login: </span>
                        {formatDate(b.lastLogin)}
                    </div>
                  </TableCell>
                  <TableCell>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <div className="flex items-center gap-1 text-emerald-600 font-medium">
                              <TrendingUp className="w-3 h-3" /> ₹{b.revenue.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                              <FileText className="w-3 h-3" /> {b.billsGenerated} Bills
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                              <Users className="w-3 h-3" /> {b.customersCount} Cust
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                              <ShoppingCart className="w-3 h-3" /> {b.productsCount} Prod
                          </div>
                      </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2 items-start">
                        <Badge variant={b.status === 'active' ? 'default' : b.status === 'suspended' ? 'destructive' : 'secondary'}>
                        {b.status}
                        </Badge>
                        <Badge variant={b.subscription === 'premium' ? 'default' : 'outline'} className={b.subscription === 'premium' ? 'bg-amber-500 hover:bg-amber-600 text-white border-none' : ''}>
                        {b.subscription}
                        </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Business Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => openEditDialog(b)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit Business Profile
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => handleVerify(b.id, !b.verified)}>
                          <UserCheck className="mr-2 h-4 w-4" /> {b.verified ? 'Unverify' : 'Verify'} Business
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => handleLoginAs(b.id)}>
                          <LogIn className="mr-2 h-4 w-4 text-indigo-500" /> Login as Business
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => handleUpgrade(b.id, b.subscription)}>
                          <Crown className="mr-2 h-4 w-4 text-amber-500" /> Upgrade to Premium
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleResetPassword(b.id, b.email)}>
                          <KeySquare className="mr-2 h-4 w-4" /> Reset Password
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        {b.status === 'active' ? (
                          <DropdownMenuItem onClick={() => handleStatusChange(b.id, 'suspended')} className="text-rose-500 focus:text-rose-600">
                            <Ban className="mr-2 h-4 w-4" /> Suspend Account
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleStatusChange(b.id, 'active')} className="text-emerald-500 focus:text-emerald-600">
                            <CheckCircle className="mr-2 h-4 w-4" /> Activate Account
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDelete(b.id)} className="text-rose-500 focus:text-rose-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Business
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredBusinesses.length)} of {filteredBusinesses.length} entries
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}>Next</Button>
        </div>
      </div>

      {/* Edit Business Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Edit Business Profile</DialogTitle>
                  <DialogDescription>
                      Make changes to the business contact information and identity.
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                      <Label>Business Name</Label>
                      <Input value={editForm.businessName} onChange={e => setEditForm({...editForm, businessName: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                      <Label>Owner Name</Label>
                      <Input value={editForm.ownerName} onChange={e => setEditForm({...editForm, ownerName: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                          <Label>Mobile Number</Label>
                          <Input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                      </div>
                      <div className="grid gap-2">
                          <Label>GST Number</Label>
                          <Input value={editForm.gstNumber} onChange={e => setEditForm({...editForm, gstNumber: e.target.value})} />
                      </div>
                  </div>
                  <div className="grid gap-2">
                      <Label>Email Address</Label>
                      <Input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveEdit}>Save Changes</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
