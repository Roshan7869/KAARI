import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { CircleAlert as AlertCircle, Package, ShoppingCart, Users } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

interface AdminOrder {
  id: string;
  order_number: string | null;
  status: string;
  total_amount: number | null;
  created_at: string;
  profiles: {
    full_name: string | null;
  } | null;
}

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        setIsAdmin(!!roles);
      } catch (err) {
        console.error('Admin check error:', err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    enabled: isAdmin,
    queryFn: async () => {
      const [orders, products, users, customRequests] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase
          .from('orders')
          .select('id')
          .eq('status', 'awaiting_review')
          .then(res => ({ count: res.data?.length || 0 })),
      ]);

      return {
        totalOrders: orders.count || 0,
        totalProducts: products.count || 0,
        totalUsers: users.count || 0,
        pendingReviews: customRequests.count,
      };
    },
    staleTime: 1000 * 60,
  });

  const { data: orders = [] } = useQuery<AdminOrder[]>({
    queryKey: ['admin-orders'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, total_amount, created_at, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching orders:', error);
        return [];
      }
      return data || [];
    },
    staleTime: 1000 * 30,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-2xl text-foreground mb-2">Access Denied</h1>
          <p className="font-body text-muted-foreground">
            You don't have permission to access the admin panel
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="font-display text-4xl text-foreground mb-2">Admin Dashboard</h1>
          <p className="font-body text-muted-foreground">Manage your marketplace</p>
        </motion.div>

        <ErrorBoundary componentName="Admin Stats">
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="fabric-card p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-xs text-muted-foreground uppercase mb-1">Total Orders</p>
                  <p className="font-display text-2xl text-foreground">{stats?.totalOrders || 0}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-accent opacity-20" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="fabric-card p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-xs text-muted-foreground uppercase mb-1">Products</p>
                  <p className="font-display text-2xl text-foreground">{stats?.totalProducts || 0}</p>
                </div>
                <Package className="w-8 h-8 text-accent opacity-20" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="fabric-card p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-xs text-muted-foreground uppercase mb-1">Customers</p>
                  <p className="font-display text-2xl text-foreground">{stats?.totalUsers || 0}</p>
                </div>
                <Users className="w-8 h-8 text-accent opacity-20" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`fabric-card p-6 ${stats?.pendingReviews > 0 ? 'ring-1 ring-amber-500' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-xs text-muted-foreground uppercase mb-1">Pending Reviews</p>
                  <p className="font-display text-2xl text-accent">{stats?.pendingReviews || 0}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-accent opacity-20" />
              </div>
            </motion.div>
          </div>
        </ErrorBoundary>

        <ErrorBoundary componentName="Recent Orders">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="fabric-card p-6"
          >
            <h2 className="font-display text-2xl text-foreground mb-6">Recent Orders</h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-body text-xs text-muted-foreground uppercase tracking-wider">
                      Order #
                    </th>
                    <th className="text-left py-3 px-4 font-body text-xs text-muted-foreground uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="text-left py-3 px-4 font-body text-xs text-muted-foreground uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 font-body text-xs text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-body text-xs text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No orders yet
                      </td>
                    </tr>
                  ) : (
                    orders.map((order, i) => (
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="border-b border-border hover:bg-accent/5 transition-colors"
                      >
                        <td className="py-3 px-4 font-body text-sm text-foreground">
                          {order.order_number || `ORD-${order.id.slice(0, 8)}`}
                        </td>
                        <td className="py-3 px-4 font-body text-sm text-foreground">
                          {order.profiles?.full_name || 'Unknown'}
                        </td>
                        <td className="py-3 px-4 font-body text-sm text-primary font-semibold">
                          ₹{order.total_amount?.toLocaleString('en-IN') || 0}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-body uppercase tracking-wider ${
                            order.status === 'delivered'
                              ? 'bg-green-100 text-green-700'
                              : order.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-body text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('en-IN')}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </ErrorBoundary>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 fabric-card p-6 bg-accent/5"
        >
          <h3 className="font-display text-xl text-foreground mb-3">Coming Soon</h3>
          <ul className="space-y-2 font-body text-sm text-muted-foreground">
            <li>• Product management and catalog editing</li>
            <li>• Custom order review queue</li>
            <li>• Quote approval workflow</li>
            <li>• Vendor management</li>
            <li>• Payment and revenue tracking</li>
            <li>• Customer analytics and insights</li>
          </ul>
        </motion.div>
      </div>
    </main>
  );
}
