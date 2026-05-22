import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, Grid, Stack, TextField, Typography } from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import EggOutlinedIcon from "@mui/icons-material/EggOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable, SectionCard, StatCard } from "../../components/shared";
import { eggService } from "../../api/services";
import { formatCurrency, formatDate } from "../../utils/helpers";

const formatDateForInput = (date) => date.toISOString().split("T")[0];

function TrendChart({ data, height = 300 }) {
  const chartData = data.map((entry) => ({
    date: formatDate(entry.date || entry.entry_date),
    Revenue: Math.round(Number(entry.revenue || entry.total_revenue || 0)),
    Profit: Math.round(Number(entry.profit || entry.gross_profit || 0)),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
        <defs>
          <linearGradient id="eggRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1565C0" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#1565C0" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="eggProfit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#2E7D32" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11, fill: "#718096" }} />
        <YAxis tick={{ fontSize: 11, fill: "#718096" }} tickFormatter={(value) => formatCurrency(value, 0)} />
        <Tooltip
          contentStyle={{ backgroundColor: "rgba(0, 0, 0, 0.88)", border: "none", borderRadius: "6px", color: "white" }}
          formatter={(value) => formatCurrency(value, 0)}
          labelStyle={{ color: "white" }}
        />
        <Legend wrapperStyle={{ paddingTop: "20px" }} />
        <Area type="monotone" dataKey="Revenue" stroke="#1565C0" fillOpacity={1} fill="url(#eggRevenue)" strokeWidth={2} />
        <Area type="monotone" dataKey="Profit" stroke="#2E7D32" fillOpacity={1} fill="url(#eggProfit)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function EggReportsPage() {
  const today = new Date();
  const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

  const [fromDate, setFromDate] = useState(formatDateForInput(oneMonthAgo));
  const [toDate, setToDate] = useState(formatDateForInput(today));
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    const stock = summary?.stock || {};
    const money = summary?.money || {};

    return {
      eggsBought: Number(stock.total_eggs_bought || 0),
      eggsSold: Number(stock.total_eggs_sold || 0),
      damaged: Number(stock.total_damaged || 0),
      closingStock: Number(stock.closing_stock || 0),
      investment: Number(money.total_investment || 0),
      revenue: Number(money.total_revenue || 0),
      profit: Number(money.gross_profit || 0),
      avgProfitPerEgg: Number(money.avg_profit_per_egg || 0),
    };
  }, [summary]);

  const getEggData = useCallback(async () => {
    if (!fromDate || !toDate) {
      setError("Please select both From Date and To Date");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await eggService.summary({ from: fromDate, to: toDate });
      setSummary(res);
      setEntries(Array.isArray(res.daily_breakdown) ? res.daily_breakdown : []);
    } catch (error) {
      setError("Failed to fetch egg report.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    if (fromDate && toDate) {
      setPage(1);
      getEggData();
    }
  }, [fromDate, toDate, getEggData]);

  const handleReset = () => {
    setFromDate(formatDateForInput(oneMonthAgo));
    setToDate(formatDateForInput(today));
    setPage(1);
    setError("");
  };

  const paginatedEntries = entries.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(entries.length / perPage);

  const reportColumns = [
    { field: "date", label: "Date", render: (value, row) => <Typography variant="body2" fontWeight={700}>{formatDate(value || row.entry_date)}</Typography> },
    { field: "opening_stock", label: "Opening", render: (value) => Number(value).toLocaleString("en-IN") },
    { field: "new_stock", label: "New Stock", render: (value, row) => Number(value ?? row.new_stock_today).toLocaleString("en-IN") },
    { field: "eggs_sold", label: "Sold", render: (value, row) => Number(value ?? row.total_eggs_sold).toLocaleString("en-IN") },
    {
      field: "damaged",
      label: "Damaged",
      align: "center",
      render: (value, row) => {
        const damaged = Number((value ?? row.damaged_eggs) || 0);
        return damaged > 0
          ? <Chip label={damaged.toLocaleString("en-IN")} size="small" color="warning" icon={<WarningAmberIcon style={{ fontSize: 12 }} />} />
          : <Typography variant="caption" color="text.secondary">0</Typography>;
      },
    },
    { field: "closing_stock", label: "Closing", render: (value) => Number(value).toLocaleString("en-IN") },
    { field: "revenue", label: "Revenue", render: (value, row) => formatCurrency(value ?? row.total_revenue) },
    { field: "cost", label: "Cost", render: (value, row) => formatCurrency(value ?? row.total_cost) },
    {
      field: "profit",
      label: "Profit",
      align: "right",
      render: (value, row) => {
        const profit = Number((value ?? row.gross_profit) || 0);
        return (
          <Typography variant="body2" fontWeight={800} color={profit >= 0 ? "success.main" : "error.main"}>
            {formatCurrency(profit)}
          </Typography>
        );
      },
    },
    {
      field: "sale_lines",
      label: "Sale Lines",
      render: (value) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {(value || []).map((line, index) => (
            <Chip
              key={line.id || index}
              size="small"
              variant="outlined"
              label={`${Number(line.trays_sold || 0).toLocaleString("en-IN")} trays + ${Number(line.loose_eggs_sold || 0).toLocaleString("en-IN")} eggs @ ${formatCurrency(line.price ?? line.price_per_egg)}`}
            />
          ))}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Stack direction="row" spacing={1.5} mb={2.5} flexWrap="wrap" useFlexGap>
        <TextField
          type="date"
          size="small"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          label="From Date"
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 150 }}
        />
        <TextField
          type="date"
          size="small"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          label="To Date"
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 150 }}
        />
        <Button variant="outlined" onClick={handleReset}>Reset</Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <Typography variant="caption" color="text.secondary">Loading...</Typography>}

      <Grid container spacing={2} mb={2.5}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard label="Investment" value={formatCurrency(stats.investment, 0)} icon={<AccountBalanceWalletIcon fontSize="small" />} color="primary.main" bgcolor="primary.50" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard label="Revenue" value={formatCurrency(stats.revenue, 0)} icon={<PaidOutlinedIcon fontSize="small" />} color="success.main" bgcolor="success.light" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard label="Gross Profit" value={formatCurrency(stats.profit, 0)} icon={<TrendingUpIcon fontSize="small" />} color="secondary.main" bgcolor="secondary.50" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard label="Avg Profit/Egg" value={formatCurrency(stats.avgProfitPerEgg)} icon={<EggOutlinedIcon fontSize="small" />} color="warning.main" bgcolor="warning.light" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard label="Eggs Bought" value={stats.eggsBought.toLocaleString("en-IN")} icon={<EggOutlinedIcon fontSize="small" />} color="success.main" bgcolor="success.light" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard label="Eggs Sold" value={stats.eggsSold.toLocaleString("en-IN")} icon={<EggOutlinedIcon fontSize="small" />} color="secondary.main" bgcolor="secondary.50" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard label="Damaged Eggs" value={stats.damaged.toLocaleString("en-IN")} icon={<WarningAmberIcon fontSize="small" />} color="error.main" bgcolor="error.light" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard label="Closing Stock" value={stats.closingStock.toLocaleString("en-IN")} icon={<WarningAmberIcon fontSize="small" />} color="warning.main" bgcolor="warning.light" />
        </Grid>
      </Grid>

      {entries.length >= 2 && (
        <Box mb={2.5} sx={{ width: "100%" }}>
          <SectionCard title="Revenue and Profit Trend">
            <TrendChart data={entries} height={300} />
          </SectionCard>
        </Box>
      )}

      <SectionCard title="Daily Breakdown">
        {fromDate && toDate ? (
          <>
            <DataTable
              columns={reportColumns}
              rows={paginatedEntries}
              emptyMessage="No egg entries found for the selected date range."
            />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
              <Button disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Prev</Button>
              <Typography variant="caption">Page {page} of {totalPages || 1}</Typography>
              <Button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </Box>

            {entries.length > 0 && (
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
                <Stack direction="row" justifyContent="space-between" flexWrap="wrap" useFlexGap>
                  <Typography variant="caption" color="text.secondary">{entries.length} entries found</Typography>
                </Stack>
              </Box>
            )}
          </>
        ) : (
          <Card>
            <CardContent sx={{ textAlign: "center", py: 6 }}>
              <Typography color="text.secondary" variant="body2">
                Select both dates to view egg reports
              </Typography>
            </CardContent>
          </Card>
        )}
      </SectionCard>
    </Box>
  );
}
