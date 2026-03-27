import { useState } from "react";
import { useListProviders, useCreateProvider, useDeleteProvider, useSyncServices } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListProvidersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Database, Plus, RefreshCw, Trash2, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

export function AdminProviders() {
  const queryClient = useQueryClient();
  const { data: providers, isLoading } = useListProviders();
  
  const createMutation = useCreateProvider();
  const deleteMutation = useDeleteProvider();
  const syncMutation = useSyncServices();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", apiUrl: "", apiKey: "" });
  const [syncResult, setSyncResult] = useState<any>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ data: { ...formData, status: "active" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProvidersQueryKey() });
        setIsAddOpen(false);
        setFormData({ name: "", apiUrl: "", apiKey: "" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if(confirm("Are you sure you want to delete this provider?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProvidersQueryKey() })
      });
    }
  };

  const handleSync = () => {
    setSyncResult(null);
    syncMutation.mutate(undefined, {
      onSuccess: (data) => setSyncResult(data),
      onError: () => alert("Sync failed")
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Providers</h1>
          <p className="text-muted-foreground">Manage API providers for your SMM panel.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleSync} disabled={syncMutation.isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync Services'}
          </Button>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Provider
          </Button>
        </div>
      </div>

      {syncResult && (
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4 flex justify-between items-center text-sm font-medium">
            <span className="text-primary">Sync Complete!</span>
            <div className="flex gap-4">
              <span className="text-green-400">Added: {syncResult.added}</span>
              <span className="text-blue-400">Updated: {syncResult.updated}</span>
              <span className="text-yellow-400">Deactivated: {syncResult.deactivated}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : providers?.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
              <Database className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium text-foreground">No providers yet.</p>
              <p>Add your first API provider to fetch services.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">ID</th>
                    <th className="px-6 py-4 font-medium">Name</th>
                    <th className="px-6 py-4 font-medium">API URL</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Added</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {providers?.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono">{p.id}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{p.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{p.apiUrl}</td>
                      <td className="px-6 py-4">
                        <Badge variant={p.status === 'active' ? 'success' : 'secondary'} className="uppercase text-[10px]">
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(new Date(p.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
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

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New Provider" description="API keys will be stored securely.">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Provider Name</label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. SocialSphare" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">API URL</label>
            <Input required type="url" value={formData.apiUrl} onChange={e => setFormData({...formData, apiUrl: e.target.value})} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">API Key <ShieldAlert className="w-3 h-3 text-yellow-500" /></label>
            <Input required type="password" value={formData.apiKey} onChange={e => setFormData({...formData, apiKey: e.target.value})} placeholder="Secret Key" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save Provider"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
