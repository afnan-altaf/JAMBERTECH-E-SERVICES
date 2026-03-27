import { useState } from "react";
import { useListUsers, useAddBalance } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListUsersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";
import { Users, DollarSign } from "lucide-react";
import { format } from "date-fns";

export function AdminUsers() {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useListUsers();
  const balanceMutation = useAddBalance();

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState("");

  const handleAddBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    balanceMutation.mutate({
      data: { userId: selectedUser.id, amount: Number(amount) }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setSelectedUser(null);
        setAmount("");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Manage Users</h1>
        <p className="text-muted-foreground">View users and manage their balances.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : users?.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium text-foreground">No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">ID</th>
                    <th className="px-6 py-4 font-medium">User</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 font-medium text-right">Balance</th>
                    <th className="px-6 py-4 font-medium">Joined</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users?.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono">{u.id}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{u.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                      <td className="px-6 py-4">
                        <Badge variant={u.role === 'admin' ? 'destructive' : 'secondary'} className="uppercase text-[10px]">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-green-400">{formatCurrency(Number(u.balance))}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(new Date(u.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelectedUser(u)} className="h-8">
                          <DollarSign className="h-4 w-4 mr-1" /> Add Funds
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

      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="Add Balance">
        {selectedUser && (
          <form onSubmit={handleAddBalance} className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-xl mb-4 text-sm flex justify-between items-center">
              <div>
                <p className="font-medium text-foreground">{selectedUser.name}</p>
                <p className="text-muted-foreground text-xs">{selectedUser.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase">Current</p>
                <p className="font-bold text-green-400">{formatCurrency(Number(selectedUser.balance))}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount to Add (USD)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  required 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  className="pl-9"
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  placeholder="50.00"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setSelectedUser(null)}>Cancel</Button>
              <Button type="submit" disabled={balanceMutation.isPending}>
                {balanceMutation.isPending ? "Adding..." : "Add Balance"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
