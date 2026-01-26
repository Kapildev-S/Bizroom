"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, Upload, Plus, Trash2, MapPin, Video, Calendar, Ticket } from "lucide-react";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type EventData } from "@/app/actions/eventActions";

// --- VALIDATION SCHEMA ---
const ticketSchema = z.object({
    id: z.string(), // Client-side temp ID
    name: z.string().min(1, "Ticket name is required"),
    type: z.enum(["free", "paid"]),
    price: z.coerce.number().min(0),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    maxPerUser: z.coerce.number().min(1, "Max per user must be at least 1"),
    saleStartDate: z.string().optional(),
    saleStartTime: z.string().optional(),
    saleEndDate: z.string().optional(),
    saleEndTime: z.string().optional(),
});

const eventSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    category: z.string().min(1, "Category is required"),
    imageUrl: z.string().optional(),

    // Schedule
    startDate: z.string().min(1, "Start Date is required"),
    startTime: z.string().min(1, "Start Time is required"),
    endDate: z.string().optional(),
    endTime: z.string().optional(),
    timezone: z.string().default("IST"), // Default IST

    // Location
    locationType: z.enum(["physical", "online"]),
    venueName: z.string().optional(),
    venueAddress: z.string().optional(),
    venueMapLink: z.string().optional(),
    meetingLink: z.string().optional(),

    // Tickets
    ticketTypes: z.array(ticketSchema).min(1, "At least one ticket type is required"),
}).refine((data) => {
    if (data.locationType === "physical") {
        return !!data.venueName && !!data.venueAddress;
    }
    if (data.locationType === "online") {
        return !!data.meetingLink;
    }
    return true;
}, {
    message: "Venue details or Meeting Link is required based on location type",
    path: ["locationType"], // Error pointer
});

export type EventFormValues = z.infer<typeof eventSchema>;

const EVENT_CATEGORIES = [
    "Conference", "Workshop", "Networking", "Concert", "Festival",
    "Exhibition", "Party", "Sports", "Other"
];

const TIMEZONES = ["IST", "UTC", "PST", "EST", "GMT"];

interface EventFormProps {
    initialData?: Partial<EventFormValues>;
    onSubmit: (data: EventFormValues) => Promise<void>;
    loading: boolean;
    isEditing?: boolean;
}

export default function EventForm({ initialData, onSubmit, loading, isEditing = false }: EventFormProps) {
    const form = useForm<EventFormValues>({
        resolver: zodResolver(eventSchema),
        defaultValues: {
            title: initialData?.title || "",
            description: initialData?.description || "",
            category: initialData?.category || "",
            imageUrl: initialData?.imageUrl || "",
            startDate: initialData?.startDate || "",
            startTime: initialData?.startTime || "",
            endDate: initialData?.endDate || "",
            endTime: initialData?.endTime || "",
            timezone: initialData?.timezone || "IST",
            locationType: initialData?.locationType || "physical",
            venueName: initialData?.venueName || "",
            venueAddress: initialData?.venueAddress || "",
            venueMapLink: initialData?.venueMapLink || "",
            meetingLink: initialData?.meetingLink || "",
            ticketTypes: initialData?.ticketTypes || [{
                id: "1",
                name: "General Admission",
                type: "free",
                price: 0,
                quantity: 100,
                maxPerUser: 5
            }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "ticketTypes",
    });

    const watchLocationType = form.watch("locationType");

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

            {/* 1. Basic Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Basic Details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Event Title <span className="text-red-500">*</span></Label>
                        <Input id="title" {...form.register("title")} placeholder="e.g. Annual Tech Summit" />
                        {form.formState.errors.title && <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="grid gap-2">
                            <Label>Category <span className="text-red-500">*</span></Label>
                            <Select onValueChange={(val) => form.setValue("category", val)} defaultValue={form.getValues("category")}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EVENT_CATEGORIES.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.category && <p className="text-xs text-red-500">{form.formState.errors.category.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label>Event Image URL</Label>
                            <Input {...form.register("imageUrl")} placeholder="https://..." />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Description <span className="text-red-500">*</span></Label>
                        <Textarea {...form.register("description")} placeholder="Tell us about the event..." className="min-h-[120px]" />
                        {form.formState.errors.description && <p className="text-xs text-red-500">{form.formState.errors.description.message}</p>}
                    </div>
                </CardContent>
            </Card>

            {/* 2. Schedule */}
            <Card>
                <CardHeader className="flex flex-row items-center space-x-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <CardTitle>Schedule</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="grid gap-2">
                            <Label>Start Date <span className="text-red-500">*</span></Label>
                            <Input type="date" {...form.register("startDate")} />
                            {form.formState.errors.startDate && <p className="text-xs text-red-500">{form.formState.errors.startDate.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label>Start Time <span className="text-red-500">*</span></Label>
                            <Input type="time" {...form.register("startTime")} />
                            {form.formState.errors.startTime && <p className="text-xs text-red-500">{form.formState.errors.startTime.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="grid gap-2">
                            <Label>End Date (Optional)</Label>
                            <Input type="date" {...form.register("endDate")} />
                        </div>
                        <div className="grid gap-2">
                            <Label>End Time (Optional)</Label>
                            <Input type="time" {...form.register("endTime")} />
                        </div>
                    </div>

                    <div className="grid gap-2 max-w-xs">
                        <Label>Timezone</Label>
                        <Select onValueChange={(val) => form.setValue("timezone", val)} defaultValue={form.getValues("timezone")}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Timezone" />
                            </SelectTrigger>
                            <SelectContent>
                                {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* 3. Location */}
            <Card>
                <CardHeader className="flex flex-row items-center space-x-2">
                    {watchLocationType === "physical" ? <MapPin className="h-5 w-5 text-primary" /> : <Video className="h-5 w-5 text-primary" />}
                    <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <RadioGroup
                        defaultValue={initialData?.locationType || "physical"}
                        onValueChange={(val) => form.setValue("locationType", val as "physical" | "online")}
                        className="flex space-x-4 mb-4"
                    >
                        <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                            <RadioGroupItem value="physical" id="physical" />
                            <Label htmlFor="physical" className="cursor-pointer">Physical Venue</Label>
                        </div>
                        <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                            <RadioGroupItem value="online" id="online" />
                            <Label htmlFor="online" className="cursor-pointer">Online Event</Label>
                        </div>
                    </RadioGroup>

                    {watchLocationType === "physical" ? (
                        <div className="space-y-4 animate-in fade-in-50">
                            <div className="grid gap-2">
                                <Label>Venue Name <span className="text-red-500">*</span></Label>
                                <Input {...form.register("venueName")} placeholder="e.g. Grand Convention Center" />
                                {form.formState.errors.venueName && <p className="text-xs text-red-500">{form.formState.errors.venueName.message}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label>Full Address <span className="text-red-500">*</span></Label>
                                <Textarea {...form.register("venueAddress")} placeholder="123 Main St, City, Country" />
                                {form.formState.errors.venueAddress && <p className="text-xs text-red-500">{form.formState.errors.venueAddress.message}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label>Google Maps Link (Optional)</Label>
                                <Input {...form.register("venueMapLink")} placeholder="https://maps.google.com/..." />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in-50">
                            <div className="grid gap-2">
                                <Label>Meeting Link <span className="text-red-500">*</span></Label>
                                <Input {...form.register("meetingLink")} placeholder="Zoom / Google Meet link" />
                                {form.formState.errors.meetingLink && <p className="text-xs text-red-500">{form.formState.errors.meetingLink.message}</p>}
                            </div>
                        </div>
                    )}
                    {form.formState.errors.locationType && <p className="text-xs text-red-500">{form.formState.errors.locationType.message}</p>}
                </CardContent>
            </Card>

            {/* 4. Tickets */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Ticket className="h-5 w-5 text-primary" />
                        <CardTitle>Ticket Configuration</CardTitle>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({
                            id: Date.now().toString(),
                            name: "",
                            type: "paid",
                            price: 0,
                            quantity: 100,
                            maxPerUser: 5
                        })}
                    >
                        <Plus className="h-4 w-4 mr-2" /> Add Ticket Type
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    {fields.map((field, index) => (
                        <div key={field.id} className="relative p-4 border rounded-lg bg-muted/20">
                            <div className="absolute top-4 right-4">
                                {fields.length > 1 && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:text-destructive/90">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pr-8">
                                <div className="grid gap-2">
                                    <Label>Ticket Name <span className="text-red-500">*</span></Label>
                                    <Input {...form.register(`ticketTypes.${index}.name`)} placeholder="e.g. VIP Access" />
                                    {form.formState.errors.ticketTypes?.[index]?.name && <p className="text-xs text-red-500">{form.formState.errors.ticketTypes[index]?.name?.message}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label>Ticket Type</Label>
                                    <Select
                                        onValueChange={(val) => {
                                            form.setValue(`ticketTypes.${index}.type`, val as "free" | "paid");
                                            if (val === "free") form.setValue(`ticketTypes.${index}.price`, 0);
                                        }}
                                        defaultValue={field.type}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="free">Free</SelectItem>
                                            <SelectItem value="paid">Paid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <Label>Price (₹)</Label>
                                    <Input
                                        type="number"
                                        {...form.register(`ticketTypes.${index}.price`)}
                                        disabled={form.watch(`ticketTypes.${index}.type`) === "free"}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Total Quantity</Label>
                                    <Input type="number" {...form.register(`ticketTypes.${index}.quantity`)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Max per User</Label>
                                    <Input type="number" {...form.register(`ticketTypes.${index}.maxPerUser`)} />
                                </div>
                            </div>
                        </div>
                    ))}
                    {form.formState.errors.ticketTypes && <p className="text-xs text-red-500">{form.formState.errors.ticketTypes.message}</p>}
                </CardContent>
            </Card>

            <div className="flex justify-end pt-6">
                <Button type="submit" size="lg" disabled={loading} className="bg-primary hover:bg-primary/90">
                    {loading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isEditing ? "Saving Changes..." : "Publish Event"}</>
                    ) : (
                        isEditing ? "Save Changes" : "Publish Event"
                    )}
                </Button>
            </div>
        </form>
    );
}
