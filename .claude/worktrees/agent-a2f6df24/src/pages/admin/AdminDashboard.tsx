import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  Users,
  AlertCircle,
  TrendingUp,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AdminOrder {
  id: string;
  order_number: string | null;
  status: string;
  total_amount: number | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
}

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [orders, products, users, pendingOrders] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase
          .from('orders')
          .select('id')
          .in('status', ['pending', 'processing']),
      ]);

      return {
        totalOrders: orders.count || 0,
        totalProducts: products.count || 0,
        totalUsers: users.count || 0,
        pendingOrders: pendingOrders.data?.length || 0,
      };
    },
    staleTime: 1000 * 60,
  });

  const { data: recentOrders = [] } = useQuery<AdminOrder[]>({
    queryKey: ['admin-recent-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, total_amount, created_at, profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching orders:', error);
        return [];
      }
      return data || [];
    },
    staleTime: 1000 * 30,
  });

  const { data: revenue } = useQuery({
    queryKey: ['admin-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount, currency')
        .eq('status', 'paid');

      if (error) throw error;

      const totalINR = (data || [])
        .filter((p) => p.currency === 'INR')
        .reduce((sum, p) => sum + p.amount, 0);

      return { total: totalINR, currency: 'INR' };
    },
    staleTime: 1000 * 60 * 5,
  });

  const statCards = [
    {
      title: 'Total Revenue',
      value: revenue ? `₹${revenue.total.toLocaleString('en-IN')}` : '₹0',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Orders',
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Products',
      value: stats?.totalProducts || 0,
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Customers',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-display text-3xl text-foreground">Dashboard</h1>
        <p className="font-body text-muted-foreground mt-1">
          Welcome back! Here's an overview of your store.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-body text-xs text-muted-foreground uppercase mb-1">
                      {stat.title}
                    </p>
                    <p className="font-display text-2xl text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Pending Orders Alert */}
      {stats?.pendingOrders > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-body font-medium text-amber-800">
                      {stats.pendingOrders} order{stats.pendingOrders > 1 ? 's' : ''} pending
                    </p>
                    <p className="font-body text-sm text-amber-700">
                      There are orders waiting to be processed
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/orders?status=pending">View Orders</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Orders</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/orders">
                View All
                <ArrowUpRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-body text-sm">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-accent/5 rounded-lg hover:bg-accent/10 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-body text-sm font-medium">
                        {order.order_number || `ORD-${order.id.slice(0, 8)}`}
                      </p>
                      <p className="font-body text-xs text-muted-foreground">
                        {order.profiles?.full_name || 'Unknown Customer'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-body text-sm font-semibold">
                        ₹{order.total_amount?.toLocaleString('en-IN') || 0}
                      </p>
                      <Badge
                        variant={order.status === 'delivered' ? 'default' : 'secondary'}
                        className="font-body text-xs"
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to="/admin/products/new">
                  <Package className="w-5 h-5 mb-2" />
                  <span className="font-body text-sm">Add Product</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to="/admin/orders?status=pending">
                  <ShoppingCart className="w-5 h-5 mb-2" />
                  <span className="font-body text-sm">Pending Orders</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to="/admin/customers">
                  <Users className="w-5 h-5 mb-2" />
                  <span className="font-body text-sm">Customers</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to="/admin/settings">
                  <TrendingUp className="w-5 h-5 mb-2" />
                  <span className="font-body text-sm">Analytics</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}