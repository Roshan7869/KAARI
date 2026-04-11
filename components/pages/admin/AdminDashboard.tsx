'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, ShoppingCart, Users, DollarSign, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import {
  useDashboardMetrics,
  useRecentOrders,
  formatCurrency,
  formatRelativeTime,
  getStatusVariant,
  TimePeriod,
} from '@/hooks/useAdminDashboard';

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  today: 'Today',
  week: 'Last 7 Days',
  month: 'Last 30 Days',
  all: 'All Time',
};

export default function AdminDashboard() {
  const [period, setPeriod] = useState<TimePeriod>('month');

  const {
    data: metrics,
    isLoading: isLoadingMetrics,
    error: metricsError,
    refetch: refetchMetrics,
  } = useDashboardMetrics(period);

  const {
    data: recentOrders,
    isLoading: isLoadingOrders,
    error: ordersError,
    refetch: refetchOrders,
  } = useRecentOrders(10);

  const handleRefresh = () => {
    refetchMetrics();
    refetchOrders();
  };

  const isLoading = isLoadingMetrics || isLoadingOrders;
  const error = metricsError || ordersError;

  // Stats configuration with real data
  const stats = [
    {
      title: 'Total Revenue',
      value: metrics ? formatCurrency(metrics.totalRevenue) : '₹0',
      icon: DollarSign,
      change: TIME_PERIOD_LABELS[period],
    },
    {
      title: 'Total Orders',
      value: metrics?.totalOrders?.toString() ?? '0',
      icon: ShoppingCart,
      change: TIME_PERIOD_LABELS[period],
    },
    {
      title: 'Customers',
      value: metrics?.totalCustomers?.toString() ?? '0',
      icon: Users,
      change: 'All time',
    },
    {
      title: 'Pending Orders',
      value: metrics?.pendingOrders?.toString() ?? '0',
      icon: Package,
      change: 'Requires attention',
    },
  ];

  const quickActions = [
    { title: 'Manage Products', description: 'Add, edit, or remove products', href: '/admin/products', icon: Package },
    { title: 'View Orders', description: 'Process and manage orders', href: '/admin/orders', icon: ShoppingCart },
    { title: 'Customer Management', description: 'View customer details', href: '/admin/customers', icon: Users },
    { title: 'Settings', description: 'Configure store settings', href: '/admin/settings', icon: null },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your admin panel</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(value) => setPeriod(value as TimePeriod)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Refresh data"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load dashboard data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingMetrics
          ? // Loading skeletons
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))
          : stats.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-display font-bold mt-1">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <stat.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-display text-xl mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {action.icon && (
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <action.icon className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-display font-medium">{action.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Recent Orders</CardTitle>
          <CardDescription>Latest orders from your store</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingOrders ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentOrders && recentOrders.length > 0 ? (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">
                        {order.order_number || `Order #${order.id.slice(0, 8)}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.customer_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(order.total_amount || 0)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getStatusVariant(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(order.created_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent orders</p>
              <p className="text-sm">Orders will appear here once customers start placing them</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}