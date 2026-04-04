
"use client";

import React from 'react';
import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, PlusCircle, ChevronsUpDown, Check } from "lucide-react";
import type { Product } from '@/lib/mockData';
import { FormLabel, FormMessage, FormDescription, FormItem } from '@/components/ui/form';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface InvoiceFormItemsProps {
  products: Product[];
  currencySymbol: string;
  enableAdvancedInvoiceSystem?: boolean;
  isTaxInclusive?: boolean;
}

export function InvoiceFormItems({ products, currencySymbol, enableAdvancedInvoiceSystem, isTaxInclusive }: InvoiceFormItemsProps) {
  const { control, watch, setValue, formState: { errors } } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const isMobile = useIsMobile();

  const watchedItems = watch("items");

  const handleProductChange = (itemIndex: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const quantity = watchedItems[itemIndex]?.quantity || 1;
      setValue(`items.${itemIndex}.productName`, product.name);
      setValue(`items.${itemIndex}.unitPrice`, product.price);
      setValue(`items.${itemIndex}.unit`, product.unit || '', { shouldValidate: true });
      setValue(`items.${itemIndex}.hsnCode`, product.hsnCode || '', { shouldValidate: true });
      setValue(`items.${itemIndex}.gstRate`, product.gstRate || 0, { shouldValidate: true });
      setValue(`items.${itemIndex}.totalPrice`, product.price * quantity);
      calculateItemTax(itemIndex, product.price * quantity, product.gstRate || 0);
    }
  };

  const handleQuantityChange = (itemIndex: number, quantity: number) => {
    const unitPrice = watchedItems[itemIndex]?.unitPrice || 0;
    setValue(`items.${itemIndex}.totalPrice`, unitPrice * quantity);
  };

  const handleUnitPriceChange = (itemIndex: number, unitPrice: number) => {
    const quantity = watchedItems[itemIndex]?.quantity || 0;
    setValue(`items.${itemIndex}.totalPrice`, unitPrice * quantity);
    calculateItemTax(itemIndex, unitPrice * quantity);
  };

  const handleGstRateChange = (itemIndex: number, gstRate: number) => {
    const totalPrice = watchedItems[itemIndex]?.totalPrice || 0;
    calculateItemTax(itemIndex, totalPrice, gstRate);
  };

  const calculateItemTax = (itemIndex: number, totalPrice: number, rate?: number) => {
    if (!enableAdvancedInvoiceSystem) return;
    const gstRate = rate !== undefined ? rate : (watchedItems[itemIndex]?.gstRate || 0);
    
    let taxAmount = 0;
    if (isTaxInclusive) {
        // Tax is already in totalPrice
        taxAmount = totalPrice - (totalPrice / (1 + gstRate / 100));
    } else {
        // Tax is added on top of totalPrice
        taxAmount = (totalPrice * gstRate) / 100;
    }
    
    setValue(`items.${itemIndex}.taxAmount`, taxAmount);
  };

  return (
    <div className="space-y-4">
      <FormLabel>Invoice Items</FormLabel>
      
      {isMobile ? (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <Card key={field.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Item {index + 1}</CardTitle>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <FormItem>
                  <Label>Product/Service</Label>
                  <Controller
                    control={control}
                    name={`items.${index}.productId`}
                    render={({ field: controllerField }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                          >
                            {controllerField.value
                              ? products.find((p) => p.id === controllerField.value)?.name
                              : "Select product..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width)] p-0">
                          <Command>
                            <CommandInput placeholder="Search product..." />
                            <CommandList>
                              <CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup>
                                {products.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    value={product.name}
                                    onSelect={() => {
                                      controllerField.onChange(product.id);
                                      handleProductChange(index, product.id);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        product.id === controllerField.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {product.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  <FormMessage>{(errors.items as any)?.[index]?.productId?.message}</FormMessage>
                </FormItem>

                <div className="grid grid-cols-2 gap-4">
                  {enableAdvancedInvoiceSystem && (
                    <FormItem>
                        <Label>HSN/SAC Code</Label>
                        <Controller
                            control={control}
                            name={`items.${index}.hsnCode`}
                            render={({ field: controllerField }) => (
                            <Input
                                placeholder="e.g. 9983"
                                {...controllerField}
                                value={controllerField.value || ""}
                            />
                            )}
                        />
                    </FormItem>
                  )}
                  <FormItem>
                    <Label>Quantity</Label>
                     <Controller
                        control={control}
                        name={`items.${index}.quantity`}
                        defaultValue={1}
                        render={({ field: controllerField }) => (
                        <Input
                            type="number"
                            step="any"
                            {...controllerField}
                            onChange={(e) => {
                                const numValue = e.target.valueAsNumber;
                                controllerField.onChange(isNaN(numValue) ? '' : numValue);
                                handleQuantityChange(index, isNaN(numValue) ? 0 : numValue);
                            }}
                            min="0.01"
                        />
                        )}
                    />
                    <FormMessage>{(errors.items as any)?.[index]?.quantity?.message}</FormMessage>
                  </FormItem>
                   <FormItem>
                    <Label>Unit</Label>
                    <Controller
                        control={control}
                        name={`items.${index}.unit`}
                        render={({ field: controllerField }) => (
                        <Select
                            onValueChange={controllerField.onChange}
                            value={controllerField.value || ""}
                        >
                            <SelectTrigger>
                            <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pcs">PCS</SelectItem>
                                <SelectItem value="unt">UNT</SelectItem>
                                <SelectItem value="kg">KG</SelectItem>
                                <SelectItem value="g">G</SelectItem>
                                <SelectItem value="l">L</SelectItem>
                                <SelectItem value="ml">ML</SelectItem>
                                <SelectItem value="m">M</SelectItem>
                                <SelectItem value="box">BOX</SelectItem>
                                <SelectItem value="set">SET</SelectItem>
                                <SelectItem value="dz">DZ</SelectItem>
                            </SelectContent>
                        </Select>
                        )}
                    />
                  </FormItem>
                  {enableAdvancedInvoiceSystem && (
                    <FormItem>
                      <Label>GST %</Label>
                      <Controller
                        control={control}
                        name={`items.${index}.gstRate`}
                        defaultValue={0}
                        render={({ field: controllerField }) => (
                          <Select
                            onValueChange={(val) => {
                              const numVal = parseInt(val);
                              controllerField.onChange(numVal);
                              handleGstRateChange(index, numVal);
                            }}
                            value={controllerField.value?.toString() || "0"}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="GST %" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="5">5%</SelectItem>
                              <SelectItem value="12">12%</SelectItem>
                              <SelectItem value="18">18%</SelectItem>
                              <SelectItem value="28">28%</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FormItem>
                  )}
                </div>

                <FormItem>
                  <Label>Unit Price ({currencySymbol})</Label>
                    <Controller
                        control={control}
                        name={`items.${index}.unitPrice`}
                        render={({ field: controllerField }) => (
                        <Input
                            type="number"
                            step="0.01"
                            {...controllerField}
                            onChange={(e) => {
                                const numValue = e.target.valueAsNumber;
                                controllerField.onChange(isNaN(numValue) ? '' : numValue);
                                handleUnitPriceChange(index, isNaN(numValue) ? 0 : numValue);
                            }}
                            min="0"
                        />
                        )}
                    />
                    <FormMessage>{(errors.items as any)?.[index]?.unitPrice?.message}</FormMessage>
                </FormItem>
                
                <FormItem>
                  <Label>Total Price ({currencySymbol})</Label>
                   <Controller
                        control={control}
                        name={`items.${index}.totalPrice`}
                        render={({ field: controllerField }) => (
                        <Input
                            type="number"
                            step="0.01"
                            {...controllerField}
                            readOnly
                            className="bg-muted"
                        />
                        )}
                    />
                </FormItem>

              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={enableAdvancedInvoiceSystem ? "w-[15%]" : "w-[25%]"}>Product/Service</TableHead>
                {enableAdvancedInvoiceSystem && <TableHead className="w-[8%]">HSN</TableHead>}
                <TableHead className="w-[10%]">Quantity</TableHead>
                <TableHead className="w-[12%]">Unit</TableHead>
                <TableHead className="w-[12%]">Unit Price ({currencySymbol})</TableHead>
                {enableAdvancedInvoiceSystem && <TableHead className="w-[10%]">GST %</TableHead>}
                <TableHead className={enableAdvancedInvoiceSystem ? "w-[12%]" : "w-[20%]"}>Total ({currencySymbol})</TableHead>
                <TableHead className={cn(enableAdvancedInvoiceSystem ? "w-[8%]" : "w-[15%]", "text-right")}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <Controller
                      control={control}
                      name={`items.${index}.productId`}
                      render={({ field: controllerField }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between overflow-hidden"
                            >
                              {controllerField.value
                                ? products.find((p) => p.id === controllerField.value)?.name
                                : "Select product..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandInput placeholder="Search product..." />
                              <CommandList>
                                <CommandEmpty>No product found.</CommandEmpty>
                                <CommandGroup>
                                  {products.map((product) => (
                                    <CommandItem
                                      key={product.id}
                                      value={product.name}
                                      onSelect={() => {
                                        controllerField.onChange(product.id);
                                        handleProductChange(index, product.id);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          product.id === controllerField.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {product.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                   <FormMessage>{(errors.items as any)?.[index]?.productId?.message}</FormMessage>
                  </TableCell>
                  {enableAdvancedInvoiceSystem && (
                    <TableCell>
                        <Controller
                        control={control}
                        name={`items.${index}.hsnCode`}
                        render={({ field: controllerField }) => (
                            <Input
                            placeholder="HSN"
                            {...controllerField}
                            value={controllerField.value || ""}
                            />
                        )}
                        />
                    </TableCell>
                  )}
                  <TableCell>
                    <Controller
                      control={control}
                      name={`items.${index}.quantity`}
                      defaultValue={1}
                      render={({ field: controllerField }) => (
                        <Input
                          type="number"
                          step="any"
                          {...controllerField}
                          onChange={(e) => {
                            const numValue = e.target.valueAsNumber;
                            controllerField.onChange(isNaN(numValue) ? '' : numValue);
                            handleQuantityChange(index, isNaN(numValue) ? 0 : numValue);
                          }}
                          min="0.01"
                        />
                      )}
                    />
                   <FormMessage>{(errors.items as any)?.[index]?.quantity?.message}</FormMessage>
                  </TableCell>
                  <TableCell>
                    <Controller
                      control={control}
                      name={`items.${index}.unit`}
                      render={({ field: controllerField }) => (
                         <Select
                          onValueChange={controllerField.onChange}
                          value={controllerField.value || ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="pcs">PCS</SelectItem>
                              <SelectItem value="unt">UNT</SelectItem>
                              <SelectItem value="kg">KG</SelectItem>
                              <SelectItem value="g">G</SelectItem>
                              <SelectItem value="l">L</SelectItem>
                              <SelectItem value="ml">ML</SelectItem>
                              <SelectItem value="m">M</SelectItem>
                              <SelectItem value="box">BOX</SelectItem>
                              <SelectItem value="set">SET</SelectItem>
                              <SelectItem value="dz">DZ</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      control={control}
                      name={`items.${index}.unitPrice`}
                      render={({ field: controllerField }) => (
                        <Input
                          type="number"
                          step="0.01"
                          {...controllerField}
                           onChange={(e) => {
                            const numValue = e.target.valueAsNumber;
                            controllerField.onChange(isNaN(numValue) ? '' : numValue);
                            handleUnitPriceChange(index, isNaN(numValue) ? 0 : numValue);
                           }}
                          min="0"
                        />
                      )}
                    />
                  <FormMessage>{(errors.items as any)?.[index]?.unitPrice?.message}</FormMessage>
                  </TableCell>
                  {enableAdvancedInvoiceSystem && (
                    <TableCell>
                      <Controller
                        control={control}
                        name={`items.${index}.gstRate`}
                        defaultValue={0}
                        render={({ field: controllerField }) => (
                          <Select
                            onValueChange={(val) => {
                              const numVal = parseInt(val);
                              controllerField.onChange(numVal);
                              handleGstRateChange(index, numVal);
                            }}
                            value={controllerField.value?.toString() || "0"}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="GST %" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="5">5%</SelectItem>
                              <SelectItem value="12">12%</SelectItem>
                              <SelectItem value="18">18%</SelectItem>
                              <SelectItem value="28">28%</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Controller
                      control={control}
                      name={`items.${index}.totalPrice`}
                      render={({ field: controllerField }) => (
                        <Input
                          type="number"
                          step="0.01"
                          {...controllerField}
                          readOnly
                          className="bg-muted"
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => append({ productId: "", productName: "", quantity: 1, unitPrice: 0, totalPrice: 0, unit: "", hsnCode: "", gstRate: 0, taxAmount: 0 })}
        className="text-primary border-primary hover:bg-primary/10"
      >
        <PlusCircle className="mr-2 h-4 w-4" /> Add Item
      </Button>
      {(errors.items && typeof errors.items === 'object' && !Array.isArray(errors.items)) && <FormDescription className="text-destructive">{(errors.items as any).message}</FormDescription>}
      {fields.length === 0 && <FormDescription className="text-destructive">Please add at least one item to the invoice.</FormDescription>}
    </div>
  );
}
