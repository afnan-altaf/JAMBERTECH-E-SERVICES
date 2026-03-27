import { useListOrders } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { PackageSearch, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function OrdersHistory() {
  const { data: orders, isLoading } = useListOrders();
  const [search, setSearch] = useState("");

  const filteredOrders = orders?.filter(o => 
    o.id.toString().includes(search) || 
    (o.link && o.link.toLowerCase().includes(search.toLowerCase())) ||
    (o.serviceName && o.serviceName.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'partial': return 'warning';
      case 'in_progress': return 'default';
      case 'canceled': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Order History</h1>
          <p className="text-muted-foreground">Track and manage all your past and active orders.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search link, ID, service..." 
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
          ) : filteredOrders.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
              <PackageSearch className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium text-foreground">No orders found.</p>
              <p>You haven't placed any orders matching this search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">ID</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Link</th>
                    <th className="px-6 py-4 font-medium">Service</th>
                    <th className="px-6 py-4 font-medium text-right">Quantity</th>
                    <th className="px-6 py-4 font-medium text-right">Charge</th>
                    <th className="px-6 py-4 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium">{order.id}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(new Date(order.createdAt), 'MMM d, yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4">
                        <a href={order.link} target="_blank" rel="noreferrer" className="text-primary hover:underline max-w-[200px] block truncate" title={order.link}>
                          {order.link}
                        </a>
                      </td>
                      <td className="px-6 py-4 max-w-[250px] truncate" title={order.serviceName || `Service #${order.serviceId}`}>
                        {order.serviceName || `Service #${order.serviceId}`}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">{order.quantity.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-medium text-foreground">{formatCurrency(Number(order.charge))}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={getStatusColor(order.status) as any} className="uppercase text-[10px] tracking-wider px-2">
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
