// src/pages/Supermarket/ReportsPage.jsx
import { useState, useMemo, useEffect } from "react";
import {
  Box, Grid, Typography, Stack,
  Button, Chip, TextField, Alert,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCurrency } from "../../utils/helpers";
import { StatCard, SectionCard, DataTable } from "../../components/shared";
import { billService } from "../../api/services";

// ✅ Recharts-based Chart Component
function TrendChart({ data, height = 300 }) {
  const chartData = data.map((d) => ({
    date: d.day_name,
    Revenue: Math.round(d.total_sales || 0),
    Profit: Math.round(d.total_profit || 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1565C0" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#1565C0" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#2E7D32" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis 
          dataKey="date" 
          angle={-45} 
          textAnchor="end" 
          height={80}
          tick={{ fontSize: 11, fill: "#718096" }}
        />
        <YAxis 
          tick={{ fontSize: 11, fill: "#718096" }}
          tickFormatter={(value) => value >= 1000 ? `₹${(value / 1000).toFixed(0)}k` : `₹${value}`}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            border: "none",
            borderRadius: "6px",
            color: "white",
          }}
          formatter={(value) => `₹${value.toLocaleString()}`}
          labelStyle={{ color: "white" }}
        />
        <Legend wrapperStyle={{ paddingTop: "20px" }} />
        <Area 
          type="monotone" 
          dataKey="Revenue" 
          stroke="#1565C0" 
          fillOpacity={1} 
          fill="url(#colorRevenue)"
          strokeWidth={2}
        />
        <Area 
          type="monotone" 
          dataKey="Profit" 
          stroke="#2E7D32" 
          fillOpacity={1} 
          fill="url(#colorProfit)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ✅ Recharts-based Bar Chart for Transaction Count
function TxnCountChart({ data, height = 300 }) {
  const chartData = data.map((d) => ({
    date: d.day_name,
    Transactions: d.txn_count || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis 
          dataKey="date"
          angle={-45}
          textAnchor="end"
          height={80}
          tick={{ fontSize: 11, fill: "#718096" }}
        />
        <YAxis 
          tick={{ fontSize: 11, fill: "#718096" }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            border: "none",
            borderRadius: "6px",
            color: "white",
          }}
          labelStyle={{ color: "white" }}
        />
        <Legend wrapperStyle={{ paddingTop: "20px" }} />
        <Bar 
          dataKey="Transactions" 
          fill="#E65100" 
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function SupermarketReportsPage() {
  // ✅ Calculate default dates: Today and One Month Ago
  const today = new Date();
  const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const formatDateForInput = (date) => date.toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(formatDateForInput(oneMonthAgo));
  const [toDate, setToDate] = useState(formatDateForInput(today));
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);

  // ✅ Fetch data from API
  useEffect(() => {
    if (fromDate && toDate) {
      getBillData();
    }
  }, [fromDate, toDate]);

  const getBillData = async () => {
    try {
      setLoading(true);
      setError("");
      setPage(1); // Reset to first page when fetching new data

      const payload = {
        from: fromDate,
        to: toDate,
      };

      const res = await billService.summary(payload);
      setBillData(res);
    } catch (error) {
      console.error("Failed to fetch bill summary");
      setError("Failed to fetch bill summary data");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFromDate(formatDateForInput(oneMonthAgo));
    setToDate(formatDateForInput(today));
    setBillData(null);
    setError("");
    setPage(1);
  };

  // ✅ Prepare data for Recharts
  const chartData = useMemo(() => {
    return billData?.day_of_week_breakdown || [];
  }, [billData]);

  // ✅ Prepare product performance data
  const productPerf = useMemo(() => {
    if (!billData?.sold_products) return [];
    return [...billData.sold_products].sort(
      (a, b) => Number(b.margin_percent || 0) - Number(a.margin_percent || 0)
    );
  }, [billData]);

  // ✅ Client-side pagination
  const paginatedProducts = productPerf.slice(
    (page - 1) * perPage,
    page * perPage
  );
  const totalPages = Math.ceil(productPerf.length / perPage);

  const perfColumns = [
    { field: "product_name", label: "Product", render: (v) => <Typography variant="body2" fontWeight={600}>{v}</Typography> },
    { 
      field: "qty_sold", 
      label: "Qty Sold", 
      align: "center",
      render: (_, row) => (
        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
          {(row.loose_qty > 0 || row.wholesale_qty > 0) && (
            <Chip
              label={[
                row.loose_qty > 0 ? `Loose: ${row.loose_qty}` : "",
                row.wholesale_qty > 0 ? `Wholesale: ${row.wholesale_qty}` : "",
                row.base_qty_sold > 0 ? `Base: ${row.base_qty_sold}` : "",
              ].filter(Boolean).join(" · ")}
              size="small"
              color="info"
              variant="outlined"
            />
          )}
        </Stack>
      )
    },
    { field: "total_revenue", label: "Revenue (ex GST)", render: (v) => formatCurrency(v) },
    {
      field: "gross_profit",
      label: "Gross Profit",
      render: (_, row) => formatCurrency(row.gross_profit ?? row.profit_revenue),
    },
    {
      field: "margin_percent", label: "Margin %", align: "center",
      render: (v) => (
        <Chip
          label={`${Number(v || 0).toFixed(1)}%`}
          size="small"
          color={Number(v || 0) >= 15 ? "success" : Number(v || 0) >= 8 ? "warning" : "error"}
          variant="outlined"
        />
      ),
    },
  ];

  return (
    <Box>
      {/* Date Filter */}
      <Stack direction="row" spacing={1.5} mb={2.5} flexWrap="wrap" useFlexGap>
        <TextField
          type="date"
          size="small"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          label="From Date"
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 140 }}
        />

        <TextField
          type="date"
          size="small"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          label="To Date"
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 140 }}
        />

        <Button
          variant="outlined"
          onClick={handleReset}
        >
          Reset
        </Button>
      </Stack>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Typography variant="caption" color="text.secondary">
          Loading...
        </Typography>
      )}

      {/* Stats - Only show when data is loaded */}
      {billData && (
        <>
          <Grid container spacing={2} mb={2.5}>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                label="Total Sales"
                value={formatCurrency(billData.totals?.total_sales, 0)}
                icon={<AccountBalanceWalletIcon fontSize="small" />}
                color="primary.main" bgcolor="primary.50"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                label="Total Profit"
                value={formatCurrency(billData.totals?.total_profit, 0)}
                icon={<TrendingUpIcon fontSize="small" />}
                color="success.main" bgcolor="success.light"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                label="Total Bills"
                value={billData.totals?.total_bills}
                icon={<ReceiptIcon fontSize="small" />}
                color="secondary.main" bgcolor="secondary.50"
              />
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={2.5} mb={2.5}>
            <Grid item xs={12} lg={7}>
              <SectionCard title="Revenue vs. Profit Trend">
                {chartData && chartData.length > 0 ? (
                  <TrendChart data={chartData} height={300} />
                ) : (
                  <Typography variant="caption" color="text.secondary">No chart data available</Typography>
                )}
              </SectionCard>
            </Grid>
            <Grid item xs={12} lg={5}>
              <SectionCard title="Transactions Count">
                {chartData && chartData.length > 0 ? (
                  <TxnCountChart data={chartData} height={300} />
                ) : (
                  <Typography variant="caption" color="text.secondary">No chart data available</Typography>
                )}
              </SectionCard>
            </Grid>
          </Grid>
        </>
      )}

      {/* Product Performance */}
      <SectionCard title="Product Performance Ranking" subtitle="Detailed breakdown of top performing products by profitability.">
        <DataTable columns={perfColumns} rows={paginatedProducts} emptyMessage="No product data" />

        {/* UI Pagination Controls */}
        {productPerf.length > 0 && (
          <>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
              <Button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>

              <Typography variant="caption">
                Page {page} of {totalPages || 1}
              </Typography>

              <Button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </Box>

            <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">{productPerf.length} products found</Typography>
                <Stack direction="row" spacing={2}>
                  <Typography variant="caption" fontWeight={700}>
                    Total Revenue: {formatCurrency(productPerf.reduce((s, p) => s + (p.total_revenue || 0), 0))}
                  </Typography>
                  <Typography variant="caption" fontWeight={700} color="success.main">
                    Total Profit: {formatCurrency(productPerf.reduce((s, p) => s + (p.gross_profit ?? p.profit_revenue ?? 0), 0))}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          </>
        )}
      </SectionCard>
    </Box>
  );
}
