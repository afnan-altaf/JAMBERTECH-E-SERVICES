import { useState } from "react";
import { useListServices, useUpdateService } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListServicesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";
import { Search, Edit2 } from "lucide-react";

export function AdminServices() {
  const queryClient = useQueryClient();
  const { data: services, isLoading } = useListServices();
  const updateMutation = useUpdateService();

  const [search, setSearch] = useState("");
  const [editingService, setEditingService] = useState<any>(null);
  const [editRate, setEditRate] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");

  const filteredServices = services?.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.id.toString() === search ||
    s.category.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleEditOpen = (service: any) => {
    setEditingService(service);
    setEditRate(service.sellRate.toString());
    setEditStatus(service.status);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    updateMutation.mutate({
      id: editingService.id,
      data: {
        sellRate: Number(editRate),
        status: editStatus
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
        setEditingService(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Services Catalog</h1>
          <p className="text-muted-foreground">Manage service margins and visibility.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search services..." 
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">ID</th>
                    <th className="px-6 py-4 font-medium">Provider</th>
                    <th className="px-6 py-4 font-medium">Category</th>
                    <th className="px-6 py-4 font-medium">Service Name</th>
                    <th className="px-6 py-4 font-medium text-right">Orig. Rate</th>
                    <th className="px-6 py-4 font-medium text-right">Sell Rate</th>
                    <th className="px-6 py-4 font-medium text-center">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredServices.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono">{s.id}</td>
                      <td className="px-6 py-4 text-muted-foreground">{s.providerName || `P-${s.providerId}`}</td>
                      <td className="px-6 py-4"><Badge variant="outline">{s.category}</Badge></td>
                      <td className="px-6 py-4 font-medium max-w-[200px] truncate" title={s.name}>{s.name}</td>
                      <td className="px-6 py-4 text-right text-muted-foreground">{formatCurrency(Number(s.originalRate))}</td>
                      <td className="px-6 py-4 text-right font-bold text-primary">{formatCurrency(Number(s.sellRate))}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={s.status === 'active' ? 'success' : 'secondary'} className="uppercase text-[10px]">
                          {s.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditOpen(s)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={!!editingService} onClose={() => setEditingService(null)} title="Edit Service">
        {editingService && (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-xl mb-4 text-sm">
              <p className="font-medium text-foreground">{editingService.name}</p>
              <p className="text-muted-foreground mt-1">Original Rate: {formatCurrency(Number(editingService.originalRate))}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Sell Rate (Your Price)</label>
              <Input 
                required 
                type="number" 
                step="0.001"
                value={editRate} 
                onChange={e => setEditRate(e.target.value)} 
              />
              <p className="text-xs text-muted-foreground">Default uses a 3.5% markup.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select 
                className="flex h-12 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary appearance-none cursor-pointer"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as "active" | "inactive")}
              >
                <option value="active">Active (Visible to users)</option>
                <option value="inactive">Inactive (Hidden)</option>
              </select>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setEditingService(null)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
