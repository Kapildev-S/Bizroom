

"use client";

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Users,
  FileText,
  BarChart3,
  Package,
  Plus,
  ChevronDown,
  Briefcase,
  CalendarCheck,
  HandCoins,
  MessageSquareText,
  ThumbsUp,
  Globe,
  Palette,
  Lightbulb,
  User,
  Sparkles,
  Truck,
  Calculator,
  FileImage,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { cn } from '@/lib/utils';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { AppSettings, BusinessProfile } from '@/lib/mockData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/products", label: "Products", icon: Package },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const businessToolsItems = [
  { href: "/attendance", label: "Staff Management", icon: Briefcase },
  { href: "/ledger", label: "Daily Ledger", icon: HandCoins },
  { href: "/dashboard/feedback", label: "Feedback & Insights", icon: Sparkles },
  { href: "/dashboard/events", label: "Organize Events", icon: CalendarCheck },
  { href: "/sms-marketing", label: "SMS Marketing", icon: MessageSquareText },
  { href: "/deliveries", label: "Deliveries", icon: Truck },

];

const otherServicesItems = [
  { href: "/other-services", label: "Website Builder", icon: Globe },
  { href: "/graphic-design", label: "Graphic Design", icon: Palette },
  { href: "/branding", label: "Branding", icon: Lightbulb },
  { href: "/social-media", label: "Social Media", icon: ThumbsUp },
  { href: "/create-posters", label: "Create Posters", icon: FileImage },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { toast } = useToast();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const settingsDocRef = doc(db, `users/${user.uid}/settings`, 'appSettings');

        // Use onSnapshot for realtime updates
        const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setSettings(docSnap.data() as AppSettings);
          }
        });

        return () => unsubscribeSettings();
      }
    });

    return () => unsubscribeAuth();
  }, []);

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


  return (
    <>
      <div data-sidebar="header" className="p-3 group-data-[collapsible=icon]:p-2">
        <div className="group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={settings?.businessProfile?.logoUrl || undefined} />
              <AvatarFallback>
                {settings?.businessProfile?.businessName?.charAt(0) || 'B'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-grow truncate">
              <p className="text-sm font-semibold text-sidebar-foreground">
                {settings?.businessProfile?.businessName || 'Your Business'}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-sidebar-foreground/70">
                  {settings?.businessProfile?.phone || ''}
                </p>
                {settings?.subscriptionStatus === 'premium' && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold border border-amber-200 flex items-center gap-0.5">
                    <Sparkles className="w-3 h-3" /> Premium
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Upgrade/Renew Banner for Basic/Expired Users */}
          {(() => {
            const isPremium = settings?.subscriptionStatus === 'premium';
            const expiryDate = settings?.premiumExpiry ? new Date(settings.premiumExpiry) : null;
            const isExpired = isPremium && expiryDate && new Date() > expiryDate;
            const showBanner = !isPremium || isExpired;

            if (showBanner) {
              return (
                <div className="mt-4 mb-2">
                  <Link href="/pay-299">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-3 text-white shadow-lg cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm">{isExpired ? 'Renew Plan' : 'Upgrade Plan'}</span>
                        <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                      </div>
                      <p className="text-[10px] opacity-90 leading-tight">
                        {isExpired ? 'Your plan has expired. Renew to unlock.' : 'Unlock all features for just ₹299!'}
                      </p>
                    </div>
                  </Link>
                </div>
              );
            }
            return null;
          })()}


          <DropdownMenu>
            <div className="flex w-full mt-2">
              <Button asChild className="flex-grow rounded-r-none" variant="secondary">
                <Link href="/invoices/new">
                  <Plus className="mr-2 h-4 w-4" /> Create Bill
                </Link>
              </Button>
              <DropdownMenuTrigger asChild>
                <Button size="icon" className="w-10 rounded-l-none border-l border-muted/50" variant="secondary">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/invoices/new" className="flex items-center w-full">
                  <FileText className="mr-2 h-4 w-4" /> New Invoice
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/products/new" className="flex items-center w-full">
                  <Package className="mr-2 h-4 w-4" /> New Product
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Collapsed Icon View Logic Omitted for brevity, kept standard */}
        <div className="hidden group-data-[collapsible=icon]:flex flex-col items-center gap-4">
          {/* ... existing collapsed logic ... */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar>
                <AvatarImage src={settings?.businessProfile?.logoUrl || undefined} />
                <AvatarFallback>
                  {settings?.businessProfile?.businessName?.charAt(0) || 'B'}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{settings?.businessProfile?.businessName || 'Your Business'}</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/invoices/new" className="flex items-center w-full">
                  <FileText className="mr-2 h-4 w-4" /> New Invoice
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/products/new" className="flex items-center w-full">
                  <Package className="mr-2 h-4 w-4" /> New Product
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>


      <div data-sidebar="content" className="flex-grow overflow-auto">
        {/* Render function for checking lock status */}
        {(() => {
          const isPremiumStatus = settings?.subscriptionStatus === 'premium';
          const expiryDate = settings?.premiumExpiry ? new Date(settings.premiumExpiry) : null;
          const isExpired = isPremiumStatus && expiryDate && new Date() > expiryDate;
          const isPremium = isPremiumStatus && !isExpired;

          const allowedPaths = ['/dashboard', '/invoices', '/products', '/settings'];

          const renderMenuItem = (item: any) => {
            const isLocked = !isPremium && !allowedPaths.some(path => item.href.startsWith(path));

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild={!isLocked}
                  isActive={pathname.startsWith(item.href) || pathname === item.href}
                  className={cn(
                    "w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2",
                    isLocked && "opacity-60 hover:bg-transparent cursor-not-allowed"
                  )}
                  tooltip={item.label}
                  onClick={(e) => {
                    if (isLocked) {
                      e.preventDefault();
                      toast({
                        title: "Premium Feature",
                        description: "Upgrade to Premium to unlock this feature!",
                        variant: "default",
                        action: <Link href="/pay-299" className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-bold">Upgrade</Link>
                      });
                    }
                  }}
                >
                  {isLocked ? (
                    <div className="flex items-center w-full">
                      <item.icon className="h-4 w-4" />
                      <span className="truncate group-data-[collapsible=icon]:hidden ml-2 flex-grow text-left">{item.label}</span>
                      <span className="material-symbols-outlined text-xs group-data-[collapsible=icon]:hidden">lock</span>
                    </div>
                  ) : (
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span className="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </Link>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          };

          return (
            <>
              <SidebarGroup>
                <SidebarGroupLabel>General</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navItems.map(renderMenuItem)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel>Business Tools</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {businessToolsItems.map(renderMenuItem)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel>More</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {otherServicesItems.map(renderMenuItem)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          );
        })()}
      </div>

      <div data-sidebar="footer" className="mt-auto border-t border-sidebar-border/50 p-3 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2">
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span className="truncate group-data-[collapsible=icon]:hidden">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {currentUser && (
            <SidebarMenuItem>
              <div className="flex w-full items-center gap-3 p-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
                  <User className="h-5 w-5 text-sidebar-accent-foreground" />
                </div>
                <div className="flex-grow truncate group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium text-sidebar-foreground">{currentUser.displayName || "User"}</p>
                  {(() => {
                    const isPremiumStatus = settings?.subscriptionStatus === 'premium';
                    const expiryDate = settings?.premiumExpiry ? new Date(settings.premiumExpiry) : null;
                    const isExpired = isPremiumStatus && expiryDate && new Date() > expiryDate;

                    if (isPremiumStatus && !isExpired) {
                      return <p className="text-xs text-amber-600 font-bold flex items-center gap-1">Premium Member</p>;
                    } else if (isPremiumStatus && isExpired) {
                      return <p className="text-xs text-red-500 font-bold flex items-center gap-1">Plan Expired</p>;
                    } else {
                      return <p className="text-xs text-muted-foreground">Basic Plan</p>;
                    }
                  })()}
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </div>
    </>
  );
}
