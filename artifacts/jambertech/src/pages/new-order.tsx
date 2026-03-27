import { useState } from "react";
import { useAuthStore } from "@/lib/store";
import { useListCategories, useListServices, useCreateOrder } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, calculateCharge } from "@/lib/utils";
import { Search, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function NewOrder() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");

  const { data: categories, isLoading: loadingCategories } = useListCategories();
  const { data: services, isLoading: loadingServices } = useListServices(
    selectedCategory ? { category: selectedCategory } : undefined
  );

  const createOrderMutation = useCreateOrder();
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const selectedService = services?.find(s => s.id === selectedServiceId);
  const filteredServices = services?.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.id.toString() === searchQuery
  ) || [];

  const parsedQty = typeof quantity === 'number' ? quantity : parseInt(quantity) || 0;
  const charge = selectedService ? calculateCharge(Number(selectedService.sellRate), parsedQty) : 0;
  const isValidQty = selectedService && parsedQty >= selectedService.min && parsedQty <= selectedService.max;
  const hasBalance = user && user.balance >= charge;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !isValidQty || !hasBalance || !link) return;
    
    setSuccessMsg("");
    setErrorMsg("");

    createOrderMutation.mutate({
      data: {
        serviceId: selectedService.id,
        link,
        quantity: parsedQty
      }
    }, {
      onSuccess: () => {
        setSuccessMsg("Order placed successfully! It will begin processing shortly.");
        setLink("");
        setQuantity("");
        // Invalidate user balance
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
      onError: (err: any) => {
        setErrorMsg(err?.data?.error || "Failed to place order.");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      
      {/* Left Column: Service Selection */}
      <div className="xl:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Service</CardTitle>
            <CardDescription>Choose a category and find the service you need.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Categories */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground ml-1">Category</label>
              <select 
                className="flex h-12 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary appearance-none cursor-pointer"
                value={selectedCategory || ""}
                onChange={(e) => {
                  setSelectedCategory(e.target.value || null);
                  setSelectedServiceId(null);
                }}
              >
                <option value="">All Categories</option>
                {categories?.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Services Search & List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground ml-1">Service</label>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by ID or name..." 
                    className="h-9 pl-9 rounded-lg"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="border border-border rounded-xl overflow-hidden bg-background/50">
                <div className="max-h-[400px] overflow-y-auto">
                  {loadingServices ? (
                    <div className="p-8 text-center text-muted-foreground">Loading services...</div>
                  ) : filteredServices.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No active services found.</div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-secondary/80 sticky top-0 backdrop-blur-md z-10">
                        <tr>
                          <th className="px-4 py-3 font-medium">ID</th>
                          <th className="px-4 py-3 font-medium">Service</th>
                          <th className="px-4 py-3 font-medium text-right">Rate / 1k</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {filteredServices.map((service) => {
                          const isSelected = selectedServiceId === service.id;
                          return (
                            <tr 
                              key={service.id} 
                              onClick={() => setSelectedServiceId(service.id)}
                              className={`
                                cursor-pointer transition-colors
                                ${isSelected ? 'bg-primary/20 hover:bg-primary/30' : 'hover:bg-muted/50'}
                              `}
                            >
                              <td className="px-4 py-3 font-mono text-xs">{service.id}</td>
                              <td className="px-4 py-3 font-medium">
                                {service.name}
                                {isSelected && <Badge className="ml-2 py-0 h-4 text-[10px] bg-primary text-white">SELECTED</Badge>}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-foreground">
                                {formatCurrency(Number(service.sellRate))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Right Column: Order Form */}
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {selectedService ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="border-primary/30 shadow-[0_0_30px_rgba(6,182,212,0.1)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-600" />
                <CardHeader className="pb-4">
                  <Badge variant="outline" className="w-fit mb-2">{selectedService.category}</Badge>
                  <CardTitle className="text-lg leading-tight">{selectedService.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-6 p-4 bg-secondary/50 rounded-xl text-sm">
                    <div className="flex-1">
                      <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Min</p>
                      <p className="font-mono font-medium">{selectedService.min.toLocaleString()}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Max</p>
                      <p className="font-mono font-medium">{selectedService.max.toLocaleString()}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Rate/1k</p>
                      <p className="font-mono font-bold text-primary">{formatCurrency(Number(selectedService.sellRate))}</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground ml-1">Link / URL</label>
                      <Input 
                        required 
                        placeholder="https://instagram.com/..." 
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground ml-1">Quantity</label>
                      <Input 
                        required 
                        type="number" 
                        min={selectedService.min}
                        max={selectedService.max}
                        placeholder={selectedService.min.toString()}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                      {parsedQty > 0 && !isValidQty && (
                        <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3 w-3" /> Quantity must be between {selectedService.min} and {selectedService.max}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-border">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-sm text-muted-foreground">Total Charge</span>
                        <span className="text-2xl font-bold text-foreground">{formatCurrency(charge)}</span>
                      </div>
                      {user && (
                        <div className="flex justify-between text-xs mt-2">
                          <span className="text-muted-foreground">Balance after order:</span>
                          <span className={hasBalance ? "text-green-400" : "text-destructive font-bold"}>
                            {formatCurrency(user.balance - charge)}
                          </span>
                        </div>
                      )}
                    </div>

                    {successMsg && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-xl flex gap-2 items-start">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <p>{successMsg}</p>
                      </div>
                    )}
                    
                    {errorMsg && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl flex gap-2 items-start">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <p>{errorMsg}</p>
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-lg" 
                      disabled={createOrderMutation.isPending || !isValidQty || !hasBalance || !link}
                    >
                      {createOrderMutation.isPending ? "Processing..." : "Place Order"}
                    </Button>
                    {!hasBalance && parsedQty > 0 && (
                      <p className="text-center text-xs text-destructive mt-2">Insufficient balance to place this order.</p>
                    )}
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="h-[400px] flex flex-col items-center justify-center border-dashed border-2 bg-transparent">
                <Info className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-1">No Service Selected</h3>
                <p className="text-sm text-muted-foreground text-center max-w-[200px]">
                  Select a service from the list to configure your order.
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
