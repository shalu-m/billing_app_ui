// src/pages/EggTracking/EggReportsPage.jsx
import { useMemo, useState, useEffect } from "react";
import { Box, Grid, Card, CardContent, Typography, Stack, Chip, TextField, Button, Alert } from "@mui/material";
import EggOutlinedIcon from "@mui/icons-material/EggOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCurrency, formatDate } from "../../utils/helpers";
import { StatCard, SectionCard, DataTable } from "../../components/shared";
import { eggService } from "../../api/services";

// ✅ Recharts-based Chart Component
function TrendChart({ data, height = 300 }) {
  const chartData = data.map((e) => ({
    date: (() => {
      const d = new Date(e.entry_date);
      const day = d.getDate().toString().padStart(2, '0');
      const month = d.toLocaleString("default", { month: "short" });
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    })(),
    Revenue: Math.round(e.revenue || 0),
    Profit: Math.round(e.profit || 0),
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

export default function EggReportsPage() {
  // ✅ Calculate default dates: Today and One Month Ago
  const today = new Date();
  const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const formatDateForInput = (date) => date.toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(formatDateForInput(oneMonthAgo));
  const [toDate, setToDate] = useState(formatDateForInput(today));
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [error, setError] = useState("");

  const stats = useMemo(() => ({
    totalSold: entries.reduce((s, e) => s + e.eggs_sold, 0),
    totalRevenue: entries.reduce((s, e) => s + e.revenue, 0),
    totalProfit: entries.reduce((s, e) => s + e.profit, 0),
    totalDamaged: entries.reduce((s, e) => s + e.damaged_eggs, 0),
  }), [entries]);

  const chartEntries = [...entries].reverse();

  useEffect(() => {
    // Only fetch if both dates are selected
    if (fromDate && toDate) {
      setPage(1); // Reset to first page when dates change
      getEggData();
    }
  }, [fromDate, toDate]);

  const getEggData = async () => {
    try {
      setLoading(true);
      setError("");

      // ✅ VALIDATE: Both dates must be selected
      if (!fromDate || !toDate) {
        setError("Please select both From Date and To Date");
        setLoading(false);
        return;
      }

      const payload = {
        from: fromDate,
        to: toDate,
      };

      const res = await eggService.list(payload);
      setEntries(res.data);
    } catch (error) {
      console.error("Failed to fetch egg entries");
      setError("Failed to fetch egg entries");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFromDate(formatDateForInput(oneMonthAgo));
    setToDate(formatDateForInput(today));
    setEntries([]);
    setPage(1);
    setError("");
  };

  // ✅ Client-side pagination
  const paginatedEntries = entries.slice(
    (page - 1) * perPage,
    page * perPage
  );
  const totalPages = Math.ceil(entries.length / perPage);

  const perfColumns = [
    { field: "entry_date", label: "Date", render: (v) => <Typography variant="body2" fontWeight={600}>{formatDate(v)}</Typography> },
    { field: "total_stock", label: "Total Stock", render: (v) => v.toLocaleString() },
    { field: "eggs_sold", label: "Sold (Qty)", render: (v) => v.toLocaleString() },
    {
      field: "damaged_eggs", label: "Damaged", align: "center",
      render: (v) => v > 0
        ? <Chip label={v} size="small" color="warning" icon={<WarningAmberIcon style={{ fontSize: 12 }} />} />
        : <Typography variant="caption" color="text.secondary">—</Typography>,
    },
    { field: "closing_stock", label: "Closing Stock", render: (v) => v.toLocaleString() },
    { field: "cost_per_egg", label: "Cost/Egg", render: (v) => `₹${v}` },
    { field: "selling_price", label: "Sell Price", render: (v) => `₹${v}` },
    {
      field: "profit", label: "Net Profit", align: "right",
      render: (v) => (
        <Typography variant="body2" fontWeight={700} color={v >= 0 ? "success.main" : "error.main"}>
          {formatCurrency(v)}
        </Typography>
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
          onChange={(e) => {
            setFromDate(e.target.value);
            setPage(1);
          }}
          label="From Date"
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 140 }}
        />

        <TextField
          type="date"
          size="small"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
            setPage(1);
          }}
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

      {/* Stats - Only show when both dates are selected */}
      {fromDate && toDate && (
        <>
          <Grid container spacing={2} mb={2.5}>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                label="Total Eggs Sold"
                value={stats.totalSold.toLocaleString()}
                icon={<EggOutlinedIcon fontSize="small" />}
                color="primary.main" bgcolor="primary.50"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                label="Total Revenue"
                value={formatCurrency(stats.totalRevenue, 0)}
                icon={<AccountBalanceWalletIcon fontSize="small" />}
                color="success.main" bgcolor="success.light"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                label="Total Profit"
                value={formatCurrency(stats.totalProfit, 0)}
                icon={<TrendingUpIcon fontSize="small" />}
                color="secondary.main" bgcolor="secondary.50"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                label="Damaged Eggs"
                value={stats.totalDamaged.toLocaleString()}
                icon={<WarningAmberIcon fontSize="small" />}
                color="warning.main" bgcolor="warning.light"
              />
            </Grid>
          </Grid>

          {/* Trend Chart */}
          {chartEntries.length >= 2 && (
            <Box mb={2.5} sx={{ width: "100%" }}>
              <SectionCard title="Profit vs. Sales Trend">
                <TrendChart data={chartEntries} height={300} />
              </SectionCard>
            </Box>
          )}
        </>
      )}

      {/* Detailed Log */}
      <SectionCard title="Detailed Performance Log">
        {fromDate && toDate ? (
          <>
            <DataTable 
              columns={perfColumns} 
              rows={paginatedEntries} 
              emptyMessage="No egg entries found for the selected date range." 
            />

            {/* UI Pagination Controls */}
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

            {entries.length > 0 && (
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">{entries.length} entries found</Typography>
                  <Typography variant="caption" fontWeight={700}>
                    Total Profit: {formatCurrency(entries.reduce((s, e) => s + e.profit, 0))}
                  </Typography>
                </Stack>
              </Box>
            )}
          </>
        ) : (
          <Card>
            <CardContent sx={{ textAlign: "center", py: 6 }}>
              <Typography color="text.secondary" variant="body2">
                Select both "From Date" and "To Date" to view egg entries
              </Typography>
            </CardContent>
          </Card>
        )}
      </SectionCard>
    </Box>
  );
}
