import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import CardGiftcardOutlinedIcon from "@mui/icons-material/CardGiftcardOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EggOutlinedIcon from "@mui/icons-material/EggOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { eggService } from "../../api/services";
import { Toast, ConfirmDialog, DataTable, StatCard } from "../../components/shared";
import { formatCurrency, formatDate, isWithinLastDays } from "../../utils/helpers";
import { useConfirm } from "../../hooks/useConfirm";

const todayIso = () => new Date().toISOString().split("T")[0];

const emptyForm = () => ({
  intake_date: todayIso(),
  trays_received: "",
  loose_eggs_received: "",
  free_trays: "",
  free_loose_eggs: "",
  eggs_per_tray: 30,
  total_purchase_amount: "",
  supplier_name: "",
  notes: "",
});

const toNumber = (value) => Number(value || 0);

export default function EggIntakePage() {
  const [form, setForm] = useState(emptyForm());
  const [filters, setFilters] = useState({ from: "", to: "" });
  const [intakes, setIntakes] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalIntakes, setTotalIntakes] = useState(0);
  const [totals, setTotals] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const { confirm, dialogProps } = useConfirm();
  const perPage = 10;

  const preview = useMemo(() => {
    const trays = toNumber(form.trays_received);
    const looseEggs = toNumber(form.loose_eggs_received);
    const freeTrays = toNumber(form.free_trays);
    const freeLooseEggs = toNumber(form.free_loose_eggs);
    const eggsPerTray = toNumber(form.eggs_per_tray) || 30;
    const totalAmount = toNumber(form.total_purchase_amount);

    const purchasedEggs = Math.round((trays * eggsPerTray) + looseEggs);
    const freeEggs = Math.round((freeTrays * eggsPerTray) + freeLooseEggs);
    const totalEggs = purchasedEggs + freeEggs;
    const costPerEgg = purchasedEggs > 0 ? totalAmount / purchasedEggs : 0;
    const costPerTray = costPerEgg * eggsPerTray;

    return {
      purchasedEggs,
      freeEggs,
      totalEggs,
      costPerEgg,
      costPerTray,
      totalCost: totalAmount,
    };
  }, [form]);

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const loadIntakes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await eggService.listIntakes({
        from: filters.from || undefined,
        to: filters.to || undefined,
        page,
        per_page: perPage,
      });
      setIntakes(res.data || []);
      setTotals(res.totals || {});
      if (res.meta) {
        setTotalPages(res.meta.last_page || 1);
        setTotalIntakes(res.meta.total || 0);
      }
    } catch (error) {
      setToast({ open: true, message: "Failed to load egg intakes.", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [filters.from, filters.to, page]);

  useEffect(() => {
    loadIntakes();
  }, [loadIntakes]);

  const validate = () => {
    const nextErrors = {};

    if (!form.intake_date) nextErrors.intake_date = "Required";
    if (toNumber(form.trays_received) <= 0 && toNumber(form.loose_eggs_received) <= 0) {
      nextErrors.trays_received = "Enter trays or loose eggs";
      nextErrors.loose_eggs_received = "Enter trays or loose eggs";
    }
    if (toNumber(form.loose_eggs_received) < 0) nextErrors.loose_eggs_received = "Must be 0 or more";
    if (toNumber(form.free_trays) < 0) nextErrors.free_trays = "Must be 0 or more";
    if (toNumber(form.free_loose_eggs) < 0) nextErrors.free_loose_eggs = "Must be 0 or more";
    if (!form.eggs_per_tray || toNumber(form.eggs_per_tray) <= 0) nextErrors.eggs_per_tray = "Required";
    if (!form.total_purchase_amount || toNumber(form.total_purchase_amount) < 0) {
      nextErrors.total_purchase_amount = "Enter total purchase amount";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const ok = await confirm("Record this egg stock intake?");
    if (!ok) return;

    try {
      await eggService.createIntake({
        intake_date: form.intake_date,
        trays_received: Number(form.trays_received || 0),
        loose_eggs_received: Number(form.loose_eggs_received || 0),
        free_trays: Number(form.free_trays || 0),
        free_loose_eggs: Number(form.free_loose_eggs || 0),
        eggs_per_tray: Number(form.eggs_per_tray),
        total_purchase_amount: Number(form.total_purchase_amount),
        supplier_name: form.supplier_name || null,
        notes: form.notes || null,
      });
      setToast({ open: true, message: "Egg stock intake recorded.", severity: "success" });
      setForm(emptyForm());
      setErrors({});
      loadIntakes();
    } catch (error) {
      setToast({
        open: true,
        message: error.response?.data?.message || "Failed to record egg intake.",
        severity: "error",
      });
    }
  };

  const handleDelete = async (intake) => {
    if (!isWithinLastDays(intake.intake_date, 15)) {
      setToast({ open: true, message: "Only intakes from the last 15 days can be deleted.", severity: "warning" });
      return;
    }

    const ok = await confirm(`Delete intake from ${formatDate(intake.intake_date)}?`);
    if (!ok) return;

    try {
      await eggService.deleteIntake(intake.id);
      setToast({ open: true, message: "Egg stock intake deleted.", severity: "success" });
      loadIntakes();
    } catch (error) {
      setToast({
        open: true,
        message: error.response?.data?.message || "Failed to delete egg intake.",
        severity: "error",
      });
    }
  };

  const intakeColumns = [
    {
      field: "intake_date",
      label: "Date",
      align: "center",
      minWidth: 112,
      cellSx: { whiteSpace: "nowrap" },
      render: (value) => (
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ display: "inline-block", minWidth: 92, textAlign: "center", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}
        >
          {formatDate(value)}
        </Typography>
      ),
    },
    { field: "trays_received", label: "Trays", render: (value) => Number(value).toLocaleString("en-IN") },
    { field: "loose_eggs_received", label: "Loose", render: (value) => Number(value || 0).toLocaleString("en-IN") },
    {
      field: "free_eggs",
      label: "Free Eggs",
      render: (value) => (
        Number(value || 0) > 0
          ? <Chip size="small" color="success" variant="outlined" label={`+${Number(value).toLocaleString("en-IN")}`} />
          : <Typography variant="caption" color="text.secondary">—</Typography>
      ),
    },
    { field: "purchased_eggs", label: "Purchased", render: (value) => Number(value || 0).toLocaleString("en-IN") },
    { field: "total_eggs", label: "Total Eggs", render: (value) => Number(value).toLocaleString("en-IN") },
    { field: "total_cost", label: "Amount Paid", render: (value) => formatCurrency(value) },
    { field: "cost_per_egg", label: "Cost/Egg", render: (value) => formatCurrency(value, 4) },
    {
      field: "actions",
      label: "",
      align: "right",
      render: (_, row) => {
        if (!isWithinLastDays(row.intake_date, 15)) return null;

        return (
          <Button
            size="small"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={(event) => {
              event.stopPropagation();
              handleDelete(row);
            }}
          >
            Delete
          </Button>
        );
      },
    },
  ];

  return (
    <Box>
      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={7} sx={{ order: { xs: 2, lg: 1 } }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  <TextField
                    label="From"
                    type="date"
                    size="small"
                    value={filters.from}
                    onChange={(event) => {
                      setFilters((current) => ({ ...current, from: event.target.value }));
                      setPage(1);
                    }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 150 }}
                  />
                  <TextField
                    label="To"
                    type="date"
                    size="small"
                    value={filters.to}
                    onChange={(event) => {
                      setFilters((current) => ({ ...current, to: event.target.value }));
                      setPage(1);
                    }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 150 }}
                  />
                  <Button variant="outlined" onClick={() => {
                    setFilters({ from: "", to: "" });
                    setPage(1);
                  }}>
                    Reset
                  </Button>
                </Stack>

                {loading && <Typography variant="caption" color="text.secondary">Loading...</Typography>}

                <DataTable
                  columns={intakeColumns}
                  rows={intakes}
                  emptyMessage="No egg intakes found."
                />

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography variant="caption" color="text.secondary">{totalIntakes} entries found</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button size="small" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
                      Prev
                    </Button>
                    <Typography variant="caption">Page {page} of {totalPages || 1}</Typography>
                    <Button size="small" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
                      Next
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5} sx={{ order: { xs: 1, lg: 2 } }}>
          <Card>
            <CardContent>
              <Stack spacing={2.2}>
                <Typography variant="subtitle1" fontWeight={800}>
                  Record Intake
                </Typography>

                <TextField
                  label="Date"
                  type="date"
                  value={form.intake_date}
                  onChange={setField("intake_date")}
                  error={Boolean(errors.intake_date)}
                  helperText={errors.intake_date}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />

                {/* ── Purchased eggs ─────────────────────────────────── */}
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                  PURCHASED EGGS
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Trays Purchased"
                      type="number"
                      value={form.trays_received}
                      onChange={setField("trays_received")}
                      error={Boolean(errors.trays_received)}
                      helperText={errors.trays_received}
                      inputProps={{ min: 0, step: 0.01 }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><ShoppingCartOutlinedIcon fontSize="small" /></InputAdornment> }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Loose Eggs Purchased"
                      type="number"
                      value={form.loose_eggs_received}
                      onChange={setField("loose_eggs_received")}
                      error={Boolean(errors.loose_eggs_received)}
                      helperText={errors.loose_eggs_received}
                      inputProps={{ min: 0, step: 1 }}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                {/* ── Free (bonus) eggs ──────────────────────────────── */}
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                  FREE EGGS
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Free Trays"
                      type="number"
                      value={form.free_trays}
                      onChange={setField("free_trays")}
                      error={Boolean(errors.free_trays)}
                      helperText={errors.free_trays}
                      inputProps={{ min: 0, step: 0.01 }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><CardGiftcardOutlinedIcon fontSize="small" /></InputAdornment> }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Free Loose Eggs"
                      type="number"
                      value={form.free_loose_eggs}
                      onChange={setField("free_loose_eggs")}
                      error={Boolean(errors.free_loose_eggs)}
                      helperText={errors.free_loose_eggs}
                      inputProps={{ min: 0, step: 1 }}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                {/* ── Eggs per tray + Total amount paid ─────────────── */}
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Eggs / Tray"
                      type="number"
                      value={form.eggs_per_tray}
                      onChange={setField("eggs_per_tray")}
                      error={Boolean(errors.eggs_per_tray)}
                      helperText={errors.eggs_per_tray}
                      inputProps={{ min: 1, step: 1 }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Total Purchase Amount"
                      type="number"
                      value={form.total_purchase_amount}
                      onChange={setField("total_purchase_amount")}
                      error={Boolean(errors.total_purchase_amount)}
                      helperText={errors.total_purchase_amount || "Amount paid (excl. free eggs)"}
                      inputProps={{ min: 0, step: 0.01 }}
                      InputProps={{ startAdornment: <InputAdornment position="start">Rs</InputAdornment> }}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                {/* ── Live preview ────────────────────────────────────── */}
                <Grid container spacing={1.5}>
                  <Grid item xs={6} sm={4}>
                    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5, bgcolor: "grey.50" }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>Purchased Eggs</Typography>
                      <Typography variant="h6" fontWeight={800}>{preview.purchasedEggs.toLocaleString("en-IN")}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Box sx={{ border: "1px solid", borderColor: "success.light", borderRadius: 2, p: 1.5, bgcolor: "success.light" }}>
                      <Typography variant="caption" color="success.dark" fontWeight={700}>Free Eggs</Typography>
                      <Typography variant="h6" fontWeight={800} color="success.dark">{preview.freeEggs > 0 ? `+${preview.freeEggs.toLocaleString("en-IN")}` : "0"}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ border: "1px solid", borderColor: "primary.200", borderRadius: 2, p: 1.5, bgcolor: "primary.50" }}>
                      <Typography variant="caption" color="primary.main" fontWeight={700}>Total Eggs</Typography>
                      <Typography variant="h6" fontWeight={800} color="primary.main">{preview.totalEggs.toLocaleString("en-IN")}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={6}>
                    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5, bgcolor: "grey.50" }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>Cost / Egg</Typography>
                      <Typography variant="h6" fontWeight={800}>{formatCurrency(preview.costPerEgg, 4)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={6}>
                    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5, bgcolor: "grey.50" }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>Cost / Tray</Typography>
                      <Typography variant="h6" fontWeight={800}>{formatCurrency(preview.costPerTray)}</Typography>
                    </Box>
                  </Grid>
                </Grid>

                {preview.freeEggs > 0 && (
                  <Alert severity="success" icon={<CardGiftcardOutlinedIcon />}>
                    {preview.freeEggs.toLocaleString("en-IN")} free eggs will be tracked separately.
                    Damage &amp; profit will prioritise free eggs first.
                  </Alert>
                )}

                <Divider />

                <TextField
                  label="Supplier Name"
                  value={form.supplier_name}
                  onChange={setField("supplier_name")}
                  fullWidth
                />
                <TextField
                  label="Notes"
                  value={form.notes}
                  onChange={setField("notes")}
                  minRows={3}
                  multiline
                  fullWidth
                />

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddCircleIcon />}
                  onClick={handleSave}
                  sx={{ fontWeight: 800 }}
                >
                  Record Intake
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Toast open={toast.open} message={toast.message} severity={toast.severity} onClose={() => setToast((current) => ({ ...current, open: false }))} />
      <ConfirmDialog {...dialogProps} />
    </Box>
  );
}