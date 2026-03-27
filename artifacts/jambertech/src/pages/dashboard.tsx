import { useAuthStore } from "@/lib/store";
import { useListOrders } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Wallet, ShoppingBag, Clock, TrendingUp, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export function Dashboard() {
  const { user } = useAuthStore();
  const { data: orders, isLoading } = useListOrders();

  if (!user) return null;

  const totalSpent = orders?.reduce((acc, order) => acc + Number(order.charge), 0) || 0;
  const activeOrders = orders?.filter(o => o.status === "pending" || o.status === "in_progress").length || 0;
  const recentOrders = orders?.slice(0, 5) || [];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'in_progress': return 'default';
      case 'canceled': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glow-effect">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Available Balance</p>
                <h3 className="text-3xl font-bold text-foreground">{formatCurrency(user.balance)}</h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Spent</p>
                <h3 className="text-3xl font-bold text-foreground">{formatCurrency(totalSpent)}</h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Orders</p>
                <h3 className="text-3xl font-bold text-foreground">{orders?.length || 0}</h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
                <ShoppingBag className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Active Orders</p>
                <h3 className="text-3xl font-bold text-foreground">{activeOrders}</h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Orders Table */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Your latest transactions on the platform.</CardDescription>
            </div>
            <Link href="/orders" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="flex-1">
            {isLoading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                <ShoppingBag className="h-8 w-8 mb-2 opacity-50" />
                <p>No orders yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 rounded-t-xl">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-xl font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">Service</th>
                      <th className="px-4 py-3 font-medium">Quantity</th>
                      <th className="px-4 py-3 font-medium">Charge</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 rounded-tr-xl font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{order.id}</td>
                        <td className="px-4 py-3 max-w-[200px] truncate" title={order.serviceName || `Service #${order.serviceId}`}>
                          {order.serviceName || `Service #${order.serviceId}`}
                        </td>
                        <td className="px-4 py-3">{order.quantity.toLocaleString()}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{formatCurrency(Number(order.charge))}</td>
                        <td className="px-4 py-3">
                          <Badge variant={getStatusColor(order.status) as any} className="uppercase text-[10px] tracking-wider">
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(order.createdAt), 'MMM d, yyyy')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Action Card */}
        <Card className="bg-gradient-to-br from-primary/10 to-blue-900/10 border-primary/20">
          <CardHeader>
            <CardTitle>Ready to grow?</CardTitle>
            <CardDescription>Place a new order instantly using our high-speed panel.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">
              Choose from hundreds of services across all major social media platforms. High quality, automated delivery.
            </p>
            <Link href="/new-order" className="block w-full">
              <button className="w-full flex items-center justify-center gap-2 h-12 bg-primary text-primary-foreground rounded-xl font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all">
                <ShoppingBag className="h-5 w-5" />
                Place New Order
              </button>
            </Link>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
